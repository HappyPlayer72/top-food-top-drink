import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as owner from "./index.ts";

it("regula 2: owner-ul poate răspunde și raporta, fără să modifice sau șteargă review-uri", () => {
  expect(owner.replyToReview).toBeTypeOf("function");
  expect(owner.reportReview).toBeTypeOf("function");
  const source = readFileSync(new URL("./owner.ts", import.meta.url), "utf8");
  expect(source).not.toMatch(/\.delete\s*\(\s*reviews\s*\)|\.update\s*\(\s*reviews\s*\)/);
});
