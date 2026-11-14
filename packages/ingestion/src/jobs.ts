/** Joburile de ingestie: descoperă locale, actualizează ratinguri/review-uri, procesează linkuri trimise. */
import { and, eq, gt, ne, notExists, sql } from "drizzle-orm";
import { socialSubmissions, reviews, touristZones, venueManagers, venueSources, venues, type Db } from "@tftd/db";
import { attachSource, haversineM, linkExternalPlace, nameSimilarity } from "@tftd/matching";
import * as google from "./google.ts";
import * as ta from "./tripadvisor.ts";
import { analyzeSocial, detectPlatform, type SocialAnalysis } from "./social.ts";
import { searchSocialForVenue } from "./social-search.ts";
import { adSignals } from "@tftd/review-analysis";

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

/**
 * Cât de departe acceptăm rezultatul căutării țintite, după cât de mult seamănă numele.
 * Coordonatele din seed pot fi greșite cu sute de metri, deci un nume identic e acceptat mai departe.
 */
export const KNOWN_VENUE_RULES = [
  { minSim: 0.99, maxM: 1500 },
  { minSim: 0.95, maxM: 600 },
  { minSim: 0.75, maxM: 300 },
] as const;
export const acceptKnown = (sim: number, distM: number) => KNOWN_VENUE_RULES.some((r) => sim >= r.minSim && distM <= r.maxM);

/**
 * Un local creat de import (fără owner, fără review-uri scrise pe site) e de fapt unul de-al nostru:
 * îi mutăm sursa și review-urile Google la localul nostru și îl ștergem. Altfel nu atingem nimic.
 */
async function mergeImportedDuplicate(db: Db, duplicateId: string, intoId: string) {
  const [managed] = await db.select({ x: sql`1` }).from(venueManagers).where(eq(venueManagers.venueId, duplicateId)).limit(1);
  const [native] = await db.select({ x: sql`1` }).from(reviews).where(and(eq(reviews.venueId, duplicateId), ne(reviews.source, "google"))).limit(1);
  if (managed || native) return false;
  await db.update(reviews).set({ venueId: intoId }).where(eq(reviews.venueId, duplicateId));
  await db.update(venueSources).set({ venueId: intoId }).where(eq(venueSources.venueId, duplicateId));
  await db.delete(venues).where(eq(venues.id, duplicateId));
  return true;
}

/**
 * Localurile noastre fără fișă Google (ex. cele din seed): o căutare țintită după nume, lângă coordonatele lor.
 * Se leagă după KNOWN_VENUE_RULES; dacă importul a creat deja o copie, copia se unește cu localul nostru.
 * Când locul Google e la peste 150 m, preluăm coordonatele Google (cele din seed erau aproximative).
 */
export async function linkKnownVenues(db: Db, citySlug: string) {
  const unlinked = await db
    .select({ id: venues.id, name: venues.name, vertical: venues.vertical, location: venues.location })
    .from(venues)
    .where(
      and(
        eq(venues.citySlug, citySlug),
        notExists(db.select({ x: sql`1` }).from(venueSources).where(and(eq(venueSources.venueId, venues.id), eq(venueSources.source, "google")))),
      ),
    );
  const outcome = { linked: 0, merged: 0, notFound: 0 };
  for (const v of unlinked) {
    const here = { lat: v.location.y, lng: v.location.x };
    const { places } = await google.searchText(`${v.name} Timișoara`, here, 500);
    const best = places
      .filter((p) => p.location && p.id && p.primaryType !== "route")
      .map((p) => ({ p, sim: nameSimilarity(v.name, p.displayName?.text ?? ""), dist: haversineM(here, { lat: p.location!.latitude, lng: p.location!.longitude }) }))
      .filter((x) => acceptKnown(x.sim, x.dist))
      .sort((a, b) => b.sim - a.sim || a.dist - b.dist)[0];
    if (!best) {
      outcome.notFound++;
      continue;
    }
    const [taken] = await db.select({ id: venueSources.venueId }).from(venueSources).where(and(eq(venueSources.source, "google"), eq(venueSources.externalId, best.p.id)));
    if (taken && !(await mergeImportedDuplicate(db, taken.id, v.id))) {
      outcome.notFound++;
      continue;
    }
    if (taken) outcome.merged++;
    await attachSource(db, v.id, google.toExternalPlace(best.p, citySlug, v.vertical));
    if (best.dist > 150) {
      await db.update(venues).set({ location: { x: best.p.location!.longitude, y: best.p.location!.latitude } }).where(eq(venues.id, v.id));
    }
    outcome.linked++;
  }
  return outcome;
}

