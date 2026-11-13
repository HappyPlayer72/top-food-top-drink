import { beforeAll, expect, it } from "vitest";
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from "./auth.ts";

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
