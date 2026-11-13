import { getTableColumns } from "drizzle-orm";
import { checkins, type Db } from "@tftd/db";
import { expect, it } from "vitest";
import { checkinFromLocation } from "./local.ts";

it("regula 7: check-in-ul stochează ziua și orașul/localul, fără coordonate", async () => {
  const saved: unknown[] = [];
  let selection = 0;
  const db = {
    select: () => {
      const rows = ++selection === 1 ? [{ slug: "timisoara", d: 10 }] : selection === 2 ? [{ id: "local" }] : [{ days: 1 }];
      const query = { from: () => query, groupBy: () => query, orderBy: () => query, limit: async () => rows, where: async () => rows };
      if (selection === 2) query.where = (() => query) as unknown as typeof query.where;
      return query;
    },
    insert: () => ({ values: (value: unknown) => { saved.push(value); return { onConflictDoNothing: async () => undefined }; } }),
  } as unknown as Db;
  await checkinFromLocation(db, "user", { lat: 45.75, lng: 21.22 }, new Date("2026-11-13T12:00:00Z"));
  expect(saved).toEqual([{ userId: "user", citySlug: "timisoara", venueId: "local", day: "2026-11-13" }]);
  expect(Object.keys(getTableColumns(checkins)).sort()).toEqual(["citySlug", "day", "id", "userId", "venueId"].sort());
});
