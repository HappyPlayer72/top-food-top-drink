import { describe, expect, it } from "vitest";
import { categoryBadges, stopsMatchTour, THEMED_TOURS, type BadgeReview } from "./tours.ts";

const review = (venueId: string, over: Partial<BadgeReview> = {}): BadgeReview => ({
  venueId,
  categories: ["pizza"],
  status: "published",
  fakeProbability: 0,
  isPaid: false,
  verifiedVisit: false,
  ...over,
});
const many = (n: number, over: Partial<BadgeReview> = {}) => Array.from({ length: n }, (_, i) => review(`v${i}`, over));

describe("insigne de categorie", () => {
  it("numără localuri diferite: zece review-uri la același local nu dau Bronz", () => {
    expect(categoryBadges(Array.from({ length: 10 }, () => review("acelasi")))).toEqual([]);
    expect(categoryBadges(many(3))).toEqual([{ category: "pizza", level: "bronze", venues: 3, verifiedVenues: 0 }]);
  });

  it("nu numără review-urile ascunse, reținute, suspecte sau plătite", () => {
    const rows = [
      ...many(2),
      review("ascuns", { status: "hidden" }),
      review("retinut", { status: "flagged" }),
      review("suspect", { fakeProbability: 0.7 }),
      review("platit", { isPaid: true }),
    ];
    expect(categoryBadges(rows)).toEqual([]);
  });

  it("Argint la 10 localuri, chiar fără vizite verificate; Aur doar cu 25 verificate", () => {
    expect(categoryBadges(many(30))[0]).toMatchObject({ level: "silver", venues: 30, verifiedVenues: 0 });
    expect(categoryBadges(many(25, { verifiedVisit: true }))[0]).toMatchObject({ level: "gold", verifiedVenues: 25 });
    expect(categoryBadges([...many(24, { verifiedVisit: true }), review("x")])[0]).toMatchObject({ level: "silver" });
  });

  it("un local verificat o dată rămâne verificat chiar dacă are și un review neverificat", () => {
    const rows = [...many(25, { verifiedVisit: true }), ...many(25)];
    expect(categoryBadges(rows)[0]).toMatchObject({ level: "gold", venues: 25, verifiedVenues: 25 });
  });

  it("un local cu mai multe categorii contează la fiecare; cele mai înalte niveluri primele", () => {
    const rows = [...many(10, { categories: ["romanesc", "bistro"] }), ...many(3, { categories: ["pub"] }).map((r, i) => ({ ...r, venueId: `p${i}` }))];
    expect(categoryBadges(rows).map((b) => [b.category, b.level])).toEqual([
      ["bistro", "silver"],
      ["romanesc", "silver"],
      ["pub", "bronze"],
    ]);
  });
});

describe("tururi tematice", () => {
  const tour = (slug: string) => THEMED_TOURS.find((t) => t.slug === slug)!;

  it("au slug-uri unice, 2–3 opriri și o listă de localuri pentru fiecare categorie", () => {
    expect(new Set(THEMED_TOURS.map((t) => t.slug)).size).toBe(THEMED_TOURS.length);
    for (const t of THEMED_TOURS) {
      expect(t.stops >= 2 && t.stops <= 3 && t.categories.length <= t.stops).toBe(true);
      expect(Object.keys(t.venues).sort()).toEqual([...t.categories].sort());
      expect(new Set(Object.values(t.venues).flat()).size).toBeGreaterThanOrEqual(t.stops);
    }
  });

  it("acceptă doar opriri din lista temei", () => {
    expect(stopsMatchTour(tour("bere-pe-bega"), ["darc-pe-mal", "beraria-700", "the-80s-pub"])).toBe(true);
    expect(stopsMatchTour(tour("bere-pe-bega"), ["darc-pe-mal", "beraria-700", "casa-bunicii"])).toBe(false);
  });

  it("două beri nu completează „Românesc + o bere”: fiecare categorie are oprirea ei", () => {
    expect(stopsMatchTour(tour("romanesc-si-o-bere"), ["darc-pe-mal", "beraria-700"])).toBe(false);
    expect(stopsMatchTour(tour("romanesc-si-o-bere"), ["casa-bunicii", "restaurant-nora"])).toBe(false);
    expect(stopsMatchTour(tour("romanesc-si-o-bere"), ["gradina-banateana", "darc-pe-mal"])).toBe(true);
  });

  it("un local din două liste poate acoperi o singură categorie", () => {
    const both = { ...tour("romanesc-si-o-bere"), venues: { romanian: ["a", "b"], beer: ["a"] } };
    expect(stopsMatchTour(both, ["a", "b"])).toBe(true);
    expect(stopsMatchTour(both, ["b", "a"])).toBe(true);
    expect(stopsMatchTour({ ...both, venues: { romanian: ["a"], beer: ["a"] } }, ["a", "c"])).toBe(false);
  });
});
