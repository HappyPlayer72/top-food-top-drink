/**
 * Încarcă în DB doar date reale: orașul din config (zone turistice, cartiere, prețuri de referință)
 * și cele 30 de locale reale din Timișoara (seed/venues.ts). Fără useri, review-uri sau scoruri inventate.
 *
 *   npm run db:up && npm run db:migrate && npm run seed
 *   npm run seed -- --reset      # șterge TOATE datele și reîncarcă (doar pe o bază locală)
 *
 * Review-urile, ratingurile și programul vin apoi din Google Places (`npm run import:real`; Tripadvisor nu, n-are variantă gratuită)
 * și din review-urile scrise de oameni pe site. Pentru teste: conturile din `seed/test-accounts.ts`, create la final.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { cities, createDb, reviews, touristZones, venueSources, venues, type Db, type OpeningHours } from "@tftd/db";
import { analyzeVenueReviews } from "@tftd/review-analysis";
import { recalculateCity } from "@tftd/scoring";
import { SEED_VENUES } from "./venues.ts";
import { createTestAccounts } from "./test-accounts.ts";
import type { GoogleSnapshot, SnapshotVenue } from "./export-google.ts";

const SNAPSHOT = join(import.meta.dirname, "data", "google-snapshot.json");
function loadSnapshot(): GoogleSnapshot | null {
  return existsSync(SNAPSHOT) ? (JSON.parse(readFileSync(SNAPSHOT, "utf8")) as GoogleSnapshot) : null;
}

/** Sursa Google și review-urile unui local, din snapshot. */
async function loadGoogle(db: Db, venueId: string, s: SnapshotVenue) {
  if (s.google) {
    await db.insert(venueSources).values({ venueId, source: "google", externalId: s.google.placeId, rawRating: s.google.rating, rawReviewCount: s.google.reviewCount, url: s.google.url, fetchedAt: new Date() }).onConflictDoNothing();
  }
  if (s.reviews.length) {
    await db.insert(reviews).values(
      s.reviews.map((r) => ({
        venueId, source: "google" as const, externalId: r.externalId, externalAuthor: r.author ?? { name: "Anonim" },
        rating: r.rating, originalRating: r.originalRating ?? r.rating / 2, originalScale: r.originalScale ?? 5,
        text: r.text, language: r.language, postedAt: new Date(r.postedAt),
      })),
    ).onConflictDoNothing();
  }
}

const CITY = "timisoara";

type CityConfig = {
  name: string;
  slug: string;
  touristZones: { name: string; lat: number; lng: number; radiusM: number }[];
  neighborhoods: string[];
  localAveragePrices: { food: Record<string, number>; drink: { beer05l: number | null; cocktail: number | null } };
};

/** --reset șterge tot: permis doar pe o bază de pe laptop, niciodată pe cea online. */
function assertLocalDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL lipsește. Copiază .env.example în .env.");
  const host = new URL(url).hostname;
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error("--reset șterge toate datele, deci merge doar pe o bază locală. Pe baza online rulează fără --reset.");
  }
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) assertLocalDb();
  const db = createDb();

  const [{ n }] = (await db.execute(sql`select count(*)::int as n from venues`)) as unknown as [{ n: number }];
  if (n > 0 && !reset) {
    console.log(`DB-ul are deja ${n} locale. Rulează „npm run seed -- --reset” ca să le ștergi și să reîncarci.`);
    process.exit(0);
  }
  if (reset) {
    await db.execute(sql`TRUNCATE cities, users RESTART IDENTITY CASCADE`);
    console.log("Am șters toate datele.");
  }

  // ---------- Oraș ----------
  const config = JSON.parse(readFileSync(join(import.meta.dirname, "..", "config", "cities", `${CITY}.json`), "utf8")) as CityConfig;
  await db.insert(cities).values({
    slug: config.slug,
    name: config.name,
    neighborhoods: config.neighborhoods,
    localAveragePrices: config.localAveragePrices,
  });
  await db.insert(touristZones).values(
    config.touristZones.map((z) => ({ citySlug: CITY, name: z.name, location: { x: z.lng, y: z.lat }, radiusM: z.radiusM })),
  );

  // ---------- Locale reale ----------
  // Snapshot-ul Google (seed/data/google-snapshot.json) are localurile aduse din Google Places, cu program,
  // telefon, coordonate corecte și review-uri. Cele 30 din seed/venues.ts își păstrează pozele, prețurile și cartierul.
  const snapshot = loadSnapshot();
  const bySlug = new Map((snapshot?.venues ?? []).map((v) => [`${v.vertical}/${v.slug}`, v]));
  const venueIds: string[] = [];
  const insertVenue = async (row: typeof venues.$inferInsert) => {
    const [r] = await db.insert(venues).values(row).returning({ id: venues.id });
    venueIds.push(r!.id);
    return r!.id;
  };
  const seeded = new Set<string>();
  for (const v of SEED_VENUES) {
    const s = bySlug.get(`${v.vertical}/${v.slug}`);
    seeded.add(`${v.vertical}/${v.slug}`);
    const id = await insertVenue({
      citySlug: CITY, vertical: v.vertical, name: v.name, slug: v.slug, categories: v.categories,
      location: s ? { x: s.lng, y: s.lat } : { x: v.lng, y: v.lat }, address: v.address, neighborhood: v.neighborhood,
      photos: v.photos ?? [],
      priceMinLei: v.priceMinLei ?? null, priceMaxLei: v.priceMaxLei ?? null, drinkPrices: v.drinkPrices ?? null,
      phone: s?.phone ?? null, website: s?.website ?? null, openingHours: (s?.openingHours as OpeningHours | null) ?? null,
    });
    if (s) await loadGoogle(db, id, s);
  }
  for (const s of snapshot?.venues ?? []) {
    if (seeded.has(`${s.vertical}/${s.slug}`)) continue;
    const id = await insertVenue({
      citySlug: CITY, vertical: s.vertical, name: s.name, slug: s.slug, categories: s.categories,
      location: { x: s.lng, y: s.lat }, address: s.address, neighborhood: s.neighborhood,
      phone: s.phone, website: s.website, priceLevel: s.priceLevel, openingHours: (s.openingHours as OpeningHours | null) ?? null,
    });
    await loadGoogle(db, id, s);
  }

  // ---------- Analiza review-urilor și scorurile (local, fără Google și fără Claude) ----------
  if (snapshot) {
    const now = new Date();
    for (const id of venueIds) await analyzeVenueReviews(db, id, { client: null, now });
    for (const vertical of ["food", "drink"] as const) await recalculateCity(db, CITY, vertical, now);
  }

  // ---------- Conturile de test (doar pe baza locală) ----------
  await createTestAccounts();

  const reviewCount = (snapshot?.venues ?? []).reduce((n, v) => n + v.reviews.length, 0);
  console.log(
    snapshot
      ? `Gata: ${venueIds.length} locale reale și ${reviewCount} review-uri Google din snapshot (${snapshot.exportedAt.slice(0, 10)}), fără niciun apel Google.`
      : `Gata: ${venueIds.length} locale reale, 0 review-uri (lipsește seed/data/google-snapshot.json).`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
