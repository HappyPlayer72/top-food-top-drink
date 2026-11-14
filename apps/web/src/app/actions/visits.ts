'use server';
/**
 * „Dovedește vizita” din formularul de review (pondere ×1,3):
 * - check-in GPS la local: coordonatele se folosesc doar pentru distanță; se salvează ziua (GDPR).
 *   Doar cu DEMO_VISIT_GPS=on locația e simulată (prezentarea de pe laptop); implicit cere GPS real.
 * - poza bonului: ajunge în /admin; după decizie poza se șterge.
 */
import { revalidatePath } from 'next/cache';
import { completeThemedTour, visits } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import type { Result } from './user';

const hasDb = () => !!process.env.DATABASE_URL;
const OFFLINE = { ok: false as const, offline: true, error: 'Baza de date nu e disponibilă.' };
const demoGps = () => process.env.DEMO_VISIT_GPS === 'on';

/**
 * Fără `loc` și în afara demo-ului întoarce `needLocation`, iar clientul cere locația telefonului.
 * Așa, în demo nu apare deloc întrebarea browserului despre locație.
 */
export async function checkInAtVenue(
  venueId: string,
  loc?: { lat: number; lng: number },
): Promise<Result<{ message: string; simulated: boolean; upgraded: boolean }> | { ok: false; needLocation: true; error: string }> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să faci check-in.' };
  const simulated = demoGps();
  if (!simulated && !loc) return { ok: false, needLocation: true, error: 'Avem nevoie de locația ta.' };
  try {
    const r = await visits.checkInAtVenue(getDb(), userId, venueId, simulated ? { simulate: true } : loc!);
    if (r.upgradedReviewId) revalidatePath('/', 'layout');
    return {
      ok: true,
      simulated,
      upgraded: !!r.upgradedReviewId,
      message: simulated
        ? 'Check-in la local (mod demo: locația e simulată).'
        : `Check-in la local (ești la ${r.distanceM} m). Păstrăm doar ziua, nu locația.`,
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Ștampila turului tematic: serverul verifică check-in-ul la fiecare oprire (Tasting Tour → „Finalizează turul”). */
export async function finishThemedTour(tourSlug: string, venueIds: string[]): Promise<Result<{ message: string; awarded: boolean }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să primești ștampila turului.' };
  if (typeof tourSlug !== 'string' || !Array.isArray(venueIds) || venueIds.length > 3 || !venueIds.every((id) => typeof id === 'string')) {
    return { ok: false, error: 'Turul nu e valid.' };
  }
  try {
    const r = await completeThemedTour(getDb(), userId, tourSlug, venueIds);
    revalidatePath('/cont');
    return {
      ok: true,
      awarded: r.awarded,
      message: r.awarded ? `Ai primit ștampila „${r.tourName}”. O găsești în profil.` : `Ai deja ștampila „${r.tourName}”.`,
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** FormData: `reviewId` + `receipt` (poza, deja micșorată în browser). */
export async function attachReceipt(fd: FormData): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont.' };
  const reviewId = String(fd.get('reviewId') ?? '');
  const file = fd.get('receipt');
  if (!reviewId || !(file instanceof Blob)) return { ok: false, error: 'Alege o poză cu bonul.' };
  try {
    await visits.submitReceipt(getDb(), userId, reviewId, new Uint8Array(await file.arrayBuffer()));
    return { ok: true, message: 'Bonul a ajuns la verificare. După aprobare, review-ul tău cântărește ×1,3.' };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
