/**
 * Ce citesc paginile publice (apps/web). Fiecare funcție întoarce exact datele unei pagini.
 * Topul onest și caruselul Sponsorizat sunt calculate SEPARAT: Sponsorizatul nu schimbă ordinea topului.
 */
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import {
  cities, employees, leaderboardSnapshots, menuItems, notFound, posts, reviewReplies, reviews, socialSubmissions, userSocialLinks, users, venueSources,
  venues, vibeChecks, type Db,
} from "@tftd/db";
import { venueProgram } from "@tftd/loyalty";
import { activePartnership, sponsoredSlots } from "@tftd/monetization";
import { formatHours, openStatus } from "./hours.ts";
import { venueFeatureData, venueFeatures, venueQuickData } from "./features.ts";
import { activeThemes, featureStatus, rankTheme, themeQuestions, type Theme, type ThemeCandidate } from "@tftd/scoring/features";
import { PRIOR_WEIGHT, POSSIBLE_TRAP, TRAP } from "@tftd/scoring";

export type Vertical = "food" | "drink";
export const trapLevel = (index: number | null) => (index == null ? "none" : index >= TRAP ? "trap" : index >= POSSIBLE_TRAP ? "possible" : "none");

const card = {
  id: venues.id,
  name: venues.name,
  slug: venues.slug,
  neighborhood: venues.neighborhood,
  categories: venues.categories,
  priceMinLei: venues.priceMinLei,
  priceMaxLei: venues.priceMaxLei,
  drinkPrices: venues.drinkPrices,
  honestScore: venues.honestScore,
  localsScore: venues.localsScore,
  touristsScore: venues.touristsScore,
  touristTrapIndex: venues.touristTrapIndex,
  explanation: venues.scoreExplanation,
  aspectScores: venues.aspectScores,
  photo: sql<string | null>`${venues.photos}[1]`,
  openingHours: venues.openingHours,
  drinkTags: venues.drinkTags,
};

/** Pagina orașului: topfood/{oras}, topdrink/{oras}, plus /categorie/{cat}. */
export async function cityPage(
  db: Db,
  q: { citySlug: string; vertical: Vertical; category?: string; neighborhood?: string; maxPriceLei?: number; noTraps?: boolean; limit?: number },
  now = new Date(),
) {
  const [city] = await db.select().from(cities).where(eq(cities.slug, q.citySlug));
  if (!city) throw notFound("Orașul");

  const filters = [
    eq(venues.citySlug, q.citySlug),
    eq(venues.vertical, q.vertical),
    eq(venues.status, "active"),
    isNotNull(venues.honestScore),
    ...(q.category ? [sql`${q.category} = ANY(${venues.categories})`] : []),
    ...(q.neighborhood ? [eq(venues.neighborhood, q.neighborhood)] : []),
    ...(q.maxPriceLei ? [sql`coalesce(${venues.priceMaxLei}, (${venues.drinkPrices}->>'beer05l')::int, 0) <= ${q.maxPriceLei}`] : []),
    ...(q.noTraps ? [sql`coalesce(${venues.touristTrapIndex}, 0) < ${POSSIBLE_TRAP}`] : []),
  ];
  const top = await db.select(card).from(venues).where(and(...filters)).orderBy(desc(venues.honestScore), desc(venues.totalWeight)).limit(q.limit ?? 20);

  const traps = await db
    .select({ name: venues.name, slug: venues.slug, neighborhood: venues.neighborhood, index: venues.touristTrapIndex, explanation: venues.scoreExplanation })
    .from(venues)
    .where(and(eq(venues.citySlug, q.citySlug), eq(venues.vertical, q.vertical), gte(venues.touristTrapIndex, POSSIBLE_TRAP)))
    .orderBy(desc(venues.touristTrapIndex));

  const [{ n }] = (await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviews)
    .innerJoin(venues, eq(venues.id, reviews.venueId))
    .where(and(eq(venues.citySlug, q.citySlug), eq(venues.vertical, q.vertical), eq(reviews.status, "published")))) as [{ n: number }];

  return {
    city: { slug: city.slug, name: city.name, neighborhoods: city.neighborhoods },
    vertical: q.vertical,
    reviewCount: n,
    top: top.map((v, i) => {
      const { openingHours, ...rest } = v;
      const open = openStatus(openingHours, now);
      return { rank: i + 1, ...rest, trapLevel: trapLevel(v.touristTrapIndex), openNow: open.openNow, openLabel: open.label };
    }),
    sponsored: await sponsoredSlots(db, q.citySlug, q.vertical, now, q.category),
    // Topurile tematice se calculează separat de sponsorizări: thematicTops nu le citește.
    themes: await thematicTops(db, { citySlug: q.citySlug, vertical: q.vertical }, now),
    traps: traps.map((t) => ({ ...t, level: trapLevel(t.index), reasons: t.explanation?.trapReasons ?? [] })),
  };
}

