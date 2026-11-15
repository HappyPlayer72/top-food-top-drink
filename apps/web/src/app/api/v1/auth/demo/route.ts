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

const DEMO_EMAILS = new Set(['andreea@e-uvt.ro', 'luca@visit.ro']);

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const parsed = await parseJsonBody<{ email?: string; setCookie?: boolean }>(req);
  if (!parsed.ok) return parsed.response;

  const email = parsed.body.email?.trim().toLowerCase() ?? '';
  if (!DEMO_EMAILS.has(email)) {
    return apiError('invalid', 'Contul demo nu există.', 400);
  }

  try {
    const db = getDb();
    const u = await accounts.login(db, {
      login: email,
      password: process.env.DEMO_PASSWORD ?? 'demo1234',
    });
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
