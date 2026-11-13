/**
 * Modulul J: coada de admin — review-uri raportate, revendicări cu CUI, potriviri nesigure, contestații Tourist Trap.
 * Doar adminul poate ascunde un review (regula 2).
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { approveClaim } from "@tftd/accounts";
import { forbidden, invalid, matchCandidates, notFound, ownerClaims, reports, reviews, users, venueSources, venues, type Db } from "@tftd/db";

export async function assertAdmin(db: Db, userId: string) {
  const [u] = await db.select({ roles: users.roles }).from(users).where(eq(users.id, userId));
  if (!u?.roles.includes("admin")) throw forbidden("Doar adminii au acces aici.");
}

/** Tot ce așteaptă o decizie, cele mai vechi primele. */
export async function queue(db: Db, adminId: string) {
  await assertAdmin(db, adminId);
  const reviewVenue = alias(venues, "review_venue");
  const appealVenue = alias(venues, "appeal_venue");
  const reviewAuthor = alias(users, "review_author");
  const [openReports, pendingMatches, pendingClaims] = await Promise.all([
    db.select({
      report: reports,
      review: { rating: reviews.rating, text: reviews.text, postedAt: reviews.postedAt, source: reviews.source, externalAuthor: reviews.externalAuthor },
      reviewVenue: { name: reviewVenue.name, address: reviewVenue.address },
      author: { username: reviewAuthor.username, displayName: reviewAuthor.displayName },
      venue: { name: appealVenue.name, address: appealVenue.address, touristTrapIndex: appealVenue.touristTrapIndex, scoreExplanation: appealVenue.scoreExplanation },
    }).from(reports)
      .leftJoin(reviews, and(eq(reports.targetType, "review"), sql`${reviews.id}::text = ${reports.targetId}`))
      .leftJoin(reviewVenue, eq(reviewVenue.id, reviews.venueId))
      .leftJoin(reviewAuthor, eq(reviewAuthor.id, reviews.authorId))
      .leftJoin(appealVenue, and(eq(reports.targetType, "trap_appeal"), sql`${appealVenue.id}::text = ${reports.targetId}`))
      .where(eq(reports.status, "open")).orderBy(asc(reports.createdAt)),
    db.select({ match: matchCandidates, venue: { name: venues.name, address: venues.address } })
      .from(matchCandidates).innerJoin(venues, eq(venues.id, matchCandidates.venueId))
      .where(eq(matchCandidates.status, "pending")).orderBy(asc(matchCandidates.createdAt)),
    db.select({ claim: ownerClaims, venue: { name: venues.name, address: venues.address }, user: { username: users.username, displayName: users.displayName } })
      .from(ownerClaims).innerJoin(venues, eq(venues.id, ownerClaims.venueId)).innerJoin(users, eq(users.id, ownerClaims.userId))
      .where(and(eq(ownerClaims.status, "pending"), eq(ownerClaims.method, "cui"))).orderBy(asc(ownerClaims.createdAt)),
  ]);
  return {
    reports: openReports.map(({ report, review, reviewVenue, author, venue }) => ({ ...report, review: review ? { ...review, venue: reviewVenue, author } : null, venue })),
    matches: pendingMatches.map(({ match, venue }) => ({ ...match, venue })),
    claims: pendingClaims.map(({ claim, venue, user }) => ({ ...claim, venue, user })),
  };
}

/**
 * Decizia pe un raport. Pentru review-uri: `hide` îl ascunde (nu se șterge), `keep` îl lasă publicat.
 * Pentru contestații Tourist Trap: `accept` / `reject` (recalcularea o face scoring-ul; aici rămâne decizia scrisă).
 */
export async function resolveReport(db: Db, adminId: string, reportId: string, decision: "hide" | "keep" | "accept" | "reject", note: string) {
  await assertAdmin(db, adminId);
  const [r] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!r) throw notFound("Raportul");
  if (r.status !== "open") throw invalid("Raportul a fost deja rezolvat.");
  if (r.targetType === "review" && decision === "hide") {
    await db.update(reviews).set({ status: "hidden" }).where(eq(reviews.id, r.targetId));
  }
  // Local adăugat de mână de un user: `accept` îl publică, `reject` îl închide
  if (r.targetType === "venue" && (decision === "accept" || decision === "reject")) {
    await db
      .update(venues)
      .set({ status: decision === "accept" ? "active" : "closed" })
      .where(and(eq(venues.id, r.targetId), eq(venues.status, "pending")));
  }
  await db
    .update(reports)
    .set({ status: decision === "keep" || decision === "reject" ? "rejected" : "resolved", decision: `${decision}: ${note}`, decidedBy: adminId, decidedAt: new Date() })
    .where(eq(reports.id, reportId));
}

/** Potrivire nesigură între platforme: confirmată = legăm sursa externă de local. */
export async function decideMatch(db: Db, adminId: string, candidateId: string, confirm: boolean) {
  await assertAdmin(db, adminId);
  const [c] = await db.select().from(matchCandidates).where(eq(matchCandidates.id, candidateId));
  if (!c) throw notFound("Potrivirea");
  if (confirm) {
    const payload = c.payload as { rating?: number | null; reviewCount?: number | null; url?: string | null };
    await db
      .insert(venueSources)
      .values({ venueId: c.venueId, source: c.source, externalId: c.externalId, rawRating: payload.rating ?? null, rawReviewCount: payload.reviewCount ?? null, url: payload.url ?? null, fetchedAt: new Date() })
      .onConflictDoNothing();
  }
  await db.update(matchCandidates).set({ status: confirm ? "confirmed" : "rejected", decidedBy: adminId }).where(eq(matchCandidates.id, candidateId));
}

/** Revendicare cu CUI: adminul verifică documentul și decide. */
export async function decideClaim(db: Db, adminId: string, claimId: string, approve: boolean) {
  await assertAdmin(db, adminId);
  if (approve) return approveClaim(db, claimId, adminId);
  await db.update(ownerClaims).set({ status: "rejected", decidedBy: adminId, decidedAt: new Date() }).where(eq(ownerClaims.id, claimId));
}

/** Un user oarecare raportează un review, o postare sau un cont. */
export async function report(db: Db, userId: string, target: { type: "review" | "post" | "user" | "venue"; id: string }, reason: string) {
  if (reason.trim().length < 10) throw invalid("Spune pe scurt de ce raportezi (minim 10 caractere).");
  const [r] = await db.insert(reports).values({ targetType: target.type, targetId: target.id, reportedBy: userId, reason: reason.trim() }).returning();
  return r!;
}
