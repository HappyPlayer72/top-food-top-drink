import { myQuickVotes } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  requireAuthUserId,
} from '@/lib/api/http';
import { toUserAccount } from '@/lib/backend/user';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Sesiunea lipsește sau a expirat.');
  if (!auth.ok) return auth.response;

  try {
    const db = getDb();
    const [user, quickVotes] = await Promise.all([
      toUserAccount(db, auth.userId),
      myQuickVotes(db, auth.userId).catch(() => ({})),
    ]);
    if (!user) {
      return apiError('unauthorized', 'Contul nu există sau sesiunea a expirat.', 401);
    }
    return apiOk({ user, myQuickVotes: quickVotes });
  } catch (e) {
    return apiFromError(e);
  }
}
