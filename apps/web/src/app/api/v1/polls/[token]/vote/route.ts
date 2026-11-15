import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
} from '@/lib/api/http';
import { getVoterToken, votePollRecord } from '@/lib/api/polls';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!hasDbConfigured()) return apiOffline('Sondajele nu sunt disponibile momentan. Încearcă mai târziu.');
  const parsed = await parseJsonBody<{ venueId?: string; venueSlug?: string }>(req);
  if (!parsed.ok) return parsed.response;

  const venueSlug = (parsed.body.venueSlug ?? parsed.body.venueId ?? '').trim();
  if (!venueSlug) return apiError('invalid', 'Alege localul pentru care votezi.', 400);

  const { token } = await params;
  try {
    const existingVoter = await getVoterToken(req);
    const result = await votePollRecord(token, venueSlug, existingVoter);
    return apiOk(result, {
      headers: { 'X-Voter-Token': result.voterToken },
    });
  } catch (e) {
    return apiFromError(e);
  }
}
