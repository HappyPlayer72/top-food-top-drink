'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { venueSources } from '@tftd/db';
import { getDb } from '../../lib/server/db';

type Point = { lat: number; lng: number };
type Stop = Point & { venueId?: string };
type Price = { start: number | null; end: number | null; currency: string; attribution: 'Google Maps' };
type TourData = {
  route: { distanceMeters: number; durationSeconds: number; warnings: string[]; attribution: 'Google Maps' } | null;
  prices: (Price | null)[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const placeId = /^[A-Za-z0-9_-]{1,255}$/;
const inCity = (p: Point) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= 45.65 && p.lat <= 45.85 && p.lng >= 21.10 && p.lng <= 21.38;
const waypoint = (p: Point) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });

// ponytail: process-local limit; use a shared rate limiter before scaling across instances.
const state = globalThis as typeof globalThis & { tasteTourRequests?: number[] };
function allowRequest() {
  const now = Date.now();
  state.tasteTourRequests = (state.tasteTourRequests ?? []).filter((time) => now - time < 60_000);
  if (state.tasteTourRequests.length >= 30) return false;
  state.tasteTourRequests.push(now);
  return true;
}

async function googleJson(url: string, key: string, fields: string, body?: unknown): Promise<any> {
  try {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fields, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(5000), cache: 'no-store',
    });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

function money(value: any): { amount: number; currency: string } | null {
  if (!value || typeof value.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(value.currencyCode)) return null;
  const units = value.units === undefined ? 0 : Number(value.units);
  const nanos = value.nanos === undefined ? 0 : Number(value.nanos);
  if (!Number.isSafeInteger(units) || !Number.isInteger(nanos) || units < 0 || nanos < 0 || nanos >= 1e9) return null;
  return { amount: units + nanos / 1e9, currency: value.currencyCode };
}

async function priceFor(id: string, key: string): Promise<Price | null> {
  const data = await googleJson(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, key, 'priceRange');
  const low = money(data?.priceRange?.startPrice);
  const high = money(data?.priceRange?.endPrice);
  if ((!low && !high) || (low && high && (low.currency !== high.currency || low.amount >= high.amount))) return null;
  return { start: low?.amount ?? null, end: high?.amount ?? null, currency: (low ?? high)!.currency, attribution: 'Google Maps' };
}

export async function getTasteTourGoogleData(input: { origin: Point; stops: Stop[] }): Promise<TourData> {
  const stops = Array.isArray(input?.stops) && input.stops.length <= 3 ? input.stops : [];
  const empty: TourData = { route: null, prices: stops.map(() => null) };
  if (!inCity(input?.origin) || stops.length < 1 || !stops.every(inCity) || !allowRequest()) return empty;

  const routeKey = process.env.GOOGLE_ROUTES_API_KEY;
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  const routePromise = routeKey ? googleJson('https://routes.googleapis.com/directions/v2:computeRoutes', routeKey,
    'routes.distanceMeters,routes.duration,routes.warnings', {
      origin: waypoint(input.origin), destination: waypoint(stops[stops.length - 1]),
      intermediates: stops.slice(0, -1).map(waypoint), travelMode: 'WALK', languageCode: 'ro',
    }) : Promise.resolve(null);

  let ids: { venueId: string; externalId: string }[] = [];
  const venueIds = stops.map((s) => s.venueId).filter((id): id is string => typeof id === 'string' && uuid.test(id));
  if (placesKey && process.env.DATABASE_URL && venueIds.length) {
    try {
      ids = await getDb().select({ venueId: venueSources.venueId, externalId: venueSources.externalId }).from(venueSources)
        .where(and(eq(venueSources.source, 'google'), inArray(venueSources.venueId, venueIds)));
    } catch { /* Datele Google sunt opționale. */ }
  }
  const [data, prices] = await Promise.all([
    routePromise,
    Promise.all(stops.map((stop) => {
      const id = ids.find((source) => source.venueId === stop.venueId)?.externalId;
      return placesKey && id && placeId.test(id) ? priceFor(id, placesKey) : null;
    })),
  ]);
  const route = data?.routes?.[0];
  const duration = typeof route?.duration === 'string' && /^\d+(?:\.\d+)?s$/.test(route.duration) ? Number(route.duration.slice(0, -1)) : NaN;
  const distance = route?.distanceMeters;
  const warnings = Array.isArray(route?.warnings) ? route.warnings.filter((w: unknown): w is string => typeof w === 'string') : [];
  return {
    route: Number.isFinite(distance) && distance >= 0 && Number.isFinite(duration) && duration >= 0
      ? { distanceMeters: distance, durationSeconds: duration, warnings: warnings.length ? warnings : ['Traseele pietonale pot să nu includă trotuare sau căi pietonale clare.'], attribution: 'Google Maps' }
      : null,
    prices,
  };
}
