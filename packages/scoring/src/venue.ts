import { splitScores, type SplitScores } from "./honest.ts";
import { touristTrapIndex, type TrapInput, type TrapResult } from "./trap.ts";
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
    /** Review-uri cu vizita dovedită (GPS la local sau bon), cântărite ×1,3. */
    verifiedVisitCount: number;
    trapReasons: TrapResult["reasons"];
    trapInputs: TrapInput;
  };
};

/** Toate scorurile unui local + explicația afișată la „De ce?” (regula 3). */
export function scoreVenue(reviews: VenueReview[], ctx: VenueContext, now: Date = new Date()): VenueScores {
  const split = splitScores(reviews, ctx.cityMean, now);

  const withLanguage = reviews.filter((r) => r.language);
  const foreign = withLanguage.filter((r) => r.language !== "ro").length;
  const tracked = reviews.filter((r) => r.authorReturned !== null);
  const oneTime = tracked.filter((r) => r.authorReturned === false).length;

  const trapInputs = {
    localsScore: split.locals.enoughData ? split.locals.score : null,
    touristsScore: split.tourists.enoughData ? split.tourists.score : null,
    distanceToTouristZoneM: ctx.distanceToTouristZoneM,
    priceRatio: ctx.priceRatio,
    foreignLanguageShare: withLanguage.length ? foreign / withLanguage.length : 0,
    oneTimeVisitorShare: tracked.length ? oneTime / tracked.length : 0,
  };
  const trap = touristTrapIndex(trapInputs);

  return {
    ...split,
    trap,
    explanation: {
      reviewCount: reviews.length,
      localCount: split.locals.reviewCount,
      touristCount: split.tourists.reviewCount,
      enoughData: split.overall.enoughData,
      trapLevel: trap.level,
      verifiedVisitCount: reviews.filter((r) => r.verifiedVisit).length,
      trapReasons: trap.reasons,
      /** Valorile brute ale semnalelor, și când nu dau puncte (pentru „De ce?” detaliat). */
      trapInputs,
    },
  };
}

/**
 * Notele pe aspecte ale localului (mâncare, servire…), pe scara 0–10: media ponderată a sentimentului
 * din review-uri (-1…1). Un aspect cu sub `minMentions` mențiuni nu se afișează.
 */
export function aggregateAspects(items: { weight: number; aspects: Record<string, number> | null }[], minMentions = 3): Record<string, number> {
  const acc: Record<string, { w: number; s: number; n: number }> = {};
  for (const { weight, aspects } of items) {
    for (const [k, v] of Object.entries(aspects ?? {})) {
      const a = (acc[k] ??= { w: 0, s: 0, n: 0 });
      a.w += weight;
      a.s += weight * v;
      a.n += 1;
    }
  }
  return Object.fromEntries(
    Object.entries(acc)
      .filter(([, a]) => a.n >= minMentions && a.w > 0)
      .map(([k, a]) => [k, Math.round(((a.s / a.w + 1) * 5) * 10) / 10]),
  );
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
