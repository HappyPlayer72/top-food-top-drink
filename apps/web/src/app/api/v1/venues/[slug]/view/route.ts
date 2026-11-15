import { owner } from '@tftd/api';
import { apiFromError, apiOk, apiOptions, hasDbConfigured } from '@/lib/api/http';
import { resolveVenueId } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasDbConfigured()) return apiOk({ recorded: false });
  const { slug } = await params;
  try {
    const db = getDb();
    const venueId = await resolveVenueId(db, slug);
    await owner.recordVenueView(db, venueId);
    return apiOk({ recorded: true });
  } catch (e) {
    return apiFromError(e);
  }
}
