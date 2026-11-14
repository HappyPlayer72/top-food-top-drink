'use server';
/**
 * „Devino localnic verificat” din site.
 * - Check-in GPS: coordonatele ajung doar aici, se găsește orașul/localul, se salvează DOAR ziua (GDPR).
 *   După check-in în 5 zile diferite din 30 → insigna de localnic.
 * - Email universitar (UVT, UPT, UMFT…): cod de confirmare. Fără serviciu de email, în demo codul
 *   se afișează pe ecran (DEMO_EMAIL_CODES ≠ "off").
 */
import { and, countDistinct, eq, gte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { accounts } from '@tftd/api';
import { checkins } from '@tftd/db';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import type { Result } from './user';

const CITY = 'timisoara';
const hasDb = () => !!process.env.DATABASE_URL;
const OFFLINE = { ok: false as const, offline: true, error: 'Baza de date nu e disponibilă.' };
const NEED = accounts.LOCAL_RULES.gpsDays;

async function daysInCity(userId: string): Promise<number> {
  const since = new Date(Date.now() - accounts.LOCAL_RULES.windowDays * 86_400_000).toISOString().slice(0, 10);
  const [r] = await getDb()
    .select({ days: countDistinct(checkins.day) })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.citySlug, CITY), gte(checkins.day, since)));
  return r?.days ?? 0;
}

export async function localStatus(): Promise<Result<{ days: number; needed: number }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont.' };
  return { ok: true, days: await daysInCity(userId), needed: NEED };
}

export async function checkInHere(loc: { lat: number; lng: number }): Promise<Result<{ message: string; becameLocal: boolean; days: number; needed: number }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să faci check-in.' };
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return { ok: false, error: 'Locația nu e validă.' };
  try {
    const r = await accounts.checkinFromLocation(getDb(), userId, loc);
    if (r.citySlug !== CITY) {
      return { ok: false, error: 'Nu pari să fii în Timișoara acum. Check-in-ul se poate face doar în oraș.' };
    }
    const days = await daysInCity(userId);
    if (r.becameLocal) revalidatePath('/', 'layout');
    return {
      ok: true,
      becameLocal: r.becameLocal,
      days,
      needed: NEED,
      message: r.becameLocal
        ? 'Gata, ești localnic verificat! Review-urile tale contează de acum dublu.'
        : `Check-in salvat (${days} din ${NEED} zile). Mai ai ${Math.max(0, NEED - days)} ${NEED - days === 1 ? 'zi' : 'zile'} până la insigna de localnic.`,
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function startEmailVerification(email: string): Promise<Result<{ verificationId: string; demoCode?: string; message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont.' };
  try {
    const r = await accounts.startUniversityEmail(getDb(), userId, CITY, email.trim().toLowerCase());
    const demo = process.env.DEMO_EMAIL_CODES !== 'off';
    return {
      ok: true,
      verificationId: r.verificationId,
      ...(demo ? { demoCode: r.code } : {}),
      message: demo
        ? `Mod demo: nu trimitem încă emailuri, codul tău e ${r.code}.`
        : `Ți-am trimis un cod pe ${email.trim()}.`,
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function confirmEmailVerification(verificationId: string, code: string): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont.' };
  try {
    await accounts.confirmUniversityEmail(getDb(), userId, verificationId, code.trim());
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Gata, ești localnic verificat! Review-urile tale contează de acum dublu.' };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
