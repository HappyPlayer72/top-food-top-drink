/**
 * Încarcă datele de demo în DB: orașul din config, 30 de locale inventate, useri, review-uri,
 * apoi rulează analiza, scorurile și topul lunii trecute.
 *
 *   npm run db:up && npm run db:migrate && npm run seed
 *   npm run seed -- --reset      # șterge TOATE datele și reîncarcă
 *
 * Fără SEED_USE_CLAUDE=1, aspectele se calculează cu dicționarul local (fără costuri API).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import {
  checkins, cities, createDb, employees, localVerifications, partnerships, posts, reviews, touristZones, userSocialLinks, users,
  venueManagers, venues, vibeChecks,
} from "@tftd/db";
import { analyzeVenueReviews } from "@tftd/review-analysis";
import { recalculateCity } from "@tftd/scoring";
import { freezeMonth, lastMonth } from "@tftd/leaderboard";
import { generate } from "./generate.ts";
import { SEED_VENUES } from "./venues.ts";

const CITY = "timisoara";
const DAY = 86_400_000;

type CityConfig = {
  name: string;
  slug: string;
  touristZones: { name: string; lat: number; lng: number; radiusM: number }[];
  neighborhoods: string[];
  localAveragePrices: { food: Record<string, number>; drink: { beer05l: number | null; cocktail: number | null } };
};

async function main() {
  const db = createDb();
  const now = new Date();
  const reset = process.argv.includes("--reset");

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

  // ---------- Useri ----------
  const data = generate(SEED_VENUES, now);
  const userIds = new Map<string, string>();
  for (const u of data.users) {
    const isLocal = !!u.localNeighborhood;
    const [row] = await db
      .insert(users)
      .values({
        username: u.username,
        displayName: u.displayName,
        roles: u.roles,
        localCitySlug: isLocal ? CITY : null,
        localNeighborhood: u.localNeighborhood,
        localUntil: isLocal ? new Date(now.getTime() + 365 * DAY) : null,
        followers: u.key === "influencer" ? 24_000 : null,
      })
      .returning({ id: users.id });
    userIds.set(u.key, row!.id);
    if (isLocal) {
      await db.insert(localVerifications).values({
        userId: row!.id, citySlug: CITY, method: "gps", status: "verified", evidence: { days: 6 }, verifiedAt: now,
        expiresAt: new Date(now.getTime() + 365 * DAY),
      });
    }
  }
  await db.insert(userSocialLinks).values({
    userId: userIds.get("influencer")!, platform: "tiktok", url: "https://www.tiktok.com/@exemplu", verified: true, followers: 24_000,
  });

  // ---------- Locale ----------
  const venueIds = new Map<string, string>();
  for (const v of SEED_VENUES) {
    const [row] = await db
      .insert(venues)
      .values({
        citySlug: CITY, vertical: v.vertical, name: v.name, slug: v.slug, categories: v.categories,
        location: { x: v.lng, y: v.lat }, address: v.address, neighborhood: v.neighborhood,
        priceMinLei: v.priceMinLei ?? null, priceMaxLei: v.priceMaxLei ?? null, drinkPrices: v.drinkPrices ?? null,
      })
      .returning({ id: venues.id });
    venueIds.set(v.slug, row!.id);
  }

  // ---------- Owner, angajați, blog, evenimente ----------
  const sandu = venueIds.get("ciorba-lui-sandu")!;
  const ownerId = userIds.get("owner-sandu")!;
  await db.insert(venueManagers).values({ venueId: sandu, userId: ownerId, role: "owner" });
  const staff = await db
    .insert(employees)
    .values([
      { venueId: sandu, firstName: "Ioana", role: "ospătar", accepted: true },
      { venueId: sandu, firstName: "Sandu", role: "bucătar-șef", accepted: true, userId: ownerId },
      { venueId: sandu, firstName: "Mihai", role: "bucătar", accepted: true },
    ])
    .returning({ id: employees.id, firstName: employees.firstName });
  const employeeIds = new Map(staff.map((s) => [s.firstName, s.id]));
  await db.insert(posts).values({
    venueId: sandu, authorId: ownerId, type: "news",
    title: "De ce avem ciorbă de burtă doar marțea și vinerea",
    body: "O fierbem de la zero, șase ore. Nu putem face asta zilnic, deci nu o vindem zilnic.",
    publishAt: new Date(now.getTime() - 3 * DAY),
  });
  const saturday = new Date(now.getTime() + ((6 - now.getUTCDay() + 7) % 7) * DAY);
  await db.insert(posts).values([
    { venueId: venueIds.get("pivnita-cu-bolta")!, authorId: ownerId, type: "event", title: "Concert de blues", body: "De la 21:00. Intrare liberă.", eventAt: new Date(saturday.getTime() - DAY) },
    { venueId: venueIds.get("depoul-de-tramvaie")!, authorId: ownerId, type: "event", title: "Noaptea de vinil", body: "De la 23:00. 30 lei.", eventAt: saturday },
  ]);

  // ---------- Review-uri și check-in-uri ----------
  await db.insert(reviews).values(
    data.reviews.map((r) => ({
      venueId: venueIds.get(r.venueSlug)!,
      source: r.source,
      externalId: r.externalId,
      authorId: r.authorKey ? userIds.get(r.authorKey)! : null,
      externalAuthor: r.externalAuthor,
      rating: (r.originalRating / r.originalScale) * 10,
      originalRating: r.originalRating,
      originalScale: r.originalScale,
      text: r.text,
      postedAt: r.postedAt,
      visitWeekendNight: r.visitWeekendNight,
      verifiedVisit: r.verifiedVisit,
      servedByEmployeeId: r.servedBy ? (employeeIds.get(r.servedBy) ?? null) : null,
    })),
  );
  await db
    .insert(checkins)
    .values(data.checkins.map((c) => ({ userId: userIds.get(c.userKey)!, citySlug: CITY, venueId: c.venueSlug ? venueIds.get(c.venueSlug)! : null, day: c.day })))
    .onConflictDoNothing();

  // ---------- Sponsorizat (NU influențează scorul) și vibe check ----------
  await db.insert(partnerships).values([
    { venueId: venueIds.get("bistro-bega")!, plan: "highlight", startsAt: new Date(now.getTime() - 10 * DAY), endsAt: new Date(now.getTime() + 20 * DAY), paymentStatus: "paid" },
    { venueId: venueIds.get("terasa-de-pe-bega")!, plan: "highlight", startsAt: new Date(now.getTime() - 10 * DAY), endsAt: new Date(now.getTime() + 20 * DAY), paymentStatus: "paid" },
  ]);
  const vibes: [string, number, number][] = [["pivnita-cu-bolta", 4, 12], ["bar-elisabetin", 2, 30], ["depoul-de-tramvaie", 5, 5]];
  await db.insert(vibeChecks).values(
    vibes.map(([slug, level, minAgo]) => ({
      venueId: venueIds.get(slug)!, level,
      createdAt: new Date(now.getTime() - minAgo * 60_000),
      expiresAt: new Date(now.getTime() - minAgo * 60_000 + 2 * 3_600_000),
    })),
  );

  // ---------- Analiză, scoruri, topul lunii trecute ----------
  const client = process.env.SEED_USE_CLAUDE === "1" ? undefined : null;
  for (const id of venueIds.values()) await analyzeVenueReviews(db, id, { client, now });
  for (const vertical of ["food", "drink"] as const) {
    const r = await recalculateCity(db, CITY, vertical, now);
    console.log(`${vertical}: ${r.venues} locale, media orașului ${r.cityMean}`);
    const saved = await freezeMonth(db, CITY, vertical, lastMonth(now));
    console.log(`${vertical}: topul pe ${lastMonth(now)}, ${saved.length} clasamente`);
  }

  // ---------- Rezumat ----------
  const top = await db.execute(sql`
    select vertical, name, honest_score, locals_score, tourists_score, tourist_trap_index
    from venues order by vertical, honest_score desc`);
  console.table(top);
  console.log(`Gata: ${data.users.length} useri, ${SEED_VENUES.length} locale, ${data.reviews.length} review-uri.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
