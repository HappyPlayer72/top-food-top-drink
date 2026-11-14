/** Acțiunile userilor din pagini: scrie review, raportează cât e de plin. */
import { and, eq, gte } from "drizzle-orm";
import { checkins, employees, invalid, notFound, reviewAnswers, reviews, socialSubmissions, venueQuickVotes, venues, vibeChecks, type Db } from "@tftd/db";
import { rateEmployee } from "@tftd/owner";
import { detectPlatform, processSubmission, submitSocialLink, type SocialAnalysis } from "@tftd/ingestion";
import { analyzeVenueReviews } from "@tftd/review-analysis";
import { recalculateCity } from "@tftd/scoring";
import { QUESTION_BY_KEY, QUICK_MAX, type Answer, type QuickKind } from "@tftd/scoring/features";

export const REVIEW_COOLDOWN_DAYS = 30;
const DAY = 86_400_000;

export type ReviewInput = {
  venueId: string;
  /** 1–10 */
  rating: number;
  text: string;
  visitedAt?: string;
  /** TOP DRINK: vizita a fost vineri–sâmbătă noaptea? */
  weekendNight?: boolean;
  servedByEmployeeId?: string;
  employeeRating?: { friendliness: number; speed: number; comment?: string };
  /** Întrebările structurate: cheie → "yes" | "no" | "not_observed". Ce nu e bifat lipsește. */
  answers?: Record<string, string>;
};

const ANSWERS: readonly string[] = ["yes", "no", "not_observed"] satisfies Answer[];

/** Validarea de pe server: doar întrebări din catalog și doar Da / Nu / Nu am observat. */
export function parseReviewAnswers(raw: unknown): { questionKey: string; answer: Answer }[] {
  if (raw == null) return [];
  if (typeof raw !== "object" || Array.isArray(raw)) throw invalid("Răspunsurile trimise nu sunt valide.");
  return Object.entries(raw).map(([questionKey, answer]) => {
    if (!QUESTION_BY_KEY.has(questionKey) || typeof answer !== "string" || !ANSWERS.includes(answer)) {
      throw invalid("Răspunsurile trimise nu sunt valide.");
    }
    return { questionKey, answer: answer as Answer };
  });
}

/**
 * Review nativ. Vizita e „verificată” dacă userul are check-in la local în ziua vizitei.
 * După salvare: analiză (limbă, fals, aspecte) și recalcularea scorurilor orașului.
 */
export async function writeReview(db: Db, userId: string, input: ReviewInput, now = new Date()) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) throw invalid("Nota e de la 1 la 10.");
  if (input.text.trim().length < 20) throw invalid("Scrie cel puțin 20 de caractere: ce ai mâncat sau băut, cum a fost.");
  const answers = parseReviewAnswers(input.answers);
  const [venue] = await db.select().from(venues).where(eq(venues.id, input.venueId));
  if (!venue) throw notFound("Localul");

  const [recent] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.venueId, venue.id), eq(reviews.authorId, userId), gte(reviews.postedAt, new Date(now.getTime() - REVIEW_COOLDOWN_DAYS * DAY))));
  if (recent) throw invalid(`Ai scris deja un review aici în ultimele ${REVIEW_COOLDOWN_DAYS} de zile.`);

  if (input.servedByEmployeeId) {
    const [e] = await db.select().from(employees).where(eq(employees.id, input.servedByEmployeeId));
    if (!e || e.venueId !== venue.id || !e.accepted || !e.active) throw invalid("Angajatul ales nu lucrează aici.");
  }

  const visitDay = input.visitedAt ?? now.toISOString().slice(0, 10);
  const [checkin] = await db
    .select({ id: checkins.id })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.venueId, venue.id), eq(checkins.day, visitDay)));

  // Review-ul și răspunsurile lui se salvează împreună (sau deloc).
  const review = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(reviews)
      .values({
        venueId: venue.id,
        source: "native",
        authorId: userId,
        rating: input.rating,
        originalRating: input.rating,
        originalScale: 10,
        text: input.text.trim(),
        visitedAt: visitDay,
        visitWeekendNight: venue.vertical === "drink" ? (input.weekendNight ?? null) : null,
        postedAt: now,
        verifiedVisit: !!checkin,
        servedByEmployeeId: input.servedByEmployeeId ?? null,
      })
      .returning();
    if (answers.length) await tx.insert(reviewAnswers).values(answers.map((a) => ({ reviewId: row!.id, ...a })));
    return row;
  });

  if (input.servedByEmployeeId && input.employeeRating) {
    await rateEmployee(db, userId, { employeeId: input.servedByEmployeeId, reviewId: review!.id, ...input.employeeRating }, now).catch(() => undefined);
  }

  await analyzeVenueReviews(db, venue.id, { onlyNew: true, now });
  await recalculateCity(db, venue.citySlug, venue.vertical, now);
  const [saved] = await db.select().from(reviews).where(eq(reviews.id, review!.id));
  return saved!;
}

