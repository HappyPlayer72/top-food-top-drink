import { apiOk, apiOptions } from '@/lib/api/http';
import { buildPlatformConfig } from '@/lib/api/service';
import { getRequestOrigin } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET(req: Request) {
  const origin = getRequestOrigin(req);
  return apiOk(buildPlatformConfig(origin), { cacheControl: 'public, max-age=300' });
}
