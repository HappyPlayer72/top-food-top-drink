import {
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
} from '@/lib/api/http';
import { createPollRecord } from '@/lib/api/polls';
import { getRequestOrigin } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline('Sondajele nu sunt disponibile momentan. Încearcă mai târziu.');
  const parsed = await parseJsonBody<{ venueIds?: unknown }>(req);
  if (!parsed.ok) return parsed.response;

  try {
    const res = await createPollRecord(parsed.body.venueIds);
    const origin = getRequestOrigin(req);
    return apiOk(
      {
        token: res.token,
        venueIds: res.venueIds,
        shareUrl: `${origin}/unde-iesim/${res.token}`,
      },
      { status: 201 }
    );
  } catch (e) {
    return apiFromError(e);
  }
}
