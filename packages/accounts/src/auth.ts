/** Înregistrare, login, parole (scrypt) și token de sesiune semnat (HMAC). Fără dependențe externe. */
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq, or } from "drizzle-orm";
import { ServiceError, interest, invalid, notFound, rateLimited, users, type Db } from "@tftd/db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

const USERNAME = /^[a-z0-9._]{3,30}$/;

export async function register(
  db: Db,
  input: { username: string; displayName: string; password: string; email?: string; phone?: string; interests?: string[] },
) {
  const interests = parseInterests(input.interests ?? []);
  const username = input.username.trim().toLowerCase();
  if (!USERNAME.test(username)) throw invalid("Numele de utilizator: 3–30 caractere, doar litere mici, cifre, punct și underscore.");
  if (input.password.length < 8) throw invalid("Parola trebuie să aibă cel puțin 8 caractere.");
  if (!input.email && !input.phone) throw invalid("Ai nevoie de email sau telefon.");

  const taken = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.username, username), ...(input.email ? [eq(users.email, input.email)] : []), ...(input.phone ? [eq(users.phone, input.phone)] : [])));
  if (taken.length) throw new ServiceError("conflict", "Există deja un cont cu acest nume, email sau telefon.");

  const [user] = await db
    .insert(users)
    .values({
      username,
      displayName: input.displayName.trim() || username,
      email: input.email ?? null,
      phone: input.phone ?? null,
      passwordHash: await hashPassword(input.password),
      interests,
    })
    .returning();
  return publicUser(user!);
}

export type Interest = (typeof interest.enumValues)[number];

/** Preferințele opționale: doar valorile din enum, fără dubluri (listă goală = a sărit pasul). */
export function parseInterests(raw: unknown): Interest[] {
  if (!Array.isArray(raw)) throw invalid("Preferințele trimise nu sunt valide.");
  const allowed = interest.enumValues as readonly string[];
  if (raw.some((x) => typeof x !== "string" || !allowed.includes(x))) throw invalid("Preferințele trimise nu sunt valide.");
  return [...new Set(raw as Interest[])];
}

/** Schimbarea preferințelor din profil. */
export async function setInterests(db: Db, userId: string, raw: unknown) {
  const interests = parseInterests(raw);
  const [u] = await db.update(users).set({ interests }).where(eq(users.id, userId)).returning({ interests: users.interests });
  if (!u) throw notFound("Contul");
  return u.interests;
}

export const MAX_LOGIN_ATTEMPTS = 10;
export const LOGIN_WINDOW_MS = 15 * 60_000;
const loginFailures = new Map<string, number[]>();

/** Resetează fereastra de limitare pentru login (folosit în teste). */
export function resetLoginRateLimit(key?: string) {
  if (key) loginFailures.delete(key.trim().toLowerCase());
  else loginFailures.clear();
}

/** `login` = username, email sau telefon. */
export async function login(db: Db, input: { login: string; password: string }, now = new Date()) {
  const l = input.login.trim();
  const key = l.toLowerCase();
  const cutoff = now.getTime() - LOGIN_WINDOW_MS;
  const recent = (loginFailures.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= MAX_LOGIN_ATTEMPTS) {
    loginFailures.set(key, recent);
    throw rateLimited("Prea multe încercări de autentificare. Așteaptă câteva minute înainte de a reîncerca.");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.username, key), eq(users.email, l), eq(users.phone, l)));
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    loginFailures.set(key, [...recent, now.getTime()]);
    throw new ServiceError("unauthorized", "Date de autentificare greșite.");
  }
  loginFailures.delete(key);
  return publicUser(user);
}

export function publicUser(u: typeof users.$inferSelect) {
  const { passwordHash: _ph, googleId: _g, email: _e, phone: _p, ...rest } = u;
  return rest;
}

// ---------- Sesiune: token semnat „userId.expirare.semnătură” ----------

const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET lipsește sau are sub 32 de caractere (vezi .env.example).");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionToken(userId: string, now = new Date()): string {
  const payload = `${userId}.${now.getTime() + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${sign(payload)}`;
}

/** userId dacă tokenul e valid și neexpirat, altfel null. */
export function verifySessionToken(token: string | undefined | null, now = new Date()): string | null {
  if (!token) return null;
  const [userId, exp, sig] = token.split(".");
  if (!userId || !exp || !sig) return null;
  const expected = Buffer.from(sign(`${userId}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(exp) > now.getTime() ? userId : null;
}
