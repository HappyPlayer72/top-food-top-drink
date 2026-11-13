/**
 * Localnic verificat (insigna „Localnic din <cartier>”).
 * Metode: GPS în ≥ 5 zile din 30, email universitar local, sau garantat de 2 localnici verificați.
 * GDPR: din GPS păstrăm doar ziua și orașul/localul; coordonatele nu se salvează.
 */
import { createHash, randomInt } from "node:crypto";
import { and, count, countDistinct, eq, gte, sql } from "drizzle-orm";
import { checkins, cities, forbidden, invalid, localVerifications, notFound, touristZones, users, venues, vouches, type Db } from "@tftd/db";

export const LOCAL_RULES = { gpsDays: 5, windowDays: 30, vouchesNeeded: 2, validMonths: 12, cityRadiusKm: 15, venueRadiusM: 60 } as const;

/** Domenii de email universitar acceptate, per oraș. */
export const UNIVERSITY_DOMAINS: Record<string, string[]> = {
  timisoara: ["e-uvt.ro", "uvt.ro", "student.upt.ro", "upt.ro", "umft.ro", "student.umft.ro", "usvt.ro"],
};

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Check-in din locația telefonului. Primim coordonatele, găsim orașul și localul (dacă e la < 60 m),
 * salvăm DOAR ziua. Apoi verificăm dacă userul a devenit localnic.
 */
export async function checkinFromLocation(db: Db, userId: string, loc: { lat: number; lng: number }, now = new Date()) {
  const point = sql`ST_SetSRID(ST_MakePoint(${loc.lng}, ${loc.lat}), 4326)::geography`;
  const [city] = await db
    .select({ slug: touristZones.citySlug, d: sql<number>`min(ST_Distance(${touristZones.location}::geography, ${point}))` })
    .from(touristZones)
    .groupBy(touristZones.citySlug)
    .orderBy(sql`2`)
    .limit(1);
  if (!city || city.d > LOCAL_RULES.cityRadiusKm * 1000) return { citySlug: null, venueId: null, becameLocal: false };

  const [venue] = await db
    .select({ id: venues.id })
    .from(venues)
    .where(and(eq(venues.citySlug, city.slug), sql`ST_DWithin(${venues.location}::geography, ${point}, ${LOCAL_RULES.venueRadiusM})`))
    .orderBy(sql`ST_Distance(${venues.location}::geography, ${point})`)
    .limit(1);

  await db
    .insert(checkins)
    .values({ userId, citySlug: city.slug, venueId: venue?.id ?? null, day: isoDay(now) })
    .onConflictDoNothing();
  const becameLocal = await tryVerifyByGps(db, userId, city.slug, now);
  return { citySlug: city.slug, venueId: venue?.id ?? null, becameLocal };
}

export async function tryVerifyByGps(db: Db, userId: string, citySlug: string, now = new Date()): Promise<boolean> {
  const since = isoDay(new Date(now.getTime() - LOCAL_RULES.windowDays * DAY));
  const [row] = await db
    .select({ days: countDistinct(checkins.day) })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.citySlug, citySlug), gte(checkins.day, since)));
  if ((row?.days ?? 0) < LOCAL_RULES.gpsDays) return false;
  await markLocal(db, userId, citySlug, "gps", { days: row!.days }, now);
  return true;
}

/** Pasul 1 pentru email universitar: întoarce codul de trimis pe email (trimiterea e treaba aplicației). */
export async function startUniversityEmail(db: Db, userId: string, citySlug: string, email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!(UNIVERSITY_DOMAINS[citySlug] ?? []).some((d) => domain === d)) {
    throw invalid(`Acceptăm doar emailuri de la universitățile din oraș (${(UNIVERSITY_DOMAINS[citySlug] ?? []).join(", ")}).`);
  }
  const code = String(randomInt(100000, 1000000));
  const [row] = await db
    .insert(localVerifications)
    .values({ userId, citySlug, method: "university_email", evidence: { domain, codeHash: hashCode(code) } })
    .returning({ id: localVerifications.id });
  return { verificationId: row!.id, code };
}

export async function confirmUniversityEmail(db: Db, userId: string, verificationId: string, code: string, now = new Date()) {
  const [v] = await db.select().from(localVerifications).where(eq(localVerifications.id, verificationId));
  if (!v || v.userId !== userId) throw notFound("Verificarea");
  const evidence = v.evidence as { domain: string; codeHash: string };
  if (v.status !== "pending" || evidence.codeHash !== hashCode(code)) throw invalid("Cod greșit sau expirat.");
  await db.update(localVerifications).set({ status: "verified", verifiedAt: now, expiresAt: addMonths(now) }).where(eq(localVerifications.id, v.id));
  await setLocal(db, userId, v.citySlug, now);
}

/** Un localnic verificat garantează pentru altcineva. La 2 garanți, celălalt devine localnic. */
export async function vouch(db: Db, voucherId: string, voucheeId: string, citySlug: string, now = new Date()) {
  if (voucherId === voucheeId) throw invalid("Nu poți garanta pentru tine.");
  const [voucher] = await db.select().from(users).where(eq(users.id, voucherId));
  if (!voucher || voucher.localCitySlug !== citySlug || !voucher.localUntil || voucher.localUntil < now) {
    throw forbidden("Doar localnicii verificați pot garanta pentru alții.");
  }
  await db.insert(vouches).values({ voucherId, voucheeId, citySlug }).onConflictDoNothing();
  const [row] = await db.select({ n: count() }).from(vouches).where(and(eq(vouches.voucheeId, voucheeId), eq(vouches.citySlug, citySlug)));
  if ((row?.n ?? 0) >= LOCAL_RULES.vouchesNeeded) {
    await markLocal(db, voucheeId, citySlug, "vouch", { vouches: row!.n }, now);
    return true;
  }
  return false;
}

async function markLocal(db: Db, userId: string, citySlug: string, method: "gps" | "vouch", evidence: object, now: Date) {
  await db.insert(localVerifications).values({ userId, citySlug, method, status: "verified", evidence, verifiedAt: now, expiresAt: addMonths(now) });
  await setLocal(db, userId, citySlug, now);
}

async function setLocal(db: Db, userId: string, citySlug: string, now: Date) {
  const [city] = await db.select({ slug: cities.slug }).from(cities).where(eq(cities.slug, citySlug));
  if (!city) throw notFound("Orașul");
  await db
    .update(users)
    .set({
      localCitySlug: citySlug,
      localUntil: addMonths(now),
      roles: sql`(SELECT array_agg(DISTINCT r) FROM unnest(${users.roles} || '{local}'::user_role[]) r)`,
    })
    .where(eq(users.id, userId));
}

/** Cartierul afișat pe insignă (îl alege userul din lista orașului). */
export async function setNeighborhood(db: Db, userId: string, neighborhood: string) {
  const [u] = await db.select({ city: users.localCitySlug }).from(users).where(eq(users.id, userId));
  if (!u?.city) throw forbidden("Doar localnicii verificați au cartier pe insignă.");
  const [c] = await db.select({ neighborhoods: cities.neighborhoods }).from(cities).where(eq(cities.slug, u.city));
  if (!c?.neighborhoods.includes(neighborhood)) throw invalid("Cartierul nu există în lista orașului.");
  await db.update(users).set({ localNeighborhood: neighborhood }).where(eq(users.id, userId));
}

const addMonths = (d: Date) => new Date(d.getTime() + LOCAL_RULES.validMonths * 30 * DAY);
export const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");
