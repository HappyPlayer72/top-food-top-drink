/** Leagă un local găsit pe o platformă externă de fișa noastră (sau creează una nouă). */
import { and, eq, sql } from "drizzle-orm";
import { matchCandidates, venueSources, venues, type Db, type OpeningHours } from "@tftd/db";
import { findMatch, normalizeName, type Place } from "./match.ts";

export type ExternalPlace = Place & {
  source: "google" | "tripadvisor" | "facebook" | "instagram" | "tiktok";
  externalId: string;
  citySlug: string;
  vertical: "food" | "drink";
  address?: string | null;
  categories?: string[];
  priceLevel?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  url?: string | null;
  openingHours?: OpeningHours | null;
};

export type LinkResult = { venueId: string; outcome: "existing-source" | "matched" | "created" | "queued-for-admin" };

export async function linkExternalPlace(db: Db, p: ExternalPlace): Promise<LinkResult> {
  const sourceRow = sourceRowOf(p);

  // Deja legat: doar actualizăm ratingul brut
  const [existing] = await db
    .select({ venueId: venueSources.venueId })
    .from(venueSources)
    .where(and(eq(venueSources.source, p.source), eq(venueSources.externalId, p.externalId)));
  if (existing) {
    await db.update(venueSources).set(sourceRow).where(and(eq(venueSources.source, p.source), eq(venueSources.externalId, p.externalId)));
    return { venueId: existing.venueId, outcome: "existing-source" };
  }

  const known = await db
    .select({ id: venues.id, name: venues.name, location: venues.location, phone: venues.phone, website: venues.website })
    .from(venues)
    .where(and(eq(venues.citySlug, p.citySlug), eq(venues.vertical, p.vertical)));
  const decision = findMatch(
    p,
    known.map((k) => ({ name: k.name, lat: k.location.y, lng: k.location.x, phone: k.phone, website: k.website })),
  );

  if (decision.status === "match") {
    const venueId = known[decision.index]!.id;
    await attachSource(db, venueId, p);
    return { venueId, outcome: "matched" };
  }

  if (decision.status === "uncertain") {
    const venueId = known[decision.index]!.id;
    // Același loc găsit de mai multe căutări: o singură cerere în coadă
    const [queued] = await db
      .select({ id: matchCandidates.id })
      .from(matchCandidates)
      .where(and(eq(matchCandidates.source, p.source), eq(matchCandidates.externalId, p.externalId), eq(matchCandidates.status, "pending")));
    if (queued) return { venueId, outcome: "queued-for-admin" };
    await db.insert(matchCandidates).values({
      venueId,
      source: p.source,
      externalId: p.externalId,
      payload: p,
      nameSimilarity: decision.nameSimilarity,
      distanceM: decision.distanceM,
    });
    return { venueId, outcome: "queued-for-admin" };
  }

  return { venueId: await createFromPlace(db, p), outcome: "created" };
}

const sourceRowOf = (p: ExternalPlace) => ({ rawRating: p.rating ?? null, rawReviewCount: p.reviewCount ?? null, url: p.url ?? null, fetchedAt: new Date() });

/** Leagă sursa externă de un local al nostru și completează ce nu știam (program, telefon, site), fără să suprascrie. */
export async function attachSource(db: Db, venueId: string, p: ExternalPlace) {
  await db.insert(venueSources).values({ venueId, source: p.source, externalId: p.externalId, ...sourceRowOf(p) }).onConflictDoNothing();
  await db
    .update(venues)
    .set({
      openingHours: sql`coalesce(${venues.openingHours}, ${p.openingHours ? JSON.stringify(p.openingHours) : null}::jsonb)`,
      phone: sql`coalesce(${venues.phone}, ${p.phone ?? null})`,
      website: sql`coalesce(${venues.website}, ${p.website ?? null})`,
    })
    .where(eq(venues.id, venueId));
}

/** Fișă nouă pentru un loc real pe care nu îl aveam. */
export async function createFromPlace(db: Db, p: ExternalPlace): Promise<string> {
  const [created] = await db
    .insert(venues)
    .values({
      citySlug: p.citySlug,
      vertical: p.vertical,
      name: p.name,
      slug: await uniqueSlug(db, p.citySlug, p.vertical, p.name),
      categories: p.categories ?? [],
      location: { x: p.lng, y: p.lat },
      address: p.address ?? null,
      phone: p.phone ?? null,
      website: p.website ?? null,
      priceLevel: p.priceLevel ?? null,
      openingHours: p.openingHours ?? null,
    })
    .returning({ id: venues.id });
  await db.insert(venueSources).values({ venueId: created!.id, source: p.source, externalId: p.externalId, ...sourceRowOf(p) });
  return created!.id;
}

/** Pragurile cu care se golește automat coada de potriviri nesigure (vezi resolveCandidates). */
export const AUTO_RESOLVE = { confirmNameMin: 0.9, confirmMaxM: 150, newPlaceNameMax: 0.7 } as const;

/**
 * Golește coada de potriviri nesigure cu reguli clare; ce rămâne la mijloc decide un admin în /admin.
 * - sursa e deja legată de un local → duplicat, se închide;
 * - nume aproape identic (≥ 0,9) la max. 150 m → același local, se leagă;
 * - nume clar diferit (< 0,7) → alt local real, i se face fișă.
 */
export async function resolveCandidates(db: Db, citySlug: string) {
  const pending = await db
    .select({ c: matchCandidates })
    .from(matchCandidates)
    .innerJoin(venues, eq(venues.id, matchCandidates.venueId))
    .where(and(eq(matchCandidates.status, "pending"), eq(venues.citySlug, citySlug)));
  const outcome = { linked: 0, created: 0, duplicate: 0, leftForAdmin: 0 };
  for (const { c } of pending) {
    const [taken] = await db
      .select({ venueId: venueSources.venueId })
      .from(venueSources)
      .where(and(eq(venueSources.source, c.source), eq(venueSources.externalId, c.externalId)));
    const p = c.payload as ExternalPlace;
    let status: "confirmed" | "rejected" | null = null;
    if (taken) {
      status = taken.venueId === c.venueId ? "confirmed" : "rejected";
      outcome.duplicate++;
    } else if (c.nameSimilarity >= AUTO_RESOLVE.confirmNameMin && (c.distanceM ?? Infinity) <= AUTO_RESOLVE.confirmMaxM) {
      await attachSource(db, c.venueId, p);
      status = "confirmed";
      outcome.linked++;
    } else if (c.nameSimilarity < AUTO_RESOLVE.newPlaceNameMax) {
      await createFromPlace(db, p);
      status = "rejected";
      outcome.created++;
    } else {
      outcome.leftForAdmin++;
    }
    if (status) await db.update(matchCandidates).set({ status }).where(eq(matchCandidates.id, c.id));
  }
  return outcome;
}

/** „Ciorba lui Sandu” → „ciorba-lui-sandu” (cu -2, -3 dacă e ocupat). */
export async function uniqueSlug(db: Db, citySlug: string, vertical: "food" | "drink", name: string): Promise<string> {
  const base = slugify(name);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [taken] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(and(eq(venues.citySlug, citySlug), eq(venues.vertical, vertical), eq(venues.slug, slug)));
    if (!taken) return slug;
  }
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || normalizeName(name).replace(/\s+/g, "-") || "local"
  );
}
