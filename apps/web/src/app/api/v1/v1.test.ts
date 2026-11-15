import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { accounts } from '@tftd/api';

vi.mock('@/lib/server/db', () => ({ getDb: vi.fn() }));

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-session-secret-with-more-than-32-chars');
  vi.stubEnv('DATABASE_URL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test('GET /api/v1/config, design-tokens, openapi.json, and assetlinks.json return mobile bootstrap contracts', async () => {
  const { GET: getConfig } = await import('./config/route');
  const { GET: getTokens } = await import('./design-tokens/route');
  const { GET: getOpenApi } = await import('./openapi.json/route');
  const { GET: getAssetLinks } = await import('../../.well-known/assetlinks.json/route');

  const configRes = await getConfig(new Request('http://10.0.2.2:3000/api/v1/config'));
  expect(configRes.status).toBe(200);
  const configBody = await configRes.json();
  expect(configBody.ok).toBe(true);
  expect(configBody.data.apiVersion).toBe(1);
  expect(configBody.data.city.slug).toBe('timisoara');
  expect(configBody.data.features.questions.length).toBeGreaterThan(0);
  expect(configBody.data.links.designTokensUrl).toBe('http://10.0.2.2:3000/api/v1/design-tokens');

  const tokensRes = await getTokens();
  const tokensBody = await tokensRes.json();
  expect(tokensBody.ok).toBe(true);
  expect(tokensBody.data.coreColors.carou).toBe('#B3261E');
  expect(tokensBody.data.coreColors.sticla).toBe('#17382C');

  const openApiRes = await getOpenApi();
  const openApiBody = await openApiRes.json();
  expect(openApiBody.openapi).toBe('3.1.0');
  expect(openApiBody.paths['/api/v1/venues']).toBeTruthy();

  vi.stubEnv('ANDROID_PACKAGE_NAME', 'ro.topfood.android');
  vi.stubEnv('ANDROID_SHA256_CERT_FINGERPRINTS', 'AA:BB:CC');
  const linksRes = await getAssetLinks();
  const linksBody = await linksRes.json();
  expect(linksBody[0].target.package_name).toBe('ro.topfood.android');
  expect(linksBody[0].target.sha256_cert_fingerprints).toEqual(['AA:BB:CC']);
});

test('GET /api/v1/venues and /api/v1/venues/[slug] work in offline static fallback mode', async () => {
  const { GET: getVenues } = await import('./venues/route');
  const { GET: getVenueBySlug } = await import('./venues/[slug]/route');

  const listRes = await getVenues(new Request('http://10.0.2.2:3000/api/v1/venues?vertical=food&noTraps=1&limit=5'));
  expect(listRes.status).toBe(200);
  const listBody = await listRes.json();
  expect(listBody.ok).toBe(true);
  expect(listBody.data.backendOnline).toBe(false);
  expect(listBody.data.venues.length).toBeLessThanOrEqual(5);
  expect(listBody.data.venues.every((v: { touristTrapIndex: number }) => v.touristTrapIndex < 60)).toBe(true);

  const firstSlug = listBody.data.venues[0].slug;
  const detailRes = await getVenueBySlug(
    new Request(`http://10.0.2.2:3000/api/v1/venues/${firstSlug}?vertical=food`),
    { params: Promise.resolve({ slug: firstSlug }) }
  );
  expect(detailRes.status).toBe(200);
  const detailBody = await detailRes.json();
  expect(detailBody.data.venue.slug).toBe(firstSlug);

  const missingRes = await getVenueBySlug(
    new Request('http://10.0.2.2:3000/api/v1/venues/nu-exista-local?vertical=food'),
    { params: Promise.resolve({ slug: 'nu-exista-local' }) }
  );
  expect(missingRes.status).toBe(404);
});

test('GET /api/v1/leaderboard and POST /api/v1/taste-tour serve data without Postgres', async () => {
  const { GET: getLeaderboard } = await import('./leaderboard/route');
  const { POST: postTasteTour } = await import('./taste-tour/route');

  const lbRes = await getLeaderboard(new Request('http://10.0.2.2:3000/api/v1/leaderboard?vertical=food'));
  expect(lbRes.status).toBe(200);
  const lbBody = await lbRes.json();
  expect(lbBody.ok).toBe(true);
  expect(lbBody.data.publicVote.categoryTops.length).toBeGreaterThan(0);

  const tourRes = await postTasteTour(
    new Request('http://10.0.2.2:3000/api/v1/taste-tour', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'pizza și bere',
        budgetRon: 150,
        stopCount: 2,
        origin: { lat: 45.758, lng: 21.229 },
      }),
    })
  );
  expect(tourRes.status).toBe(200);
  const tourBody = await tourRes.json();
  expect(tourBody.ok).toBe(true);
  expect(tourBody.data.parsed.categories).toEqual(['pizza', 'beer']);
});

