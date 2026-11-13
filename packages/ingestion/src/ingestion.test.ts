import { describe, expect, it } from "vitest";
import { toExternalPlace, toReviewRow } from "./google.ts";
import { detectPlatform } from "./social.ts";
import { toReviewRow as taReview } from "./tripadvisor.ts";

describe("Google Places", () => {
  it("transformă un Place în local extern", () => {
    const p = toExternalPlace(
      {
        id: "ChIJ123",
        displayName: { text: "Pizzeria Exemplu" },
        location: { latitude: 45.75, longitude: 21.22 },
        rating: 4.6,
        userRatingCount: 812,
        priceLevel: "PRICE_LEVEL_MODERATE",
        primaryType: "pizza_restaurant",
        nationalPhoneNumber: "0256 000 000",
      },
      "timisoara",
      "food",
    );
    expect(p).toMatchObject({ source: "google", externalId: "ChIJ123", name: "Pizzeria Exemplu", lat: 45.75, categories: ["pizza"], priceLevel: 2, rating: 4.6 });
  });
  it("review Google: 4★ → 8/10, limba originală", () => {
    const r = toReviewRow(
      { name: "places/x/reviews/y", rating: 4, originalText: { text: "Great food", languageCode: "en" }, publishTime: "2026-10-01T10:00:00Z" },
      "v1",
    );
    expect(r).toMatchObject({ rating: 8, originalScale: 5, language: "en", externalId: "places/x/reviews/y" });
  });
});

it("review Tripadvisor: titlu + text, limba", () => {
  const r = taReview({ id: 7, lang: "de", published_date: "2026-10-02T10:00:00Z", rating: 3, title: "Teuer", text: "Zu teuer." }, "v1");
  expect(r).toMatchObject({ rating: 6, language: "de", text: "Teuer. Zu teuer.", externalId: "7" });
});

it("recunoaște platforma linkului", () => {
  expect(detectPlatform("https://www.tiktok.com/@cineva/video/123")).toBe("tiktok");
  expect(detectPlatform("https://www.instagram.com/reel/abc/")).toBe("instagram");
  expect(detectPlatform("https://m.facebook.com/story.php?id=1")).toBe("facebook");
  expect(detectPlatform("https://exemplu.ro/video")).toBeNull();
});
