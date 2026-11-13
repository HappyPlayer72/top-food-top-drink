import { expect, it } from "vitest";
import { signCode } from "./loyalty.ts";

it("codul QR depinde de minut și de secret", () => {
  const a = signCode("p1", 100, "secret-a");
  expect(a.startsWith("p1.100.")).toBe(true);
  expect(signCode("p1", 100, "secret-a")).toBe(a);
  expect(signCode("p1", 101, "secret-a")).not.toBe(a);
  expect(signCode("p1", 100, "secret-b")).not.toBe(a);
});
