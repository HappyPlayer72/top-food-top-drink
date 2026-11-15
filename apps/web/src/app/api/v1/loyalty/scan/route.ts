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
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să aduni ștampile.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ programId?: string; code?: string }>(req);
  if (!parsed.ok) return parsed.response;

  let scanCode = parsed.body.code?.trim();
  const programId = parsed.body.programId?.trim() || scanCode?.split('.')[0]?.trim() || '';
  if (!programId && !scanCode) {
    return apiError('invalid', 'Trimite codul QR scanat sau `programId`.', 400);
  }

  try {
    const db = getDb();
    if (programId) {
      const card = await loyalty.cardFor(db, auth.userId, programId);
      const wallet = card ? (await loyalty.myCards(db, auth.userId)).find((c) => c.cardId === card.id) : null;
      if (wallet?.personal) {
        const after = await loyalty.addPersonalStamp(db, auth.userId, card!.id);
        return apiOk({
          action: after.stamps === 0 ? 'redeemed' : 'stamped',
          message:
            after.stamps === 0
              ? `Premiu folosit: ${after.rewardTitle}.`
              : `+1 ștampilă (${after.stamps}/${after.stampsRequired}).`,
          card: after,
        });
      }
    }

    if (!scanCode) {
      if (process.env.DEMO_SCAN === 'off') {
        return apiError('invalid', 'Scanează codul QR afișat de local.', 400);
      }
      scanCode = await loyalty.demoStampCode(db, programId);
    }

    const res = await loyalty.scanCode(db, auth.userId, scanCode);
    return apiOk({
      action: res.action,
      message: res.message,
      card: res.card,
    });
  } catch (e) {
    return apiFromError(e);
  }
}
