/** Influencer (conturi sociale verificate) și revendicarea localului de către owner. */
import { randomInt } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { forbidden, invalid, notFound, ownerClaims, userSocialLinks, users, venueManagers, venues, type Db } from "@tftd/db";
import { hashCode } from "./local.ts";

export const INFLUENCER_MIN_FOLLOWERS = 1000;

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
  if (owner) throw forbidden("Localul are deja un proprietar. Dacă e o greșeală, scrie-ne și decide un admin.");
  if (method === "cui" && !/^(RO)?\d{2,10}$/i.test(cui ?? "")) throw invalid("CUI invalid.");

  const code = method === "phone_code" ? (process.env.DEMO_CLAIM_CODE ?? String(randomInt(100000, 1000000))) : null;
  const [claim] = await db
    .insert(ownerClaims)
    .values({ userId, venueId, method, cui: cui ?? null, codeHash: code ? hashCode(code) : null })
    .returning({ id: ownerClaims.id });
  return { claimId: claim!.id, code, sendTo: method === "phone_code" ? venue.phone : null };
}

/** Pasul 2 pentru `phone_code` și `google_business`: confirmarea face userul owner. */
export async function confirmClaim(db: Db, userId: string, claimId: string, proof: { code?: string; googleBusinessVerified?: boolean }) {
  const [claim] = await db.select().from(ownerClaims).where(eq(ownerClaims.id, claimId));
  if (!claim || claim.userId !== userId) throw notFound("Cererea");
  if (claim.status !== "pending") throw invalid("Cererea a fost deja procesată.");
  const ok =
    (claim.method === "phone_code" && !!proof.code && claim.codeHash === hashCode(proof.code)) ||
    (claim.method === "google_business" && proof.googleBusinessVerified === true);
  if (!ok) throw invalid("Dovada nu se potrivește.");
  await approveClaim(db, claim.id, null);
}

/** Folosită și de admin (moderation) pentru cererile cu CUI. */
export async function approveClaim(db: Db, claimId: string, adminId: string | null) {
  const [claim] = await db
    .update(ownerClaims)
    .set({ status: "verified", decidedBy: adminId, decidedAt: new Date() })
    .where(eq(ownerClaims.id, claimId))
    .returning();
  if (!claim) throw notFound("Cererea");
  await db.insert(venueManagers).values({ venueId: claim.venueId, userId: claim.userId, role: "owner" }).onConflictDoNothing();
  await db
    .update(users)
    .set({ roles: sql`(SELECT array_agg(DISTINCT r) FROM unnest(${users.roles} || '{owner}'::user_role[]) r)` })
    .where(eq(users.id, claim.userId));
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