/**
 * Topurile tematice (Accesibilitate, Locuri pentru lucru…). Două grupe separate: „Evaluat de comunitate”
 * (ordonat după limita Wilson ponderată) și „Declarat de local”. Nu citește parteneriatele (regula 1).
 */
export async function thematicTops(db: Db, q: { citySlug: string; vertical: Vertical }, now = new Date(), limit = 10) {
  const rows = await db
    .select(card)
    .from(venues)
    // Aceleași localuri ca topul general (cu Scor Onest), ca pagina să le poată deschide.
    // shortcut: web-ul încarcă primele 100 din topul general; la orașe cu > 100 localuri, încarcă și localurile din topurile tematice.
    .where(and(eq(venues.citySlug, q.citySlug), eq(venues.vertical, q.vertical), eq(venues.status, "active"), isNotNull(venues.honestScore)));
  const [data, quick] = await Promise.all([venueFeatureData(db, rows.map((r) => r.id)), venueQuickData(db, rows.map((r) => r.id))]);
  const candidates = rows.map((r) => ({ ...r, ...data.get(r.id)! }));
  const entry = (theme: Theme, v: (typeof candidates)[number] & ThemeCandidate) => {
    const { stats: _s, declarations: _d, openingHours, ...rest } = v;
    const open = openStatus(openingHours, now);
    return {
      ...rest,
      openNow: open.openNow,
      trapLevel: trapLevel(v.touristTrapIndex),
      // Doar afișat (siguranță la Ieșiri, zgomot la Lucru); ordinea vine din rankTheme.
      quick: quick.get(v.id)!,
      facts: themeQuestions(theme).map((qq) => featureStatus(qq, v.stats.get(qq.key), v.declarations.get(qq.key))),
    };
  };
  return activeThemes().map((t) => {
    const { community, declared } = rankTheme(t.key, candidates);
    return {
      theme: t.key,
      label: t.label,
      community: community.slice(0, limit).map((c, i) => ({ rank: i + 1, ...entry(t.key, c.venue) })),
      declared: declared.slice(0, limit).map((d) => entry(t.key, d.venue)),
    };
  });
}

export type ReviewFilter = "local" | "tourist" | "influencer" | "all";

