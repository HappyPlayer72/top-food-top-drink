import { describe, expect, it } from "vitest";
import { honestScore, splitScores } from "./honest.ts";
import { touristTrapIndex } from "./trap.ts";
import { haversineM } from "./venue.ts";
import { reviewWeight, toTenScale, type ScoringReview } from "./weights.ts";

const now = new Date("2026-11-13T12:00:00Z");
const review = (o: Partial<ScoringReview> = {}): ScoringReview => ({
  rating: 8,
  authorType: "unknown",
  authorIsVerifiedLocal: false,
  authorReviewCount: 5,
  verifiedVisit: false,
  fakeProbability: 0,
  isPaid: false,
  postedAt: now,
  ...o,
});
const many = (n: number, o: Partial<ScoringReview>) => Array.from({ length: n }, () => review(o));

describe("ponderea unui review", () => {
  it("localnic verificat ×2, cont nou ×0,3, utilizator cu ≥10 review-uri ×1,5", () => {
    expect(reviewWeight(review({ authorIsVerifiedLocal: true }), now)).toBe(2);
    expect(reviewWeight(review({ authorReviewCount: 1 }), now)).toBeCloseTo(0.3);
    expect(reviewWeight(review({ authorReviewCount: 10 }), now)).toBe(1.5);
  });
  it("vizită verificată ×1,3, plătit ×0,2, fals scade proporțional", () => {
    expect(reviewWeight(review({ verifiedVisit: true }), now)).toBeCloseTo(1.3);
    expect(reviewWeight(review({ isPaid: true }), now)).toBeCloseTo(0.2);
    expect(reviewWeight(review({ fakeProbability: 0.75 }), now)).toBeCloseTo(0.25);
  });
  it("se înjumătățește la 180 de zile", () => {
    const old = new Date(now.getTime() - 180 * 86_400_000);
    expect(reviewWeight(review({ postedAt: old }), now)).toBeCloseTo(0.5);
  });
  it("convertește 4,6★ în 9,2", () => {
    expect(toTenScale(4.6)).toBeCloseTo(9.2);
  });
});

describe("Scorul Onest", () => {
  it("3 review-uri de 10 nu bat 400 de review-uri de 9,4", () => {
    const small = honestScore(many(3, { rating: 10 }), 7, now);
    const big = honestScore(many(400, { rating: 9.4 }), 7, now);
    expect(big.score).toBeGreaterThan(small.score);
    expect(small.enoughData).toBe(false);
  });
  it("fără review-uri rămâne media orașului", () => {
    expect(honestScore([], 7.3, now).score).toBe(7.3);
  });
  it("scenariul de demo 3: 20 de review-uri false de 10 în 24h mută scorul cu sub 0,2", () => {
    const base = many(100, { rating: 7 });
    const before = honestScore(base, 7, now).score;
    const fakes = many(20, { rating: 10, authorReviewCount: 1, fakeProbability: 0.9 });
    const after = honestScore([...base, ...fakes], 7, now).score;
    expect(after - before).toBeLessThan(0.2);
  });
  it("calculează separat localnici și turiști", () => {
    const s = splitScores([...many(20, { rating: 5, authorType: "local" }), ...many(20, { rating: 9, authorType: "tourist" })], 7, now);
    expect(s.locals.score).toBeLessThan(s.tourists.score);
    expect(s.locals.reviewCount).toBe(20);
  });
});

describe("Tourist Trap Index", () => {
  it("scenariul de demo 1: terasa din Piața Unirii e capcană, cu motive", () => {
    const t = touristTrapIndex({
      localsScore: 5.1,
      touristsScore: 8.4,
      distanceToTouristZoneM: 40,
      priceRatio: 1.6,
      foreignLanguageShare: 0.7,
      oneTimeVisitorShare: 0.6,
    });
    expect(t.level).toBe("trap");
    expect(t.index).toBeGreaterThanOrEqual(80);
    expect(t.reasons[0]?.signal).toBe("gap");
    expect(t.reasons.every((r) => r.text.length > 0)).toBe(true);
  });
  it("un local de cartier nu primește avertizare", () => {
    const t = touristTrapIndex({
      localsScore: 9.4,
      touristsScore: 8.2,
      distanceToTouristZoneM: 2500,
      priceRatio: 0.9,
      foreignLanguageShare: 0.1,
      oneTimeVisitorShare: 0.2,
    });
    expect(t).toEqual({ index: 0, level: "none", reasons: [] });
  });
});

it("haversine: Piața Unirii → Piața Victoriei ≈ 500 m", () => {
  const d = haversineM({ lat: 45.7579, lng: 21.229 }, { lat: 45.7539, lng: 21.2254 });
  expect(d).toBeGreaterThan(450);
  expect(d).toBeLessThan(600);
});

describe("aspecte adunate pe local", () => {
  it("media ponderată, pe scara 0–10, doar cu minim 3 mențiuni", async () => {
    const { aggregateAspects } = await import("./venue.ts");
    const r = aggregateAspects([
      { weight: 2, aspects: { mancare: 1, servire: -1 } },
      { weight: 1, aspects: { mancare: 0.5 } },
      { weight: 1, aspects: { mancare: 0 } },
    ]);
    expect(r.mancare).toBeCloseTo(8.1, 1);
    expect(r.servire).toBeUndefined();
  });
});
