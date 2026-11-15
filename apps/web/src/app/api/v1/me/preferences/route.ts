import { accounts } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
  requireAuthUserId,
} from '@/lib/api/http';
import { toUserAccount } from '@/lib/backend/user';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function PUT(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să îți salvezi preferințele.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ interests?: string[] }>(req);
  if (!parsed.ok) return parsed.response;
  if (!Array.isArray(parsed.body.interests)) {
    return apiError('invalid', 'Preferințele trimise nu sunt valide.', 400);
  }

  try {
    const db = getDb();
    await accounts.setInterests(db, auth.userId, parsed.body.interests);
    return apiOk({ user: await toUserAccount(db, auth.userId) });
  } catch (e) {
    return apiFromError(e);
  }
}
