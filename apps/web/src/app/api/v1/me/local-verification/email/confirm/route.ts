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

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ verificationId?: string; code?: string }>(req);
  if (!parsed.ok) return parsed.response;

  const verificationId = parsed.body.verificationId?.trim() ?? '';
  const code = parsed.body.code?.trim() ?? '';
  if (!verificationId || !code) {
    return apiError('invalid', 'Trimite `verificationId` și codul de confirmare.', 400);
  }

  try {
    const db = getDb();
    await accounts.confirmUniversityEmail(db, auth.userId, verificationId, code);
    return apiOk({
      message: 'Gata, ești localnic verificat! Review-urile tale contează de acum dublu.',
      user: await toUserAccount(db, auth.userId),
    });
  } catch (e) {
    return apiFromError(e);
  }
}
