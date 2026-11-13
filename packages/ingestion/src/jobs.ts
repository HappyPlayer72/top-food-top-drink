/** Joburile de ingestie: descoperă locale, actualizează ratinguri/review-uri, procesează linkuri trimise. */
import { and, eq } from "drizzle-orm";
import { socialSubmissions, reviews, touristZones, venueSources, venues, type Db } from "@tftd/db";
import { linkExternalPlace } from "@tftd/matching";
import * as google from "./google.ts";
import * as ta from "./tripadvisor.ts";
import { analyzeSocial, detectPlatform } from "./social.ts";

/** Centrul orașului = media zonelor turistice (suficient pentru căutarea pe rază). */
async function cityCenter(db: Db, citySlug: string) {
  const zones = await db.select({ location: touristZones.location }).from(touristZones).where(eq(touristZones.citySlug, citySlug));
  if (!zones.length) throw new Error(`Orașul ${citySlug} nu are zone turistice în config; nu știu unde să caut.`);
  return {
    lat: zones.reduce((s, z) => s + z.location.y, 0) / zones.length,
    lng: zones.reduce((s, z) => s + z.location.x, 0) / zones.length,
  };
}

/** Jobul `descopera-locale` (săptămânal, per oraș). */
export async function discoverVenues(db: Db, citySlug: string, vertical: "food" | "drink", maxPagesPerQuery = 3) {
  const center = await cityCenter(db, citySlug);
  const outcomes: Record<string, number> = {};
  for (const query of google.DISCOVERY_QUERIES[vertical]) {
    let token: string | undefined;
    for (let page = 0; page < maxPagesPerQuery; page++) {
      const { places, nextPageToken } = await google.searchText(query, center, 6000, token);
      for (const p of places) {
        if (!p.location) continue;
        const { outcome } = await linkExternalPlace(db, google.toExternalPlace(p, citySlug, vertical));
        outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
      }
      if (!nextPageToken) break;
      token = nextPageToken;
    }
  }
  return outcomes;
}

/** Jobul `actualizeaza-ratinguri` (zilnic): rating brut + review-uri noi de pe Google și Tripadvisor. */
export async function refreshCity(db: Db, citySlug: string) {
  const rows = await db
    .select({ venue: venues, source: venueSources })
    .from(venues)
    .leftJoin(venueSources, eq(venueSources.venueId, venues.id))
    .where(eq(venues.citySlug, citySlug));

  let newReviews = 0;
  const byVenue = new Map<string, { venue: (typeof rows)[number]["venue"]; sources: NonNullable<(typeof rows)[number]["source"]>[] }>();
  for (const r of rows) {
    const entry = byVenue.get(r.venue.id) ?? { venue: r.venue, sources: [] };
    if (r.source) entry.sources.push(r.source);
    byVenue.set(r.venue.id, entry);
  }

  for (const { venue, sources } of byVenue.values()) {
    const g = sources.find((s) => s.source === "google");
    if (g && process.env.GOOGLE_PLACES_API_KEY) {
      const d = await google.placeDetails(g.externalId);
      await db
        .update(venueSources)
        .set({ rawRating: d.rating ?? null, rawReviewCount: d.userRatingCount ?? null, fetchedAt: new Date() })
        .where(and(eq(venueSources.source, "google"), eq(venueSources.externalId, g.externalId)));
      for (const rev of d.reviews ?? []) {
        const inserted = await db.insert(reviews).values(google.toReviewRow(rev, venue.id)).onConflictDoNothing().returning({ id: reviews.id });
        newReviews += inserted.length;
      }
    }

    if (process.env.TRIPADVISOR_API_KEY) {
      let t = sources.find((s) => s.source === "tripadvisor");
      if (!t) {
        const loc = await ta.findLocation(venue.name, venue.location.y, venue.location.x, venue.vertical);
        if (!loc) continue;
        [t] = await db
          .insert(venueSources)
          .values({ venueId: venue.id, source: "tripadvisor", externalId: loc.location_id })
          .onConflictDoNothing()
          .returning();
        if (!t) continue;
      }
      const details = await ta.locationDetails(t.externalId);
      await db
        .update(venueSources)
        .set({ rawRating: details.rating ? Number(details.rating) : null, rawReviewCount: details.num_reviews ? Number(details.num_reviews) : null, url: details.web_url ?? null, fetchedAt: new Date() })
        .where(and(eq(venueSources.source, "tripadvisor"), eq(venueSources.externalId, t.externalId)));
      for (const rev of await ta.locationReviews(t.externalId)) {
        const inserted = await db.insert(reviews).values(ta.toReviewRow(rev, venue.id)).onConflictDoNothing().returning({ id: reviews.id });
        newReviews += inserted.length;
      }
    }
  }
  return { venues: byVenue.size, newReviews };
}

/** Un user lipește un link TikTok/Instagram/Facebook la un local. */
export async function submitSocialLink(db: Db, input: { venueId: string; url: string; userId: string | null }) {
  const platform = detectPlatform(input.url);
  if (!platform) throw new Error("Linkul trebuie să fie de pe TikTok, Instagram, Facebook sau YouTube.");
  const [row] = await db
    .insert(socialSubmissions)
    .values({ venueId: input.venueId, submittedBy: input.userId, platform, url: input.url })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

/** Jobul `proceseaza-linkuri`: embed + eticheta „reclamă?”. */
export async function processSubmission(db: Db, submissionId: string) {
  const [s] = await db.select().from(socialSubmissions).where(eq(socialSubmissions.id, submissionId));
  if (!s) throw new Error(`Linkul ${submissionId} nu există.`);
  const [v] = await db.select({ vertical: venues.vertical }).from(venues).where(eq(venues.id, s.venueId));
  try {
    const analysis = await analyzeSocial(s.url, s.platform, v?.vertical ?? "food");
    await db.update(socialSubmissions).set({ status: "processed", analysis }).where(eq(socialSubmissions.id, s.id));
    return analysis;
  } catch (error) {
    await db.update(socialSubmissions).set({ status: "failed", analysis: { error: String(error) } }).where(eq(socialSubmissions.id, s.id));
    throw error;
  }
}
