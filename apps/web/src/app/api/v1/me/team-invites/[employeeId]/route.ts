import { owner } from '@tftd/api';
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

export async function POST(req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ accept?: boolean }>(req);
  if (!parsed.ok) return parsed.response;
  if (typeof parsed.body.accept !== 'boolean') {
    return apiError('invalid', 'Specifică `accept: true` sau `accept: false`.', 400);
  }

  const { employeeId } = await params;
  try {
    const db = getDb();
    await owner.respondToInvite(db, auth.userId, employeeId, parsed.body.accept);
    return apiOk({ user: await toUserAccount(db, auth.userId) });
  } catch (e) {
    return apiFromError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont.');
  if (!auth.ok) return auth.response;

  const { employeeId } = await params;
  try {
    const db = getDb();
    await owner.removeEmployee(db, auth.userId, employeeId);
    return apiOk({ user: await toUserAccount(db, auth.userId) });
  } catch (e) {
    return apiFromError(e);
  }
}
