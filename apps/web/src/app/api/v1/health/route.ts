import { sql } from 'drizzle-orm';
import { API_VERSION, apiOk, apiOptions, hasDbConfigured } from '@/lib/api/http';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function GET() {
  const dbConfigured = hasDbConfigured();
  let dbReachable = false;
  if (dbConfigured) {
    try {
      await getDb().execute(sql`select 1`);
      dbReachable = true;
    } catch {
      dbReachable = false;
    }
  }
  return apiOk({
    status: 'ok',
    apiVersion: Number(API_VERSION),
    dbConfigured,
    dbReachable,
    timestamp: new Date().toISOString(),
  });
}
