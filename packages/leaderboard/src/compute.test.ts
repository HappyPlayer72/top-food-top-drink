import { describe, expect, it } from "vitest";
import { eligible, employeeOfMonth, localOfMonth, previousMonth, rankMonth, revelation, type MonthVenue } from "./compute.ts";

const now = new Date("2026-10-31T23:59:59Z");
const review = (o: Partial<MonthVenue["reviews"][number]> = {}): MonthVenue["reviews"][number] => ({
  rating: 8,
  authorType: "local",
  authorIsVerifiedLocal: true,
  authorReviewCount: 5,
  verifiedVisit: false,
  fakeProbability: 0,
  isPaid: false,
  postedAt: new Date("2026-10-15T12:00:00Z"),
  ...o,
});
const venue = (id: string, rating: number, n = 12, o: Partial<MonthVenue["reviews"][number]> = {}): MonthVenue => ({
  venueId: id,
  name: id,
  categories: ["romanesc"],
  reviews: Array.from({ length: n }, () => review({ rating, ...o })),
});

describe("leaderboard lunar", () => {
  it("intră doar localele cu ≥ 10 review-uri de la localnici și fără alertă de fraudă", () => {
    expect(eligible(venue("a", 9, 10))).toBe(true);
    expect(eligible(venue("b", 9, 9))).toBe(false);
    const fraud = venue("c", 9, 12);
    fraud.reviews.push(...Array.from({ length: 3 }, () => review({ fakeProbability: 0.9 })));
    expect(eligible(fraud)).toBe(false);
  });
  it("ordonează după scor și calculează mișcarea față de luna trecută", () => {
    const entries = rankMonth([venue("a", 7), venue("b", 9.5), venue("c", 8.5)], 7, { ranks: new Map([["b", 3], ["a", 1]]), scores: new Map() }, now);
    expect(entries.map((e) => e.venueId)).toEqual(["b", "c", "a"]);
    expect(entries[0]?.movement).toBe(2);
    expect(entries[1]?.movement).toBeNull();
    expect(entries[2]?.movement).toBe(-2);
  });
  it("revelația lunii = cea mai mare creștere", () => {
    const entries = rankMonth([venue("a", 9), venue("b", 8.5)], 7, null, now);
    const r = revelation(entries, { ranks: new Map(), scores: new Map([["a", 8.5], ["b", 6.5]]) });
    expect(r?.venueId).toBe("b");
  });
  it("angajatul lunii ignoră conturile noi și angajații care n-au acceptat", () => {
    const v = venue("a", 9, 5, { servedByEmployeeId: "ioana" });
    v.reviews.push(...Array.from({ length: 10 }, () => review({ servedByEmployeeId: "mihai", authorReviewCount: 1 })));
    v.reviews.push(...Array.from({ length: 10 }, () => review({ servedByEmployeeId: "ascuns" })));
    expect(employeeOfMonth([v], new Map([["ioana", "a"], ["mihai", "a"]]))).toEqual({ employeeId: "ioana", venueId: "a", mentions: 5 });
  });
  it("localnicul lunii", () => {
    const v = venue("a", 9, 3, { authorId: "andreea" });
    v.reviews.push(review({ authorId: "radu" }));
    expect(localOfMonth([v])).toEqual({ userId: "andreea", reviews: 3 });
  });
  it("luna trecută", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(previousMonth("2026-11")).toBe("2026-10");
  });
});
