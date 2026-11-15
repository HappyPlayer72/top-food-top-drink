import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { accounts } from '@tftd/api';
import {
  extractBearerToken,
  getRequestClientHash,
  getRequestOrigin,
  getRequestUserId,
  getSessionTokenExpiryIso,
} from './session';

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-session-secret-with-more-than-32-chars');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('extractBearerToken handles case-insensitive Bearer prefix and rejects malformed values', () => {
  expect(extractBearerToken('Bearer abc.123.sig')).toBe('abc.123.sig');
  expect(extractBearerToken('bearer   token-value  ')).toBe('token-value');
  expect(extractBearerToken('Basic xyz')).toBeNull();
  expect(extractBearerToken('Bearer   ')).toBeNull();
  expect(extractBearerToken(null)).toBeNull();
});

test('getRequestUserId verifies Bearer tokens and extracts expiry', async () => {
  const token = accounts.createSessionToken('user-123', new Date('2026-11-15T00:00:00Z'));
  const expiry = getSessionTokenExpiryIso(token);
  expect(expiry).toBe('2026-12-15T00:00:00.000Z');

  const req = new Request('http://localhost:3000/api/v1/auth/me', {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(await getRequestUserId(req)).toBe('user-123');

  const badReq = new Request('http://localhost:3000/api/v1/auth/me', {
    headers: { authorization: 'Bearer invalid.token.sig' },
  });
  expect(await getRequestUserId(badReq)).toBeNull();
});

test('getRequestOrigin respects SITE_URL, forwarded headers, and URL origin fallback', () => {
  const fromHeaders = new Request('http://internal:3000/api/v1/config', {
    headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'api.topfood.ro' },
  });
  expect(getRequestOrigin(fromHeaders)).toBe('https://api.topfood.ro');

  vi.stubEnv('SITE_URL', 'https://topfood.ro/');
  expect(getRequestOrigin(fromHeaders)).toBe('https://topfood.ro');
});

test('getRequestClientHash computes HMAC fingerprint from forwarded IP and user-agent', () => {
  const req1 = new Request('http://localhost:3000/api/v1/venues/nora/reviews', {
    headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1', 'user-agent': 'TopFoodAndroid/1.0' },
  });
  const req2 = new Request('http://localhost:3000/api/v1/venues/nora/reviews', {
    headers: { 'x-real-ip': '203.0.113.10', 'user-agent': 'TopFoodAndroid/1.0' },
  });
  const hash1 = getRequestClientHash(req1);
  const hash2 = getRequestClientHash(req2);
  expect(hash1).toBeTruthy();
  expect(hash1).toBe(hash2);
});
