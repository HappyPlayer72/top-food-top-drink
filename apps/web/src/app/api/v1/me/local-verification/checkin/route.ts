import { accounts } from '@tftd/api';
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
import { DEFAULT_CITY_SLUG, getUserLocalCheckinDays } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

const NEED = accounts.LOCAL_RULES.gpsDays;

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să faci check-in.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ lat?: number; lng?: number }>(req);
  if (!parsed.ok) return parsed.response;

  const { lat, lng } = parsed.body;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return apiError('invalid', 'Locația nu e validă.', 400);
  }

  try {
    const db = getDb();
    const r = await accounts.checkinFromLocation(db, auth.userId, { lat, lng });
    if (r.citySlug !== DEFAULT_CITY_SLUG) {
      return apiError(
        'invalid',
        'Nu pari să fii în Timișoara acum. Check-in-ul se poate face doar în oraș.',
        400
      );
    }
    const days = await getUserLocalCheckinDays(db, auth.userId);
    return apiOk({
      becameLocal: r.becameLocal,
      days,
      needed: NEED,
      message: r.becameLocal
        ? 'Gata, ești localnic verificat! Review-urile tale contează de acum dublu.'
        : `Check-in salvat (${days} din ${NEED} zile). Mai ai ${Math.max(0, NEED - days)} ${NEED - days === 1 ? 'zi' : 'zile'} până la insigna de localnic.`,
    });
  } catch (e) {
    return apiFromError(e);
  }
}
