/**
 * Recalculează scorurile unui oraș × verticală și le scrie în DB (jobul `recalculeaza-scoruri`).
 * Regula 1: aici nu se citește NIMIC din tabelele de monetizare (verificat de rule1.test.ts).
 */
import { and, count, countDistinct, eq, inArray, isNotNull } from "drizzle-orm";
import { checkins, cities, ensureExtendedSchema, reviews, touristZones, users, venueScoreSnapshots, venueSources, venues, type Db } from "@tftd/db";
import { cityMean } from "./honest.ts";
import { aggregateAspects, distanceToNearestZone, priceRatio, scoreVenue, type VenueReview } from "./venue.ts";
import { reviewWeight } from "./weights.ts";

export async function recalculateCity(db: Db, citySlug: string, vertical: "food" | "drink", now = new Date()) {
  await ensureExtendedSchema(db);
  const [city] = await db.select().from(cities).where(eq(cities.slug, citySlug));
  if (!city) throw new Error(`Orașul ${citySlug} nu există.`);

  const zones = (await db.select({ location: touristZones.location }).from(touristZones).where(eq(touristZones.citySlug, citySlug))).map(
    (z) => ({ lat: z.location.y, lng: z.location.x }),
  );
  const venueRows = await db
    .select()
    .from(venues)
    .where(and(eq(venues.citySlug, citySlug), eq(venues.vertical, vertical), eq(venues.status, "active")));
  if (!venueRows.length) return { venues: 0, cityMean: city.meanScore[vertical] };
  const venueIds = venueRows.map((v) => v.id);

  const rows = await db
    .select({
      id: reviews.id,
      venueId: reviews.venueId,
      authorId: reviews.authorId,
      externalAuthor: reviews.externalAuthor,
      rating: reviews.rating,
      authorType: reviews.authorType,
      verifiedVisit: reviews.verifiedVisit,
      fakeProbability: reviews.fakeProbability,
      isPaid: reviews.isPaid,
      postedAt: reviews.postedAt,
      language: reviews.language,
      visitWeekendNight: reviews.visitWeekendNight,
      aspects: reviews.aspects,
      localCitySlug: users.localCitySlug,
      localUntil: users.localUntil,
    })
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.authorId))
    .where(and(inArray(reviews.venueId, venueIds), eq(reviews.status, "published")));

  // Câte review-uri are fiecare autor nativ, pe toată platforma
  const authorIds = [...new Set(rows.map((r) => r.authorId).filter((x): x is string => !!x))];
  const authorCounts = new Map<string, number>();
  const visitDays = new Map<string, number>();
  if (authorIds.length) {
    for (const a of await db
      .select({ authorId: reviews.authorId, n: count() })
      .from(reviews)
      .where(inArray(reviews.authorId, authorIds))
      .groupBy(reviews.authorId)) {
      authorCounts.set(a.authorId!, a.n);
    }
    for (const c of await db
      .select({ userId: checkins.userId, venueId: checkins.venueId, days: countDistinct(checkins.day) })
      .from(checkins)
      .where(and(inArray(checkins.userId, authorIds), isNotNull(checkins.venueId), inArray(checkins.venueId, venueIds)))
      .groupBy(checkins.userId, checkins.venueId)) {
      visitDays.set(`${c.userId}:${c.venueId}`, c.days);
    }
  }

  const toScoring = (r: (typeof rows)[number]): VenueReview => {
    const days = r.authorId ? visitDays.get(`${r.authorId}:${r.venueId}`) : undefined;
    return {
      rating: r.rating,
      authorType: r.authorType,
      authorIsVerifiedLocal: r.localCitySlug === citySlug && !!r.localUntil && r.localUntil > now,
      authorReviewCount: r.authorId ? (authorCounts.get(r.authorId) ?? 1) : (r.externalAuthor?.reviewCount ?? 1),
      verifiedVisit: r.verifiedVisit,
      fakeProbability: r.fakeProbability,
      isPaid: r.isPaid,
      postedAt: r.postedAt,
      visitWeekendNight: r.visitWeekendNight,
      language: r.language,
      authorReturned: days === undefined ? null : days > 1,
    };
  };

  // Nota agregată Google per local (punctul de pornire al scorului)
  const external = new Map<string, { source: "google"; rating5: number; count: number }>();
  for (const s of await db
    .select({ venueId: venueSources.venueId, rating: venueSources.rawRating, count: venueSources.rawReviewCount })
    .from(venueSources)
    .where(and(inArray(venueSources.venueId, venueIds), eq(venueSources.source, "google")))) {
    if (s.rating && s.count) external.set(s.venueId, { source: "google", rating5: s.rating, count: s.count });
  }

  const scored = rows.map((r) => ({ row: r, s: toScoring(r) }));
  const mean = cityMean(scored.map((x) => x.s), city.meanScore[vertical], now);
  const day = now.toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    await tx.update(cities).set({ meanScore: { ...city.meanScore, [vertical]: mean }, updatedAt: now }).where(eq(cities.slug, citySlug));

    for (const v of venueRows) {
      const own = scored.filter((x) => x.row.venueId === v.id);
      const price =
        vertical === "drink"
          ? priceRatio(v.drinkPrices?.beer05l, city.localAveragePrices.drink.beer05l)
          : priceRatio(
              v.priceMinLei && v.priceMaxLei ? (v.priceMinLei + v.priceMaxLei) / 2 : null,
              city.localAveragePrices.food[v.categories[0] ?? ""],
            );
      const result = scoreVenue(
        own.map((x) => x.s),
        { cityMean: mean, external: external.get(v.id) ?? null, distanceToTouristZoneM: distanceToNearestZone({ lat: v.location.y, lng: v.location.x }, zones), priceRatio: price },
        now,
      );
      // Fără niciun review nu există scor: altfel localul ar primi media orașului, adică o notă inventată
      const hasReviews = own.length > 0;
      await tx
        .update(venues)
        .set({
          honestScore: hasReviews ? result.overall.score : null,
          localsScore: result.locals.enoughData ? result.locals.score : null,
          touristsScore: result.tourists.enoughData ? result.tourists.score : null,
          totalWeight: result.overall.totalWeight,
          touristTrapIndex: hasReviews ? result.trap.index : null,
          scoreExplanation: result.explanation,
          aspectScores: aggregateAspects(own.map((x) => ({ weight: reviewWeight(x.s, now), aspects: x.row.aspects }))),
          scoreUpdatedAt: now,
        })
        .where(eq(venues.id, v.id));
      if (hasReviews) {
        await tx
          .insert(venueScoreSnapshots)
          .values({ venueId: v.id, day, score: result.overall.score, reviewCount: own.length })
          .onConflictDoUpdate({
            target: [venueScoreSnapshots.venueId, venueScoreSnapshots.day],
            set: { score: result.overall.score, reviewCount: own.length },
          });
      }
      for (const x of own) {
        await tx.update(reviews).set({ weight: reviewWeight(x.s, now) }).where(eq(reviews.id, x.row.id));
      }
    }
  });

  return { venues: venueRows.length, cityMean: mean };
}
