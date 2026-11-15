import { submitQuickVote } from '@tftd/api';
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
import { resolveVenueId } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să votezi.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ kind?: string; value?: number }>(req);
  if (!parsed.ok) return parsed.response;

  const { kind, value } = parsed.body;
  if (typeof kind !== 'string' || typeof value !== 'number') {
    return apiError('invalid', 'Trimite `kind` (`safety` sau `noise`) și `value`.', 400);
  }

  const { slug } = await params;
  try {
    const db = getDb();
    const venueId = await resolveVenueId(db, slug);
    const row = await submitQuickVote(db, auth.userId, venueId, kind, value);
    return apiOk({ kind: row.kind, value: row.value });
  } catch (e) {
    return apiFromError(e);
  }
}