/**
 * Vot rapid din bara localului (siguranță 1–5, zgomot 1–4). Un vot per user, per local, per tip;
 * un vot nou îl înlocuiește pe cel vechi. Nu intră în scoruri sau în ordinea topurilor.
 */
export async function submitQuickVote(db: Db, userId: string, venueId: string, kind: string, value: number, now = new Date()) {
  if (kind !== "safety" && kind !== "noise") throw invalid("Tip de vot necunoscut.");
  const max = QUICK_MAX[kind as QuickKind];
  if (!Number.isInteger(value) || value < 1 || value > max) throw invalid(`Alege o valoare de la 1 la ${max}.`);
  const [v] = await db.select({ status: venues.status }).from(venues).where(eq(venues.id, venueId));
  if (!v || v.status !== "active") throw notFound("Localul");
  const [row] = await db
    .insert(venueQuickVotes)
    .values({ venueId, userId, kind, value, updatedAt: now })
    .onConflictDoUpdate({ target: [venueQuickVotes.venueId, venueQuickVotes.userId, venueQuickVotes.kind], set: { value, updatedAt: now } })
    .returning();
  return row!;
}

/** „Spune cât e de plin unde ești”: 1 (gol) … 5 (coadă la intrare), expiră în 2 ore. */
export async function submitVibe(db: Db, userId: string | null, venueId: string, level: number, now = new Date()) {
  if (!Number.isInteger(level) || level < 1 || level > 5) throw invalid("Alege de la 1 (gol) la 5 (coadă la intrare).");
  const [v] = await db.select({ vertical: venues.vertical }).from(venues).where(eq(venues.id, venueId));
  if (!v) throw notFound("Localul");
  if (v.vertical !== "drink") throw invalid("Vibe check-ul e doar pentru baruri și cluburi.");
  const [row] = await db
    .insert(vibeChecks)
    .values({ venueId, userId, level, createdAt: now, expiresAt: new Date(now.getTime() + 2 * 3_600_000) })
    .returning();
  return row!;
}

/**
 * „Lipește link TikTok/Instagram”: salvează linkul și îl procesează pe loc (embed + „reclamă?”),
 * ca demo-ul să nu aștepte jobul `proceseaza-linkuri`. Dacă procesarea pică, linkul rămâne `failed`.
 */
export async function submitSocialLinkNow(
  db: Db,
  input: { venueId: string; url: string; userId: string | null },
): Promise<{ status: "processed" | "failed" | "duplicate"; analysis: SocialAnalysis | null }> {
  // Doar „platformă nesuportată” e mesaj pentru user; erorile de DB rămân erori interne (fără SQL în UI).
  if (!detectPlatform(input.url)) throw invalid("Linkul trebuie să fie de pe TikTok, Instagram, Facebook sau YouTube.");
  let row = await submitSocialLink(db, input);
  if (!row) {
    // Un link care a eșuat (ex. rețea) la același local se poate reîncerca; restul sunt duplicate.
    const [prev] = await db.select().from(socialSubmissions).where(eq(socialSubmissions.url, input.url));
    if (prev?.status !== "failed" || prev.venueId !== input.venueId) return { status: "duplicate", analysis: null };
    row = prev;
  }
  try {
    return { status: "processed", analysis: await processSubmission(db, row.id) };
  } catch {
    return { status: "failed", analysis: null };
  }
}
