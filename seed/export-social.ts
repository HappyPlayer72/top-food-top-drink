/**
 * Salvează linkurile de social media găsite automat (jobul cauta-social) în seed/data/social-snapshot.json,
 * ca `npm run seed` să le reîncarce fără nicio căutare (colegii nu au nevoie de chei).
 *
 *   npx tsx --env-file-if-exists=.env seed/export-social.ts
 *
 * Păstrăm doar linkul, platforma, titlul, sursa și analiza „reclamă?”; postările rămân pe platforma lor.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNotNull } from "drizzle-orm";
import { createDb, socialSubmissions, venues } from "@tftd/db";

export type SocialSnapshotLink = {
  venueSlug: string;
  vertical: "food" | "drink";
  url: string;
  platform: "tiktok" | "instagram" | "facebook" | "youtube";
  title: string | null;
  via: "youtube" | "brave" | "google_cse";
  analysis: unknown;
};
export type SocialSnapshot = { exportedAt: string; links: SocialSnapshotLink[] };

const db = createDb();
const rows = await db
  .select({ venueSlug: venues.slug, vertical: venues.vertical, url: socialSubmissions.url, platform: socialSubmissions.platform, title: socialSubmissions.title, via: socialSubmissions.discoveredVia, analysis: socialSubmissions.analysis })
  .from(socialSubmissions)
  .innerJoin(venues, eq(venues.id, socialSubmissions.venueId))
  .where(and(isNotNull(socialSubmissions.discoveredVia), eq(socialSubmissions.status, "processed")));

const snapshot: SocialSnapshot = {
  exportedAt: new Date().toISOString(),
  links: rows.map((r) => ({ ...r, via: r.via! })).sort((a, b) => a.venueSlug.localeCompare(b.venueSlug) || a.url.localeCompare(b.url)),
};
const dir = join(import.meta.dirname, "data");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "social-snapshot.json"), JSON.stringify(snapshot, null, 1) + "\n");
console.log(`Salvat: ${snapshot.links.length} linkuri de pe social media → seed/data/social-snapshot.json`);
await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
