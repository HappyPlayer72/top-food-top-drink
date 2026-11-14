import { expect, it } from "vitest";
import type { Db } from "@tftd/db";
import { decideReceipt, decideSuspiciousAccount, queue, resolveReport } from "./moderation.ts";

it("moderarea respinge utilizatorii fără rol de admin", async () => {
  const db = { select: () => ({ from: () => ({ where: async () => [{ roles: ["user"] }] }) }) } as unknown as Db;
  await expect(queue(db, "user")).rejects.toMatchObject({ code: "forbidden" });
  await expect(resolveReport(db, "user", "report", "hide", "motiv")).rejects.toMatchObject({ code: "forbidden" });
});

it("un admin poate ascunde un review raportat și înregistrează decizia", async () => {
  let selects = 0;
  const updates: unknown[] = [];
  const db = {
    select: () => ({ from: () => ({ where: async () => ++selects === 1 ? [{ roles: ["admin"] }] : [{ status: "open", targetType: "review", targetId: "review" }] }) }),
    update: () => ({ set: (values: unknown) => { updates.push(values); return { where: async () => undefined }; } }),
  } as unknown as Db;
  await resolveReport(db, "admin", "report", "hide", "review fals");
  expect(updates).toEqual([{ status: "hidden" }, expect.objectContaining({ status: "resolved", decision: "hide: review fals", decidedBy: "admin" })]);
});


it("coada conține datele cazurilor necesare deciziei", async () => {
  const rows = [
    [{ roles: ["admin"] }],
    [{ report: { id: "r", targetType: "review", targetId: "review", reason: "motiv" }, review: { text: "Mâncare bună", rating: 8, postedAt: new Date("2026-01-01"), source: "native", externalAuthor: null }, reviewVenue: { name: "Local", address: "Strada 1" }, author: { username: "ana", displayName: "Ana" }, venue: null },
     { report: { id: "a", targetType: "trap_appeal", targetId: "venue", reason: "contest" }, review: null, reviewVenue: null, author: null, venue: { name: "Local", address: "Strada 1", touristTrapIndex: 70, scoreExplanation: { trapReasons: [] } } }],
    [{ match: { id: "m", payload: { name: "Local extern" } }, venue: { name: "Local", address: "Strada 1" } }],
    [{ claim: { id: "c", cui: "123" }, venue: { name: "Local", address: "Strada 1" }, user: { username: "ana", displayName: "Ana" } }],
    [{ id: "rev-receipt", venueId: "ven-1", rating: 9, text: "Paste proaspete", receiptPhotoUrl: "data:image/jpeg;base64,abc", postedAt: new Date("2026-01-02"), venue: { name: "Local", address: "Strada 1" }, author: { username: "ana", displayName: "Ana" } }],
    [{ userId: "sus-1", username: "bot1", displayName: "Bot 1", roles: ["user"], rating: 10, fakeProbability: 0.9, fakeSignals: ["burst"], postedAt: new Date("2026-01-03") }],
    [],
  ];
  const db = {
    execute: async () => undefined,
    select: () => {
      const row = rows.shift();
      const chain = { from: () => chain, leftJoin: () => chain, innerJoin: () => chain, where: () => chain, orderBy: async () => row, then: (resolve: (value: unknown) => void) => resolve(row) };
      return chain;
    },
  } as unknown as Db;
  const result = await queue(db, "admin");
  expect(result.reports[0]).toMatchObject({ reason: "motiv", review: { text: "Mâncare bună", rating: 8, author: { username: "ana" }, venue: { name: "Local" } } });
  expect(result.reports[1]).toMatchObject({ venue: { touristTrapIndex: 70, scoreExplanation: { trapReasons: [] } } });
  expect(result.matches[0]).toMatchObject({ venue: { name: "Local" }, payload: { name: "Local extern" } });
  expect(result.claims[0]).toMatchObject({ cui: "123", user: { username: "ana" }, venue: { name: "Local" } });
  expect(result.receipts[0]).toMatchObject({ id: "rev-receipt", venue: { name: "Local" }, author: { username: "ana" } });
  expect(result.suspiciousAccounts[0]).toMatchObject({ userId: "sus-1", username: "bot1", reasons: expect.arrayContaining(["Review cu probabilitate falsă ≥ 80%", "Rafală coordonată de note maxime"]) });
});

it("decideReceipt respinge un bon fără să recalculeze scorul", async () => {
  const rows = [
    [{ roles: ["admin"] }],
    [{ id: "rev-1", venueId: "ven-1" }],
  ];
  const updates: unknown[] = [];
  const db = {
    execute: async () => undefined,
    select: () => ({ from: () => ({ where: async () => rows.shift() }) }),
    update: () => ({ set: (values: unknown) => { updates.push(values); return { where: async () => undefined }; } }),
  } as unknown as Db;
  await decideReceipt(db, "admin", "rev-1", false);
  expect(updates).toEqual([{ verifiedVisit: false, receiptStatus: "rejected" }]);
});

it("decideSuspiciousAccount poate ignora un cont și salvează decizia", async () => {
  const inserted: unknown[] = [];
  const db = {
    execute: async () => undefined,
    select: () => ({ from: () => ({ where: async () => [{ roles: ["admin"] }] }) }),
    insert: () => ({ values: async (values: unknown) => { inserted.push(values); } }),
  } as unknown as Db;
  await decideSuspiciousAccount(db, "admin", "sus-1", "dismiss");
  expect(inserted).toEqual([expect.objectContaining({ targetType: "suspicious_user", targetId: "sus-1", decision: "dismiss", decidedBy: "admin" })]);
});
