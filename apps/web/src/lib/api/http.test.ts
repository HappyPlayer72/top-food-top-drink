import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { accounts, ServiceError } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  parseJsonBody,
  requireAuthUserId,
} from './http';

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-session-secret-with-more-than-32-chars');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('apiOk and apiError produce standard envelope and CORS/version headers', async () => {
  const okRes = apiOk({ hello: 'world' }, { status: 201 });
  expect(okRes.status).toBe(201);
  expect(okRes.headers.get('X-API-Version')).toBe('1');
  expect(okRes.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(await okRes.json()).toEqual({ ok: true, data: { hello: 'world' } });

  const errRes = apiError('invalid', 'Date invalide.', 400);
  expect(errRes.status).toBe(400);
  expect(await errRes.json()).toEqual({
    ok: false,
    error: { code: 'invalid', message: 'Date invalide.' },
  });
});

test('apiFromError maps all ServiceError codes to proper HTTP statuses', async () => {
  const cases: [ServiceError['code'], number][] = [
    ['invalid', 400],
    ['unauthorized', 401],
    ['forbidden', 403],
    ['not_found', 404],
    ['conflict', 409],
    ['rate_limited', 429],
  ];
  for (const [code, status] of cases) {
    const res = apiFromError(new ServiceError(code, `Msg ${code}`));
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.error.code).toBe(code);
  }

  const offline = apiOffline();
  expect(offline.status).toBe(503);
});

test('parseJsonBody rejects non-object or invalid JSON', async () => {
  const invalidReq = new Request('http://localhost/test', { method: 'POST', body: '{not-json' });
  const r1 = await parseJsonBody(invalidReq);
  expect(r1.ok).toBe(false);
  if (!r1.ok) expect(r1.response.status).toBe(400);

  const arrayReq = new Request('http://localhost/test', { method: 'POST', body: '[1,2]' });
  const r2 = await parseJsonBody(arrayReq);
  expect(r2.ok).toBe(false);
});

test('requireAuthUserId enforces Bearer authentication', async () => {
  const unauthReq = new Request('http://localhost/test');
  const r1 = await requireAuthUserId(unauthReq);
  expect(r1.ok).toBe(false);
  if (!r1.ok) expect(r1.response.status).toBe(401);

  const token = accounts.createSessionToken('u-42');
  const authReq = new Request('http://localhost/test', {
    headers: { authorization: `Bearer ${token}` },
  });
  const r2 = await requireAuthUserId(authReq);
  expect(r2).toEqual({ ok: true, userId: 'u-42' });
});
