import { beforeAll, expect, it } from "vitest";
import type { Db } from "@tftd/db";
import { createSessionToken, hashPassword, login, MAX_LOGIN_ATTEMPTS, resetLoginRateLimit, verifyPassword, verifySessionToken } from "./auth.ts";
import { confirmSocialVerification, socialVerificationCode, startSocialVerification } from "./roles.ts";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
});

it("parola: hash diferit de fiecare dată, verificare corectă", async () => {
  const a = await hashPassword("parola-mea-123");
  expect(a).not.toBe(await hashPassword("parola-mea-123"));
  expect(await verifyPassword("parola-mea-123", a)).toBe(true);
  expect(await verifyPassword("alta-parola", a)).toBe(false);
});

it("token de sesiune: valid, modificat sau expirat", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  const token = createSessionToken("user-1", now);
  expect(verifySessionToken(token, now)).toBe("user-1");
  expect(verifySessionToken(token.replace("user-1", "user-2"), now)).toBeNull();
  expect(verifySessionToken(token, new Date("2027-01-01T00:00:00Z"))).toBeNull();
  expect(verifySessionToken(undefined)).toBeNull();
});

it("login blochează după prea multe încercări eșuate (MAX_LOGIN_ATTEMPTS)", async () => {
  resetLoginRateLimit("brute-user");
  const db = {
    select: () => ({ from: () => ({ where: async () => [] }) }),
  } as unknown as Db;
  const now = new Date("2026-11-13T12:00:00Z");
  for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
    await expect(login(db, { login: "brute-user", password: "wrong" }, now)).rejects.toMatchObject({ code: "unauthorized" });
  }
  await expect(login(db, { login: "brute-user", password: "wrong" }, now)).rejects.toMatchObject({ code: "rate_limited" });
  resetLoginRateLimit("brute-user");
});

it("verificarea contului social generează cod și acordă rolul influencer când are ≥ 1000 urmăritori", async () => {
  const updates: unknown[] = [];
  const upserts: unknown[] = [];
  const db = {
    select: () => ({
      from: () => ({
        where: async () => [{ userId: "u-inf", platform: "tiktok", url: "https://www.tiktok.com/@ana", verified: false, followers: 1800 }],
      }),
    }),
    insert: () => ({
      values: (vals: unknown) => ({
        onConflictDoUpdate: async () => {
          upserts.push(vals);
        },
      }),
    }),
    update: () => ({
      set: (vals: unknown) => {
        updates.push(vals);
        return { where: async () => undefined };
      },
    }),
  } as unknown as Db;

  const start = await startSocialVerification(db, "u-inf", { platform: "tiktok", url: "https://www.tiktok.com/@ana", followers: 1800 });
  expect(start.code).toBe(socialVerificationCode("u-inf", "tiktok"));
  expect(upserts[0]).toMatchObject({ verified: false, followers: 1800 });

  await expect(confirmSocialVerification(db, "u-inf", { platform: "tiktok", bioSnippet: "bio fără cod" })).rejects.toMatchObject({ code: "invalid" });

  const done = await confirmSocialVerification(db, "u-inf", { platform: "tiktok", bioSnippet: `Foodie TM ${start.code}`, followers: 1800 });
  expect(done.influencer).toBe(true);
  expect(updates.length).toBeGreaterThan(0);
});
