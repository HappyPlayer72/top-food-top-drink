/** Acțiunile userilor din pagini: scrie review, raportează cât e de plin. */
import { and, eq, gte } from "drizzle-orm";
import { checkins, employees, invalid, notFound, reviewSubmissions, reviews, socialSubmissions, venues, vibeChecks, type Db } from "@tftd/db";
import { checkReviewGate, type ReviewClient } from "./antibot.ts";
import { rateEmployee } from "@tftd/owner";
import { detectPlatform, processSubmission, submitSocialLink, type SocialAnalysis } from "@tftd/ingestion";
import { analyzeVenueReviews } from "@tftd/review-analysis";
import { recalculateCity } from "@tftd/scoring";

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
};

/**
 * Review nativ. Vizita e „verificată” dacă userul are check-in la local în ziua vizitei
 * (sau, mai târziu, prin bon aprobat de admin: vezi visits.ts).
 * După salvare: analiză (limbă, fals, aspecte, anti-bot) și recalcularea scorurilor orașului.
 *
 * `client` vine de la site (token de formular, câmp capcană, amprenta dispozitivului): trece prin poarta
 * anti-bot (antibot.ts) și se salvează în `review_submissions`. Fără el (seed, teste) poarta e sărită.
 * Dacă analiza îl reține ca bot, review-ul întors are `status: "flagged"` (așteaptă un admin).
 */
export async function writeReview(db: Db, userId: string, input: ReviewInput, now = new Date(), client?: ReviewClient) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) throw invalid("Nota e de la 1 la 10.");
  if (input.text.trim().length < 20) throw invalid("Scrie cel puțin 20 de caractere: ce ai mâncat sau băut, cum a fost.");
  const [venue] = await db.select().from(venues).where(eq(venues.id, input.venueId));
  if (!venue) throw notFound("Localul");

  const [recent] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.venueId, venue.id), eq(reviews.authorId, userId), gte(reviews.postedAt, new Date(now.getTime() - REVIEW_COOLDOWN_DAYS * DAY))));
  if (recent) throw invalid(`Ai scris deja un review aici în ultimele ${REVIEW_COOLDOWN_DAYS} de zile.`);
  const submission = client ? await checkReviewGate(db, userId, venue.id, client, now) : null;

  if (input.servedByEmployeeId) {
    const [e] = await db.select().from(employees).where(eq(employees.id, input.servedByEmployeeId));
    if (!e || e.venueId !== venue.id || !e.accepted || !e.active) throw invalid("Angajatul ales nu lucrează aici.");
  }

  const visitDay = input.visitedAt ?? now.toISOString().slice(0, 10);
  const [checkin] = await db
    .select({ id: checkins.id })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.venueId, venue.id), eq(checkins.day, visitDay)));

  const [review] = await db
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
      verifiedVia: checkin ? "gps" : null,
      servedByEmployeeId: input.servedByEmployeeId ?? null,
    })
    .returning();

  if (submission) {
    await db.insert(reviewSubmissions).values({ reviewId: review!.id, userId, venueId: venue.id, ...submission, createdAt: now });
  }

  if (input.servedByEmployeeId && input.employeeRating) {
    await rateEmployee(db, userId, { employeeId: input.servedByEmployeeId, reviewId: review!.id, ...input.employeeRating }, now).catch(() => undefined);
  }

  await analyzeVenueReviews(db, venue.id, { onlyNew: true, now });
  await recalculateCity(db, venue.citySlug, venue.vertical, now);
  const [saved] = await db.select().from(reviews).where(eq(reviews.id, review!.id));
  return saved!;
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

/** După decizia adminului pe un review (ascuns / păstrat): reanalizează localul și recalculează scorurile. */
export async function refreshAfterModeration(db: Db, reviewId: string, now = new Date()) {
  const [r] = await db
    .select({ venueId: reviews.venueId, citySlug: venues.citySlug, vertical: venues.vertical })
    .from(reviews)
    .innerJoin(venues, eq(venues.id, reviews.venueId))
    .where(eq(reviews.id, reviewId));
  if (!r) return;
  await analyzeVenueReviews(db, r.venueId, { onlyNew: true, now });
  await recalculateCity(db, r.citySlug, r.vertical, now);
}
