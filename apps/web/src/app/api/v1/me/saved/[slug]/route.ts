import { accounts } from '@tftd/api';
import {
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  requireAuthUserId,
} from '@/lib/api/http';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

async function toggle(req: Request, slug: string, desired: boolean) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să salvezi localurile pe termen lung.');
  if (!auth.ok) return auth.response;
  try {
    const res = await accounts.toggleSavedVenueSlug(getDb(), auth.userId, slug, desired);
    return apiOk({ saved: res.saved, slugs: res.savedSlugs });
  } catch (e) {
    return apiFromError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return toggle(req, slug, true);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return toggle(req, slug, false);
}
