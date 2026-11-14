/**
 * Încarcă datele de demo în DB: orașul din config, 30 de locale reale din Timișoara, useri, review-uri,
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
import { randomBytes } from "node:crypto";
import {
  checkins, cities, createDb, employees, localVerifications, loyaltyPrograms, menuItems, partnerships, posts, reviewVotes, reviews, touristZones,
  userSocialLinks, users, venueManagers, venues, vibeChecks, type OpeningHours,
} from "@tftd/db";
import { hashPassword } from "@tftd/accounts";
import { analyzeVenueReviews } from "@tftd/review-analysis";
import { recalculateCity } from "@tftd/scoring";
import { freezeMonth, lastMonth } from "@tftd/leaderboard";
import { generate } from "./generate.ts";
import { SEED_VENUES } from "./venues.ts";
import { seedFeatureDemo } from "./demo-features.ts";

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
  // Conturile demo de pe ecranul de login (parola DEMO_PASSWORD, implicit „demo1234”)
  const demoHash = await hashPassword(process.env.DEMO_PASSWORD ?? "demo1234");
  await db.update(users).set({ email: "andreea@e-uvt.ro", passwordHash: demoHash, localNeighborhood: "Iosefin" }).where(sql`${users.id} = ${userIds.get("u0")!}`);
  const [luca] = await db
    .insert(users)
    .values({ username: "luca.t", displayName: "Luca T.", email: "luca@visit.ro", passwordHash: demoHash, roles: ["user"] })
    .returning({ id: users.id });
  userIds.set("luca", luca!.id);
  await db.insert(users).values({ username: "admin", displayName: "Admin topfood", email: "admin@topfood.ro", passwordHash: demoHash, roles: ["user", "admin"] });
  await db.update(users).set({ passwordHash: demoHash }).where(sql`${users.id} = ${userIds.get("owner-sandu")!}`);

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
        photos: v.photos ?? [],
        priceMinLei: v.priceMinLei ?? null, priceMaxLei: v.priceMaxLei ?? null, drinkPrices: v.drinkPrices ?? null,
      })
      .returning({ id: venues.id });
    venueIds.set(v.slug, row!.id);
  }

  // ---------- Owner, angajați, blog, evenimente ----------
  const nora = venueIds.get("restaurant-nora")!;
  const ownerId = userIds.get("owner-sandu")!;
  await db.insert(venueManagers).values({ venueId: nora, userId: ownerId, role: "owner" });
  const staff = await db
    .insert(employees)
    .values([
      { venueId: nora, firstName: "Ioana", role: "ospătar", accepted: true },
      { venueId: nora, firstName: "Sandu", role: "bucătar-șef", accepted: true, userId: ownerId },
      { venueId: nora, firstName: "Mihai", role: "bucătar", accepted: true },
    ])
    .returning({ id: employees.id, firstName: employees.firstName });
  const employeeIds = new Map(staff.map((s) => [s.firstName, s.id]));
  await db.insert(posts).values({
    venueId: nora, authorId: ownerId, type: "news",
    title: "De ce fierbem ciorba de burtă de la zero în fiecare dimineață",
    body: "Stocul de oase fierbe șase ore la foc mic. Când se termină oala de prânz, nu completăm din congelator.",
    photos: ["https://restaurantnora.ro/wp-content/uploads/2024/03/Sarmalute.webp"],
    publishAt: new Date(now.getTime() - 3 * DAY),
  });
  // Evenimentele cad mereu în weekendul curent sau următor, după ora de acum (pagina ascunde ce a trecut)
  const day0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const fri = new Date(day0.getTime() + ((5 - now.getUTCDay() + 7) % 7) * DAY - (now.getUTCDay() === 6 ? DAY : now.getUTCDay() === 0 ? 2 * DAY : 0));
  const upcoming = (d: Date, fallbackHours: number) => (d > now ? d : new Date(now.getTime() + fallbackHours * 3_600_000));
  const bluesAt = upcoming(new Date(fri.getTime() + 19 * 3_600_000), 1); // vineri 21:00 ora României
  const vinylAt = upcoming(new Date(fri.getTime() + DAY + 21 * 3_600_000), 2); // sâmbătă 23:00
  await db.insert(posts).values([
    { venueId: venueIds.get("scart-loc-lejer")!, authorId: ownerId, type: "event", title: "Concert de blues", body: "De la 21:00. Intrare liberă.", eventAt: bluesAt },
    { venueId: venueIds.get("the-80s-pub")!, authorId: ownerId, type: "event", title: "Noaptea de vinil", body: "De la 23:00. 30 lei.", eventAt: vinylAt },
  ]);

  // ---------- Program, meniu, prezentare ----------
  const foodHours: OpeningHours = { mon: [["11:00", "22:00"]], tue: [["11:00", "22:00"]], wed: [["11:00", "22:00"]], thu: [["11:00", "22:00"]], fri: [["11:00", "23:00"]], sat: [["12:00", "23:00"]], sun: [["12:00", "20:00"]] };
  const barHours: OpeningHours = { tue: [["17:00", "00:00"]], wed: [["17:00", "00:00"]], thu: [["17:00", "02:00"]], fri: [["17:00", "04:00"]], sat: [["18:00", "04:00"]] };
  for (const v of SEED_VENUES) {
    await db.update(venues).set({ openingHours: v.vertical === "food" ? foodHours : barHours }).where(sql`${venues.id} = ${venueIds.get(v.slug)!}`);
  }
  await db.update(venues).set({
    editorialHeadline: "Mâncare românească gătită cinstit, pentru care vin localnicii din tot orașul",
    editorialWriteup: [
      "Restaurant de cartier pe Bd. Dâmbovița cu bucătărie bănățeană clasică, porții generoase și clienți fideli de ani de zile.",
      "Ciorba de burtă și micii la grătar sunt vedetele casei; la prânz e aglomerat, merită rezervat sau comandat prin livrare.",
    ],
    occasionTags: ["prânz rapid", "cu familia", "livrare proprie"],
  }).where(sql`${venues.id} = ${nora}`);
  await db.insert(menuItems).values([
    { venueId: nora, name: "Ciorbă de burtă", priceLei: 26, description: "Cu smântână și ardei iute", mustOrder: true, position: 0 },
    { venueId: nora, name: "Mici de casă (4 buc.)", priceLei: 28, description: "La grătar cu muștar și chiflă", mustOrder: true, position: 1 },
    { venueId: nora, name: "Papanași cu dulceață de afine", priceLei: 24, position: 2 },
  ]);
  await db.update(venues).set({ drinkTags: ["muzica-live"] }).where(sql`${venues.slug} in ('manufactura-pub', 'scart-loc-lejer')`);

  // ---------- Fidelitate ----------
  await db.insert(loyaltyPrograms).values([
    { venueId: nora, createdBy: ownerId, rewardTitle: "O ciorbă din partea casei", stampsRequired: 6, icon: "soup", accentColor: "#0B7A53", stampSecret: randomBytes(32).toString("base64url") },
    { venueId: venueIds.get("scart-loc-lejer")!, createdBy: ownerId, rewardTitle: "A cincea bere e gratis", stampsRequired: 5, icon: "beer", accentColor: "#F2A33A", stampSecret: randomBytes(32).toString("base64url") },
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
      verifiedVia: r.verifiedVisit ? ("gps" as const) : null,
      servedByEmployeeId: r.servedBy ? (employeeIds.get(r.servedBy) ?? null) : null,
    })),
  );
  await db
    .insert(checkins)
    .values(data.checkins.map((c) => ({ userId: userIds.get(c.userKey)!, citySlug: CITY, venueId: c.venueSlug ? venueIds.get(c.venueSlug)! : null, day: c.day })))
    .onConflictDoNothing();

  // ---------- Voturi „util”: localnicii votează review-urile lungi ale altor localnici ----------
  const nativeReviews = await db.select({ id: reviews.id, authorId: reviews.authorId, text: reviews.text }).from(reviews).where(sql`${reviews.authorId} is not null`);
  const voters = [...userIds.entries()].filter(([k]) => k.startsWith("u")).map(([, id]) => id);
  const votes = nativeReviews
    .filter((r) => (r.text?.length ?? 0) > 60)
    .flatMap((r, i) => voters.slice(i % 7, (i % 7) + (i % 5) + 1).filter((v) => v !== r.authorId).map((userId) => ({ reviewId: r.id, userId })));
  if (votes.length) await db.insert(reviewVotes).values(votes).onConflictDoNothing();

  // ---------- Sponsorizat (NU influențează scorul) și vibe check ----------
  await db.insert(partnerships).values([
    { venueId: venueIds.get("vinto-gastro-wine-bar")!, plan: "highlight", startsAt: new Date(now.getTime() - 10 * DAY), endsAt: new Date(now.getTime() + 20 * DAY), paymentStatus: "paid" },
    { venueId: venueIds.get("darc-pe-mal")!, plan: "highlight", startsAt: new Date(now.getTime() - 10 * DAY), endsAt: new Date(now.getTime() + 20 * DAY), paymentStatus: "paid" },
  ]);
  const vibes: [string, number, number][] = [["scart-loc-lejer", 4, 12], ["aethernativ-cafe", 2, 30], ["the-80s-pub", 5, 5]];
  await db.insert(vibeChecks).values(
    vibes.map(([slug, level, minAgo]) => ({
      venueId: venueIds.get(slug)!, level,
      createdAt: new Date(now.getTime() - minAgo * 60_000),
      expiresAt: new Date(now.getTime() - minAgo * 60_000 + 2 * 3_600_000),
    })),
  );

  // ---------- DATE DEMO: răspunsuri, facilități declarate, voturi rapide (seed/demo-features.ts) ----------
  await seedFeatureDemo(db);

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
