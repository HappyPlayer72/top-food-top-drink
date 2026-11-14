import { expect, it, vi } from "vitest";
import type { Db } from "@tftd/db";
import { deleteReview, editReview, MAX_REVIEWS_PER_HOUR, MAX_VIBES_PER_HOUR, resetApiRateLimits, submitVibe, writeReview } from "./actions.ts";

vi.mock("@tftd/review-analysis", () => ({
  analyzeVenueReviews: vi.fn(async () => undefined),
}));

vi.mock("@tftd/scoring", () => ({
  recalculateCity: vi.fn(async () => undefined),
  PRIOR_WEIGHT: 5,
  POSSIBLE_TRAP: 45,
  TRAP: 65,
}));

it("editReview și deleteReview verifică autorul și recalculează orașul", async () => {
  const deletedWhere: unknown[] = [];
  const updates: unknown[] = [];
  const rows = [
    [{ id: "rev-1", authorId: "other-user", source: "native", venueId: "ven-1" }],
    [{ id: "rev-1", authorId: "u-1", source: "native", venueId: "ven-1" }],
    [{ id: "ven-1", citySlug: "timisoara", vertical: "food" }],
    [{ id: "rev-1", authorId: "u-1", rating: 9, text: "Text actualizat foarte clar și util" }],
    [{ id: "rev-1", authorId: "u-1", source: "native", venueId: "ven-1" }],
    [{ id: "ven-1", citySlug: "timisoara", vertical: "food" }],
  ];
  const db = {
    execute: async () => undefined,
    select: () => ({ from: () => ({ where: async () => rows.shift() }) }),
    update: () => ({ set: (v: unknown) => { updates.push(v); return { where: async () => undefined }; } }),
    delete: () => ({ where: async (w: unknown) => { deletedWhere.push(w); } }),
  } as unknown as Db;

  await expect(
    editReview(db, "u-1", { reviewId: "rev-1", rating: 9, text: "Text actualizat foarte clar și util" }),
  ).rejects.toMatchObject({ code: "forbidden" });

  const edited = await editReview(db, "u-1", { reviewId: "rev-1", rating: 9, text: "Text actualizat foarte clar și util" });
  expect(edited.rating).toBe(9);
  expect(updates[0]).toMatchObject({ rating: 9, text: "Text actualizat foarte clar și util" });

  const del = await deleteReview(db, "u-1", "rev-1");
  expect(del).toEqual({ deleted: true });
  expect(deletedWhere).toHaveLength(1);
});

it("writeReview aplică limita orară MAX_REVIEWS_PER_HOUR", async () => {
  const db = {
    execute: async () => undefined,
    select: () => ({ from: () => ({ where: async () => [{ n: MAX_REVIEWS_PER_HOUR }] }) }),
  } as unknown as Db;

  await expect(
    writeReview(db, "u-spam", { venueId: "v-1", rating: 8, text: "Un text suficient de lung pentru un review valid." }),
  ).rejects.toMatchObject({ code: "rate_limited" });
});

it("submitVibe aplică limita orară pentru utilizatori autentificați și anonimi", async () => {
  resetApiRateLimits();
  const dbAuthLimit = {
    select: () => ({
      from: () => ({
        where: async () => {
          return [{ vertical: "drink", n: MAX_VIBES_PER_HOUR }];
        },
      }),
    }),
  } as unknown as Db;

  await expect(submitVibe(dbAuthLimit, "u-vibe", "v-bar", 4)).rejects.toMatchObject({ code: "rate_limited" });

  let calls = 0;
  const dbAnon = {
    select: () => ({ from: () => ({ where: async () => [{ vertical: "drink" }] }) }),
    insert: () => ({
      values: () => ({
        returning: async () => [{ id: `vb-${++calls}`, level: 3 }],
      }),
    }),
  } as unknown as Db;

  const now = new Date("2026-11-14T21:00:00Z");
  for (let i = 0; i < MAX_VIBES_PER_HOUR; i++) {
    await submitVibe(dbAnon, null, "v-bar-anon", 3, now);
  }
  await expect(submitVibe(dbAnon, null, "v-bar-anon", 3, now)).rejects.toMatchObject({ code: "rate_limited" });
  resetApiRateLimits();
});
