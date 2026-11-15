import { addFromGoogle } from '@tftd/api';
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
import { DEFAULT_CITY_SLUG } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';
import type { Vertical } from '@/types';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să adaugi un local.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ vertical?: Vertical; placeId?: string }>(req);
  if (!parsed.ok) return parsed.response;

  const vertical: Vertical = parsed.body.vertical === 'drink' ? 'drink' : 'food';
  const placeId = parsed.body.placeId?.trim() ?? '';
  if (!placeId) return apiError('invalid', 'Lipsește identificatorul Google Places (`placeId`).', 400);

  try {
    const r = await addFromGoogle(getDb(), auth.userId, {
      citySlug: DEFAULT_CITY_SLUG,
      vertical,
      placeId,
    });
    return apiOk(
      {
        outcome: r.outcome,
        message:
          r.outcome === 'created'
            ? 'Localul a fost adăugat. Apare în top după primele review-uri.'
            : 'Localul era deja la noi, l-am legat de rezultatul de pe Google.',
      },
      { status: r.outcome === 'created' ? 201 : 200 }
    );
  } catch (e) {
    return apiFromError(e);
  }
}