/**
 * Jobul `actualizeaza-ratinguri` (zilnic): rating brut + review-uri noi de pe Google (și Tripadvisor, dacă are cheie).
 * `skipFreshHours`: sare localurile care au primit review-uri Google în ultimele N ore (import incremental, mai puține cereri).
 */
export async function refreshCity(db: Db, citySlug: string, opts: { skipFreshHours?: number } = {}) {
  const fresh = new Set<string>();
  if (opts.skipFreshHours) {
    const since = new Date(Date.now() - opts.skipFreshHours * 3_600_000);
    const rows = await db.selectDistinct({ id: reviews.venueId }).from(reviews).where(and(eq(reviews.source, "google"), gt(reviews.createdAt, since)));
    for (const r of rows) fresh.add(r.id);
  }
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
    if (g && process.env.GOOGLE_PLACES_API_KEY && !fresh.has(venue.id)) {
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

/**
 * Jobul `cauta-social`: pentru fiecare local necăutat în ultimele `staleDays` zile, caută postări pe social media
 * (social-search.ts, doar API-uri oficiale), le salvează ca linkuri găsite automat și le analizează ca pe cele trimise de useri.
 * Instagram/Facebook fără token Meta nu au embed: rămân ca link simplu, cu titlul din căutare.
 */
export async function discoverSocialLinks(db: Db, citySlug: string, opts: { staleDays?: number; maxVenues?: number } = {}) {
  const since = new Date(Date.now() - (opts.staleDays ?? 7) * 86_400_000);
  const todo = await db
    .select({ id: venues.id, name: venues.name, vertical: venues.vertical })
    .from(venues)
    .where(and(eq(venues.citySlug, citySlug), eq(venues.status, "active"), sql`(${venues.socialSearchedAt} is null or ${venues.socialSearchedAt} < ${since})`))
    .orderBy(sql`${venues.honestScore} desc nulls last`)
    .limit(opts.maxVenues ?? 1000);
  const outcome = { venues: 0, links: 0, errors: [] as string[] };
  for (const v of todo) {
    const { links, errors } = await searchSocialForVenue(v.name);
    outcome.errors.push(...errors.map((e) => `${v.name}: ${e}`));
    for (const l of links) {
      const [row] = await db
        .insert(socialSubmissions)
        .values({ venueId: v.id, platform: l.platform, url: l.url, discoveredVia: l.via, title: l.title.slice(0, 300), status: "pending" })
        .onConflictDoNothing()
        .returning({ id: socialSubmissions.id });
      if (!row) continue;
      try {
        await processSubmission(db, row.id);
      } catch {
        // fără embed (ex. Instagram fără token Meta): îl arătăm ca link, cu analiza făcută pe titlul din căutare
        const signals = adSignals(l.title);
        const price = l.title.match(/(\d{1,4})\s*(lei|ron)\b/i);
        const analysis: SocialAnalysis = {
          embed: { html: null, title: l.title, authorName: null, thumbnailUrl: null },
          isAd: signals.length > 0, adSignals: signals, sentiment: null, aspects: {}, dishes: [], priceMentioned: price ? Number(price[1]) : null,
        };
        await db.update(socialSubmissions).set({ status: "processed", analysis }).where(eq(socialSubmissions.id, row.id));
      }
      outcome.links++;
    }
    await db.update(venues).set({ socialSearchedAt: new Date() }).where(eq(venues.id, v.id));
    outcome.venues++;
  }
  return { ...outcome, errors: [...new Set(outcome.errors.map((e) => e.replace(/^[^:]+: /, "")))].slice(0, 5) };
}
