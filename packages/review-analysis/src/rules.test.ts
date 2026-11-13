import { describe, expect, it } from "vitest";
import { keywordAspects } from "./aspects.ts";
import { adSignals, classifyAuthor, detectLanguage, fakeProbability, fakeSignals, isGeneric, textSimilarity, type FakeContext } from "./rules.ts";

const now = new Date("2026-11-13T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const ctx = (o: Partial<FakeContext> = {}): FakeContext => ({
  rating: 10,
  text: "Am mâncat o ciorbă de burtă foarte bună, porția a fost mare și personalul amabil.",
  postedAt: now,
  authorReviewCount: 12,
  authorHasPhotoOrHistory: true,
  authorRatings: [8, 9, 6, 10],
  authorIsOwnerOrStaff: false,
  venueReviews: [],
  ...o,
});

describe("limbă și autor", () => {
  it("recunoaște româna și engleza", () => {
    expect(detectLanguage("Mâncare foarte bună, porții mari și prețuri corecte pentru centru.")).toBe("ro");
    expect(detectLanguage("The food was great and the staff were really friendly, we will come back.")).toBe("en");
    expect(detectLanguage("Super!")).toBeNull();
  });
  it("turist dacă scrie în altă limbă sau a recenzat multe orașe", () => {
    expect(classifyAuthor({ isVerifiedLocal: true, language: "en" })).toBe("local");
    expect(classifyAuthor({ isVerifiedLocal: false, language: "de" })).toBe("tourist");
    expect(classifyAuthor({ isVerifiedLocal: false, language: "ro", citiesReviewed: 6 })).toBe("tourist");
    expect(classifyAuthor({ isVerifiedLocal: false, language: "ro" })).toBe("unknown");
  });
});

describe("reclamă", () => {
  it("găsește hashtag-uri și formule de colaborare", () => {
    expect(adSignals("Cea mai bună pizza #colaborare")).toHaveLength(1);
    expect(adSignals("Video făcut în colaborare cu localul")).toHaveLength(1);
    expect(adSignals("Am plătit eu, pizza bună")).toHaveLength(0);
  });
});

describe("review-uri false", () => {
  it("un review normal nu are semnale", () => {
    const s = fakeSignals(ctx());
    expect(s).toEqual([]);
    expect(fakeProbability(s)).toBe(0);
  });
  it("rafală de note maxime în 48h", () => {
    const venueReviews = [
      ...Array.from({ length: 6 }, (_, i) => ({ rating: 10, text: null, postedAt: hoursAgo(i * 3) })),
      ...Array.from({ length: 20 }, (_, i) => ({ rating: 7, text: null, postedAt: hoursAgo(24 * 30 * (i + 1)) })),
    ];
    expect(fakeSignals(ctx({ venueReviews }))).toContain("burst");
  });
  it("cont nou cu text generic și texte copiate", () => {
    const s = fakeSignals(
      ctx({
        text: "Super! Recomand!",
        authorReviewCount: 1,
        authorHasPhotoOrHistory: false,
        authorRatings: [],
        venueReviews: [{ rating: 10, text: "Super! Recomand!", postedAt: hoursAgo(5) }],
      }),
    );
    expect(s).toEqual(expect.arrayContaining(["newAccount", "generic", "similarText"]));
    expect(fakeProbability(s)).toBeGreaterThan(0.5);
  });
  it("review-ul proprietarului e aproape sigur fals", () => {
    expect(fakeProbability(fakeSignals(ctx({ authorIsOwnerOrStaff: true })))).toBeGreaterThanOrEqual(0.9);
  });
  it("similaritate și text generic", () => {
    expect(textSimilarity("ciorba de burta foarte buna azi", "ciorba de burta foarte buna azi")).toBe(1);
    expect(textSimilarity("ciorba de burta foarte buna", "pizza cu ton si ceapa rosie")).toBe(0);
    expect(isGeneric("Top, recomand")).toBe(true);
    expect(isGeneric("Ciorba e bună, dar desertul e slab și terasa mică")).toBe(false);
  });
});

it("dicționarul de rezervă găsește aspectele", () => {
  const r = keywordAspects({ id: "1", text: "Ciorba foarte bună. Ospătarul a fost nepoliticos. Cam scump." }, "food");
  expect(r.aspects.mancare).toBeGreaterThan(0);
  expect(r.aspects.servire).toBeLessThan(0);
  expect(r.aspects.pret).toBeLessThan(0);
});
