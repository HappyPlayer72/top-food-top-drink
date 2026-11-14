/**
 * Limitele pentru cererile Google făcute din site (fiecare costă bani peste pragul gratuit):
 * - max 3 căutări „Caută și pe internet” per cont în 48 de ore;
 * - max 100 de cereri Google pe zi pe tot site-ul (căutări + adăugări);
 * - „Adaugă de pe Google” merge doar pentru un loc întors de o căutare a aceluiași cont, în aceeași fereastră.
 * Căutarea în localurile noastre nu are limită (nu cheamă Google).
 */
import { and, count, eq, gte, sql } from "drizzle-orm";
import { googleApiCalls, type Db } from "@tftd/db";

export const GOOGLE_LIMITS = { userSearches: 3, userWindowHours: 48, sitePerDay: 100 } as const;

export type GoogleSlot =
  | { ok: true; callId: string; remaining: number }
  | { ok: false; reason: "user" | "site"; retryAt: Date | null; message: string };

const hours = (h: number, now: Date) => new Date(now.getTime() - h * 3_600_000);

function waitText(retryAt: Date, now: Date) {
  const h = Math.max(1, Math.ceil((retryAt.getTime() - now.getTime()) / 3_600_000));
  return h === 1 ? "peste o oră" : `peste ${h} ore`;
}

async function siteFull(db: Db, now: Date) {
  const [{ n }] = (await db.select({ n: count() }).from(googleApiCalls).where(gte(googleApiCalls.createdAt, hours(24, now)))) as [{ n: number }];
  return n >= GOOGLE_LIMITS.sitePerDay;
}

/** Rezervă o căutare pe internet pentru user, sau spune de ce nu se poate (și când se poate din nou). */
export async function reserveGoogleSearch(db: Db, userId: string, now = new Date()): Promise<GoogleSlot> {
  if (await siteFull(db, now)) {
    return { ok: false, reason: "site", retryAt: null, message: "Căutarea pe internet s-a oprit pentru azi pe tot site-ul. Poți adăuga localul de mână mai jos." };
  }
  const mine = await db
    .select({ createdAt: googleApiCalls.createdAt })
    .from(googleApiCalls)
    .where(and(eq(googleApiCalls.userId, userId), eq(googleApiCalls.kind, "search"), gte(googleApiCalls.createdAt, hours(GOOGLE_LIMITS.userWindowHours, now))))
    .orderBy(googleApiCalls.createdAt);
  if (mine.length >= GOOGLE_LIMITS.userSearches) {
    const retryAt = new Date(mine[0]!.createdAt.getTime() + GOOGLE_LIMITS.userWindowHours * 3_600_000);
    return {
      ok: false,
      reason: "user",
      retryAt,
      message: `Ai folosit cele ${GOOGLE_LIMITS.userSearches} căutări pe internet din ultimele 2 zile. Poți căuta din nou ${waitText(retryAt, now)}; până atunci poți adăuga localul de mână mai jos.`,
    };
  }
  const [row] = await db.insert(googleApiCalls).values({ userId, kind: "search", createdAt: now }).returning({ id: googleApiCalls.id });
  return { ok: true, callId: row!.id, remaining: GOOGLE_LIMITS.userSearches - mine.length - 1 };
}

/** Ține minte ce a găsit căutarea, ca „Adaugă” să meargă doar pentru aceste locuri. */
export async function recordSearchResults(db: Db, callId: string, placeIds: string[]) {
  await db.update(googleApiCalls).set({ placeIds }).where(eq(googleApiCalls.id, callId));
}

/** „Adaugă de pe Google”: doar un loc găsit de același user în fereastra de 48 de ore, și cât mai e loc azi. */
export async function reserveGoogleAdd(db: Db, userId: string, placeId: string, now = new Date()): Promise<GoogleSlot> {
  const [found] = await db
    .select({ id: googleApiCalls.id })
    .from(googleApiCalls)
    .where(
      and(
        eq(googleApiCalls.userId, userId),
        eq(googleApiCalls.kind, "search"),
        gte(googleApiCalls.createdAt, hours(GOOGLE_LIMITS.userWindowHours, now)),
        sql`${placeId} = ANY(${googleApiCalls.placeIds})`,
      ),
    )
    .limit(1);
  if (!found) return { ok: false, reason: "user", retryAt: null, message: "Caută întâi localul pe internet, apoi adaugă-l din rezultate." };
  if (await siteFull(db, now)) return { ok: false, reason: "site", retryAt: null, message: "Adăugarea de pe Google s-a oprit pentru azi. Poți adăuga localul de mână." };
  const [row] = await db.insert(googleApiCalls).values({ userId, kind: "add", placeIds: [placeId], createdAt: now }).returning({ id: googleApiCalls.id });
  return { ok: true, callId: row!.id, remaining: 0 };
}
