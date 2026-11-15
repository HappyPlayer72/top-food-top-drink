import { apiFromError, apiOk, apiOptions } from '@/lib/api/http';
import { loadWeekendEventsList } from '@/lib/api/service';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET() {
  try {
    return apiOk(await loadWeekendEventsList());
  } catch (e) {
    return apiFromError(e);
  }
}
