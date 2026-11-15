import { apiFromError, apiOffline, apiOk, apiOptions, hasDbConfigured } from '@/lib/api/http';
import { getVoterToken, readPollRecord } from '@/lib/api/polls';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!hasDbConfigured()) return apiOffline('Sondajele nu sunt disponibile momentan. Încearcă mai târziu.');
  const { token } = await params;
  try {
    const voterToken = await getVoterToken(req);
    const poll = await readPollRecord(token, voterToken);
    return apiOk(poll);
  } catch (e) {
    return apiFromError(e);
  }
}
