import { apiFromError, apiOk, apiOptions } from '@/lib/api/http';
import { loadLoyaltyProgramsForUser } from '@/lib/api/service';
import { getRequestUserId } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request) {
  try {
    const userId = await getRequestUserId(req);
    const data = await loadLoyaltyProgramsForUser(userId);
    return apiOk(data);
  } catch (e) {
    return apiFromError(e);
  }
}
