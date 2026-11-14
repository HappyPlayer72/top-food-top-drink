/**
 * Fidelitate: carduri cu ștampile.
 *
 * Programul unui local: owner-ul are pe telefon/tabletă un cod QR care se schimbă la fiecare minut
 * (semnat cu secretul programului). Clientul îl scanează → +1 ștampilă. Cardul plin + o nouă scanare
 * = premiul se folosește și cardul o ia de la zero. Anti-trișat: o ștampilă pe card pe zi, iar un cod
 * vechi (fotografiat ieri) nu mai e valid.
 *
 * Programul personal: userul își ține singur evidența la un local care nu e pe platformă.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  forbidden, invalid, loyaltyCards, loyaltyPrograms, loyaltyStamps, notFound, venueManagers, venues, type Db,
} from "@tftd/db";

export const QR_WINDOW_SECONDS = 60;
export const ICONS = ["soup", "coffee", "croissant", "pizza", "beer", "wine", "heart", "cat"] as const;
export type LoyaltyIcon = (typeof ICONS)[number];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function validateProgram(i: { rewardTitle: string; stampsRequired: number; icon?: string }) {
  if (!i.rewardTitle.trim() || i.rewardTitle.length > 80) throw invalid("Premiul trebuie descris în 1–80 de caractere.");
  if (!Number.isInteger(i.stampsRequired) || i.stampsRequired < 2 || i.stampsRequired > 20) throw invalid("Cardul are între 2 și 20 de ștampile.");
  if (i.icon && !(ICONS as readonly string[]).includes(i.icon)) throw invalid("Iconiță necunoscută.");
}

// ---------- Programul unui local (owner) ----------

export async function createVenueProgram(
  db: Db,
  ownerId: string,
  venueId: string,
  input: { rewardTitle: string; stampsRequired: number; icon?: LoyaltyIcon; accentColor?: string },
) {
  const [m] = await db.select().from(venueManagers).where(and(eq(venueManagers.venueId, venueId), eq(venueManagers.userId, ownerId)));
  if (!m) throw forbidden("Nu administrezi acest local.");
  validateProgram(input);
  // Un singur program activ per local
  await db.update(loyaltyPrograms).set({ active: false }).where(and(eq(loyaltyPrograms.venueId, venueId), eq(loyaltyPrograms.active, true)));
  const [p] = await db
    .insert(loyaltyPrograms)
    .values({
      venueId, createdBy: ownerId, rewardTitle: input.rewardTitle.trim(), stampsRequired: input.stampsRequired,
      icon: input.icon ?? "heart", accentColor: input.accentColor ?? null, stampSecret: randomBytes(32).toString("base64url"),
    })
    .returning();
  return publicProgram(p!);
}

/**
 * Codul pe care îl afișează owner-ul ca QR. Se schimbă la fiecare minut; `expiresInSeconds` îi spune
 * ecranului owner-ului când să ceară unul nou.
 */
export async function currentStampCode(db: Db, ownerId: string, programId: string, now = new Date()) {
  const p = await programForOwner(db, ownerId, programId);
  const w = windowOf(now);
  return {
    code: signCode(p.id, w, p.stampSecret!),
    expiresInSeconds: QR_WINDOW_SECONDS - Math.floor((now.getTime() / 1000) % QR_WINDOW_SECONDS),
  };
}

