import { accounts } from '@tftd/api';
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

type Platform = 'tiktok' | 'instagram' | 'facebook' | 'youtube';
const PLATFORMS = new Set<Platform>(['tiktok', 'instagram', 'facebook', 'youtube']);

export async function DELETE(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont mai întâi.');
  if (!auth.ok) return auth.response;

  const { platform } = await params;
  if (!PLATFORMS.has(platform as Platform)) {
    return apiError('invalid', 'Platformă socială necunoscută.', 400);
  }

  try {
    const db = getDb();
    await accounts.unlinkSocialAccount(db, auth.userId, platform as Platform);
    return apiOk({ user: await toUserAccount(db, auth.userId) });
  } catch (e) {
    return apiFromError(e);
  }
}
