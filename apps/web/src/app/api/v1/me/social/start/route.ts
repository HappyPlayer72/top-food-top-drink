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

type Platform = 'tiktok' | 'instagram' | 'facebook' | 'youtube';
const PLATFORMS = new Set<Platform>(['tiktok', 'instagram', 'facebook', 'youtube']);

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont mai întâi.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ platform?: Platform; url?: string; followers?: number }>(req);
  if (!parsed.ok) return parsed.response;

  const { platform, url, followers } = parsed.body;
  if (!platform || !PLATFORMS.has(platform) || typeof url !== 'string' || !url.trim()) {
    return apiError('invalid', 'Platforma sau linkul profilului social nu sunt valide.', 400);
  }

  try {
    const db = getDb();
    const res = await accounts.startSocialVerification(db, auth.userId, {
      platform,
      url: url.trim(),
      followers,
    });
    return apiOk({
      code: res.code,
      instruction: res.instruction,
      user: await toUserAccount(db, auth.userId),
    });
  } catch (e) {
    return apiFromError(e);
  }
}
