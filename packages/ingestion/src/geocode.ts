/**
 * Adresă → coordonate cu Geoapify (date OpenStreetMap), pentru localurile adăugate de mână.
 * Fără GEOAPIFY_API_KEY sau fără rezultat sigur întoarce null, iar apelantul folosește centrul cartierului.
 */
export type GeoPoint = { lat: number; lng: number; formatted: string | null };

/** Dreptunghiul în care căutăm (lng/lat min, lng/lat max), ca să nu nimerim o stradă cu același nume din alt oraș. */
export type BBox = [number, number, number, number];

export async function geocodeAddress(text: string, bbox: BBox, fetchImpl: typeof fetch = fetch): Promise<GeoPoint | null> {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key || !text.trim()) return null;
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", text);
  url.searchParams.set("filter", `rect:${bbox.join(",")}`);
  url.searchParams.set("lang", "ro");
  url.searchParams.set("limit", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", key);
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: { lat: number; lon: number; formatted?: string; rank?: { confidence?: number } }[] };
    const r = json.results?.[0];
    if (!r || (r.rank?.confidence ?? 0) < 0.5) return null;
    return { lat: r.lat, lng: r.lon, formatted: r.formatted ?? null };
  } catch {
    return null;
  }
}
