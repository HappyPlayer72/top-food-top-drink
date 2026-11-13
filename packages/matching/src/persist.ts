/** Leagă un local găsit pe o platformă externă de fișa noastră (sau creează una nouă). */
import { and, eq } from "drizzle-orm";
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
  const sourceRow = {
    rawRating: p.rating ?? null,
    rawReviewCount: p.reviewCount ?? null,
    url: p.url ?? null,
    fetchedAt: new Date(),
  };

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
    await db.insert(venueSources).values({ venueId, source: p.source, externalId: p.externalId, ...sourceRow });
    return { venueId, outcome: "matched" };
  }

  if (decision.status === "uncertain") {
    const venueId = known[decision.index]!.id;
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
  await db.insert(venueSources).values({ venueId: created!.id, source: p.source, externalId: p.externalId, ...sourceRow });
  return { venueId: created!.id, outcome: "created" };
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
