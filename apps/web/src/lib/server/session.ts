// Doar pentru server: sesiunea userului într-un cookie semnat (accounts.createSessionToken).
import { cookies } from 'next/headers';
import { accounts, ServiceError } from '@tftd/api';

export const SESSION_COOKIE = 'tftd_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** userId-ul din cookie, sau null dacă lipsește, e expirat sau falsificat. */
export async function getUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return accounts.verifySessionToken(token);
}

export async function setSession(userId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, accounts.createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Mesajul pentru user: cel din ServiceError (deja în română) sau unul generic. */
export function errorMessage(e: unknown): string {
  if (e instanceof ServiceError) return e.message;
  console.error(e);
  return 'Ceva n-a mers. Încearcă din nou.';
}
