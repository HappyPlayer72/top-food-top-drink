import { afterEach, expect, test, vi } from 'vitest';
vi.mock('../../lib/server/db', () => ({ getDb: vi.fn() }));
import { getTasteTourGoogleData } from './taste-tour';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

test('returns walking route data and warnings without sending a client place ID to Places', async () => {
  vi.stubEnv('GOOGLE_ROUTES_API_KEY', 'test');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test');
  vi.stubEnv('DATABASE_URL', '');
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ routes: [{ distanceMeters: 1200, duration: '850s', warnings: ['Cale pietonală incompletă'] }] })));
  vi.stubGlobal('fetch', fetchMock);
  const result = await getTasteTourGoogleData({ origin: { lat: 45.75, lng: 21.22 }, stops: [{ lat: 45.76, lng: 21.23 }] });
  expect(result.route).toMatchObject({ distanceMeters: 1200, durationSeconds: 850, warnings: ['Cale pietonală incompletă'] });
  expect(result.prices).toEqual([null]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('rejects outside-city coordinates without contacting Google', async () => {
  vi.stubEnv('GOOGLE_ROUTES_API_KEY', 'test');
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const result = await getTasteTourGoogleData({ origin: { lat: 0, lng: 0 }, stops: [{ lat: 45.76, lng: 21.23 }] });
  expect(result.route).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('uses only the stored Google identifier and returns its price range', async () => {
  vi.stubEnv('GOOGLE_ROUTES_API_KEY', '');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test');
  vi.stubEnv('DATABASE_URL', 'postgres://example');
  const { getDb } = await import('../../lib/server/db');
  const venueId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  vi.mocked(getDb).mockReturnValue({ select: () => ({ from: () => ({ where: () => Promise.resolve([{ venueId, externalId: 'ChIJ123' }]) }) }) } as never);
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ priceRange: { startPrice: { currencyCode: 'RON', units: '40' }, endPrice: { currencyCode: 'RON', units: '60' } } })));
  vi.stubGlobal('fetch', fetchMock);
  const result = await getTasteTourGoogleData({ origin: { lat: 45.75, lng: 21.22 }, stops: [{ lat: 45.76, lng: 21.23, venueId }] });
  expect(result.prices).toEqual([{ start: 40, end: 60, currency: 'RON', attribution: 'Google Maps' }]);
  expect(fetchMock.mock.calls[0][0]).toBe('https://places.googleapis.com/v1/places/ChIJ123');
});