/** Clientul scanează codul: +1 ștampilă, sau folosește premiul dacă are cardul plin. */
export async function scanCode(db: Db, userId: string, code: string, now = new Date()) {
  const [programId, windowStr, sig] = code.split(".");
  if (!programId || !windowStr || !sig) throw invalid("Cod QR invalid.");
  const [p] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, programId));
  if (!p || !p.active || !p.stampSecret) throw invalid("Programul de fidelitate nu mai e activ.");

  // Acceptăm minutul curent și pe cel dinainte (scanarea poate dura câteva secunde)
  const w = Number(windowStr);
  const current = windowOf(now);
  if (!(w === current || w === current - 1) || !safeEqual(signCode(p.id, w, p.stampSecret), code)) {
    throw invalid("Codul a expirat. Cere localului să-ți arate codul de acum.");
  }

  const card = await getOrCreateCard(db, p.id, userId);
  const day = isoDay(now);

  if (card.stamps >= p.stampsRequired) {
    const redeemed = await db.insert(loyaltyStamps).values({ cardId: card.id, day, kind: "redeem" }).onConflictDoNothing().returning();
    if (!redeemed.length) throw invalid("Ai folosit deja un premiu aici azi.");
    const [c] = await db
      .update(loyaltyCards)
      .set({ stamps: 0, redeemed: sql`${loyaltyCards.redeemed} + 1` })
      .where(eq(loyaltyCards.id, card.id))
      .returning();
    return { action: "redeemed" as const, message: `Premiul tău: ${p.rewardTitle}. Poftă bună!`, card: cardView(p, c!) };
  }

  const stamped = await db.insert(loyaltyStamps).values({ cardId: card.id, day }).onConflictDoNothing().returning();
  if (!stamped.length) throw invalid("Ai primit deja ștampila de azi la acest local. Revino mâine.");
  const [c] = await db.update(loyaltyCards).set({ stamps: sql`${loyaltyCards.stamps} + 1` }).where(eq(loyaltyCards.id, card.id)).returning();
  const full = c!.stamps >= p.stampsRequired;
  return {
    action: "stamped" as const,
    message: full ? `Card complet! La următoarea vizită primești: ${p.rewardTitle}.` : `+1 ștampilă (${c!.stamps}/${p.stampsRequired}).`,
    card: cardView(p, c!),
  };
}

// ---------- Programe personale (localuri care nu sunt pe platformă) ----------

export async function createPersonalCard(
  db: Db,
  userId: string,
  input: { name: string; rewardTitle: string; stampsRequired: number; icon?: LoyaltyIcon; accentColor?: string },
) {
  if (!input.name.trim() || input.name.length > 60) throw invalid("Numele localului are 1–60 de caractere.");
  validateProgram(input);
  const [p] = await db
    .insert(loyaltyPrograms)
    .values({ createdBy: userId, customName: input.name.trim(), rewardTitle: input.rewardTitle.trim(), stampsRequired: input.stampsRequired, icon: input.icon ?? "heart", accentColor: input.accentColor ?? null })
    .returning();
  const card = await getOrCreateCard(db, p!.id, userId);
  return cardView(p!, card);
}

/** Pe cardurile personale userul își pune singur ștampila (tot max una pe zi). */
export async function addPersonalStamp(db: Db, userId: string, cardId: string, now = new Date()) {
  const [row] = await db
    .select({ card: loyaltyCards, program: loyaltyPrograms })
    .from(loyaltyCards)
    .innerJoin(loyaltyPrograms, eq(loyaltyPrograms.id, loyaltyCards.programId))
    .where(eq(loyaltyCards.id, cardId));
  if (!row || row.card.userId !== userId) throw notFound("Cardul");
  if (row.program.venueId) throw forbidden("La localurile de pe platformă ștampila se ia scanând codul QR al localului.");
  const full = row.card.stamps >= row.program.stampsRequired;
  const ins = await db.insert(loyaltyStamps).values({ cardId, day: isoDay(now), kind: full ? "redeem" : "stamp" }).onConflictDoNothing().returning();
  if (!ins.length) throw invalid("Ai pus deja ștampila de azi pe acest card.");
  const [c] = await db
    .update(loyaltyCards)
    .set(full ? { stamps: 0, redeemed: sql`${loyaltyCards.redeemed} + 1` } : { stamps: sql`${loyaltyCards.stamps} + 1` })
    .where(eq(loyaltyCards.id, cardId))
    .returning();
  return cardView(row.program, c!);
}

// ---------- Citire ----------

/** Portofelul userului: toate cardurile, cu numele localului și progresul. */
export async function myCards(db: Db, userId: string) {
  const rows = await db
    .select({ card: loyaltyCards, program: loyaltyPrograms, venueName: venues.name, venueSlug: venues.slug, vertical: venues.vertical, neighborhood: venues.neighborhood })
    .from(loyaltyCards)
    .innerJoin(loyaltyPrograms, eq(loyaltyPrograms.id, loyaltyCards.programId))
    .leftJoin(venues, eq(venues.id, loyaltyPrograms.venueId))
    .where(eq(loyaltyCards.userId, userId));
  return rows.map((r) => ({
    ...cardView(r.program, r.card),
    venueName: r.venueName ?? r.program.customName ?? "Local",
    venueSlug: r.venueSlug,
    vertical: r.vertical,
    neighborhood: r.neighborhood,
  }));
}

