/**
 * Caută postări despre un local pe social media, doar prin API-uri oficiale (regula 6, fără scraping):
 * - YouTube Data API v3 (search.list) — GOOGLE_PLACES_API_KEY, cu „YouTube Data API v3” activat în proiect;
 * - Brave Search API — BRAVE_SEARCH_API_KEY;
 * - Google Custom Search JSON API — GOOGLE_CSE_ID + GOOGLE_PLACES_API_KEY (dacă Google refuză, e sărit).
 * Întoarce doar linkuri TikTok / Instagram / Facebook / YouTube care chiar vorbesc despre local și Timișoara.
 */
import { detectPlatform, type Platform } from "./social.ts";

export type Provider = "youtube" | "brave" | "google_cse";
export type SearchHit = { url: string; title: string; snippet: string; via: Provider };
export type SocialLink = SearchHit & { platform: Platform };

/** Plafonul de cereri pentru rularea curentă (jobul îl setează din SOCIAL_MAX_REQUESTS). */
let budget: number | null = null;
let used = 0;
export class SocialBudgetExceeded extends Error {}
export function limitSocialRequests(max: number | null) {
  budget = max;
  used = 0;
}
export const socialRequestsUsed = () => used;

async function call(url: string, init?: RequestInit): Promise<Response> {
  if (budget !== null && used >= budget) throw new SocialBudgetExceeded(`Plafonul de ${budget} căutări pe social media s-a atins; m-am oprit.`);
  used++;
  return fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
}

/** Ce surse sunt configurate (fără cheie, sursa e sărită). */
export function activeProviders(): Provider[] {
  const p: Provider[] = [];
  if (process.env.GOOGLE_PLACES_API_KEY && process.env.SOCIAL_YOUTUBE !== "off") p.push("youtube");
  if (process.env.BRAVE_SEARCH_API_KEY) p.push("brave");
  if (process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_CSE_ID) p.push("google_cse");
  return p;
}

const SITES = "(site:tiktok.com OR site:instagram.com OR site:facebook.com)";

export async function searchYouTube(query: string): Promise<SearchHit[]> {
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  u.searchParams.set("part", "snippet");
  u.searchParams.set("type", "video");
  u.searchParams.set("maxResults", "5");
  u.searchParams.set("q", query);
  u.searchParams.set("relevanceLanguage", "ro");
  u.searchParams.set("regionCode", "RO");
  u.searchParams.set("key", process.env.GOOGLE_PLACES_API_KEY!);
  const res = await call(u.toString());
  if (!res.ok) throw new Error(`YouTube ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { items?: { id?: { videoId?: string }; snippet?: { title?: string; description?: string } }[] };
  return (json.items ?? [])
    .filter((i) => i.id?.videoId)
    .map((i) => ({ url: `https://www.youtube.com/watch?v=${i.id!.videoId}`, title: i.snippet?.title ?? "", snippet: i.snippet?.description ?? "", via: "youtube" as const }));
}

export async function searchBrave(query: string): Promise<SearchHit[]> {
  const u = new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q", `${query} ${SITES}`);
  u.searchParams.set("count", "10");
  u.searchParams.set("country", "RO");
  const res = await call(u.toString(), { headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY! } });
  if (!res.ok) throw new Error(`Brave ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { web?: { results?: { url: string; title?: string; description?: string }[] } };
  return (json.web?.results ?? []).map((r) => ({ url: r.url, title: r.title ?? "", snippet: r.description ?? "", via: "brave" as const }));
}

export async function searchGoogleCse(query: string): Promise<SearchHit[]> {
  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("q", `${query} ${SITES}`);
  u.searchParams.set("cx", process.env.GOOGLE_CSE_ID!);
  u.searchParams.set("num", "10");
  u.searchParams.set("key", process.env.GOOGLE_PLACES_API_KEY!);
  const res = await call(u.toString());
  if (!res.ok) throw new Error(`Google Custom Search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { items?: { link: string; title?: string; snippet?: string }[] };
  return (json.items ?? []).map((r) => ({ url: r.link, title: r.title ?? "", snippet: r.snippet ?? "", via: "google_cse" as const }));
}

const SEARCHERS: Record<Provider, (q: string) => Promise<SearchHit[]>> = { youtube: searchYouTube, brave: searchBrave, google_cse: searchGoogleCse };

/** Litere mici, fără diacritice și semne (spre deosebire de normalizeName din matching, păstrează și orașul). */
const plain = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Cuvintele din nume care contează (fără „restaurant”, „bar” etc.). */
const GENERIC = new Set(["restaurant", "restaurantul", "bistro", "bar", "pub", "cafe", "caffe", "cafenea", "club", "pizzeria", "pizza", "the", "si", "de", "la", "lounge", "timisoara"]);
const keyWords = (name: string) => plain(name).split(" ").filter((w) => w.length >= 3 && !GENERIC.has(w));

const safeDecode = (u: string) => { try { return decodeURIComponent(u); } catch { return u; } };

/** Linkul curățat (fără parametri de urmărire), ca același clip să nu intre de două ori. */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtube.com") && u.searchParams.get("v")) return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * Păstrează doar postările despre acest local: platformă cunoscută, numele localului (cuvintele lui importante)
 * în titlu sau descriere, și Timișoara (sau linkul e chiar pe contul localului). Max `limit` linkuri, cel mult 2 de pe aceeași platformă.
 */
export function relevantLinks(venueName: string, hits: SearchHit[], limit = 3): SocialLink[] {
  const words = keyWords(venueName);
  if (!words.length) return [];
  const seen = new Set<string>();
  const perPlatform = new Map<Platform, number>();
  const out: SocialLink[] = [];
  for (const h of hits) {
    const platform = detectPlatform(h.url);
    if (!platform) continue;
    const url = cleanUrl(h.url);
    if (seen.has(url)) continue;
    const text = ` ${plain(`${h.title} ${h.snippet} ${safeDecode(url)}`)} `;
    const nameOk = words.every((w) => text.includes(` ${w} `));
    const cityOk = text.includes("timisoara") || text.includes("temeswar") || words.some((w) => plain(url).includes(w));
    if (!nameOk || !cityOk) continue;
    if ((perPlatform.get(platform) ?? 0) >= 2) continue;
    seen.add(url);
    perPlatform.set(platform, (perPlatform.get(platform) ?? 0) + 1);
    out.push({ ...h, url, platform });
    if (out.length >= limit) break;
  }
  return out;
}

/** Caută un local pe toate sursele active. O sursă care dă eroare e sărită (și raportată), nu oprește restul. */
export async function searchSocialForVenue(venueName: string, providers = activeProviders()) {
  const query = `"${venueName}" Timișoara`;
  const hits: SearchHit[] = [];
  const errors: string[] = [];
  for (const p of providers) {
    try {
      hits.push(...(await SEARCHERS[p](p === "youtube" ? `${venueName} Timișoara` : query)));
    } catch (e) {
      if (e instanceof SocialBudgetExceeded) throw e;
      errors.push(`${p}: ${(e as Error).message}`);
    }
  }
  return { links: relevantLinks(venueName, hits), errors };
}
