import { visits } from '@tftd/api';
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
  const auth = await requireAuthUserId(req, 'Intră în cont ca să faci check-in.');
  if (!auth.ok) return auth.response;

  let body: { lat?: number; lng?: number; simulate?: boolean } = {};
  if ((req.headers.get('content-length') ?? '0') !== '0') {
    const parsed = await parseJsonBody<{ lat?: number; lng?: number; simulate?: boolean }>(req);
    if (!parsed.ok) return parsed.response;
    body = parsed.body;
  }

  const demoAllowed = process.env.DEMO_VISIT_GPS !== 'off';
  const hasCoords = Number.isFinite(body.lat) && Number.isFinite(body.lng);
  const simulated = Boolean(body.simulate && demoAllowed) || (demoAllowed && !hasCoords);

  if (!simulated && !hasCoords) {
    return apiError('invalid', 'Avem nevoie de locația ta.', 400, { needLocation: true });
  }

  const { slug } = await params;
  try {
    const db = getDb();
    const venueId = await resolveVenueId(db, slug);
    const r = await visits.checkInAtVenue(
      db,
      auth.userId,
      venueId,
      simulated ? { simulate: true } : { lat: body.lat!, lng: body.lng! }
    );
    return apiOk({
      simulated,
      distanceM: r.distanceM,
      day: r.day,
      upgraded: Boolean(r.upgradedReviewId),
      upgradedReviewId: r.upgradedReviewId,
      message: simulated
        ? 'Check-in la local (mod demo: locația e simulată).'
        : `Check-in la local (ești la ${r.distanceM} m). Păstrăm doar ziua, nu locația.`,
    });
  } catch (e) {
    return apiFromError(e);
  }
}
