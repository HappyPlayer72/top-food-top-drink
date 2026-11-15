import { accounts } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
} from '@/lib/api/http';
import { toUserAccount } from '@/lib/backend/user';
import { getDb } from '@/lib/server/db';
import { issueApiSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const parsed = await parseJsonBody<{
    email?: string;
    login?: string;
    password?: string;
    setCookie?: boolean;
  }>(req);
  if (!parsed.ok) return parsed.response;

  const identifier = (parsed.body.login ?? parsed.body.email ?? '').trim().toLowerCase();
  const password = parsed.body.password ?? '';
  if (!identifier || !password) {
    return apiError('invalid', 'Introdu emailul/username-ul și parola.', 400);
  }

  try {
    const db = getDb();
    const u = await accounts.login(db, { login: identifier, password });
    const session = await issueApiSession(u.id, parsed.body.setCookie !== false);
    const user = await toUserAccount(db, u.id);
    return apiOk({
      token: session.token,
      expiresAt: session.expiresAt,
      tokenType: 'Bearer' as const,
      user,
    });
  } catch (e) {
    return apiFromError(e);
  }
}
