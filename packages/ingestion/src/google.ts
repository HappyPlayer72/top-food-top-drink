/**
 * Google Places API (New) — doar API-ul oficial (regula 6).
 * Text Search pentru descoperirea localelor, Place Details pentru rating + max 5 review-uri.
 * Cheia: GOOGLE_PLACES_API_KEY.
 */
import type { OpeningHours, Weekday } from "@tftd/db";

const BASE = "https://places.googleapis.com/v1";

export type GooglePlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryType?: string;
  types?: string[];
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    periods?: { open: GoogleTime; close?: GoogleTime }[];
  };
  reviews?: GoogleReview[];
};

/** Google: day 0 = duminică. */
export type GoogleTime = { day: number; hour: number; minute?: number };

const GOOGLE_DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const hhmm = (t: GoogleTime) => `${String(t.hour).padStart(2, "0")}:${String(t.minute ?? 0).padStart(2, "0")}`;

/** Perioadele Google → { mon: [["11:00","22:00"]] }. Deschis non-stop = o perioadă fără `close`. */
export function toOpeningHours(periods: { open: GoogleTime; close?: GoogleTime }[] | undefined): OpeningHours | null {
  if (!periods?.length) return null;
  const out: OpeningHours = {};
  for (const p of periods) {
    const day = GOOGLE_DAYS[p.open.day];
    if (!day) continue;
    (out[day] ??= []).push([hhmm(p.open), p.close ? hhmm(p.close) : "24:00"]);
  }
  return out;
}

export type GoogleReview = {
  name: string;
  rating: number;
  text?: { text: string; languageCode?: string };
  originalText?: { text: string; languageCode?: string };
  authorAttribution?: { displayName?: string; uri?: string };
  publishTime: string;
};

const DISCOVERY_FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.location", "places.rating", "places.userRatingCount",
  "places.priceLevel", "places.nationalPhoneNumber", "places.websiteUri", "places.googleMapsUri", "places.primaryType", "places.types",
  "places.regularOpeningHours", "nextPageToken",
].join(",");
const DETAIL_FIELDS = "id,displayName,rating,userRatingCount,reviews,googleMapsUri";

/** Ce căutăm pentru fiecare verticală. */
export const DISCOVERY_QUERIES: Record<"food" | "drink", string[]> = {
  food: ["restaurant", "pizzerie", "bistro", "fast food", "patiserie"],
  drink: ["bar", "pub", "club", "cocktail bar", "berărie"],
};

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY lipsește din .env.");
  return key;
}

/**
 * Plafonul de cereri Google pentru procesul curent (importul îl setează din IMPORT_MAX_REQUESTS).
 * Fiecare cerere trece prin googleFetch: peste plafon se oprește înainte să plece cererea.
 */
let budget: number | null = null;
let used = 0;
export class GoogleBudgetExceeded extends Error {}
export function limitGoogleRequests(max: number | null) {
  budget = max;
  used = 0;
}
export const googleRequestsUsed = () => used;

async function googleFetch(url: string, init: RequestInit): Promise<Response> {
  if (budget !== null && used >= budget) {
    throw new GoogleBudgetExceeded(`Plafonul de ${budget} cereri Google pentru această rulare s-a atins; m-am oprit. Mărește IMPORT_MAX_REQUESTS doar dacă ești sigur.`);
  }
  used++;
  return fetch(url, init);
}

export async function searchText(
  query: string,
  center: { lat: number; lng: number },
  radiusM = 6000,
  pageToken?: string,
): Promise<{ places: GooglePlace[]; nextPageToken?: string }> {
  const res = await googleFetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey(), "X-Goog-FieldMask": DISCOVERY_FIELDS },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "ro",
      locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: radiusM } },
      pageSize: 20,
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Google Places searchText ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { places?: GooglePlace[]; nextPageToken?: string };
  return { places: json.places ?? [], nextPageToken: json.nextPageToken };
}

/** Un singur loc cu toate câmpurile de prezentare (pentru adăugarea de către un user). */
export async function getPlace(placeId: string): Promise<GooglePlace> {
  const fields = DISCOVERY_FIELDS.split(",").filter((f) => f.startsWith("places.")).map((f) => f.slice(7)).join(",");
  const res = await googleFetch(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=ro`, {
    headers: { "X-Goog-Api-Key": apiKey(), "X-Goog-FieldMask": fields },
  });
  if (!res.ok) throw new Error(`Google Places get ${res.status}: ${await res.text()}`);
  return (await res.json()) as GooglePlace;
}

export async function placeDetails(placeId: string): Promise<GooglePlace> {
  const res = await googleFetch(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=ro`, {
    headers: { "X-Goog-Api-Key": apiKey(), "X-Goog-FieldMask": DETAIL_FIELDS },
  });
  if (!res.ok) throw new Error(`Google Places details ${res.status}: ${await res.text()}`);
  return (await res.json()) as GooglePlace;
}

const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const CATEGORY_BY_TYPE: Record<string, string> = {
  pizza_restaurant: "pizza",
  fast_food_restaurant: "street-food",
  hamburger_restaurant: "burger",
  bakery: "patiserie",
  cafe: "cafenea",
  vegan_restaurant: "vegan",
  vegetarian_restaurant: "vegan",
  asian_restaurant: "asiatic",
  chinese_restaurant: "asiatic",
  japanese_restaurant: "asiatic",
  ramen_restaurant: "asiatic",
  bar: "pub",
  pub: "pub",
  night_club: "club",
  wine_bar: "cocktail-bar",
  cocktail_bar: "cocktail-bar",
};

/** Transformă un Place în forma pe care o înțelege modulul de potrivire. */
export function toExternalPlace(p: GooglePlace, citySlug: string, vertical: "food" | "drink") {
  const types = [p.primaryType, ...(p.types ?? [])].filter((t): t is string => !!t);
  const categories = [...new Set(types.map((t) => CATEGORY_BY_TYPE[t]).filter((c): c is string => !!c))];
  if (!categories.length && vertical === "food") categories.push("romanesc");
  return {
    source: "google" as const,
    externalId: p.id,
    citySlug,
    vertical,
    name: p.displayName?.text ?? "(fără nume)",
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    phone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    address: p.formattedAddress ?? null,
    categories,
    priceLevel: p.priceLevel ? (PRICE_LEVELS[p.priceLevel] ?? null) : null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    url: p.googleMapsUri ?? null,
    openingHours: toOpeningHours(p.regularOpeningHours?.periods),
  };
}

/** Review Google → rând pentru tabela reviews (fără câmpurile de analiză). */
export function toReviewRow(r: GoogleReview, venueId: string) {
  const text = r.originalText?.text ?? r.text?.text ?? null;
  return {
    venueId,
    source: "google" as const,
    externalId: r.name,
    externalAuthor: { name: r.authorAttribution?.displayName ?? "Anonim", profileUrl: r.authorAttribution?.uri },
    rating: r.rating * 2,
    originalRating: r.rating,
    originalScale: 5,
    text,
    language: r.originalText?.languageCode ?? r.text?.languageCode ?? null,
    postedAt: new Date(r.publishTime),
  };
}
