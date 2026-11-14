'use server';
/**
 * Fidelitate pe site-ul public: portofelul userului, ștampile, carduri personale.
 * Programele localurilor = ștampile prin codul QR rotativ al localului (packages/loyalty).
 * În demo (DEMO_SCAN ≠ "off") butonul „+1 ștampilă” simulează scanarea codului de la tejghea.
 */
import { loyalty } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import type { LoyaltyIconId, LoyaltyProgram } from '@/types';
import type { Result } from './user';

const CITY = 'timisoara';
const ICONS: LoyaltyIconId[] = ['soup', 'coffee', 'croissant', 'pizza', 'beer', 'wine', 'heart', 'cat'];
const asIcon = (i: string): LoyaltyIconId => (ICONS.includes(i as LoyaltyIconId) ? (i as LoyaltyIconId) : 'heart');
const hasDb = () => !!process.env.DATABASE_URL;
const OFFLINE = { ok: false as const, offline: true, error: 'Baza de date nu e disponibilă.' };

/** Portofelul: programele localurilor din oraș (cu progresul userului) + cardurile lui personale. */
export async function fidelityWallet(): Promise<Result<{ programs: LoyaltyProgram[]; loggedIn: boolean }>> {
  if (!hasDb()) return OFFLINE;
  try {
    const userId = await getUserId();
    if (!userId) return { ok: false, error: 'Intră în cont ca să vezi cardurile.' };
    const db = getDb();
    const [venuePrograms, cards] = await Promise.all([loyalty.cityPrograms(db, CITY), loyalty.myCards(db, userId)]);
    const byProgram = new Map(cards.map((c) => [c.programId, c]));
    const programs: LoyaltyProgram[] = [
      ...cards
        .filter((c) => c.personal)
        .map((c) => ({
          id: c.programId,
          venueName: c.venueName,
          neighborhood: 'Card personal',
          rewardTitle: c.rewardTitle,
          stampsRequired: c.stampsRequired,
          iconId: asIcon(c.icon),
          accentColor: c.accentColor ?? '#3A2418',
          stampsCollected: c.stamps,
          redeemedCount: c.redeemed,
          qrSeed: `TOPFOOD:CARD:${c.cardId}`,
          isCustomVendor: true,
        })),
      ...venuePrograms.map((p) => {
        const c = byProgram.get(p.id);
        return {
          id: p.id,
          venueName: p.venueName,
          neighborhood: p.neighborhood ?? 'Timișoara',
          rewardTitle: p.rewardTitle,
          stampsRequired: p.stampsRequired,
          iconId: asIcon(p.icon),
          accentColor: p.accentColor ?? (p.vertical === 'drink' ? '#17382C' : '#B3261E'),
          stampsCollected: c?.stamps ?? 0,
          redeemedCount: c?.redeemed ?? 0,
          qrSeed: `TOPFOOD:PROGRAM:${p.id}`,
        };
      }),
    ];
    return { ok: true, programs, loggedIn: !!userId };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/**
 * „+1 ștampilă” / „Revendică”: la un card personal pune ștampila userul; la un local se folosește
 * codul QR al localului (în demo, generat aici, ca și cum ai fi scanat ecranul de la tejghea).
 */
export async function stampFidelity(programId: string, code?: string): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să aduni ștampile.' };
  try {
    const db = getDb();
    const card = await loyalty.cardFor(db, userId, programId);
    const wallet = card ? (await loyalty.myCards(db, userId)).find((c) => c.cardId === card.id) : null;
    if (wallet?.personal) {
      const after = await loyalty.addPersonalStamp(db, userId, card!.id);
      return {
        ok: true,
        message: after.stamps === 0 ? `Premiu folosit: ${after.rewardTitle}.` : `+1 ștampilă (${after.stamps}/${after.stampsRequired}).`,
      };
    }
    let scanCode = code?.trim();
    if (!scanCode) {
      if (process.env.DEMO_SCAN === 'off') return { ok: false, error: 'Scanează codul QR afișat de local.' };
      scanCode = await loyalty.demoStampCode(db, programId);
    }
    const res = await loyalty.scanCode(db, userId, scanCode);
    return { ok: true, message: res.message };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** „Adaugă un local”: card personal pentru un local care nu e pe platformă. */
export async function createFidelityCard(input: {
  name: string;
  rewardTitle: string;
  stampsRequired: number;
  icon: LoyaltyIconId;
  accentColor: string;
}): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să-ți faci un card.' };
  try {
    const card = await loyalty.createPersonalCard(getDb(), userId, input);
    await loyalty.addPersonalStamp(getDb(), userId, card.cardId);
    return { ok: true, message: `Cardul pentru „${input.name.trim()}” e gata, cu prima ștampilă pusă.` };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
