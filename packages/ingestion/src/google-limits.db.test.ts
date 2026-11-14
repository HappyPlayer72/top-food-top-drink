/**
 * Limitele Google din site, pe o bază de test (sau cea locală), în tranzacții anulate la final.
 *   TEST_DATABASE_URL=postgresql://…/topfood npx vitest run packages/ingestion/src/google-limits.db.test.ts
 */
import { afterAll, describe, expect, it } from "vitest";
import { createDb, googleApiCalls, users, type Db } from "@tftd/db";
import { GOOGLE_LIMITS, recordSearchResults, reserveGoogleAdd, reserveGoogleSearch } from "./google-limits.ts";

const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : (null as unknown as Db);
afterAll(async () => {
  await (db as unknown as { $client?: { end: () => Promise<void> } })?.$client?.end();
});

class Rollback extends Error {}
async function inTx(fn: (tx: Db) => Promise<void>) {
  await expect(
    db.transaction(async (tx) => {
      await fn(tx as unknown as Db);
      throw new Rollback();
    }),
  ).rejects.toBeInstanceOf(Rollback);
}
let n = 0;
const newUser = async (tx: Db) =>
  (await tx.insert(users).values({ username: `glim_${Date.now()}_${n++}`, displayName: "Test", roles: ["user"] }).returning({ id: users.id }))[0]!.id;

describe.skipIf(!url)("limitele Google din site", () => {
  it("3 căutări per cont în 48 de ore, apoi refuză și spune când se poate din nou", () =>
    inTx(async (tx) => {
      const u = await newUser(tx);
      const now = new Date();
      const results = [];
      for (let i = 0; i < 4; i++) results.push(await reserveGoogleSearch(tx, u, now));
      expect(results.slice(0, 3).map((r) => r.ok)).toEqual([true, true, true]);
      expect(results[2]).toMatchObject({ ok: true, remaining: 0 });
      expect(results[3]).toMatchObject({ ok: false, reason: "user" });
      // după 48 de ore se poate din nou
      expect((await reserveGoogleSearch(tx, u, new Date(now.getTime() + 49 * 3_600_000))).ok).toBe(true);
    }));

  it("plafonul pe tot site-ul oprește și un cont nou", () =>
    inTx(async (tx) => {
      const filler = await newUser(tx);
      await tx.insert(googleApiCalls).values(Array.from({ length: GOOGLE_LIMITS.sitePerDay }, () => ({ userId: filler, kind: "add" as const })));
      expect(await reserveGoogleSearch(tx, await newUser(tx))).toMatchObject({ ok: false, reason: "site" });
    }));

  it("„Adaugă” merge doar pentru un loc găsit de același cont", () =>
    inTx(async (tx) => {
      const a = await newUser(tx);
      const b = await newUser(tx);
      const slot = await reserveGoogleSearch(tx, a);
      if (!slot.ok) throw new Error("căutarea trebuia să meargă");
      await recordSearchResults(tx, slot.callId, ["place-1"]);
      expect((await reserveGoogleAdd(tx, a, "place-1")).ok).toBe(true);
      expect((await reserveGoogleAdd(tx, a, "place-inventat")).ok).toBe(false);
      expect((await reserveGoogleAdd(tx, b, "place-1")).ok).toBe(false);
    }));
});
