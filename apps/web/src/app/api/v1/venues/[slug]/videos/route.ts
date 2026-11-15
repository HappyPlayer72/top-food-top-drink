import { detectPlatform, submitSocialLinkNow } from '@tftd/api';
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
import { toVenueVideo } from '@/lib/backend/toRestaurant';
import { getDb } from '@/lib/server/db';
import { getRequestUserId } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const parsed = await parseJsonBody<{ url?: string }>(req);
  if (!parsed.ok) return parsed.response;

  const trimmed = parsed.body.url?.trim() ?? '';
  if (!trimmed) return apiError('invalid', 'Lipsește linkul video.', 400);

  const { slug } = await params;
  try {
    const db = getDb();
    const [venueId, userId] = await Promise.all([resolveVenueId(db, slug), getRequestUserId(req)]);
    const res = await submitSocialLinkNow(db, { venueId, url: trimmed, userId });
    if (res.status === 'duplicate') {
      return apiError('conflict', 'Acest link a fost deja adăugat la un local.', 409);
    }
    if (res.status === 'failed' || !res.analysis) {
      return apiError('invalid', 'Nu am putut citi datele video-ului acum. Verifică linkul și încearcă din nou.', 400);
    }
    return apiOk(
      {
        status: res.status,
        video: toVenueVideo(trimmed, detectPlatform(trimmed) ?? 'tiktok', res.analysis),
      },
      { status: 201 }
    );
  } catch (e) {
    return apiFromError(e);
  }
}
