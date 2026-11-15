import { randomInt } from 'node:crypto';
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
    name?: string;
    username?: string;
    email?: string;
    phone?: string;
    password?: string;
    interests?: string[];
    setCookie?: boolean;
  }>(req);
  if (!parsed.ok) return parsed.response;

  const email = parsed.body.email?.trim().toLowerCase();
  const phone = parsed.body.phone?.trim();
  const password = parsed.body.password ?? '';
  const name = parsed.body.name?.trim() ?? '';

  if ((!email && !phone) || !password) {
    return apiError('invalid', 'Ai nevoie de email sau telefon și parolă.', 400);
  }

  const base = ((email?.split('@')[0] ?? name) || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 20) || 'user';
  const username = parsed.body.username?.trim().toLowerCase() || `${base.padEnd(3, '0')}${randomInt(1000, 10000)}`;

  try {
    const db = getDb();
    const u = await accounts.register(db, {
      username,
      displayName: name || username,
      email,
      phone,
      password,
      interests: parsed.body.interests ?? [],
    });
    const session = await issueApiSession(u.id, parsed.body.setCookie !== false);
    const user = await toUserAccount(db, u.id);
    return apiOk(
      {
        token: session.token,
        expiresAt: session.expiresAt,
        tokenType: 'Bearer' as const,
        user,
      },
      { status: 201 }
    );
  } catch (e) {
    return apiFromError(e);
  }
}
