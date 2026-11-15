import type { ReviewFilter } from '@tftd/api';
import { apiError, apiFromError, apiOk, apiOptions } from '@/lib/api/http';
import { loadVenueDetailBySlug } from '@/lib/api/service';
import { getRequestOrigin, getRequestUserId } from '@/lib/server/session';
import type { Vertical } from '@/types';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const vertical: Vertical = searchParams.get('vertical') === 'drink' ? 'drink' : 'food';
  const rf = searchParams.get('reviews');
  const reviews: ReviewFilter =
    rf === 'local' || rf === 'tourist' || rf === 'influencer' ? rf : 'all';
  const trackView = searchParams.get('trackView') === '1' || searchParams.get('trackView') === 'true';

  try {
    const userId = await getRequestUserId(req);
    const data = await loadVenueDetailBySlug(
      { vertical, slug, reviews, trackView, userId },
      getRequestOrigin(req)
    );
    if (!data.venue) {
      return apiError('not_found', 'Localul nu există.', 404);
    }
    return apiOk(data);
  } catch (e) {
    return apiFromError(e);
  }
}
