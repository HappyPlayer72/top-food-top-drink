import { antibot } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  requireAuthUserId,
} from '@/lib/api/http';
import { resolveVenueId } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să scrii un review.');
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const venueRef = (searchParams.get('venueId') ?? searchParams.get('slug') ?? '').trim();
  if (!venueRef) return apiError('invalid', 'Lipsește localul (`venueId` sau `slug`).', 400);

  try {
    const venueId = await resolveVenueId(getDb(), venueRef);
    const token = antibot.issueReviewFormToken(auth.userId, venueId);
    return apiOk({
      venueId,
      token,
      minFillMs: antibot.GATE_RULES.minFillMs,
      tokenTtlMs: antibot.GATE_RULES.tokenTtlMs,
    });
  } catch (e) {
    return apiFromError(e);
  }
}
