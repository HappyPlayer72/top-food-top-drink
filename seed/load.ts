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
import { desc, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import {
  checkins, cities, createDb, employees, localVerifications, loyaltyPrograms, menuItems, partnerships, posts, reviewAnswers, reviewVotes, reviews, touristZones,
  userSocialLinks, users, venueFacilityDeclarations, venueManagers, venues, vibeChecks, type OpeningHours,
} from "@tftd/db";
import { hashPassword } from "@tftd/accounts";
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
  // Evenimentele cad mereu în weekendul curent sau următor, după ora de acum (pagina ascunde ce a trecut)
  const day0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const fri = new Date(day0.getTime() + ((5 - now.getUTCDay() + 7) % 7) * DAY - (now.getUTCDay() === 6 ? DAY : now.getUTCDay() === 0 ? 2 * DAY : 0));
  const upcoming = (d: Date, fallbackHours: number) => (d > now ? d : new Date(now.getTime() + fallbackHours * 3_600_000));
  const bluesAt = upcoming(new Date(fri.getTime() + 19 * 3_600_000), 1); // vineri 21:00 ora României
  const vinylAt = upcoming(new Date(fri.getTime() + DAY + 21 * 3_600_000), 2); // sâmbătă 23:00
  await db.insert(posts).values([
    { venueId: venueIds.get("pivnita-cu-bolta")!, authorId: ownerId, type: "event", title: "Concert de blues", body: "De la 21:00. Intrare liberă.", eventAt: bluesAt },
    { venueId: venueIds.get("depoul-de-tramvaie")!, authorId: ownerId, type: "event", title: "Noaptea de vinil", body: "De la 23:00. 30 lei.", eventAt: vinylAt },
  ]);

  // ---------- Program, meniu, prezentare ----------
  const foodHours: OpeningHours = { mon: [["11:00", "22:00"]], tue: [["11:00", "22:00"]], wed: [["11:00", "22:00"]], thu: [["11:00", "22:00"]], fri: [["11:00", "23:00"]], sat: [["12:00", "23:00"]], sun: [["12:00", "20:00"]] };
  const barHours: OpeningHours = { tue: [["17:00", "00:00"]], wed: [["17:00", "00:00"]], thu: [["17:00", "02:00"]], fri: [["17:00", "04:00"]], sat: [["18:00", "04:00"]] };
  for (const v of SEED_VENUES) {
    await db.update(venues).set({ openingHours: v.vertical === "food" ? foodHours : barHours }).where(sql`${venues.id} = ${venueIds.get(v.slug)!}`);
  }
  await db.update(venues).set({
    editorialHeadline: "Ciorba de burtă pentru care vin localnicii din tot Iosefinul",
    editorialWriteup: [
      "Local de cartier deschis de Sandu acum opt ani. Meniul e scurt și se schimbă după piață.",
      "Ciorba de burtă se face doar marțea și vinerea, de la zero. La prânz e plin, sună înainte.",
    ],
    occasionTags: ["prânz rapid", "cu familia", "buget mic"],
  }).where(sql`${venues.id} = ${sandu}`);
  await db.insert(menuItems).values([
    { venueId: sandu, name: "Ciorbă de burtă", priceLei: 24, description: "Doar marțea și vinerea", mustOrder: true, position: 0 },
    { venueId: sandu, name: "Sarmale cu mămăligă", priceLei: 32, mustOrder: true, position: 1 },
    { venueId: sandu, name: "Papanași", priceLei: 18, position: 2 },
  ]);
  await db.update(venues).set({ drinkTags: ["muzica-live"] }).where(sql`${venues.slug} in ('jazz-in-pivnita', 'pivnita-cu-bolta')`);

  // ---------- Fidelitate ----------
  await db.insert(loyaltyPrograms).values([
    { venueId: sandu, createdBy: ownerId, rewardTitle: "O ciorbă din partea casei", stampsRequired: 6, icon: "soup", accentColor: "#0B7A53", stampSecret: randomBytes(32).toString("base64url") },
    { venueId: venueIds.get("pivnita-cu-bolta")!, createdBy: ownerId, rewardTitle: "A cincea bere e gratis", stampsRequired: 5, icon: "beer", accentColor: "#F2A33A", stampSecret: randomBytes(32).toString("base64url") },
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

  // ---------- Voturi „util”: localnicii votează review-urile lungi ale altor localnici ----------
  const nativeReviews = await db.select({ id: reviews.id, authorId: reviews.authorId, text: reviews.text }).from(reviews).where(sql`${reviews.authorId} is not null`);
  const voters = [...userIds.entries()].filter(([k]) => k.startsWith("u")).map(([, id]) => id);
  const votes = nativeReviews
    .filter((r) => (r.text?.length ?? 0) > 60)
    .flatMap((r, i) => voters.slice(i % 7, (i % 7) + (i % 5) + 1).filter((v) => v !== r.authorId).map((userId) => ({ reviewId: r.id, userId })));
  if (votes.length) await db.insert(reviewVotes).values(votes).onConflictDoNothing();

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

  // ---------- DATE DEMO: răspunsuri la întrebările din review + facilități declarate ----------
  // Inventate pentru demonstrație (prezentare / teste), nu vin de la clienți reali.
  // Răspunsurile se atașează review-urilor native deja generate: [Da, Nu, Nu am observat].
  const DEMO_ANSWERS: Record<string, Record<string, [number, number, number?]>> = {
    "ciorba-lui-sandu": { intrare_fara_trepte: [7, 1, 2], toaleta_accesibila: [2, 4], spatiu_intre_mese: [5, 1] },
    "cafe-domului": { wifi: [9, 1], prize: [6, 1], liniste: [6, 2], intrare_fara_trepte: [5, 0] },
    "verde-pe-farfurie": { intrare_fara_trepte: [6, 0], toaleta_accesibila: [5, 1], spatiu_intre_mese: [4, 1], wifi: [3, 0] },
    "bistro-bega": { intrare_fara_trepte: [3, 0] }, // sub prag: rămâne „Declarat de local” (și e sponsorizat — nu urcă)
    "pizzeria-din-fabric": { wifi: [1, 5, 1] }, // contrazice declarația owner-ului
    "cafeneaua-de-noapte": { wifi: [6, 1], prize: [5, 2], intrare_fara_trepte: [2, 3] },
    "terasa-de-pe-bega": { intrare_fara_trepte: [6, 0], spatiu_intre_mese: [5, 0], atmosfera: [5, 3], siguranta: [6, 1] },
    // Ieșiri (etapa 2): experiența personală raportată de clienți; owner-ii nu o pot declara.
    "pivnita-cu-bolta": { intrare_fara_trepte: [0, 6], toaleta_accesibila: [0, 5], atmosfera: [9, 1], siguranta: [8, 1], revin_cu_prietenii: [7, 2] },
    "depoul-de-tramvaie": { atmosfera: [6, 2], siguranta: [3, 4, 1], revin_cu_prietenii: [5, 2] },
    "studio-19": { siguranta: [2, 1] }, // sub prag: „Nespecificat”
  };
  const DEMO_DECLARATIONS: Record<string, Record<string, "yes" | "no">> = {
    "ciorba-lui-sandu": { intrare_fara_trepte: "yes", toaleta_accesibila: "yes", wifi: "no" },
    "bistro-bega": { intrare_fara_trepte: "yes", toaleta_accesibila: "yes", wifi: "yes", prize: "yes" },
    "placintaria-elisabetin": { wifi: "yes" },
    "pizzeria-din-fabric": { wifi: "yes" },
    "jazz-in-pivnita": { intrare_fara_trepte: "yes" },
  };
  for (const [slug, questions] of Object.entries(DEMO_ANSWERS)) {
    const native = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(sql`${reviews.venueId} = ${venueIds.get(slug)!} and ${reviews.authorId} is not null`)
      .orderBy(desc(reviews.postedAt));
    const rows = Object.entries(questions).flatMap(([questionKey, [yes, no, notObserved = 0]]) =>
      [...Array(yes).fill("yes"), ...Array(no).fill("no"), ...Array(notObserved).fill("not_observed")].map((answer, i) => ({
        reviewId: native[i]!.id,
        questionKey,
        answer: answer as "yes" | "no" | "not_observed",
      })),
    );
    await db.insert(reviewAnswers).values(rows);
  }
  await db.insert(venueFacilityDeclarations).values(
    Object.entries(DEMO_DECLARATIONS).flatMap(([slug, decl]) =>
      // Doar Sandu are owner în seed; la celelalte declarația demo nu are autor.
      Object.entries(decl).map(([questionKey, value]) => ({ venueId: venueIds.get(slug)!, questionKey, value, updatedBy: slug === "ciorba-lui-sandu" ? ownerId : null })),
    ),
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
