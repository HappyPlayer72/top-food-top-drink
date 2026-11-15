import { submitVibe } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
} from '@/lib/api/http';
import { resolveVenueId } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const parsed = await parseJsonBody<{ level?: number }>(req);
  if (!parsed.ok) return parsed.response;

  const level = parsed.body.level;
  if (typeof level !== 'number' || !Number.isInteger(level)) {
    return apiError('invalid', 'Alege un nivel de aglomerație de la 1 la 5.', 400);
  }

  const { slug } = await params;
  try {
    const db = getDb();
    const [venueId, userId] = await Promise.all([resolveVenueId(db, slug), getRequestUserId(req)]);
    const row = await submitVibe(db, userId, venueId, level);
    return apiOk({ id: row.id, level: row.level, expiresAt: row.expiresAt });
  } catch (e) {
    return apiFromError(e);
  }
}
