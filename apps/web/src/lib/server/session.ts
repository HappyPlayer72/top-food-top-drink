// Doar pentru server: sesiunea userului prin cookie semnat (`tftd_session`) sau header `Authorization: Bearer <token>`.
import { cookies } from 'next/headers';
import { accounts, antibot, ServiceError } from '@tftd/api';

export const SESSION_COOKIE = 'tftd_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Extrage tokenul din header-ul `Authorization: Bearer <token>` (case-insensitive). */
export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

/** Întoarce data expirării ISO-8601 dintr-un token `userId.exp.sig`, sau null. */
export function getSessionTokenExpiryIso(token: string): string | null {
  const parts = token.split('.');
  const expMs = Number(parts[1]);
  if (!Number.isFinite(expMs) || expMs <= 0) return null;
  return new Date(expMs).toISOString();
}

/** userId-ul din cookie, sau null dacă lipsește, e expirat sau falsificat. */
export async function getUserId(): Promise<string | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return accounts.verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * userId-ul pentru API-ul HTTP (`/api/v1/*`):
 * - Dacă există header `Authorization: Bearer ...`, verifică exclusiv tokenul Bearer.
 * - Altfel citește cookie-ul `tftd_session` (compatibil cu browserul / WebView).
 */
export async function getRequestUserId(req?: Request): Promise<string | null> {
  const authHeader = req?.headers.get('authorization');
  if (authHeader !== null && authHeader !== undefined && authHeader.trim() !== '') {
    const bearer = extractBearerToken(authHeader);
    return accounts.verifySessionToken(bearer);
  }
  return getUserId();
}

/** Amprenta dispozitivului (HMAC de IP + User-Agent) pentru poarta anti-bot din HTTP API. */
export function getRequestClientHash(req: Request): string | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip');
  return antibot.clientFingerprint(ip, req.headers.get('user-agent'));
}

/** Originea publică a cererii (pentru URL-uri absolute către imagini/share în aplicații native). */
export function getRequestOrigin(req: Request): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || req.headers.get('host')?.trim();
  if (proto && host) return `${proto}://${host}`;
  if (host) return `http://${host}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export async function setSession(userId: string): Promise<string> {
  const token = accounts.createSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}

/** Emite token semnat pentru API; setează și cookie-ul dacă rulează în context HTTP Next.js. */
export async function issueApiSession(userId: string, shouldSetCookie = true): Promise<{ token: string; expiresAt: string | null }> {
  const token = accounts.createSessionToken(userId);
  if (shouldSetCookie) {
    try {
      (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: MAX_AGE_SECONDS,
      });
    } catch {
      // În teste unitare fără request store Next.js nu există cookie jar.
    }
  }
  return { token, expiresAt: getSessionTokenExpiryIso(token) };
}

export async function clearSession(): Promise<void> {
  try {
    (await cookies()).delete(SESSION_COOKIE);
  } catch {
    // ignore outside request store
  }
}

/** Mesajul pentru user: cel din ServiceError (deja în română) sau unul generic. */
export function errorMessage(e: unknown): string {
  if (e instanceof ServiceError) return e.message;
  console.error(e);
  return 'Ceva n-a mers. Încearcă din nou.';
}
