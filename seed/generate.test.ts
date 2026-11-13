import { expect, it } from "vitest";
import { generate } from "./generate.ts";
import { SEED_VENUES } from "./venues.ts";

const now = new Date("2026-11-13T12:00:00Z");

it("30 de locale: 20 food, 10 drink, sluguri unice", () => {
  expect(SEED_VENUES.filter((v) => v.vertical === "food")).toHaveLength(20);
  expect(SEED_VENUES.filter((v) => v.vertical === "drink")).toHaveLength(10);
  expect(new Set(SEED_VENUES.map((v) => v.slug)).size).toBe(30);
});

it("e determinist", () => {
  expect(generate(SEED_VENUES, now).reviews.length).toBe(generate(SEED_VENUES, now).reviews.length);
  expect(generate(SEED_VENUES, now).reviews[5]?.text).toBe(generate(SEED_VENUES, now).reviews[5]?.text);
});

it("favoritul localnicilor are destui localnici în luna trecută pentru top", () => {
  const { users, reviews } = generate(SEED_VENUES, now);
  const locals = new Set(users.filter((u) => u.localNeighborhood).map((u) => u.key));
  const october = reviews.filter(
    (r) => r.venueSlug === "ciorba-lui-sandu" && r.authorKey && locals.has(r.authorKey) && r.postedAt.getUTCMonth() === 9,
  );
  expect(october.length).toBeGreaterThanOrEqual(10);
});

it("rafala de review-uri false e în ultimele 24h", () => {
  const fakes = generate(SEED_VENUES, now).reviews.filter((r) => r.authorKey?.startsWith("fake"));
  expect(fakes).toHaveLength(20);
  expect(fakes.every((r) => now.getTime() - r.postedAt.getTime() <= 86_400_000)).toBe(true);
});
