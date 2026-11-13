/** Influencer (conturi sociale verificate) și revendicarea localului de către owner. */
import { randomInt } from "node:crypto";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { forbidden, invalid, notFound, ownerClaims, userSocialLinks, users, venueManagers, venues, type Db } from "@tftd/db";
import { hashCode } from "./local.ts";

export const INFLUENCER_MIN_FOLLOWERS = 1000;
export const MAX_CLAIM_ATTEMPTS = 5;
export const MAX_CLAIMS_PER_DAY = 3;
const HAS_OWNER = "Localul are deja un proprietar. Dacă e o greșeală, scrie-ne și decide un admin.";
export const TOO_MANY_ATTEMPTS = "Prea multe încercări greșite. Cere un cod nou peste 24 de ore.";

/**
 * Leagă un cont social de profil. `verified` vine DOAR din fluxul OAuth al platformei (dovada că e al lui);
 * un link adăugat de mână rămâne neverificat.
 */
export async function linkSocialAccount(
  db: Db,
  userId: string,
  input: { platform: "tiktok" | "instagram" | "facebook" | "youtube"; url: string; verified?: boolean; followers?: number },
) {
  await db
    .insert(userSocialLinks)
    .values({ userId, platform: input.platform, url: input.url, verified: !!input.verified, followers: input.followers ?? null })
    .onConflictDoUpdate({
      target: [userSocialLinks.userId, userSocialLinks.platform],
      set: { url: input.url, verified: !!input.verified, followers: input.followers ?? null },
    });
  if (input.verified && (input.followers ?? 0) >= INFLUENCER_MIN_FOLLOWERS) {
    await db
      .update(users)
      .set({ followers: input.followers, roles: sql`(SELECT array_agg(DISTINCT r) FROM unnest(${users.roles} || '{influencer}'::user_role[]) r)` })
      .where(eq(users.id, userId));
    return { influencer: true };
  }
  return { influencer: false };
}

/**
 * Pasul 1 al revendicării. Pentru `phone_code` întoarce codul de comunicat prin SMS/apel la numărul PUBLIC al localului
 * (trimiterea e treaba aplicației). La demo, DEMO_CLAIM_CODE fixează codul.
 * `cui` așteaptă decizia unui admin; `google_business` se confirmă după OAuth-ul Google.
 */
export async function startClaim(db: Db, userId: string, venueId: string, method: "phone_code" | "cui" | "google_business", cui?: string) {
  const [venue] = await db.select({ id: venues.id, phone: venues.phone }).from(venues).where(eq(venues.id, venueId));
  if (!venue) throw notFound("Localul");
  const [owner] = await db
    .select({ userId: venueManagers.userId })
    .from(venueManagers)
    .where(and(eq(venueManagers.venueId, venueId), eq(venueManagers.role, "owner")));
  if (owner) throw forbidden(HAS_OWNER);
  if (method === "cui" && !/^(RO)?\d{2,10}$/i.test(cui ?? "")) throw invalid("CUI invalid.");

  const code = method === "phone_code" ? (process.env.DEMO_CLAIM_CODE ?? String(randomInt(100000, 1000000))) : null;
  const claim = await db.transaction(async (tx) => {
    // Lock per (user, local): cererile paralele nu pot depăși limita de mai jos.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`claim:${userId}:${venueId}`}))`);
    const [recent] = await tx
      .select({ n: count() })
      .from(ownerClaims)
      .where(and(eq(ownerClaims.userId, userId), eq(ownerClaims.venueId, venueId), gte(ownerClaims.createdAt, new Date(Date.now() - 86_400_000))));
    if ((recent?.n ?? 0) >= MAX_CLAIMS_PER_DAY) {
      throw invalid(`Ai cerut deja de ${MAX_CLAIMS_PER_DAY} ori revendicarea acestui local în ultimele 24 de ore. Încearcă din nou mai târziu.`);
    }
    const [row] = await tx
      .insert(ownerClaims)
      .values({ userId, venueId, method, cui: cui ?? null, codeHash: code ? hashCode(code) : null })
      .returning({ id: ownerClaims.id });
    return row!;
  });
  return { claimId: claim.id, code, sendTo: method === "phone_code" ? venue.phone : null };
}

