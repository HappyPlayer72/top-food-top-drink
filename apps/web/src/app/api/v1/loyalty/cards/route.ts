import { loyalty } from '@tftd/api';
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
import { asLoyaltyIcon } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să-ți faci un card.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{
    name?: string;
    rewardTitle?: string;
    stampsRequired?: number;
    icon?: string;
    accentColor?: string;
  }>(req);
  if (!parsed.ok) return parsed.response;

  const { name, rewardTitle, stampsRequired, icon, accentColor } = parsed.body;
  if (!name?.trim() || !rewardTitle?.trim() || typeof stampsRequired !== 'number') {
    return apiError('invalid', 'Completează numele localului, premiul și numărul de ștampile.', 400);
  }

  try {
    const db = getDb();
    const card = await loyalty.createPersonalCard(db, auth.userId, {
      name,
      rewardTitle,
      stampsRequired,
      icon: asLoyaltyIcon(icon ?? 'heart'),
      accentColor,
    });
    const stamped = await loyalty.addPersonalStamp(db, auth.userId, card.cardId);
    return apiOk(
      {
        message: `Cardul pentru „${name.trim()}” e gata, cu prima ștampilă pusă.`,
        card: stamped,
      },
      { status: 201 }
    );
  } catch (e) {
    return apiFromError(e);
  }
}