/** Pagina localului: topfood/{oras}/{slug}. */
export async function venuePage(
  db: Db,
  q: { citySlug: string; vertical: Vertical; slug: string; reviews?: ReviewFilter; limit?: number },
  now = new Date(),
) {
  const [venue] = await db
    .select()
    .from(venues)
    .where(and(eq(venues.citySlug, q.citySlug), eq(venues.vertical, q.vertical), eq(venues.slug, q.slug)));
  if (!venue) throw notFound("Localul");

  const filter = q.reviews ?? "local";
  const reviewRows = await db
    .select({
      id: reviews.id,
      source: reviews.source,
      rating: reviews.rating,
      text: reviews.text,
      language: reviews.language,
      postedAt: reviews.postedAt,
      authorType: reviews.authorType,
      isPaid: reviews.isPaid,
      verifiedVisit: reviews.verifiedVisit,
      externalAuthor: reviews.externalAuthor,
      author: { username: users.username, displayName: users.displayName, neighborhood: users.localNeighborhood, roles: users.roles, avatarUrl: users.avatarUrl, followers: users.followers },
      servedBy: employees.firstName,
      weight: reviews.weight,
      helpfulCount: sql<number>`(select count(*)::int from review_votes rv where rv.review_id = ${reviews.id})`,
    })
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.authorId))
    .leftJoin(employees, and(eq(employees.id, reviews.servedByEmployeeId), eq(employees.accepted, true), eq(employees.active, true)))
    .where(
      and(
        eq(reviews.venueId, venue.id),
        eq(reviews.status, "published"),
        ...(filter === "local" ? [eq(reviews.authorType, "local")] : []),
        ...(filter === "tourist" ? [eq(reviews.authorType, "tourist")] : []),
        ...(filter === "influencer" ? [sql`'influencer' = ANY(${users.roles})`] : []),
      ),
    )
    .orderBy(desc(reviews.postedAt))
    .limit(q.limit ?? 30);

  const replies = reviewRows.length
    ? await db
        .select({ reviewId: reviewReplies.reviewId, text: reviewReplies.text, createdAt: reviewReplies.createdAt, author: users.displayName })
        .from(reviewReplies)
        .innerJoin(users, eq(users.id, reviewReplies.authorId))
        .where(inArray(reviewReplies.reviewId, reviewRows.map((r) => r.id)))
    : [];

  const counts = await db
    .select({ authorType: reviews.authorType, n: sql<number>`count(*)::int`, influencers: sql<number>`count(*) filter (where 'influencer' = ANY(${users.roles}))::int` })
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.authorId))
    .where(and(eq(reviews.venueId, venue.id), eq(reviews.status, "published")))
    .groupBy(reviews.authorType);

  const team = await db
    .select({ id: employees.id, firstName: employees.firstName, role: employees.role, photoUrl: employees.photoUrl })
    .from(employees)
    .where(and(eq(employees.venueId, venue.id), eq(employees.accepted, true), eq(employees.active, true)));
  // Public: doar mențiunile pozitive (nota ≥ 7) din ultimele 30 de zile
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
  const praise = team.length
    ? await db
        .select({ employeeId: reviews.servedByEmployeeId, n: sql<number>`count(*)::int` })
        .from(reviews)
        .where(and(eq(reviews.venueId, venue.id), gte(reviews.rating, 7), gte(reviews.postedAt, monthAgo), isNotNull(reviews.servedByEmployeeId)))
        .groupBy(reviews.servedByEmployeeId)
    : [];

  const blog = await db
    .select()
    .from(posts)
    .where(and(eq(posts.venueId, venue.id), lt(posts.publishAt, now)))
    .orderBy(desc(posts.publishAt))
    .limit(10);
  const videos = await db
    .select({ url: socialSubmissions.url, platform: socialSubmissions.platform, analysis: socialSubmissions.analysis })
    .from(socialSubmissions)
    .where(and(eq(socialSubmissions.venueId, venue.id), eq(socialSubmissions.status, "processed")))
    .orderBy(desc(socialSubmissions.createdAt))
    .limit(6);
  const sources = await db
    .select({ source: venueSources.source, rating: venueSources.rawRating, reviewCount: venueSources.rawReviewCount, url: venueSources.url })
    .from(venueSources)
    .where(eq(venueSources.venueId, venue.id));
  const menu = await db
    // Poza nu intră în pagină (data URL mare); doar dacă există, iar browserul o cere de la /api/menu-photo/{id}.
    .select({ id: menuItems.id, category: menuItems.category, name: menuItems.name, priceLei: menuItems.priceLei, description: menuItems.description, mustOrder: menuItems.mustOrder, hasPhoto: isNotNull(menuItems.photo) })
    .from(menuItems)
    .where(eq(menuItems.venueId, venue.id))
    .orderBy(asc(menuItems.position));
  const open = openStatus(venue.openingHours, now);

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      vertical: venue.vertical,
      categories: venue.categories,
      neighborhood: venue.neighborhood,
      address: venue.address,
      phone: venue.phone,
      website: venue.website,
      openingHours: venue.openingHours,
      hoursText: formatHours(venue.openingHours),
      openNow: open.openNow,
      openLabel: open.label,
      priceMinLei: venue.priceMinLei,
      priceMaxLei: venue.priceMaxLei,
      drinkPrices: venue.drinkPrices,
      location: { lat: venue.location.y, lng: venue.location.x },
      photos: venue.photos,
      headline: venue.editorialHeadline,
      writeup: venue.editorialWriteup,
      occasionTags: venue.occasionTags,
      drinkTags: venue.drinkTags,
      status: venue.status,
    },
    menu,
    features: venueFeatures((await venueFeatureData(db, [venue.id])).get(venue.id)),
    quick: (await venueQuickData(db, [venue.id])).get(venue.id)!,
    aspectScores: venue.aspectScores ?? {},
    loyalty: await venueProgram(db, venue.id),
    scores: {
      honest: venue.honestScore,
      locals: venue.localsScore,
      tourists: venue.touristsScore,
      touristTrapIndex: venue.touristTrapIndex,
      trapLevel: trapLevel(venue.touristTrapIndex),
      explanation: venue.scoreExplanation,
      ...(venue.vertical === "drink" ? { byTime: await drinkTimeScores(db, venue.id) } : {}),
    },
    isPartner: !!(await activePartnership(db, venue.id, now)),
    reviewCounts: {
      local: counts.find((c) => c.authorType === "local")?.n ?? 0,
      tourist: counts.find((c) => c.authorType === "tourist")?.n ?? 0,
      influencer: counts.reduce((s, c) => s + c.influencers, 0),
    },
    reviews: reviewRows.map((r) => ({ ...r, replies: replies.filter((x) => x.reviewId === r.id) })),
    blog,
    team: team.map((e) => ({ ...e, mentionsThisMonth: praise.find((p) => p.employeeId === e.id)?.n ?? 0 })),
    videos,
    externalRatings: sources,
    vibe: venue.vertical === "drink" ? await currentVibe(db, venue.id, now) : null,
  };
}