/** Pasul 2 pentru `phone_code` și `google_business`: confirmarea face userul owner. Cel mult 5 încercări. */
export async function confirmClaim(db: Db, userId: string, claimId: string, proof: { code?: string; googleBusinessVerified?: boolean }) {
  const [claim] = await db.select().from(ownerClaims).where(eq(ownerClaims.id, claimId));
  if (!claim || claim.userId !== userId) throw notFound("Cererea");
  if (claim.status === "rejected" && claim.attempts >= MAX_CLAIM_ATTEMPTS) throw invalid(TOO_MANY_ATTEMPTS);
  if (claim.status !== "pending") throw invalid("Cererea a fost deja procesată.");
  // Încercarea se numără ÎNAINTE de comparație, atomic: o rafală de cereri paralele nu poate depăși limita.
  const [tried] = await db
    .update(ownerClaims)
    .set({ attempts: sql`${ownerClaims.attempts} + 1` })
    .where(and(eq(ownerClaims.id, claimId), eq(ownerClaims.status, "pending"), lt(ownerClaims.attempts, MAX_CLAIM_ATTEMPTS)))
    .returning({ attempts: ownerClaims.attempts });
  if (!tried) throw invalid(TOO_MANY_ATTEMPTS);
  const ok =
    (claim.method === "phone_code" && !!proof.code && claim.codeHash === hashCode(proof.code)) ||
    (claim.method === "google_business" && proof.googleBusinessVerified === true);
  if (!ok) {
    if (tried.attempts < MAX_CLAIM_ATTEMPTS) throw invalid("Dovada nu se potrivește.");
    await db
      .update(ownerClaims)
      .set({ status: "rejected", decidedAt: new Date() })
      .where(and(eq(ownerClaims.id, claimId), eq(ownerClaims.status, "pending")));
    throw invalid(TOO_MANY_ATTEMPTS);
  }
  await approveClaim(db, claim.id, null);
}

/** Folosită și de admin (moderation) pentru cererile cu CUI. Un local are un singur owner. */
export async function approveClaim(db: Db, claimId: string, adminId: string | null) {
  // Tranzacție + lock pe rândul localului: doi useri care confirmă în paralel nu pot deveni amândoi owner.
  const approved = await db.transaction(async (tx) => {
    const [claim] = await tx.select().from(ownerClaims).where(eq(ownerClaims.id, claimId));
    if (!claim) throw notFound("Cererea");
    await tx.select({ id: venues.id }).from(venues).where(eq(venues.id, claim.venueId)).for("update");
    const [owner] = await tx
      .select({ userId: venueManagers.userId })
      .from(venueManagers)
      .where(and(eq(venueManagers.venueId, claim.venueId), eq(venueManagers.role, "owner")));
    const decision = { decidedBy: adminId, decidedAt: new Date() };
    if (owner && owner.userId !== claim.userId) {
      await tx.update(ownerClaims).set({ status: "rejected", ...decision }).where(eq(ownerClaims.id, claimId));
      return false;
    }
    await tx.update(ownerClaims).set({ status: "verified", ...decision }).where(eq(ownerClaims.id, claimId));
    await tx.insert(venueManagers).values({ venueId: claim.venueId, userId: claim.userId, role: "owner" }).onConflictDoNothing();
    await tx
      .update(users)
      .set({ roles: sql`(SELECT array_agg(DISTINCT r) FROM unnest(${users.roles} || '{owner}'::user_role[]) r)` })
      .where(eq(users.id, claim.userId));
    return true;
  });
  // Aruncăm după commit: respingerea cererii trebuie să rămână salvată.
  if (!approved) throw forbidden(HAS_OWNER);
}

/** Owner-ul adaugă un manager (alt cont). */
export async function addManager(db: Db, ownerId: string, venueId: string, managerUserId: string) {
  const [me] = await db
    .select()
    .from(venueManagers)
    .where(and(eq(venueManagers.venueId, venueId), eq(venueManagers.userId, ownerId), eq(venueManagers.role, "owner")));
  if (!me) throw forbidden("Doar proprietarul poate adăuga manageri.");
  await db.insert(venueManagers).values({ venueId, userId: managerUserId, role: "manager" }).onConflictDoNothing();
}
