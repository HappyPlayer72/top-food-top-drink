'use server';
/**
 * Acțiunile userilor de pe site-ul public (login, review, „util”, cât e de plin).
 * Fiecare întoarce un rezultat, nu aruncă: UI-ul afișează `error` (în română).
 * `offline: true` = nu există bază de date (DATABASE_URL lipsă) → UI-ul păstrează comportamentul local.
 */
import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { accounts, deleteReview, detectPlatform, editReview, monetization, owner, submitQuickVote, submitSocialLinkNow, submitVibe, toggleHelpful, writeReview } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { clearSession, errorMessage, getUserId, setSession } from '@/lib/server/session';
import { toVenueVideo } from '@/lib/backend/toRestaurant';
import { toUserAccount } from '@/lib/backend/user';
import type { UserAccount, VenueVideo } from '@/types';

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; offline?: boolean };

const OFFLINE = { ok: false as const, offline: true, error: 'Baza de date nu e disponibilă.' };
const hasDb = () => !!process.env.DATABASE_URL;

/** Conturile demo de pe ecranul de login (există în seed, cu parola DEMO_PASSWORD). */
const DEMO_EMAILS = new Set(['andreea@e-uvt.ro', 'luca@visit.ro']);

export async function currentUser(): Promise<UserAccount | null> {
  if (!hasDb()) return null;
  const id = await getUserId();
  return id ? toUserAccount(getDb(), id) : null;
}

