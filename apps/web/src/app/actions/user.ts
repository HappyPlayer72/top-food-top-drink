'use server';
/**
 * Acțiunile userilor de pe site-ul public (login, review, „util”, cât e de plin).
 * Fiecare întoarce un rezultat, nu aruncă: UI-ul afișează `error` (în română).
 * `offline: true` = nu există bază de date (DATABASE_URL lipsă) → UI-ul păstrează comportamentul local.
 */
import { randomInt } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { accounts, antibot, submitVibe, toggleHelpful, writeReview } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { clearSession, errorMessage, getUserId, setSession } from '@/lib/server/session';
import { toUserAccount } from '@/lib/backend/user';
import type { UserAccount } from '@/types';

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

export async function registerUser(input: { name: string; email: string; password: string }): Promise<Result<{ user: UserAccount }>> {
  if (!hasDb()) return OFFLINE;
  try {
    const email = input.email.trim().toLowerCase();
    const base = (email.split('@')[0] ?? 'user').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20) || 'user';
    const u = await accounts.register(getDb(), {
      username: `${base.padEnd(3, '0')}${randomInt(1000, 10000)}`,
      displayName: input.name,
      email,
      password: input.password,
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

/**
 * Tokenul anti-bot al formularului de review: îl cere formularul când se deschide (docs/ANTI-BOT.md).
 * Leagă userul, localul și ora deschiderii; la trimitere serverul știe cât a durat completarea.
 */
export async function reviewFormToken(venueId: string): Promise<Result<{ token: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să scrii un review.' };
  return { ok: true, token: antibot.issueReviewFormToken(userId, venueId) };
}

/** Amprenta dispozitivului (HMAC de IP + browser); IP-ul nu se salvează. */
async function clientHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip');
  return antibot.clientFingerprint(ip, h.get('user-agent'));
}

/** Review real: poarta anti-bot, analiză (limbă, fals, aspecte, bot) + recalcularea scorului. */
export async function submitReview(input: {
  venueId: string;
  rating: number;
  text: string;
  weekendNight?: boolean;
  /** Din `reviewFormToken`, primit la deschiderea formularului. */
  formToken?: string;
  /** Câmpul ascuns: gol la oameni. */
  website?: string;
}): Promise<Result<{ message: string; reviewId: string; verifiedVisit: boolean; held: boolean }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să scrii un review.' };
  try {
    const { formToken, website, ...review } = input;
    const r = await writeReview(getDb(), userId, { ...review, rating: Math.round(review.rating) }, new Date(), {
      formToken,
      honeypot: website,
      clientHash: await clientHash(),
    });
    if (r.status === 'flagged') {
      return {
        ok: true,
        reviewId: r.id,
        verifiedVisit: false,
        held: true,
        message: 'Review-ul tău a ajuns la verificare la un moderator și apare după ce îl aprobă.',
      };
    }
    revalidatePath('/', 'layout');
    const weight = (r.weight ?? 1).toFixed(1).replace('.', ',');
    const why =
      r.fakeProbability >= 0.5
        ? ` Atenție: arată ca un review suspect (${Math.round(r.fakeProbability * 100)}%), așa că pondera e mică.`
        : r.authorType === 'local'
          ? ' Ești localnic verificat, nota ta contează dublu.'
          : '';
    const visit = r.verifiedVisit ? ' Vizită verificată prin check-in (×1,3).' : '';
    return {
      ok: true,
      reviewId: r.id,
      verifiedVisit: r.verifiedVisit,
      held: false,
      message: `Review publicat. Pondere ×${weight}.${why}${visit} Scorul localului s-a recalculat.`,
    };
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
