/**
 * Insignele din profil: ștampilele tururilor tematice (tabelul tour_completions) și nivelurile pe categorii
 * (calculate din review-uri, fără tabel). Nimic nu vine de la client fără verificare.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { checkins, invalid, reviews, tourCompletions, venues, type Db } from "@tftd/db";
import { categoryBadges, findThemedTour, stopsMatchTour } from "./tours.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Acordă ștampila unui tur tematic dacă userul are check-in (azi sau ieri: turul poate trece de miezul nopții)
 * la fiecare oprire. O singură ștampilă per tur; a doua oară întoarce `awarded: false`.
 */
export async function completeThemedTour(db: Db, userId: string, tourSlug: string, venueIds: readonly string[], now = new Date()) {
  const tour = findThemedTour(tourSlug);
  if (!tour) throw invalid("Ștampila se dă doar pentru tururile tematice.");
  const ids = [...new Set(venueIds)];
  if (ids.length !== venueIds.length || ids.length !== tour.stops || !ids.every((id) => UUID.test(id))) {
    throw invalid(`Turul „${tour.name}” are ${tour.stops} opriri la localuri diferite.`);
  }
  const stops = await db.select({ slug: venues.slug }).from(venues).where(inArray(venues.id, ids));
  if (stops.length !== ids.length || !stopsMatchTour(tour, stops.map((s) => s.slug))) {
    throw invalid(`Localurile nu se potrivesc turului „${tour.name}”. Ștampila se dă doar pentru traseul propus de tur.`);
  }
  const rows = await db
    .selectDistinct({ venueId: checkins.venueId })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), inArray(checkins.venueId, ids), inArray(checkins.day, [isoDay(now), isoDay(new Date(now.getTime() - 86_400_000))])));
  const missing = ids.length - new Set(rows.map((r) => r.venueId)).size;
  if (missing > 0) throw invalid(`Lipsește check-in-ul la ${missing === 1 ? "o oprire" : `${missing} opriri`}. Ștampila se dă doar cu check-in la fiecare local.`);
  const [row] = await db.insert(tourCompletions).values({ userId, tourSlug, venueIds: ids, completedAt: now }).onConflictDoNothing().returning();
  return { awarded: !!row, tourName: tour.name };
}

/** Ștampilele de tur + insignele de categorie, pentru /u/[username] și /cont. */
export async function userBadges(db: Db, userId: string) {
  const [tours, rows] = await Promise.all([
    db.select({ slug: tourCompletions.tourSlug, completedAt: tourCompletions.completedAt }).from(tourCompletions).where(eq(tourCompletions.userId, userId)).orderBy(asc(tourCompletions.completedAt)),
    db
      .select({
        venueId: reviews.venueId,
        categories: venues.categories,
        status: reviews.status,
        fakeProbability: reviews.fakeProbability,
        isPaid: reviews.isPaid,
        verifiedVisit: reviews.verifiedVisit,
      })
      .from(reviews)
      .innerJoin(venues, eq(venues.id, reviews.venueId))
      .where(and(eq(reviews.authorId, userId), eq(reviews.source, "native"))),
  ]);
  return {
    tourBadges: tours.flatMap((t) => {
      const tour = findThemedTour(t.slug);
      return tour ? [{ slug: t.slug, name: tour.name, completedAt: t.completedAt }] : [];
    }),
    categoryBadges: categoryBadges(rows),
  };
}
