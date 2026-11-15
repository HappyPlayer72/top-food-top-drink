import { accounts } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
  requireAuthUserId,
} from '@/lib/api/http';
import { DEFAULT_CITY_SLUG } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ email?: string }>(req);
  if (!parsed.ok) return parsed.response;

  const email = parsed.body.email?.trim().toLowerCase() ?? '';
  if (!email) return apiError('invalid', 'Introdu adresa de email universitar.', 400);

  try {
    const r = await accounts.startUniversityEmail(getDb(), auth.userId, DEFAULT_CITY_SLUG, email);
    const demo = process.env.DEMO_EMAIL_CODES !== 'off';
    return apiOk({
      verificationId: r.verificationId,
      ...(demo ? { demoCode: r.code } : {}),
      message: demo
        ? `Mod demo: nu trimitem încă emailuri, codul tău e ${r.code}.`
        : `Ți-am trimis un cod pe ${email}.`,
    });
  } catch (e) {
    return apiFromError(e);
  }
}
