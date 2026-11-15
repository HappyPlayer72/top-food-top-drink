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

  const parsed = await parseJsonBody<{ platform?: Platform; bioSnippet?: string; followers?: number }>(req);
  if (!parsed.ok) return parsed.response;

  const { platform, bioSnippet, followers } = parsed.body;
  if (!platform || !PLATFORMS.has(platform) || typeof bioSnippet !== 'string' || !bioSnippet.trim()) {
    return apiError('invalid', 'Lipește textul din bio care conține codul de verificare.', 400);
  }

  try {
    const db = getDb();
    const res = await accounts.confirmSocialVerification(db, auth.userId, {
      platform,
      bioSnippet: bioSnippet.trim(),
      followers,
    });
    return apiOk({
      influencer: res.influencer,
      user: await toUserAccount(db, auth.userId),
    });
  } catch (e) {
    return apiFromError(e);
  }
}
