import { apiFromError, apiOk, apiOptions } from '@/lib/api/http';
import { loadLeaderboardAndMonthlyVotes } from '@/lib/api/service';
import { getRequestUserId } from '@/lib/server/session';
import type { Vertical } from '@/types';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vertical: Vertical = searchParams.get('vertical') === 'drink' ? 'drink' : 'food';
  const month = searchParams.get('month')?.trim() || null;

  try {
    const userId = await getRequestUserId(req);
    const data = await loadLeaderboardAndMonthlyVotes({ vertical, month, userId });
    return apiOk(data);
  } catch (e) {
    return apiFromError(e);
  }
}
