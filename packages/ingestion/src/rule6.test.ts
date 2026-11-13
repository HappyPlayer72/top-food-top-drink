import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { placeDetails } from "./google.ts";
import { locationReviews } from "./tripadvisor.ts";
import { fetchEmbed } from "./social.ts";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("regula 6: sursele folosesc API-urile oficiale și oEmbed", async () => {
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "test");
  vi.stubEnv("TRIPADVISOR_API_KEY", "test");
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
  vi.stubGlobal("fetch", fetchMock);
  await placeDetails("place");
  await locationReviews("location");
  await fetchEmbed("https://www.tiktok.com/@user/video/1", "tiktok");
  const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
  expect(urls.map((url) => url.origin)).toEqual(["https://places.googleapis.com", "https://api.content.tripadvisor.com", "https://www.tiktok.com"]);
  expect(urls[2]?.pathname).toBe("/oembed");
});

it("regula 6: ingestia nu include biblioteci uzuale de scraping", () => {
  for (const file of readdirSync(import.meta.dirname).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
    expect(readFileSync(join(import.meta.dirname, file), "utf8"), file).not.toMatch(/\b(?:cheerio|puppeteer|playwright|jsdom)\b/);
  }
});
