import {
  apiError,
  apiFromError,
  apiOk,
  apiOptions,
  parseJsonBody,
} from '@/lib/api/http';
import { DEFAULT_CITY_CENTER, loadVenuesCatalog } from '@/lib/api/service';
import { getTasteTourGoogleData } from '@/app/actions/taste-tour';
import {
  generateTasteTour,
  parseTasteRequest,
  TASTE_CATEGORIES,
  type TasteCategory,
} from '@/components/scarnavii/tasteTour.ts';
import { getRequestOrigin } from '@/lib/server/session';
import type { Coordinates, Vertical } from '@/types';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

const VALID_CATEGORIES = new Set<string>(TASTE_CATEGORIES.map((c) => c.id));

export async function POST(req: Request) {
  const parsedBody = await parseJsonBody<{
    query?: string;
    categories?: string[];
    excluded?: string[];
    budgetRon?: number;
    stopCount?: number;
    origin?: Coordinates;
    vertical?: Vertical | 'all';
    includeGoogle?: boolean;
  }>(req);
  if (!parsedBody.ok) return parsedBody.response;

  const {
    query = '',
    categories: rawCats,
    excluded: rawExcluded,
    budgetRon = 100,
    stopCount = 2,
    origin: startPoint = DEFAULT_CITY_CENTER,
    vertical = 'all',
    includeGoogle = false,
  } = parsedBody.body;

  const parsedQuery = query.trim() ? parseTasteRequest(query) : null;
  const categories = (
    Array.isArray(rawCats)
      ? rawCats.filter((c): c is TasteCategory => VALID_CATEGORIES.has(c))
      : parsedQuery?.categories ?? []
  );
  const excluded = (
    Array.isArray(rawExcluded)
      ? rawExcluded.filter((c): c is TasteCategory => VALID_CATEGORIES.has(c))
      : parsedQuery?.excluded ?? []
  );

  if (stopCount !== 2 && stopCount !== 3) {
    return apiError('invalid', 'Alege 2 sau 3 opriri pentru traseu.', 400);
  }
  if (!Number.isFinite(budgetRon) || budgetRon <= 0) {
    return apiError('invalid', 'Bugetul trebuie să fie mai mare decât 0 lei.', 400);
  }
  if (!categories.length) {
    return apiOk({
      parsed: parsedQuery ?? { categories: [], excluded, needsClarification: true },
      tour: null,
      google: null,
    });
  }

  try {
    const reqOrigin = getRequestOrigin(req);
    const pools = vertical === 'all'
      ? await Promise.all([
          loadVenuesCatalog({ vertical: 'food' }, reqOrigin),
          loadVenuesCatalog({ vertical: 'drink' }, reqOrigin),
        ])
      : [await loadVenuesCatalog({ vertical }, reqOrigin)];

    const restaurants = pools.flatMap((p) => p.venues);
    const tour = generateTasteTour({
      restaurants,
      categories,
      excluded,
      budgetRon,
      stopCount,
      start: startPoint,
    });

    const google = tour && includeGoogle
      ? await getTasteTourGoogleData({
          origin: startPoint,
          stops: tour.stops.map(({ restaurant }) => ({
            ...restaurant.coordinates,
            venueId: restaurant.venueId,
          })),
        })
      : null;

    return apiOk({
      parsed: parsedQuery ?? { categories, excluded, needsClarification: false },
      tour,
      google,
    });
  } catch (e) {
    return apiFromError(e);
  }
}
