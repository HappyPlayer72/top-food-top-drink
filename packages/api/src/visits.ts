/**
 * Vizită verificată (docs/ARHITECTURA.md → Conturi și verificare → „Review cu vizită verificată”).
 * Un review cu vizita dovedită are pondere ×1,3. Două dovezi:
 *
 * 1. GPS la local: userul e la cel mult 100 m de local. Salvăm DOAR ziua și localul (regula 7, GDPR),
 *    niciodată coordonatele. Review-ul din aceeași zi devine verificat (și dacă check-in-ul vine după).
 * 2. Poza bonului: ajunge în coada adminului. La decizie poza se șterge; rămân hash-ul (același bon nu
 *    poate verifica două review-uri) și decizia.
 */
import { createHash } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { checkins, forbidden, invalid, notFound, reviews, ServiceError, users, venues, visitProofs, type Db } from "@tftd/db";

const conflict = (msg: string) => new ServiceError("conflict", msg);
import { assertAdmin } from "@tftd/moderation";
import { recalculateCity } from "@tftd/scoring";

export const VISIT_RULES = {
  /** GPS-ul unui telefon greșește ușor cu 20–50 m în oraș; 100 m acoperă și terasa. */
  venueRadiusM: 100,
  maxImageBytes: 2_000_000,
  /** Câte bonuri poate avea un user în așteptare deodată (anti-spam pentru coada adminului). */
  maxPendingPerUser: 5,
} as const;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export type VisitCheckinResult = {
  distanceM: number;
  day: string;
  /** Review-ul de azi la acest local care a devenit verificat prin check-in. */
  upgradedReviewId: string | null;
};

/**
 * Check-in la un local anume. `simulate: true` (doar demo, decis de aplicație) sare peste distanță.
 * Coordonatele se folosesc doar pentru calculul distanței și nu se salvează.
 */
