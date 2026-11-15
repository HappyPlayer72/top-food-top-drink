import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanUrl, limitSocialRequests, relevantLinks, searchSocialForVenue, SocialBudgetExceeded, type SearchHit } from "./social-search.ts";

const hit = (url: string, title: string, snippet = "", via: SearchHit["via"] = "brave"): SearchHit => ({ url, title, snippet, via });

describe("relevantLinks", () => {
  it("păstrează doar postările despre local și Timișoara, pe platforme cunoscute", () => {
    const links = relevantLinks("Restaurant Nora", [
      hit("https://www.tiktok.com/@foodie/video/1", "Am mâncat la Nora în Timișoara", "ciorbă de burtă"),
      hit("https://www.instagram.com/p/abc/", "Nora Timisoara", "cel mai bun prânz"),
      hit("https://www.tiktok.com/@x/video/2", "Nora în București", "altă locație"),
      hit("https://www.tripadvisor.com/nora", "Nora Timișoara"),
      hit("https://www.facebook.com/p/3", "Restaurant bun în Timișoara", "fără nume"),
    ]);
    expect(links.map((l) => l.platform)).toEqual(["tiktok", "instagram"]);
  });

  it("max 3 linkuri, cel mult 2 de pe aceeași platformă, fără duplicate", () => {
    const many = [1, 2, 3, 4].map((i) => hit(`https://www.tiktok.com/@a/video/${i}?is_from_webapp=1`, "Scârț Loc Lejer Timișoara"));
    many.push(hit("https://www.tiktok.com/@a/video/1", "Scârț Loc Lejer Timișoara"));
    many.push(hit("https://www.youtube.com/watch?v=xyz&t=10", "Scârț Loc Lejer Timisoara vlog", "", "youtube"));
    const links = relevantLinks("Scârț Loc Lejer", many);
    expect(links).toHaveLength(3);
    expect(links.filter((l) => l.platform === "tiktok")).toHaveLength(2);
    expect(links.find((l) => l.platform === "youtube")?.url).toBe("https://www.youtube.com/watch?v=xyz");
  });

  it("un nume doar generic nu caută nimic", () => {
    expect(relevantLinks("Restaurant Bar", [hit("https://www.tiktok.com/@a/video/1", "Restaurant Bar Timișoara")])).toEqual([]);
  });

  it("cleanUrl scoate parametrii de urmărire", () => {
    expect(cleanUrl("https://www.instagram.com/p/abc/?igsh=123")).toBe("https://www.instagram.com/p/abc");
  });
});

describe("searchSocialForVenue", () => {
  afterEach(() => {
    limitSocialRequests(null);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("o sursă care pică nu le oprește pe celelalte, iar plafonul oprește înainte de cerere", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "k");
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "b");
    vi.stubEnv("GOOGLE_CSE_ID", "");
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("youtube")
        ? new Response("quota", { status: 403 })
        : new Response(JSON.stringify({ web: { results: [{ url: "https://www.tiktok.com/@a/video/9", title: "Faber Timișoara brunch" }] } })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const r = await searchSocialForVenue("FABER");
    expect(r.links.map((l) => l.url)).toEqual(["https://www.tiktok.com/@a/video/9"]);
    expect(r.errors[0]).toMatch(/^youtube: YouTube 403/);

    limitSocialRequests(1);
    await expect(searchSocialForVenue("FABER")).rejects.toBeInstanceOf(SocialBudgetExceeded);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
