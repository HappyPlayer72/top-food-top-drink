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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { cities, createDb, touristZones, venues } from "@tftd/db";
import { SEED_VENUES } from "./venues.ts";
import { createTestAccounts } from "./test-accounts.ts";

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

  // ---------- Locale reale (fără scor: îl calculează importul și review-urile) ----------
  for (const v of SEED_VENUES) {
    await db.insert(venues).values({
      citySlug: CITY, vertical: v.vertical, name: v.name, slug: v.slug, categories: v.categories,
      location: { x: v.lng, y: v.lat }, address: v.address, neighborhood: v.neighborhood,
      photos: v.photos ?? [],
      priceMinLei: v.priceMinLei ?? null, priceMaxLei: v.priceMaxLei ?? null, drinkPrices: v.drinkPrices ?? null,
    });
  }

  // ---------- Conturile de test (doar pe baza locală) ----------
  await createTestAccounts();

  console.log(`Gata: ${SEED_VENUES.length} locale reale, 0 review-uri. Review-urile vin din „npm run import:real” și de pe site.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
