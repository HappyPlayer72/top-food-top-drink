/**
 * Căutarea pe social media cap-coadă pe o bază de test (sau cea locală), cu API-urile simulate (nicio cerere reală),
 * în tranzacții anulate la final.
 *   TEST_DATABASE_URL=postgresql://…/topfood npx vitest run packages/ingestion/src/social-discover.db.test.ts
 */
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, socialSubmissions, venues, type Db } from "@tftd/db";
import { discoverSocialLinks } from "./jobs.ts";

const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : (null as unknown as Db);
afterAll(async () => {
  await (db as unknown as { $client?: { end: () => Promise<void> } })?.$client?.end();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

class Rollback extends Error {}
async function inTx(fn: (tx: Db) => Promise<void>) {
  await expect(db.transaction(async (tx) => { await fn(tx as unknown as Db); throw new Rollback(); })).rejects.toBeInstanceOf(Rollback);
}

describe.skipIf(!url)("cauta-social", () => {
  it("salvează linkurile relevante ca „găsite automat” și le marchează localul ca fiind căutat", () =>
    inTx(async (tx) => {
      const [v] = await tx.select({ id: venues.id, name: venues.name }).from(venues).where(eq(venues.status, "active")).limit(1);
      // doar acest local e de căutat
      await tx.update(venues).set({ socialSearchedAt: new Date() });
      await tx.update(venues).set({ socialSearchedAt: null }).where(eq(venues.id, v!.id));
      vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
      vi.stubEnv("BRAVE_SEARCH_API_KEY", "b");
      vi.stubGlobal("fetch", vi.fn(async (u: string) => {
        if (u.includes("api.search.brave.com")) {
          return new Response(JSON.stringify({ web: { results: [
            { url: "https://www.tiktok.com/@test/video/123?lang=ro", title: `${v!.name} Timișoara, merită?` },
            { url: "https://www.tiktok.com/@test/video/999", title: "Alt local din Cluj" },
          ] } }));
        }
        if (u.includes("tiktok.com/oembed")) return new Response(JSON.stringify({ title: `${v!.name} Timișoara #ad`, author_name: "test", html: "<blockquote></blockquote>" }));
        return new Response("{}", { status: 404 });
      }));
      const r = await discoverSocialLinks(tx, "timisoara", { staleDays: 7 });
      expect(r).toMatchObject({ venues: 1, links: 1 });
      const rows = await tx.select().from(socialSubmissions).where(eq(socialSubmissions.venueId, v!.id));
      const found = rows.find((x) => x.discoveredVia === "brave")!;
      expect(found).toMatchObject({ url: "https://www.tiktok.com/@test/video/123", platform: "tiktok", status: "processed" });
      expect((found.analysis as { isAd: boolean }).isAd).toBe(true);
      const [after] = await tx.select({ at: venues.socialSearchedAt }).from(venues).where(eq(venues.id, v!.id));
      expect(after!.at).not.toBeNull();
      // a doua rulare nu caută din nou același local
      expect(await discoverSocialLinks(tx, "timisoara", { staleDays: 7 })).toMatchObject({ venues: 0 });
    }));
});
