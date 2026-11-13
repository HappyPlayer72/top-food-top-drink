/** Jobul `leaderboard-lunar`: calculează luna trecută și o îngheață în DB. */
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { cities, employees, leaderboardSnapshots, reviews, users, venues, type Db } from "@tftd/db";
import { employeeOfMonth, localOfMonth, monthRange, previousMonth, rankMonth, revelation, type MonthVenue, type PreviousMonth } from "./compute.ts";

export async function freezeMonth(db: Db, citySlug: string, vertical: "food" | "drink", month: string) {
  const { start, end } = monthRange(month);
  const [city] = await db.select().from(cities).where(eq(cities.slug, citySlug));
  if (!city) throw new Error(`Orașul ${citySlug} nu există.`);

  const venueRows = await db
    .select({ id: venues.id, name: venues.name, categories: venues.categories })
    .from(venues)
    .where(and(eq(venues.citySlug, citySlug), eq(venues.vertical, vertical)));
  if (!venueRows.length) return [];
  const venueIds = venueRows.map((v) => v.id);

  const rows = await db
    .select({
      venueId: reviews.venueId,
      authorId: reviews.authorId,
      externalAuthor: reviews.externalAuthor,
      rating: reviews.rating,
      authorType: reviews.authorType,
      verifiedVisit: reviews.verifiedVisit,
      fakeProbability: reviews.fakeProbability,
      isPaid: reviews.isPaid,
      postedAt: reviews.postedAt,
      servedByEmployeeId: reviews.servedByEmployeeId,
      localCitySlug: users.localCitySlug,
      localUntil: users.localUntil,
    })
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.authorId))
    .where(and(inArray(reviews.venueId, venueIds), eq(reviews.status, "published"), gte(reviews.postedAt, start), lt(reviews.postedAt, end)));

  const authorCounts = new Map<string, number>();
  for (const r of rows) if (r.authorId) authorCounts.set(r.authorId, (authorCounts.get(r.authorId) ?? 0) + 1);

  const monthVenues: MonthVenue[] = venueRows.map((v) => ({
    venueId: v.id,
    name: v.name,
    categories: v.categories,
    reviews: rows
      .filter((r) => r.venueId === v.id)
      .map((r) => ({
        rating: r.rating,
        authorType: r.authorType,
        authorIsVerifiedLocal: r.localCitySlug === citySlug && !!r.localUntil && r.localUntil >= start,
        authorReviewCount: r.authorId ? (authorCounts.get(r.authorId) ?? 1) : (r.externalAuthor?.reviewCount ?? 1),
        verifiedVisit: r.verifiedVisit,
        fakeProbability: r.fakeProbability,
        isPaid: r.isPaid,
        postedAt: r.postedAt,
        servedByEmployeeId: r.servedByEmployeeId,
        authorId: r.authorId,
      })),
  }));

  const accepted = new Map(
    (await db
      .select({ id: employees.id, venueId: employees.venueId })
      .from(employees)
      .where(and(inArray(employees.venueId, venueIds), eq(employees.accepted, true), eq(employees.active, true)))).map((e) => [e.id, e.venueId]),
  );

  const categories = ["all", ...new Set(venueRows.flatMap((v) => v.categories))];
  const prevSnapshots = await db
    .select()
    .from(leaderboardSnapshots)
    .where(and(eq(leaderboardSnapshots.citySlug, citySlug), eq(leaderboardSnapshots.vertical, vertical), eq(leaderboardSnapshots.month, previousMonth(month))));

  // Scorul e calculat la sfârșitul lunii, ca vechimea review-urilor să fie aceeași pentru toți
  const asOf = new Date(end.getTime() - 1);
  const saved = [];
  for (const category of categories) {
    const prevSnap = prevSnapshots.find((s) => s.category === category);
    const previous: PreviousMonth | null = prevSnap
      ? { ranks: new Map(prevSnap.entries.map((e) => [e.venueId, e.rank])), scores: new Map(prevSnap.entries.map((e) => [e.venueId, e.score])) }
      : null;
    const entries = rankMonth(monthVenues, city.meanScore[vertical], previous, asOf, category);
    const awards =
      category === "all"
        ? { revelation: revelation(entries, previous), employee: employeeOfMonth(monthVenues, accepted), local: localOfMonth(monthVenues) }
        : { revelation: revelation(entries, previous) };

    // Înghețat: dacă luna e deja calculată, nu o mai rescriem
    const [row] = await db
      .insert(leaderboardSnapshots)
      .values({ citySlug, vertical, category, month, entries, awards })
      .onConflictDoNothing()
      .returning();
    if (row) saved.push(row);
  }
  return saved;
}

/** Luna trecută, ca text („2026-10”), pentru jobul care rulează pe 1 ale lunii. */
export function lastMonth(now = new Date()): string {
  return previousMonth(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`);
}
