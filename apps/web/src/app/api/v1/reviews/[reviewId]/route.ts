import { deleteReview, editReview } from '@tftd/api';
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
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function PATCH(req: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să editezi un review.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ rating?: number; text?: string }>(req);
  if (!parsed.ok) return parsed.response;
  if (typeof parsed.body.rating !== 'number' || typeof parsed.body.text !== 'string') {
    return apiError('invalid', 'Trimite nota (`rating`) și textul (`text`).', 400);
  }

  const { reviewId } = await params;
  try {
    await editReview(getDb(), auth.userId, {
      reviewId,
      rating: Math.round(parsed.body.rating),
      text: parsed.body.text,
    });
    return apiOk({
      reviewId,
      message: 'Review-ul a fost actualizat și scorul localului s-a recalculat.',
    });
  } catch (e) {
    return apiFromError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să ștergi un review.');
  if (!auth.ok) return auth.response;

  const { reviewId } = await params;
  try {
    await deleteReview(getDb(), auth.userId, reviewId);
    return apiOk({
      deleted: true,
      message: 'Review-ul a fost șters și scorul localului s-a recalculat.',
    });
  } catch (e) {
    return apiFromError(e);
  }
}
