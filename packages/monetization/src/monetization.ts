/**
 * Modulul H: parteneriate (Basic / Highlight), sloturi „Sponsorizat”, reclame.
 * Datele de aici ajung DOAR în sloturi separate din pagini, niciodată în scor sau clasament.
 * Plăți reale (Stripe) după hackathon: acum o plată se marchează manual cu markPaid.
 */
import { and, count, eq, gt, gte, lte, sql } from "drizzle-orm";
import { adSlots, forbidden, invalid, notFound, partnerships, reviews, venueManagers, venues, type Db } from "@tftd/db";

export const SPONSORED_SLOTS = 3;
/** Peste acest Tourist Trap Index localul nu poate cumpăra Highlight. */
export const HIGHLIGHT_MAX_TRAP = 79;
export const FRAUD_SUSPICION = { probability: 0.7, count: 3, days: 30 } as const;

export async function activePartnership(db: Db, venueId: string, now = new Date()) {
  const [p] = await db
    .select()
    .from(partnerships)
    .where(and(eq(partnerships.venueId, venueId), eq(partnerships.paymentStatus, "paid"), lte(partnerships.startsAt, now), gt(partnerships.endsAt, now)));
  return p ?? null;
}

/** De ce nu poate cumpăra Highlight (null = poate). */
export async function highlightBlockedReason(db: Db, venueId: string, now = new Date()): Promise<string | null> {
  const [v] = await db.select({ trap: venues.touristTrapIndex }).from(venues).where(eq(venues.id, venueId));
  if (!v) throw notFound("Localul");
  if ((v.trap ?? 0) > HIGHLIGHT_MAX_TRAP) return "Localul e marcat drept capcană turistică (index ≥ 80) și nu poate apărea la Sponsorizat.";
  const since = new Date(now.getTime() - FRAUD_SUSPICION.days * 86_400_000);
  const [s] = await db
    .select({ n: count() })
    .from(reviews)
    .where(and(eq(reviews.venueId, venueId), gte(reviews.postedAt, since), gte(reviews.fakeProbability, FRAUD_SUSPICION.probability)));
  if ((s?.n ?? 0) >= FRAUD_SUSPICION.count) return "Localul are review-uri suspecte în ultimele 30 de zile și nu poate apărea la Sponsorizat.";
  return null;
}

export async function buyPartnership(db: Db, userId: string, venueId: string, plan: "basic" | "highlight", months = 1, now = new Date()) {
  const [m] = await db.select().from(venueManagers).where(and(eq(venueManagers.venueId, venueId), eq(venueManagers.userId, userId)));
  if (!m) throw forbidden("Nu administrezi acest local.");
  if (months < 1 || months > 12) throw invalid("Abonamentul e între 1 și 12 luni.");
  if (plan === "highlight") {
    const reason = await highlightBlockedReason(db, venueId, now);
    if (reason) throw forbidden(reason);
  }
  const [p] = await db
    .insert(partnerships)
    .values({ venueId, plan, startsAt: now, endsAt: new Date(now.getTime() + months * 30 * 86_400_000), paymentStatus: "pending" })
    .returning();
  return p!;
}

export async function markPaid(db: Db, partnershipId: string) {
  const [p] = await db.update(partnerships).set({ paymentStatus: "paid" }).where(eq(partnerships.id, partnershipId)).returning();
  if (!p) throw notFound("Parteneriatul");
  return p;
}

export async function cancelPartnership(db: Db, userId: string, partnershipId: string) {
  const [p] = await db.select().from(partnerships).where(eq(partnerships.id, partnershipId));
  if (!p) throw notFound("Parteneriatul");
  const [m] = await db.select().from(venueManagers).where(and(eq(venueManagers.venueId, p.venueId), eq(venueManagers.userId, userId)));
  if (!m) throw forbidden("Nu administrezi acest local.");
  await db.update(partnerships).set({ paymentStatus: "cancelled" }).where(eq(partnerships.id, partnershipId));
}

/**
 * Caruselul „Sponsorizat” al unei pagini: max 3, prin rotație (se schimbă la fiecare oră).
 * E o listă SEPARATĂ de topul onest; nu schimbă ordinea topului.
 */
export async function sponsoredSlots(db: Db, citySlug: string, vertical: "food" | "drink", now = new Date(), category?: string) {
  const rows = await db
    .select({
      venueId: venues.id,
      name: venues.name,
      slug: venues.slug,
      neighborhood: venues.neighborhood,
      categories: venues.categories,
      priceMinLei: venues.priceMinLei,
      priceMaxLei: venues.priceMaxLei,
      drinkPrices: venues.drinkPrices,
      honestScore: venues.honestScore,
    })
    .from(partnerships)
    .innerJoin(venues, eq(venues.id, partnerships.venueId))
    .where(
      and(
        eq(venues.citySlug, citySlug),
        eq(venues.vertical, vertical),
        eq(venues.status, "active"),
        eq(partnerships.plan, "highlight"),
        eq(partnerships.paymentStatus, "paid"),
        lte(partnerships.startsAt, now),
        gt(partnerships.endsAt, now),
        sql`coalesce(${venues.touristTrapIndex}, 0) <= ${HIGHLIGHT_MAX_TRAP}`,
        ...(category ? [sql`${category} = ANY(${venues.categories})`] : []),
      ),
    );
  const hour = Math.floor(now.getTime() / 3_600_000);
  return rotate(rows, hour).slice(0, SPONSORED_SLOTS).map((r) => ({ ...r, label: "Sponsorizat. Nu schimbă scorul." }));
}

/** Rotație deterministă: fiecare oră începe de la alt local. */
export function rotate<T>(xs: T[], step: number): T[] {
  if (!xs.length) return xs;
  const k = step % xs.length;
  return [...xs.slice(k), ...xs.slice(0, k)];
}

// ---------- Reclame ----------

export async function adsFor(db: Db, citySlug: string, vertical: "food" | "drink", placement: string, now = new Date()) {
  return db
    .select()
    .from(adSlots)
    .where(and(eq(adSlots.citySlug, citySlug), eq(adSlots.vertical, vertical), eq(adSlots.placement, placement), lte(adSlots.startsAt, now), gt(adSlots.endsAt, now)));
}

export async function recordAdEvent(db: Db, adId: string, event: "impression" | "click") {
  await db
    .update(adSlots)
    .set(event === "impression" ? { impressions: sql`${adSlots.impressions} + 1` } : { clicks: sql`${adSlots.clicks} + 1` })
    .where(eq(adSlots.id, adId));
}