/** TOP DRINK: scorul pe „vineri–sâmbătă noaptea” și „în timpul săptămânii”, din ponderile deja calculate. */
async function drinkTimeScores(db: Db, venueId: string) {
  const rows = await db
    .select({ weekend: reviews.visitWeekendNight, w: sql<number>`sum(${reviews.weight})`, wr: sql<number>`sum(${reviews.weight} * ${reviews.rating})` })
    .from(reviews)
    .where(and(eq(reviews.venueId, venueId), eq(reviews.status, "published"), isNotNull(reviews.visitWeekendNight), isNotNull(reviews.weight)))
    .groupBy(reviews.visitWeekendNight);
  const [v] = await db.select({ citySlug: venues.citySlug }).from(venues).where(eq(venues.id, venueId));
  const [c] = await db.select({ mean: cities.meanScore }).from(cities).where(eq(cities.slug, v!.citySlug));
  const mean = c?.mean.drink ?? 7;
  const score = (weekend: boolean) => {
    const r = rows.find((x) => x.weekend === weekend);
    const w = Number(r?.w ?? 0);
    return Math.round(((PRIOR_WEIGHT * mean + Number(r?.wr ?? 0)) / (PRIOR_WEIGHT + w)) * 10) / 10;
  };
  return { weekendNight: score(true), weekday: score(false) };
}

/** „Vibe check”: media raportărilor neexpirate (1–5) și cât de recentă e ultima. */
export async function currentVibe(db: Db, venueId: string, now = new Date()) {
  const rows = await db
    .select({ level: vibeChecks.level, createdAt: vibeChecks.createdAt })
    .from(vibeChecks)
    .where(and(eq(vibeChecks.venueId, venueId), gt(vibeChecks.expiresAt, now)))
    .orderBy(desc(vibeChecks.createdAt));
  if (!rows.length) return null;
  const level = Math.round(rows.reduce((s, r) => s + r.level, 0) / rows.length);
  const labels = ["", "Gol", "Locuri libere", "Destul de plin", "Aproape plin", "Coadă la intrare"];
  return { level, label: labels[level], reports: rows.length, minutesAgo: Math.round((now.getTime() - rows[0]!.createdAt.getTime()) / 60_000) };
}

