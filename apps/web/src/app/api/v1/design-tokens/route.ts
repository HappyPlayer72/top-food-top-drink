import tokens from '../../../../../../../design/tokens.json';
import { apiOk, apiOptions } from '@/lib/api/http';

export const dynamic = 'force-static';
export const OPTIONS = apiOptions;

export async function GET() {
  return apiOk(tokens, { cacheControl: 'public, max-age=3600' });
}
