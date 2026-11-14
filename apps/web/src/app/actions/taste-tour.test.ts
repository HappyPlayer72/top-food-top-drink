import { afterEach, expect, test, vi } from 'vitest';
vi.mock('../../lib/server/db', () => ({ getDb: vi.fn() }));
import { getDb } from '../../lib/server/db';
import { getTasteTourGoogleData, PRICE_BANDS, WALK } from './taste-tour';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.mocked(getDb).mockReset(); });

const origin = { lat: 45.7558, lng: 21.2286 };
const stop = { lat: 45.7468, lng: 21.2286 }; // ~1 km spre sud

test('traseul e o estimare locală și nu cheamă niciun API extern', async () => {
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test');
  vi.stubEnv('GOOGLE_ROUTES_API_KEY', 'test');
  vi.stubEnv('DATABASE_URL', '');
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const data = await getTasteTourGoogleData({ origin, stops: [stop] });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(data.route?.attribution).toBe('Estimare demo');
  expect(data.route!.distanceMeters).toBeGreaterThan(1000 * WALK.streetFactor * 0.95);
  expect(data.route!.distanceMeters).toBeLessThan(1000 * WALK.streetFactor * 1.05);
  expect(data.route!.durationSeconds).toBe(Math.round((data.route!.distanceMeters / 1000 / WALK.kmPerHour) * 3600));
  expect(data.prices).toEqual([null]);
});

test('prețul vine din nivelul de preț salvat în DB, ca interval orientativ', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  const id = '11111111-1111-1111-1111-111111111111';
  vi.mocked(getDb).mockReturnValue({ select: () => ({ from: () => ({ where: async () => [{ id, level: 2 }] }) }) } as never);
  const data = await getTasteTourGoogleData({ origin, stops: [{ ...stop, venueId: id }] });
  expect(data.prices).toEqual([{ start: PRICE_BANDS[2]![0], end: PRICE_BANDS[2]![1], currency: 'RON', attribution: 'Estimare demo' }]);
});

test('în afara orașului sau fără opriri nu întoarce nimic', async () => {
  expect(await getTasteTourGoogleData({ origin: { lat: 44.4, lng: 26.1 }, stops: [stop] })).toEqual({ route: null, prices: [null] });
  expect(await getTasteTourGoogleData({ origin, stops: [] })).toEqual({ route: null, prices: [] });
});
