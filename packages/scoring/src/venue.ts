import { splitScores, type SplitScores } from "./honest.ts";
import { touristTrapIndex, type TrapResult } from "./trap.ts";
import type { ScoringReview } from "./weights.ts";

export type VenueReview = ScoringReview & {
  language: string | null;
  /** true/false dacă știm (check-in-uri native), null dacă nu. */
  authorReturned: boolean | null;
};

export type VenueContext = {
  cityMean: number;
  distanceToTouristZoneM: number | null;
  priceRatio: number | null;
};

export type VenueScores = SplitScores & {
  trap: TrapResult;
  explanation: {
    reviewCount: number;
    localCount: number;
    touristCount: number;
    enoughData: boolean;
    trapLevel: TrapResult["level"];
    trapReasons: TrapResult["reasons"];
  };
};

/** Toate scorurile unui local + explicația afișată la „De ce?” (regula 3). */
export function scoreVenue(reviews: VenueReview[], ctx: VenueContext, now: Date = new Date()): VenueScores {
  const split = splitScores(reviews, ctx.cityMean, now);

  const withLanguage = reviews.filter((r) => r.language);
  const foreign = withLanguage.filter((r) => r.language !== "ro").length;
  const tracked = reviews.filter((r) => r.authorReturned !== null);
  const oneTime = tracked.filter((r) => r.authorReturned === false).length;

  const trap = touristTrapIndex({
    localsScore: split.locals.enoughData ? split.locals.score : null,
    touristsScore: split.tourists.enoughData ? split.tourists.score : null,
    distanceToTouristZoneM: ctx.distanceToTouristZoneM,
    priceRatio: ctx.priceRatio,
    foreignLanguageShare: withLanguage.length ? foreign / withLanguage.length : 0,
    oneTimeVisitorShare: tracked.length ? oneTime / tracked.length : 0,
  });

  return {
    ...split,
    trap,
    explanation: {
      reviewCount: reviews.length,
      localCount: split.locals.reviewCount,
      touristCount: split.tourists.reviewCount,
      enoughData: split.overall.enoughData,
      trapLevel: trap.level,
      trapReasons: trap.reasons,
    },
  };
}

/** Prețul localului față de media locală (1,6 = +60%). */
export function priceRatio(venuePrice: number | null | undefined, localAverage: number | null | undefined): number | null {
  if (!venuePrice || !localAverage) return null;
  return venuePrice / localAverage;
}

/** Distanța pe sferă, în metri. */
export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distanța până la centrul celei mai apropiate zone turistice (piața). */
export function distanceToNearestZone(p: { lat: number; lng: number }, zones: { lat: number; lng: number }[]): number | null {
  if (!zones.length) return null;
  return Math.min(...zones.map((z) => haversineM(p, z)));
}