/** topfood/{oras}/top-luna și arhiva /2026-10. */
export async function leaderboardPage(db: Db, q: { citySlug: string; vertical: Vertical; month?: string; category?: string }) {
  const category = q.category ?? "all";
  const months = (
    await db
      .selectDistinct({ month: leaderboardSnapshots.month })
      .from(leaderboardSnapshots)
      .where(and(eq(leaderboardSnapshots.citySlug, q.citySlug), eq(leaderboardSnapshots.vertical, q.vertical)))
      .orderBy(desc(leaderboardSnapshots.month))
  ).map((m) => m.month);
  const month = q.month ?? months[0];
  if (!month) return { month: null, months, snapshot: null };
  const [snapshot] = await db
    .select()
    .from(leaderboardSnapshots)
    .where(
      and(eq(leaderboardSnapshots.citySlug, q.citySlug), eq(leaderboardSnapshots.vertical, q.vertical), eq(leaderboardSnapshots.month, month), eq(leaderboardSnapshots.category, category)),
    );
  if (!snapshot) return { month, months, snapshot: null };

  // Nume pentru premii (angajat, localnic)
  const awards = snapshot.awards;
  const [employee] = awards.employee
    ? await db.select({ firstName: employees.firstName, venue: venues.name }).from(employees).innerJoin(venues, eq(venues.id, employees.venueId)).where(eq(employees.id, awards.employee.employeeId))
    : [];
  const [local] = awards.local
    ? await db.select({ displayName: users.displayName, neighborhood: users.localNeighborhood }).from(users).where(eq(users.id, awards.local.userId))
    : [];
  return {
    month,
    months,
    snapshot: {
      entries: snapshot.entries,
      frozenAt: snapshot.frozenAt,
      awards: {
        revelation: awards.revelation ? { ...awards.revelation, name: snapshot.entries.find((e) => e.venueId === awards.revelation!.venueId)?.name } : null,
        employee: awards.employee && employee ? { ...awards.employee, ...employee } : null,
        local: awards.local && local ? { ...awards.local, ...local } : null,
      },
    },
  };
}

/** topdrink/{oras}/weekend: evenimentele de vineri până duminică. */
export async function weekendEvents(db: Db, citySlug: string, now = new Date()) {
  const day = now.getUTCDay();
  const friday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + ((5 - day + 7) % 7)));
  const start = day === 0 || day === 6 ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) : friday;
  const end = new Date(friday.getTime() + 3 * 86_400_000);
  return db
    .select({ id: posts.id, title: posts.title, body: posts.body, eventAt: posts.eventAt, venue: { name: venues.name, slug: venues.slug, vertical: venues.vertical } })
    .from(posts)
    .innerJoin(venues, eq(venues.id, posts.venueId))
    .where(and(eq(venues.citySlug, citySlug), eq(posts.type, "event"), gte(posts.eventAt, start), lt(posts.eventAt, end)))
    .orderBy(asc(posts.eventAt));
}

/** /u/{username} */
export async function userProfile(db: Db, username: string) {
  const [u] = await db.select().from(users).where(eq(users.username, username));
  if (!u) throw notFound("Utilizatorul");
  const links = await db.select({ platform: userSocialLinks.platform, url: userSocialLinks.url, verified: userSocialLinks.verified, followers: userSocialLinks.followers }).from(userSocialLinks).where(eq(userSocialLinks.userId, u.id));
  const recent = await db
    .select({ id: reviews.id, rating: reviews.rating, text: reviews.text, postedAt: reviews.postedAt, venue: { name: venues.name, slug: venues.slug, vertical: venues.vertical, citySlug: venues.citySlug } })
    .from(reviews)
    .innerJoin(venues, eq(venues.id, reviews.venueId))
    .where(and(eq(reviews.authorId, u.id), eq(reviews.status, "published")))
    .orderBy(desc(reviews.postedAt))
    .limit(20);
  return {
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    roles: u.roles,
    local: u.localCitySlug && u.localUntil && u.localUntil > new Date() ? { citySlug: u.localCitySlug, neighborhood: u.localNeighborhood } : null,
    followers: u.followers,
    socialLinks: links,
    reviews: recent,
  };
}

/** Poza unui fel din meniu (data URL), pentru /api/menu-photo/{id}. null dacă nu există. */
export async function menuPhoto(db: Db, id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const [row] = await db.select({ photo: menuItems.photo }).from(menuItems).where(eq(menuItems.id, id));
  return row?.photo ?? null;
}
