/** Voturi „util” pe review-uri și topul recenzenților (localnici verificați și influenceri). */
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { invalid, notFound, reviewVotes, reviews, users, venues, type Db } from "@tftd/db";

/** Comută votul „util” (al doilea click îl retrage). Nu-ți poți vota propriul review. */
export async function toggleHelpful(db: Db, userId: string, reviewId: string) {
  const [r] = await db.select({ authorId: reviews.authorId }).from(reviews).where(eq(reviews.id, reviewId));
  if (!r) throw notFound("Review-ul");
  if (r.authorId === userId) throw invalid("Nu-ți poți vota propriul review.");
  const removed = await db.delete(reviewVotes).where(and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.userId, userId))).returning();
  if (!removed.length) await db.insert(reviewVotes).values({ reviewId, userId });
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(reviewVotes).where(eq(reviewVotes.reviewId, reviewId))) as [{ n: number }];
  return { voted: !removed.length, helpfulCount: n };
}

/** Cei mai utili recenzenți din oraș (după voturile „util” primite), din ultimele `days` zile. */
export async function topReviewers(db: Db, citySlug: string, opts: { days?: number; limit?: number } = {}, now = new Date()) {
  const since = new Date(now.getTime() - (opts.days ?? 90) * 86_400_000);
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      neighborhood: users.localNeighborhood,
      roles: users.roles,
      followers: users.followers,
      helpfulVotes: sql<number>`count(${reviewVotes.userId})::int`,
      reviews: sql<number>`count(distinct ${reviews.id})::int`,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.authorId))
    .innerJoin(venues, eq(venues.id, reviews.venueId))
    .leftJoin(reviewVotes, eq(reviewVotes.reviewId, reviews.id))
    .where(and(eq(venues.citySlug, citySlug), eq(reviews.status, "published"), gte(reviews.postedAt, since), sql`(${users.localCitySlug} = ${citySlug} or 'influencer' = any(${users.roles}))`))
    .groupBy(users.id)
    .orderBy(desc(sql`count(${reviewVotes.userId})`), desc(sql`count(distinct ${reviews.id})`))
    .limit(opts.limit ?? 10);
  return rows.map((r) => ({
    ...r,
    role: r.roles.includes("influencer") ? ("influencer" as const) : ("verified-local" as const),
    badgeLabel: r.roles.includes("influencer") ? "Influencer" : `Localnic${r.neighborhood ? ` din ${r.neighborhood}` : ""}`,
  }));
}