test('POST /api/v1/auth/login issues Bearer token and GET /api/v1/auth/me validates it', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://example');
  const loginSpy = vi.spyOn(accounts, 'login').mockResolvedValue({
    id: 'user-1',
    username: 'andreea',
    displayName: 'Andreea M.',
  } as never);
  const { getDb } = await import('@/lib/server/db');
  vi.mocked(getDb).mockReturnValue({
    select: () => ({
      from: () => ({
        where: async () => [
          {
            id: 'user-1',
            username: 'andreea',
            displayName: 'Andreea M.',
            email: 'andreea@e-uvt.ro',
            roles: ['local'],
            localCitySlug: 'timisoara',
            localNeighborhood: 'Iosefin',
            localUntil: new Date('2027-01-01T00:00:00Z'),
            followers: null,
            interests: ['mancare'],
          },
        ],
      }),
    }),
  } as never);
  vi.spyOn(accounts, 'getSavedVenueSlugs').mockResolvedValue(['restaurant-nora']);
  vi.spyOn(accounts, 'getSocialLinks').mockResolvedValue([]);

  const { POST: postLogin } = await import('./auth/login/route');
  const { GET: getMe } = await import('./auth/me/route');

  const loginRes = await postLogin(
    new Request('http://10.0.2.2:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'andreea@e-uvt.ro', password: 'demo1234', setCookie: false }),
    })
  );
  expect(loginRes.status).toBe(200);
  expect(loginSpy).toHaveBeenCalledTimes(1);
  const loginBody = await loginRes.json();
  expect(loginBody.ok).toBe(true);
  expect(loginBody.data.tokenType).toBe('Bearer');
  expect(loginBody.data.token).toContain('user-1.');
  expect(loginBody.data.user.role).toBe('verified-local');

  const unauthMe = await getMe(new Request('http://10.0.2.2:3000/api/v1/auth/me'));
  expect(unauthMe.status).toBe(401);

  const authMe = await getMe(
    new Request('http://10.0.2.2:3000/api/v1/auth/me', {
      headers: { authorization: `Bearer ${loginBody.data.token}` },
    })
  );
  expect(authMe.status).toBe(200);
  const meBody = await authMe.json();
  expect(meBody.data.user.username).toBe('andreea');
  expect(meBody.data.user.savedVenueSlugs).toEqual(['restaurant-nora']);
});

test('POST /api/v1/loyalty/scan handles Bearer-authenticated QR code scan', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://example');
  const { loyalty } = await import('@tftd/api');
  vi.spyOn(loyalty, 'cardFor').mockResolvedValue(undefined as never);
  const scanSpy = vi.spyOn(loyalty, 'scanCode').mockResolvedValue({
    action: 'stamped',
    message: '+1 ștampilă (1/6).',
    card: { cardId: 'c1', programId: 'p1', stamps: 1, stampsRequired: 6, redeemed: 0 } as never,
  });

  const { POST: postScan } = await import('./loyalty/scan/route');
  const token = accounts.createSessionToken('user-1');
  const res = await postScan(
    new Request('http://10.0.2.2:3000/api/v1/loyalty/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: 'p1.12345.sig' }),
    })
  );

  expect(res.status).toBe(200);
  expect(scanSpy).toHaveBeenCalledWith(undefined, 'user-1', 'p1.12345.sig');
  const body = await res.json();
  expect(body.data.action).toBe('stamped');
});

test('POST /api/v1/polls/[token]/vote issues and honors X-Voter-Token for anonymous mobile voting', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://example');
  const { getDb } = await import('@/lib/server/db');
  const pollToken = 'a'.repeat(48);
  const voterToken = 'b'.repeat(48);

  vi.mocked(getDb).mockReturnValue({
    select: (fields?: unknown) => ({
      from: () => ({
        where: () => {
          if (fields && typeof fields === 'object' && 'count' in fields) {
            return { groupBy: async () => [{ venueSlug: 'restaurant-nora', count: 1 }] };
          }
          if (fields && typeof fields === 'object' && 'venueSlugs' in fields) {
            return Promise.resolve([{ venueSlugs: ['restaurant-nora', 'la-focacceria'] }]);
          }
          if (fields && typeof fields === 'object' && 'venueSlug' in fields) {
            return Promise.resolve([{ venueSlug: 'restaurant-nora' }]);
          }
          return Promise.resolve([{ token: pollToken, venueSlugs: ['restaurant-nora', 'la-focacceria'] }]);
        },
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: async () => undefined,
      }),
    }),
  } as never);

  const { POST: postVote } = await import('./polls/[token]/vote/route');
  const res = await postVote(
    new Request(`http://10.0.2.2:3000/api/v1/polls/${pollToken}/vote`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-voter-token': voterToken,
      },
      body: JSON.stringify({ venueSlug: 'restaurant-nora' }),
    }),
    { params: Promise.resolve({ token: pollToken }) }
  );

  expect(res.status).toBe(200);
  expect(res.headers.get('X-Voter-Token')).toBe(voterToken);
  const body = await res.json();
  expect(body.data.myVote).toBe('restaurant-nora');
  expect(body.data.voterToken).toBe(voterToken);
});
