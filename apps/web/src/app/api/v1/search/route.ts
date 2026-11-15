import { searchPlaces } from '@tftd/api';
import { apiError, apiFromError, apiOk, apiOptions, hasDbConfigured } from '@/lib/api/http';
import { DEFAULT_CITY_CENTER, DEFAULT_CITY_SLUG } from '@/lib/api/service';
import { DRINK_VENUES, INITIAL_RESTAURANTS } from '@/data/restaurants';
import { getDb } from '@/lib/server/db';
import type { Vertical } from '@/types';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') ?? searchParams.get('query') ?? '').trim();
  const vertical: Vertical = searchParams.get('vertical') === 'drink' ? 'drink' : 'food';
  if (query.length < 2) {
    return apiError('invalid', 'Scrie cel puțin 2 litere.', 400);
  }

  if (hasDbConfigured()) {
    try {
      const r = await searchPlaces(getDb(), {
        citySlug: DEFAULT_CITY_SLUG,
        vertical,
        query,
        center: DEFAULT_CITY_CENTER,
      });
      return apiOk({
        onPlatform: r.onPlatform,
        internetSearched: r.internetSearched,
        fromInternet: r.fromInternet.map((p) => ({
          placeId: p.placeId,
          name: p.name,
          address: p.address,
          googleRating: p.googleRating,
        })),
        backendOnline: true,
      });
    } catch (e) {
      return apiFromError(e);
    }
  }

  const needle = query.toLocaleLowerCase('ro');
  const pool = vertical === 'drink' ? DRINK_VENUES : INITIAL_RESTAURANTS;
  const onPlatform = pool
    .filter((v) => v.name.toLocaleLowerCase('ro').includes(needle))
    .slice(0, 10)
    .map((v) => ({
      id: v.venueId ?? v.id,
      name: v.name,
      slug: v.slug,
      neighborhood: v.neighborhood,
      honestScore: v.foodQualityScore,
      status: 'active' as const,
    }));

  return apiOk({
    onPlatform,
    internetSearched: false,
    fromInternet: [],
    backendOnline: false,
  });
}