export async function loginUser(input: { email: string; password: string }): Promise<Result<{ user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  try {
    const u = await accounts.login(getDb(), { login: input.email.trim().toLowerCase(), password: input.password });
    await setSession(u.id);
    return { ok: true, user: (await toUserAccount(getDb(), u.id))! };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Butoanele „Acces rapid cu un cont demo”: loghează contul real din seed. */
export async function loginDemo(email: string): Promise<Result<{ user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  if (!DEMO_EMAILS.has(email)) return { ok: false, error: 'Contul demo nu există.' };
  return loginUser({ email, password: process.env.DEMO_PASSWORD ?? 'demo1234' });
}

export async function registerUser(input: { name: string; email: string; password: string; interests?: string[] }): Promise<Result<{ user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  try {
    const email = input.email.trim().toLowerCase();
    const base = (email.split('@')[0] ?? 'user').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20) || 'user';
    const u = await accounts.register(getDb(), {
      username: `${base.padEnd(3, '0')}${randomInt(1000, 10000)}`,
      displayName: input.name,
      email,
      password: input.password,
      interests: input.interests ?? [],
    });
    await setSession(u.id);
    return { ok: true, user: (await toUserAccount(getDb(), u.id))! };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function logoutUser(): Promise<void> {
  if (hasDb()) await clearSession();
}

/** Review real: analiză (limbă, fals, aspecte) + recalcularea scorului, apoi paginile se reîncarcă. */
export async function submitReview(input: {
  venueId: string;
  rating: number;
  text: string;
  weekendNight?: boolean;
  /** Întrebările structurate; validate pe server (writeReview). */
  answers?: Record<string, string>;
  receiptPhotoUrl?: string;
}): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să scrii un review.' };
  try {
    const r = await writeReview(getDb(), userId, { ...input, rating: Math.round(input.rating) });
    revalidatePath('/', 'layout');
    const weight = (r.weight ?? 1).toFixed(1).replace('.', ',');
    const receiptNote = r.receiptPhotoUrl
      ? ' Bonul a fost trimis spre verificare (după aprobare primești ×1,3).'
      : '';
    const why =
      r.fakeProbability >= 0.5
        ? ` Atenție: arată ca un review suspect (${Math.round(r.fakeProbability * 100)}%), așa că pondera e mică.`
        : r.authorType === 'local'
          ? ' Ești localnic verificat, nota ta contează dublu.'
          : '';
    return { ok: true, message: `Review publicat. Pondere ×${weight}.${why}${receiptNote} Scorul localului s-a recalculat.` };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function updateReviewAction(input: {
  reviewId: string;
  rating: number;
  text: string;
}): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să editezi un review.' };
  try {
    await editReview(getDb(), userId, { ...input, rating: Math.round(input.rating) });
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Review-ul a fost actualizat și scorul localului s-a recalculat.' };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteReviewAction(reviewId: string): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să ștergi un review.' };
  try {
    await deleteReview(getDb(), userId, reviewId);
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Review-ul a fost șters și scorul localului s-a recalculat.' };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** „Preferințele mele”: opționale, se pot schimba oricând; listă goală = fără preferințe. */
export async function savePreferences(interests: string[]): Promise<Result<{ user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să îți salvezi preferințele.' };
  try {
    await accounts.setInterests(getDb(), userId, interests);
    revalidatePath('/', 'layout');
    return { ok: true, user: (await toUserAccount(getDb(), userId))! };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Vot rapid din bara localului (siguranță 1–5, zgomot 1–4): cere cont; validat pe server. */
export async function castQuickVote(venueId: string, kind: string, value: number): Promise<Result> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să votezi.' };
  try {
    await submitQuickVote(getDb(), userId, venueId, kind, value);
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function voteHelpful(reviewId: string): Promise<Result<{ voted: boolean; helpfulCount: number }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să votezi.' };
  try {
    return { ok: true, ...(await toggleHelpful(getDb(), userId, reviewId)) };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** „Cât e de plin acum”: merge și fără cont (raportările anonime expiră în 2 ore). */
export async function reportCrowd(venueId: string, level: number): Promise<Result> {
  if (!hasDb()) return OFFLINE;
  try {
    await submitVibe(getDb(), await getUserId(), venueId, level);
    revalidatePath('/topdrink/timisoara');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Trimite un link TikTok / Instagram / YouTube / Facebook pentru un local și îl procesează prin oEmbed. */
export async function submitVenueVideoAction(input: {
  venueId: string;
  url: string;
}): Promise<Result<{ status: 'processed' | 'failed' | 'duplicate'; video?: VenueVideo }>> {
  if (!hasDb()) return OFFLINE;
  try {
    const userId = await getUserId();
    const trimmed = input.url.trim();
    const res = await submitSocialLinkNow(getDb(), { venueId: input.venueId, url: trimmed, userId });
    revalidatePath('/', 'layout');
    if (res.status === 'duplicate') {
      return { ok: false, error: 'Acest link a fost deja adăugat la un local.' };
    }
    if (res.status === 'failed' || !res.analysis) {
      return { ok: false, error: 'Nu am putut citi datele video-ului acum. Verifică linkul și încearcă din nou.' };
    }
    return {
      ok: true,
      status: res.status,
      video: toVenueVideo(trimmed, detectPlatform(trimmed) ?? 'tiktok', res.analysis),
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Salvează / elimină un local din lista „Salvate” a userului conectat. */
export async function toggleSavedVenueAction(venueSlug: string, desired?: boolean): Promise<Result<{ slugs: string[] }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să salvezi localurile pe termen lung.' };
  try {
    const res = await accounts.toggleSavedVenueSlug(getDb(), userId, venueSlug, desired);
    return { ok: true, slugs: res.savedSlugs };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Înregistrează o vizualizare a paginii/modalului unui local pentru statisticile owner-ului. */
export async function trackVenueViewAction(venueId: string): Promise<void> {
  if (!hasDb() || !venueId) return;
  try {
    await owner.recordVenueView(getDb(), venueId);
  } catch {
    // non-fatal
  }
}

/** Acceptă sau refuză o invitație de angajat sau părăsește echipa (GDPR #7). */
export async function respondEmployeeInviteAction(employeeId: string, accept: boolean): Promise<Result<{ user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont.' };
  try {
    await owner.respondToInvite(getDb(), userId, employeeId, accept);
    revalidatePath('/', 'layout');
    return { ok: true, user: (await toUserAccount(getDb(), userId))! };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function leaveTeamAction(employeeId: string): Promise<Result<{ user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont.' };
  try {
    await owner.removeEmployee(getDb(), userId, employeeId);
    revalidatePath('/', 'layout');
    return { ok: true, user: (await toUserAccount(getDb(), userId))! };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Leagă un cont social și generează codul de verificare în bio (item 14). */
export async function startSocialVerificationAction(input: {
  platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube';
  url: string;
  followers?: number;
}): Promise<Result<{ code: string; instruction: string; user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont mai întâi.' };
  try {
    const res = await accounts.startSocialVerification(getDb(), userId, input);
    revalidatePath('/', 'layout');
    return { ok: true, code: res.code, instruction: res.instruction, user: (await toUserAccount(getDb(), userId))! };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function confirmSocialVerificationAction(input: {
  platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube';
  bioSnippet: string;
  followers?: number;
}): Promise<Result<{ influencer: boolean; user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont mai întâi.' };
  try {
    const res = await accounts.confirmSocialVerification(getDb(), userId, input);
    revalidatePath('/', 'layout');
    return { ok: true, influencer: res.influencer, user: (await toUserAccount(getDb(), userId))! };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function unlinkSocialAction(platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube'): Promise<Result<{ user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont mai întâi.' };
  try {
    await accounts.unlinkSocialAccount(getDb(), userId, platform);
    revalidatePath('/', 'layout');
    return { ok: true, user: (await toUserAccount(getDb(), userId))! };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function recordAdEventAction(adId: string, event: 'impression' | 'click'): Promise<void> {
  if (!hasDb() || !adId) return;
  try {
    await monetization.recordAdEvent(getDb(), adId, event);
  } catch {
    // non-fatal
  }
}
