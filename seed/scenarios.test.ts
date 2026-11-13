/**
 * Scenariile de demo din arhitectură, rulate în memorie pe datele de seed (fără DB):
 * generate → analiză (reguli) → scoruri. Repetă pe scurt ce fac persist.ts din review-analysis și scoring.
 */
import { describe, expect, it } from "vitest";
import { classifyAuthor, detectLanguage, fakeProbability, fakeSignals } from "@tftd/review-analysis";
import { cityMean, distanceToNearestZone, priceRatio, scoreVenue, type VenueReview } from "@tftd/scoring";
import config from "../config/cities/timisoara.json";
import { generate } from "./generate.ts";
import { SEED_VENUES } from "./venues.ts";

const now = new Date("2026-11-13T12:00:00Z");
const data = generate(SEED_VENUES, now);
const userByKey = new Map(data.users.map((u) => [u.key, u]));
const countByAuthor = new Map<string, number[]>();
for (const r of data.reviews) if (r.authorKey) countByAuthor.set(r.authorKey, [...(countByAuthor.get(r.authorKey) ?? []), (r.originalRating / r.originalScale) * 10]);

function analyzed(slug: string): VenueReview[] {
  const own = data.reviews.filter((r) => r.venueSlug === slug);
  return own.map((r) => {
    const rating = (r.originalRating / r.originalScale) * 10;
    const user = r.authorKey ? userByKey.get(r.authorKey) : undefined;
    const language = detectLanguage(r.text);
    const isVerifiedLocal = !!user?.localNeighborhood;
    const authorRatings = r.authorKey ? (countByAuthor.get(r.authorKey) ?? []) : [];
    const authorReviewCount = r.authorKey ? authorRatings.length : (r.externalAuthor?.reviewCount ?? 1);
    const signals = fakeSignals({
      rating, text: r.text, postedAt: r.postedAt, authorReviewCount,
      authorHasPhotoOrHistory: authorReviewCount > 1, authorRatings, authorIsOwnerOrStaff: false,
      venueReviews: own.filter((o) => o !== r).map((o) => ({ rating: (o.originalRating / o.originalScale) * 10, text: o.text, postedAt: o.postedAt })),
    });
    return {
      rating, language,
      authorType: classifyAuthor({ isVerifiedLocal, language, citiesReviewed: r.externalAuthor?.citiesReviewed }),
      authorIsVerifiedLocal: isVerifiedLocal, authorReviewCount,
      verifiedVisit: r.verifiedVisit, fakeProbability: fakeProbability(signals), isPaid: false, postedAt: r.postedAt,
      visitWeekendNight: r.visitWeekendNight, authorReturned: null,
    };
  });
}

const zones = config.touristZones;
const scoreOf = (slug: string, mean: number) => {
  const v = SEED_VENUES.find((x) => x.slug === slug)!;
  const price =
    v.vertical === "drink"
      ? priceRatio(v.drinkPrices?.beer05l, config.localAveragePrices.drink.beer05l)
      : priceRatio(((v.priceMinLei ?? 0) + (v.priceMaxLei ?? 0)) / 2, (config.localAveragePrices.food as Record<string, number>)[v.categories[0]!]);
  return scoreVenue(analyzed(slug), { cityMean: mean, distanceToTouristZoneM: distanceToNearestZone(v, zones), priceRatio: price }, now);
};

describe("scenariile de demo pe datele de seed", () => {
  const foodMean = cityMean(SEED_VENUES.filter((v) => v.vertical === "food").flatMap((v) => analyzed(v.slug)), 7, now);

  it("1. Terasa Grand Unirii e semnalată drept capcană, cu motive", () => {
    const s = scoreOf("terasa-grand-unirii", foodMean);
    expect(s.trap.level).not.toBe("none");
    expect(s.trap.index).toBeGreaterThanOrEqual(60);
    expect(s.locals.score).toBeLessThan(s.tourists.score);
  });

  it("Ciorba lui Sandu e pe primul loc la food", () => {
    const ranked = SEED_VENUES.filter((v) => v.vertical === "food")
      .map((v) => ({ slug: v.slug, score: scoreOf(v.slug, foodMean).overall.score }))
      .sort((a, b) => b.score - a.score);
    expect(ranked[0]?.slug).toBe("ciorba-lui-sandu");
    expect(scoreOf("ciorba-lui-sandu", foodMean).trap.level).toBe("none");
  });

  it("3. cele 20 de review-uri false abia mișcă scorul lui Grill Nou Freidorf", () => {
    const all = analyzed("grill-nou-freidorf");
    const withoutFakes = all.filter((r) => r.authorReviewCount > 1 || r.rating < 10);
    const mean = foodMean;
    const a = scoreVenue(all, { cityMean: mean, distanceToTouristZoneM: null, priceRatio: null }, now).overall.score;
    const b = scoreVenue(withoutFakes, { cityMean: mean, distanceToTouristZoneM: null, priceRatio: null }, now).overall.score;
    expect(a - b).toBeLessThan(0.2);
  });
});
