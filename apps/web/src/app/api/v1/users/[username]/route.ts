import { userProfile } from '@tftd/api';
import {
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
} from '@/lib/api/http';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const { username } = await params;
  try {
    const profile = await userProfile(getDb(), decodeURIComponent(username));
    return apiOk(profile);
  } catch (e) {
    return apiFromError(e);
  }
}
