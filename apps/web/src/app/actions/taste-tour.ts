'use server';
/**
 * „Turul de gust”: distanța pe jos și intervalul de preț pentru opririle din tur.
 * Date demo calculate local, fără niciun apel Google (oricine poate cere un tur, deci nu cheltuim cheia):
 * - traseul = distanța în linie dreaptă între opriri × 1,3 (străzile nu merg drept), la 4,8 km/h;
 * - prețul = din nivelul de preț al localului salvat în DB (1–4), transformat într-un interval orientativ în lei.
 * Pe ecran ambele apar ca „Estimare demo”.
 */
import { inArray } from 'drizzle-orm';
import { venues } from '@tftd/db';
import { getDb } from '../../lib/server/db';
// Constantele stau în lib/: un fișier 'use server' poate exporta doar funcții async
import { haversineM, PRICE_BANDS, WALK } from '../../lib/tasteTourEstimate';

import type { Point } from '../../lib/tasteTourEstimate';
type Stop = Point & { venueId?: string };
export type TourAttribution = 'Estimare demo';
type Price = { start: number | null; end: number | null; currency: string; attribution: TourAttribution };
type TourData = {
  route: { distanceMeters: number; durationSeconds: number; warnings: string[]; attribution: TourAttribution } | null;
  prices: (Price | null)[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inCity = (p: Point) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= 45.65 && p.lat <= 45.85 && p.lng >= 21.10 && p.lng <= 21.38;


export async function getTasteTourGoogleData(input: { origin: Point; stops: Stop[] }): Promise<TourData> {
  const stops = Array.isArray(input?.stops) && input.stops.length <= 3 ? input.stops : [];
  if (!inCity(input?.origin) || stops.length < 1 || !stops.every(inCity)) return { route: null, prices: stops.map(() => null) };

  const points = [input.origin, ...stops];
  let straight = 0;
  for (let i = 1; i < points.length; i++) straight += haversineM(points[i - 1]!, points[i]!);
  const distanceMeters = Math.round(straight * WALK.streetFactor);
  const durationSeconds = Math.round((distanceMeters / 1000 / WALK.kmPerHour) * 3600);

  // Nivelul de preț vine din DB (salvat la import), nu dintr-un apel nou
  const ids = stops.map((s) => s.venueId).filter((id): id is string => typeof id === 'string' && uuid.test(id));
  const levels = new Map<string, number>();
  if (ids.length && process.env.DATABASE_URL) {
    try {
      for (const v of await getDb().select({ id: venues.id, level: venues.priceLevel }).from(venues).where(inArray(venues.id, ids))) {
        if (v.level) levels.set(v.id, v.level);
      }
    } catch {
      /* fără bază: turul merge, doar fără prețuri */
    }
  }

  return {
    route: {
      distanceMeters,
      durationSeconds,
      warnings: ['Estimare: distanța în linie dreaptă × 1,3, la pas de plimbare. Traseul real poate diferi.'],
      attribution: 'Estimare demo',
    },
    prices: stops.map((s) => {
      const band = s.venueId ? PRICE_BANDS[levels.get(s.venueId) ?? 0] : undefined;
      return band ? { start: band[0], end: band[1], currency: 'RON', attribution: 'Estimare demo' as const } : null;
    }),
  };
}
