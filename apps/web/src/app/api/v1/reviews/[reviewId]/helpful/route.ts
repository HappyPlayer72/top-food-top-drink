import { toggleHelpful } from '@tftd/api';
import {
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  requireAuthUserId,
} from '@/lib/api/http';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să votezi.');
  if (!auth.ok) return auth.response;

  const { reviewId } = await params;
  try {
    const res = await toggleHelpful(getDb(), auth.userId, reviewId);
    return apiOk(res);
  } catch (e) {
    return apiFromError(e);
  }
}
