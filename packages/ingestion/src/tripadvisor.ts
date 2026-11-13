/**
 * Tripadvisor Content API — doar API-ul oficial (regula 6). Cheia: TRIPADVISOR_API_KEY.
 * Limba review-urilor e un semnal bun de turist.
 */
const BASE = "https://api.content.tripadvisor.com/api/v1";

export type TaLocation = { location_id: string; name: string; address_obj?: { address_string?: string } };
export type TaReview = {
  id: number;
  lang: string;
  published_date: string;
  rating: number;
  text: string;
  title?: string;
  user?: { username?: string; user_location?: { name?: string }; reviewer_badge?: string };
};

function key(): string {
  const k = process.env.TRIPADVISOR_API_KEY;
  if (!k) throw new Error("TRIPADVISOR_API_KEY lipsește din .env.");
  return k;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.search = new URLSearchParams({ key: key(), ...params }).toString();
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Tripadvisor ${path} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Caută localul după nume, lângă coordonatele lui. */
export async function findLocation(name: string, lat: number, lng: number, vertical: "food" | "drink"): Promise<TaLocation | null> {
  const json = await get<{ data?: TaLocation[] }>("/location/search", {
    searchQuery: name,
    latLong: `${lat},${lng}`,
    category: vertical === "food" ? "restaurants" : "attractions",
    language: "ro",
  });
  return json.data?.[0] ?? null;
}

export async function locationDetails(locationId: string) {
  return get<{ rating?: string; num_reviews?: string; web_url?: string }>(`/location/${locationId}/details`, { language: "ro", currency: "RON" });
}

/** Cele mai recente review-uri, în toate limbile (ne interesează și cele ale turiștilor). */
export async function locationReviews(locationId: string): Promise<TaReview[]> {
  const json = await get<{ data?: TaReview[] }>(`/location/${locationId}/reviews`, { language: "all" });
  return json.data ?? [];
}

export function toReviewRow(r: TaReview, venueId: string) {
  return {
    venueId,
    source: "tripadvisor" as const,
    externalId: String(r.id),
    externalAuthor: { name: r.user?.username ?? "Anonim" },
    rating: r.rating * 2,
    originalRating: r.rating,
    originalScale: 5,
    text: [r.title, r.text].filter(Boolean).join(". "),
    language: r.lang ? r.lang.slice(0, 2) : null,
    postedAt: new Date(r.published_date),
  };
}
