import { apiOk, apiOptions } from '@/lib/api/http';
import { clearSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST() {
  await clearSession();
  return apiOk({ loggedOut: true });
}