/** Programul activ al unui local (pentru pagina localului: „Are card de fidelitate”). */
export async function venueProgram(db: Db, venueId: string) {
  const [p] = await db.select().from(loyaltyPrograms).where(and(eq(loyaltyPrograms.venueId, venueId), eq(loyaltyPrograms.active, true)));
  return p ? publicProgram(p) : null;
}

/** Toate programele active ale localurilor dintr-un oraș (pentru portofel: „poți aduna ștampile aici”). */
export async function cityPrograms(db: Db, citySlug: string) {
  const rows = await db
    .select({ program: loyaltyPrograms, venueName: venues.name, venueSlug: venues.slug, neighborhood: venues.neighborhood, vertical: venues.vertical })
    .from(loyaltyPrograms)
    .innerJoin(venues, eq(venues.id, loyaltyPrograms.venueId))
    .where(and(eq(loyaltyPrograms.active, true), eq(venues.citySlug, citySlug)));
  return rows.map((r) => ({ ...publicProgram(r.program), venueName: r.venueName, venueSlug: r.venueSlug, neighborhood: r.neighborhood, vertical: r.vertical }));
}

/**
 * Codul curent al unui program, FĂRĂ verificarea owner-ului. Doar pentru modul demo („simulează scanarea
 * la tejghea”, când nu există un al doilea telefon); aplicația îl permite doar cu DEMO_SCAN activ.
 */
export async function demoStampCode(db: Db, programId: string, now = new Date()) {
  const [p] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, programId));
  if (!p || !p.active || !p.stampSecret) throw notFound("Programul");
  return signCode(p.id, windowOf(now), p.stampSecret);
}

/** Cardul unui user la un program (sau null). */
export async function cardFor(db: Db, userId: string, programId: string) {
  const [c] = await db.select().from(loyaltyCards).where(and(eq(loyaltyCards.programId, programId), eq(loyaltyCards.userId, userId)));
  return c ?? null;
}

// ---------- Interne ----------

async function programForOwner(db: Db, ownerId: string, programId: string) {
  const [p] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, programId));
  if (!p || !p.venueId || !p.stampSecret) throw notFound("Programul");
  const [m] = await db.select().from(venueManagers).where(and(eq(venueManagers.venueId, p.venueId), eq(venueManagers.userId, ownerId)));
  if (!m) throw forbidden("Nu administrezi acest local.");
  if (!p.active) throw invalid("Programul nu mai e activ.");
  return p;
}

async function getOrCreateCard(db: Db, programId: string, userId: string) {
  await db.insert(loyaltyCards).values({ programId, userId }).onConflictDoNothing();
  const [c] = await db.select().from(loyaltyCards).where(and(eq(loyaltyCards.programId, programId), eq(loyaltyCards.userId, userId)));
  return c!;
}

const windowOf = (now: Date) => Math.floor(now.getTime() / 1000 / QR_WINDOW_SECONDS);

export function signCode(programId: string, window: number, secret: string): string {
  const sig = createHmac("sha256", secret).update(`${programId}.${window}`).digest("base64url").slice(0, 22);
  return `${programId}.${window}.${sig}`;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function publicProgram(p: typeof loyaltyPrograms.$inferSelect) {
  const { stampSecret: _s, ...rest } = p;
  return rest;
}

function cardView(p: typeof loyaltyPrograms.$inferSelect, c: typeof loyaltyCards.$inferSelect) {
  return {
    cardId: c.id,
    programId: p.id,
    rewardTitle: p.rewardTitle,
    stampsRequired: p.stampsRequired,
    stamps: c.stamps,
    redeemed: c.redeemed,
    rewardReady: c.stamps >= p.stampsRequired,
    icon: p.icon,
    accentColor: p.accentColor,
    personal: !p.venueId,
  };
}
