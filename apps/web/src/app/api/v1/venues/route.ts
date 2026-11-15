import { addManually } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
  requireAuthUserId,
} from '@/lib/api/http';
import {
  DEFAULT_CITY_CENTER,
  DEFAULT_CITY_SLUG,
  loadVenuesCatalog,
  type VenueQueryFilters,
} from '@/lib/api/service';
import { TIMISOARA_NEIGHBORHOOD_ZONES } from '@/data/timisoaraGeo';
import { getDb } from '@/lib/server/db';
import { getRequestOrigin } from '@/lib/server/session';
import type { Vertical } from '@/types';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const verticalParam = searchParams.get('vertical');
  const vertical: Vertical = verticalParam === 'drink' ? 'drink' : 'food';
  const maxPriceRaw = searchParams.get('maxPriceLei');
  const maxPriceLei = maxPriceRaw ? Number(maxPriceRaw) : null;
  const limitRaw = searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const sortParam = searchParams.get('sort');
  const sort: VenueQueryFilters['sort'] =
    sortParam === 'trap_asc' || sortParam === 'price_asc' || sortParam === 'reviews'
      ? sortParam
      : 'honest';

  try {
    const data = await loadVenuesCatalog(
      {
        vertical,
        category: searchParams.get('category'),
        neighborhood: searchParams.get('neighborhood'),
        maxPriceLei: maxPriceLei && Number.isFinite(maxPriceLei) ? maxPriceLei : null,
        noTraps: searchParams.get('noTraps') === '1' || searchParams.get('noTraps') === 'true',
        openNow: searchParams.get('openNow') === '1' || searchParams.get('openNow') === 'true',
        search: searchParams.get('search') ?? searchParams.get('q'),
        sort,
        limit: limit && Number.isFinite(limit) ? limit : undefined,
      },
      getRequestOrigin(req)
    );
    return apiOk(data, { cacheControl: 'no-store' });
  } catch (e) {
    return apiFromError(e);
  }
}

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să adaugi un local.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{
    vertical?: Vertical;
    name?: string;
    address?: string;
    neighborhood?: string;
    lat?: number;
    lng?: number;
    category?: string;
    priceLevel?: number;
  }>(req);
  if (!parsed.ok) return parsed.response;

  const vertical: Vertical = parsed.body.vertical === 'drink' ? 'drink' : 'food';
  const name = parsed.body.name?.trim() ?? '';
  const address = parsed.body.address?.trim() ?? '';
  const neighborhood = parsed.body.neighborhood?.trim() ?? '';

  if (name.length < 2 || address.length < 2) {
    return apiError('invalid', 'Completează numele și adresa localului.', 400);
  }

  const zone = TIMISOARA_NEIGHBORHOOD_ZONES.find((z) => z.name === neighborhood);
  const [fallbackLng, fallbackLat] = zone?.center ?? [DEFAULT_CITY_CENTER.lng, DEFAULT_CITY_CENTER.lat];
  const lat = Number.isFinite(parsed.body.lat) ? parsed.body.lat! : fallbackLat;
  const lng = Number.isFinite(parsed.body.lng) ? parsed.body.lng! : fallbackLng;
  const fullAddress = neighborhood && !address.toLowerCase().includes(neighborhood.toLowerCase())
    ? `${address}, ${neighborhood}`
    : address;

  try {
    const r = await addManually(getDb(), auth.userId, {
      citySlug: DEFAULT_CITY_SLUG,
      vertical,
      name,
      address: fullAddress,
      lat,
      lng,
    });
    return apiOk(
      {
        outcome: r.outcome,
        message:
          r.outcome === 'already-exists'
            ? 'Localul există deja la noi. Caută-l după nume.'
            : 'Mulțumim! Localul apare după ce îl verificăm (de obicei în aceeași zi).',
      },
      { status: r.outcome === 'already-exists' ? 200 : 201 }
    );
  } catch (e) {
    return apiFromError(e);
  }
}
