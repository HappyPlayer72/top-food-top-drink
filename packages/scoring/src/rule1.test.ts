/** Regula 1: plata nu schimbă scorul. scoring și leaderboard nu au voie să citească date de monetizare. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const FORBIDDEN = /\b(partnerships|adSlots|@tftd\/monetization)\b/;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(join(dir, e.name)) : e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") ? [join(dir, e.name)] : [],
  );
}

it.each(["scoring", "leaderboard"])("packages/%s nu atinge monetizarea", (pkg) => {
  const dir = join(import.meta.dirname, "..", "..", pkg, "src");
  for (const file of sources(dir)) {
    expect(readFileSync(file, "utf8"), file).not.toMatch(FORBIDDEN);
  }
});
