/**
 * Poarta anti-bot la scrierea unui review (docs/ANTI-BOT.md → Stratul 1).
 * Oprește înainte de salvare ce e sigur automat: câmpul capcană completat, formular nesemnat sau
 * trimis instant, prea multe review-uri pe cont / dispozitiv. Restul semnalelor (viteză, copy-paste,
 * dispozitiv comun) le calculează analiza, după salvare (review-analysis → botSignals).
 *
 * GDPR: nu salvăm IP-ul. `clientFingerprint` dă un HMAC (cheia serverului) al IP-ului + browserului:
 * recunoaștem același dispozitiv, dar nu putem afla IP-ul din el.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { invalid, reviewSubmissions, reviews, users, type Db } from "@tftd/db";

export const GATE_RULES = {
  /** Sub atât, formularul e trimis de un script (un om nici nu citește întrebările). */
  minFillMs: 3_000,
  /** Tokenul formularului expiră (pagină lăsată deschisă peste noapte → cere altul). */
  tokenTtlMs: 6 * 3_600_000,
  perUserPerHour: 5,
  perUserPerDay: 15,
  /** Cont mai nou de 24 de ore. */
  newAccountPerDay: 3,
  newAccountAgeMs: 24 * 3_600_000,
  /** Același dispozitiv / rețea (ex. wifi-ul unui cămin): mai larg decât per cont. */
  perDevicePerHour: 12,
} as const;

export type ReviewClient = {
  /** Tokenul primit la deschiderea formularului (`issueReviewFormToken`). */
  formToken: string | null | undefined;
  /** Câmpul ascuns „website”: un om nu-l vede, un bot îl completează. */
  honeypot?: string | null;
  /** `clientFingerprint(ip, userAgent)`; null dacă nu-l avem. */
  clientHash: string | null;
};

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET lipsește sau are sub 32 de caractere (vezi .env.example).");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(`review-form:${payload}`).digest("base64url");

/** Tokenul formularului: leagă userul, localul și momentul deschiderii. Nu se poate falsifica fără cheie. */
export function issueReviewFormToken(userId: string, venueId: string, now = new Date()): string {
  const issuedAt = String(now.getTime());
  return `${issuedAt}.${sign(`${userId}:${venueId}:${issuedAt}`)}`;
}

/** Cât a stat formularul deschis (ms), sau null dacă tokenul e invalid, al altcuiva sau expirat. */
export function readReviewFormToken(token: string | null | undefined, userId: string, venueId: string, now = new Date()): number | null {
  const [issuedAt, mac] = (token ?? "").split(".");
  if (!issuedAt || !mac || !/^\d{13}$/.test(issuedAt)) return null;
  const expected = Buffer.from(sign(`${userId}:${venueId}:${issuedAt}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const elapsed = now.getTime() - Number(issuedAt);
  return elapsed < 0 || elapsed > GATE_RULES.tokenTtlMs ? null : elapsed;
}

/** HMAC scurt al IP-ului + browserului. Același dispozitiv → același hash; IP-ul nu se poate recupera. */
export function clientFingerprint(ip: string | null | undefined, userAgent: string | null | undefined): string | null {
  if (!ip) return null;
  return createHmac("sha256", secret()).update(`client:${ip.trim()}|${(userAgent ?? "").slice(0, 300)}`).digest("base64url").slice(0, 22);
}

/** Mesajul e același pentru toate cazurile de bot, ca un script să nu afle ce l-a dat de gol. */
const BLOCKED = "Nu am putut publica review-ul. Reîncarcă pagina și încearcă din nou.";

/**
 * Verifică trimiterea; aruncă `invalid` dacă e blocată. Întoarce datele de salvat în `review_submissions`.
 */
export async function checkReviewGate(db: Db, userId: string, venueId: string, client: ReviewClient, now = new Date()) {
  if (client.honeypot && client.honeypot.trim()) throw invalid(BLOCKED);
  const fillMs = readReviewFormToken(client.formToken, userId, venueId, now);
  if (fillMs === null) throw invalid(BLOCKED);
  if (fillMs < GATE_RULES.minFillMs) throw invalid(BLOCKED);

  const hourAgo = new Date(now.getTime() - 3_600_000);
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const mine = (since: Date) =>
    db
      .select({ n: count() })
      .from(reviews)
      .where(and(eq(reviews.authorId, userId), eq(reviews.source, "native"), gte(reviews.postedAt, since)))
      .then((r) => r[0]?.n ?? 0);

  const [user] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId));
  const accountAgeMs = user ? now.getTime() - user.createdAt.getTime() : 0;
  const [lastHour, lastDay] = await Promise.all([mine(hourAgo), mine(dayAgo)]);
  if (lastHour >= GATE_RULES.perUserPerHour || lastDay >= GATE_RULES.perUserPerDay) {
    throw invalid("Ai scris multe review-uri în ultima vreme. Mai încearcă peste o oră.");
  }
  if (accountAgeMs < GATE_RULES.newAccountAgeMs && lastDay >= GATE_RULES.newAccountPerDay) {
    throw invalid(`Conturile noi pot scrie cel mult ${GATE_RULES.newAccountPerDay} review-uri în prima zi.`);
  }
  if (client.clientHash) {
    const [row] = await db
      .select({ n: count() })
      .from(reviewSubmissions)
      .where(and(eq(reviewSubmissions.clientHash, client.clientHash), gte(reviewSubmissions.createdAt, hourAgo)));
    if ((row?.n ?? 0) >= GATE_RULES.perDevicePerHour) throw invalid("Prea multe review-uri de pe această rețea. Mai încearcă peste o oră.");
  }
  return { fillMs, accountAgeSec: Math.max(0, Math.round(accountAgeMs / 1000)), clientHash: client.clientHash };
}
