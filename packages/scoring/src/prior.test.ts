import { describe, expect, it } from "vitest";
import { honestScore, priorMean } from "./honest.ts";

describe("priorMean (punctul de pornire din nota Google)", () => {
  it("fără notă Google pornește de la media orașului", () => {
    expect(priorMean(8)).toBe(8);
    expect(priorMean(8, { rating5: 4.5, count: 0 })).toBe(8);
  });
  it("multe note Google → aproape de nota Google; puține → aproape de media orașului", () => {
    const many = priorMean(8, { rating5: 4.5, count: 3952 }); // n plafonat la 500
    const few = priorMean(8, { rating5: 4.9, count: 12 });
    expect(many).toBeCloseTo((50 * 8 + 500 * 9) / 550, 2);
    expect(few).toBeLessThan(8.4);
    expect(many).toBeGreaterThan(few);
  });
  it("review-urile analizate corectează punctul de pornire", () => {
    const prior = priorMean(8, { rating5: 4.5, count: 3952 });
    const bad = honestScore(Array.from({ length: 5 }, () => ({ rating: 3, authorType: "local", authorIsVerifiedLocal: true, authorReviewCount: 10, verifiedVisit: true, fakeProbability: 0, isPaid: false, postedAt: new Date() })) as never, prior);
    expect(bad.score).toBeLessThan(prior);
  });
});
