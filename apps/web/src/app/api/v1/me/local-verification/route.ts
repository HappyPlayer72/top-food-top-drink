import { accounts } from '@tftd/api';
import {
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  requireAuthUserId,
} from '@/lib/api/http';
import { getUserLocalCheckinDays } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont.');
  if (!auth.ok) return auth.response;

  try {
    const days = await getUserLocalCheckinDays(getDb(), auth.userId);
    return apiOk({ days, needed: accounts.LOCAL_RULES.gpsDays });
  } catch (e) {
    return apiFromError(e);
  }
}