export async function checkInAtVenue(
  db: Db,
  userId: string,
  venueId: string,
  loc: { lat: number; lng: number } | { simulate: true },
  now = new Date(),
): Promise<VisitCheckinResult> {
  let distanceM = 0;
  if ("simulate" in loc) {
    const [v] = await db.select({ id: venues.id }).from(venues).where(eq(venues.id, venueId));
    if (!v) throw notFound("Localul");
  } else {
    if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng) || Math.abs(loc.lat) > 90 || Math.abs(loc.lng) > 180) {
      throw invalid("Locația nu e validă.");
    }
    const point = sql`ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326)::geography`;
    const [v] = await db
      .select({ d: sql<number>`ST_Distance(${venues.location}::geography, ${point})` })
      .from(venues)
      .where(eq(venues.id, venueId));
    if (!v) throw notFound("Localul");
    distanceM = Math.round(v.d);
    if (distanceM > VISIT_RULES.venueRadiusM) {
      throw invalid(
        `Ești la ${distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1).replace(".", ",")} km` : `${distanceM} m`} de local. ` +
          `Check-in-ul merge doar de la cel mult ${VISIT_RULES.venueRadiusM} m. Poți atașa în schimb poza bonului.`,
      );
    }
  }

  const [venue] = await db.select({ citySlug: venues.citySlug }).from(venues).where(eq(venues.id, venueId));
  const day = isoDay(now);
  await db.insert(checkins).values({ userId, citySlug: venue!.citySlug, venueId, day }).onConflictDoNothing();

  // Review scris azi înainte de check-in → îl verificăm acum.
  const [review] = await db
    .update(reviews)
    .set({ verifiedVisit: true, verifiedVia: "gps" })
    .where(
      and(
        eq(reviews.authorId, userId),
        eq(reviews.venueId, venueId),
        eq(reviews.source, "native"),
        eq(reviews.visitedAt, day),
        eq(reviews.verifiedVisit, false),
      ),
    )
    .returning({ id: reviews.id });
  if (review) await recalculateVenueCity(db, venueId, now);
  return { distanceM, day, upgradedReviewId: review?.id ?? null };
}

/** Recunoaște JPEG / PNG / WebP după primii octeți (nu ne bazăm pe tipul trimis de browser). */
export function detectImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length > 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Userul atașează poza bonului la review-ul lui; ajunge la admin. */
export async function submitReceipt(db: Db, userId: string, reviewId: string, image: Uint8Array) {
  if (!image.length) throw invalid("Alege o poză cu bonul.");
  if (image.length > VISIT_RULES.maxImageBytes) throw invalid("Poza e prea mare (maxim 2 MB).");
  const imageType = detectImageType(image);
  if (!imageType) throw invalid("Poza trebuie să fie JPEG, PNG sau WebP.");

  const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
  if (!review) throw notFound("Review-ul");
  if (review.authorId !== userId || review.source !== "native") throw forbidden("Poți atașa bonul doar la review-urile tale.");
  if (review.verifiedVisit) throw invalid("Vizita e deja verificată.");

  const [pending] = await db
    .select({ id: visitProofs.id })
    .from(visitProofs)
    .where(and(eq(visitProofs.reviewId, reviewId), eq(visitProofs.status, "pending")));
  if (pending) throw conflict("Bonul pentru acest review așteaptă deja verificarea.");

  const [mine] = await db
    .select({ n: count() })
    .from(visitProofs)
    .where(and(eq(visitProofs.userId, userId), eq(visitProofs.status, "pending")));
  if ((mine?.n ?? 0) >= VISIT_RULES.maxPendingPerUser) {
    throw invalid(`Ai deja ${VISIT_RULES.maxPendingPerUser} bonuri în verificare. Așteaptă să fie verificate.`);
  }

  const imageHash = createHash("sha256").update(image).digest("hex");
  const [row] = await db
    .insert(visitProofs)
    .values({ reviewId, userId, venueId: review.venueId, method: "receipt", image: Buffer.from(image), imageType, imageHash })
    .onConflictDoNothing({ target: visitProofs.imageHash })
    .returning({ id: visitProofs.id, status: visitProofs.status });
  if (!row) throw conflict("Bonul ăsta a fost deja folosit pentru alt review.");
  return row;
}

/** Starea verificării pentru review-urile unui user la un local (pentru „Bonul e în verificare”). */
export async function myVisitProofs(db: Db, userId: string, venueId: string) {
  return db
    .select({ reviewId: visitProofs.reviewId, status: visitProofs.status, decision: visitProofs.decision, createdAt: visitProofs.createdAt })
    .from(visitProofs)
    .where(and(eq(visitProofs.userId, userId), eq(visitProofs.venueId, venueId)))
    .orderBy(asc(visitProofs.createdAt));
}

// ---------- Admin ----------

/** Bonurile care așteaptă o decizie, cele mai vechi primele (fără poză; poza vine din `receiptImage`). */
export async function receiptQueue(db: Db, adminId: string) {
  await assertAdmin(db, adminId);
  return db
    .select({
      id: visitProofs.id,
      createdAt: visitProofs.createdAt,
      imageType: visitProofs.imageType,
      review: { id: reviews.id, rating: reviews.rating, text: reviews.text, visitedAt: reviews.visitedAt, postedAt: reviews.postedAt },
      venue: { name: venues.name, address: venues.address, priceLevel: venues.priceLevel },
      user: { username: users.username, displayName: users.displayName },
    })
    .from(visitProofs)
    .innerJoin(reviews, eq(reviews.id, visitProofs.reviewId))
    .innerJoin(venues, eq(venues.id, visitProofs.venueId))
    .innerJoin(users, eq(users.id, visitProofs.userId))
    .where(eq(visitProofs.status, "pending"))
    .orderBy(asc(visitProofs.createdAt));
}

/** Poza bonului, doar pentru admin și doar cât timp așteaptă decizia. */
export async function receiptImage(db: Db, adminId: string, proofId: string) {
  await assertAdmin(db, adminId);
  const [p] = await db
    .select({ image: visitProofs.image, imageType: visitProofs.imageType })
    .from(visitProofs)
    .where(and(eq(visitProofs.id, proofId), eq(visitProofs.status, "pending")));
  if (!p?.image || !p.imageType) throw notFound("Poza bonului");
  return { bytes: p.image, type: p.imageType };
}

/**
 * Decizia adminului. Aprobat → review-ul primește „vizită verificată” (×1,3) și scorurile se recalculează.
 * În ambele cazuri poza se șterge.
 */
export async function decideReceipt(db: Db, adminId: string, proofId: string, approve: boolean, note = "", now = new Date()) {
  await assertAdmin(db, adminId);
  const [p] = await db
    .update(visitProofs)
    .set({ status: approve ? "verified" : "rejected", image: null, decision: note.trim() || null, decidedBy: adminId, decidedAt: now })
    .where(and(eq(visitProofs.id, proofId), eq(visitProofs.status, "pending")))
    .returning();
  if (!p) throw invalid("Bonul a fost deja verificat sau nu există.");
  if (approve) {
    await db
      .update(reviews)
      .set({ verifiedVisit: true, verifiedVia: "receipt" })
      .where(and(eq(reviews.id, p.reviewId), eq(reviews.verifiedVisit, false)));
    await recalculateVenueCity(db, p.venueId, now);
  }
  return p;
}

async function recalculateVenueCity(db: Db, venueId: string, now: Date) {
  const [v] = await db.select({ citySlug: venues.citySlug, vertical: venues.vertical }).from(venues).where(eq(venues.id, venueId));
  if (v) await recalculateCity(db, v.citySlug, v.vertical, now);
}

