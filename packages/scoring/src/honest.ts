import { reviewWeight, type ScoringReview } from "./weights.ts";

/** Cât de tare e tras scorul spre media orașului (constanta 10 din formulă). */
export const PRIOR_WEIGHT = 10;
/**
 * Punctul de pornire al unui local: nota lui agregată de pe Google, trasă spre media orașului după câte note are.
 * prior = (50 · media_orașului + n · nota_Google) / (50 + n), cu n plafonat la 500.
 * Un local cu 3.952 de note pornește aproape de nota lui Google; unul cu 12 note, aproape de media orașului.
 * Review-urile analizate (cu ponderile lor) corectează apoi acest punct, ca în formula de mai jos.
 */
export const CITY_PRIOR_WEIGHT = 50;
export const EXTERNAL_COUNT_CAP = 500;
export function priorMean(cityMeanScore: number, external?: { rating5: number; count: number } | null): number {
  if (!external || !external.count || !external.rating5) return cityMeanScore;
  const n = Math.min(external.count, EXTERNAL_COUNT_CAP);
  return round2((CITY_PRIOR_WEIGHT * cityMeanScore + n * external.rating5 * 2) / (CITY_PRIOR_WEIGHT + n));
}

/** Sub această pondere totală afișăm „Încă nu avem destule date”. */
export const MIN_TOTAL_WEIGHT = 5;

export type HonestScore = {
  score: number;
  totalWeight: number;
  reviewCount: number;
  enoughData: boolean;
};

/**
 * ScorOnest = (10 · media_orasului + Σ pondere·notă) / (10 + Σ pondere)
 * Un local cu 3 review-uri de 5★ nu bate unul cu 400 de review-uri de 4,7★.
 */
export function honestScore(reviews: ScoringReview[], cityMean: number, now: Date = new Date()): HonestScore {
  let sumW = 0;
  let sumWR = 0;
  for (const r of reviews) {
    const w = reviewWeight(r, now);
    sumW += w;
    sumWR += w * r.rating;
  }
  return {
    score: round1((PRIOR_WEIGHT * cityMean + sumWR) / (PRIOR_WEIGHT + sumW)),
    totalWeight: round2(sumW),
    reviewCount: reviews.length,
    enoughData: sumW >= MIN_TOTAL_WEIGHT,
  };
}

export type SplitScores = {
  overall: HonestScore;
  locals: HonestScore;
  tourists: HonestScore;
};

/** Scor Onest + Scor Localnici + Scor Turiști (regula 4: afișate separat). */
export function splitScores(reviews: ScoringReview[], cityMean: number, now: Date = new Date()): SplitScores {
  return {
    overall: honestScore(reviews, cityMean, now),
    locals: honestScore(reviews.filter((r) => r.authorType === "local"), cityMean, now),
    tourists: honestScore(reviews.filter((r) => r.authorType === "tourist"), cityMean, now),
  };
}

/** TOP DRINK: același scor, separat pe „vineri–sâmbătă noaptea” și „în timpul săptămânii”. */
export function drinkTimeScores(reviews: ScoringReview[], cityMean: number, now: Date = new Date()) {
  return {
    weekendNight: honestScore(reviews.filter((r) => r.visitWeekendNight === true), cityMean, now),
    weekday: honestScore(reviews.filter((r) => r.visitWeekendNight === false), cityMean, now),
  };
}

/** Media orașului: media ponderată a tuturor review-urilor din oraș și verticală (fără tragere spre o medie). */
export function cityMean(reviews: ScoringReview[], fallback = 7, now: Date = new Date()): number {
  let sumW = 0;
  let sumWR = 0;
  for (const r of reviews) {
    const w = reviewWeight(r, now);
    sumW += w;
    sumWR += w * r.rating;
  }
  return sumW === 0 ? fallback : round2(sumWR / sumW);
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;
