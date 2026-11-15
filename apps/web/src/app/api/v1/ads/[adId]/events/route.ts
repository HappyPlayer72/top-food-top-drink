import { monetization } from '@tftd/api';
import {
  apiError,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
} from '@/lib/api/http';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request, { params }: { params: Promise<{ adId: string }> }) {
  const parsed = await parseJsonBody<{ event?: 'impression' | 'click' }>(req);
  if (!parsed.ok) return parsed.response;

  const event = parsed.body.event;
  if (event !== 'impression' && event !== 'click') {
    return apiError('invalid', 'Evenimentul trebuie să fie `impression` sau `click`.', 400);
  }

  const { adId } = await params;
  if (!hasDbConfigured() || !adId) {
    return apiOk({ recorded: false });
  }

  try {
    await monetization.recordAdEvent(getDb(), adId, event);
    return apiOk({ recorded: true });
  } catch {
    return apiOk({ recorded: false });
  }
}
