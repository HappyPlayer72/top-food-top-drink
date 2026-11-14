/**
 * Modulul J: coada de admin — review-uri raportate, revendicări cu CUI, potriviri nesigure, contestații Tourist Trap.
 * Doar adminul poate ascunde un review (regula 2).
 */
import { and, asc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { approveClaim } from "@tftd/accounts";
import {
  ensureExtendedSchema,
  forbidden,
  invalid,
  matchCandidates,
  moderationDecisions,
  notFound,
  ownerClaims,
  reports,
  reviews,
  users,
  venueSources,
  venues,
  type Db,
} from "@tftd/db";
import { recalculateCity } from "@tftd/scoring";

export async function assertAdmin(db: Db, userId: string) {
  const [u] = await db.select({ roles: users.roles }).from(users).where(eq(users.id, userId));
  if (!u?.roles.includes("admin")) throw forbidden("Doar adminii au acces aici.");
}

/** Tot ce așteaptă o decizie, cele mai vechi primele. */
export async function queue(db: Db, adminId: string) {
  await assertAdmin(db, adminId);
  await ensureExtendedSchema(db);
  const reviewVenue = alias(venues, "review_venue");
  const appealVenue = alias(venues, "appeal_venue");
  const reviewAuthor = alias(users, "review_author");
  const receiptVenue = alias(venues, "receipt_venue");
  const receiptAuthor = alias(users, "receipt_author");
  const [openReports, pendingMatches, pendingClaims, pendingReceipts, nativeReviews, decidedSuspicious] = await Promise.all([
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
    db.select({
      id: reviews.id,
      venueId: reviews.venueId,
      rating: reviews.rating,
      text: reviews.text,
      postedAt: reviews.postedAt,
      receiptPhotoUrl: reviews.receiptPhotoUrl,
      venue: { name: receiptVenue.name, address: receiptVenue.address },
      author: { username: receiptAuthor.username, displayName: receiptAuthor.displayName },
    }).from(reviews)
      .innerJoin(receiptVenue, eq(receiptVenue.id, reviews.venueId))
      .leftJoin(receiptAuthor, eq(receiptAuthor.id, reviews.authorId))
      .where(eq(reviews.receiptStatus, "pending"))
      .orderBy(asc(reviews.createdAt)),
    db.select({
      userId: reviews.authorId,
      username: users.username,
      displayName: users.displayName,
      roles: users.roles,
      rating: reviews.rating,
      fakeProbability: reviews.fakeProbability,
      fakeSignals: reviews.fakeSignals,
      postedAt: reviews.postedAt,
    }).from(reviews)
      .innerJoin(users, eq(users.id, reviews.authorId))
      .where(and(isNotNull(reviews.authorId), eq(reviews.status, "published"))),
    db.select({ targetId: moderationDecisions.targetId })
      .from(moderationDecisions)
      .where(eq(moderationDecisions.targetType, "suspicious_user")),
  ]);

  const decidedSet = new Set(decidedSuspicious.map((d) => d.targetId));
  const byUser = new Map<
    string,
    {
      username: string;
      displayName: string;
      ratings: number[];
      probs: number[];
      signals: Set<string>;
      latestAt: Date;
    }
  >();
  for (const r of nativeReviews) {
    if (!r.userId || decidedSet.has(r.userId) || r.roles.includes("admin")) continue;
    const cur = byUser.get(r.userId) ?? {
      username: r.username,
      displayName: r.displayName,
      ratings: [],
      probs: [],
      signals: new Set<string>(),
      latestAt: r.postedAt,
    };
    cur.ratings.push(r.rating);
    cur.probs.push(r.fakeProbability);
    for (const s of r.fakeSignals ?? []) cur.signals.add(s);
    if (r.postedAt > cur.latestAt) cur.latestAt = r.postedAt;
    byUser.set(r.userId, cur);
  }

  const suspiciousAccounts = [...byUser.entries()]
    .map(([userId, u]) => {
      const avgFakeProbability = Math.round((u.probs.reduce((a, b) => a + b, 0) / u.probs.length) * 100) / 100;
      const maxFakeProbability = Math.max(...u.probs);
      const extremeOnly = u.ratings.length >= 3 && (u.ratings.every((r) => r >= 9.5) || u.ratings.every((r) => r <= 2.5));
      const reasons: string[] = [];
      if (u.probs.length >= 2 && avgFakeProbability >= 0.55) reasons.push(`Probabilitate medie falsă ${Math.round(avgFakeProbability * 100)}%`);
      if (maxFakeProbability >= 0.8) reasons.push("Review cu probabilitate falsă ≥ 80%");
      if (extremeOnly) reasons.push(`Doar note extreme (${u.ratings.length} review-uri)`);
      if (u.signals.has("burst")) reasons.push("Rafală coordonată de note maxime");
      if (u.signals.has("ownerOrStaff")) reasons.push("Asociat ca owner/angajat pe un local evaluat");
      if (u.signals.has("similarText")) reasons.push("Text duplicat/parafrazat");
      return {
        userId,
        username: u.username,
        displayName: u.displayName,
        reviewCount: u.probs.length,
        avgFakeProbability,
        reasons,
        latestAt: u.latestAt,
      };
    })
    .filter((u) => u.reasons.length > 0)
    .sort((a, b) => b.avgFakeProbability - a.avgFakeProbability || b.reviewCount - a.reviewCount)
    .slice(0, 20);

  return {
    reports: openReports.map(({ report, review, reviewVenue, author, venue }) => ({ ...report, review: review ? { ...review, venue: reviewVenue, author } : null, venue })),
    matches: pendingMatches.map(({ match, venue }) => ({ ...match, venue })),
    claims: pendingClaims.map(({ claim, venue, user }) => ({ ...claim, venue, user })),
    receipts: pendingReceipts,
    suspiciousAccounts,
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

/** Verificare bon fiscal atașat unui review: aprobarea marchează vizita verificată (pondere ×1.3) și recalculează scorul. */
export async function decideReceipt(db: Db, adminId: string, reviewId: string, approve: boolean) {
  await assertAdmin(db, adminId);
  await ensureExtendedSchema(db);
  const [rev] = await db.select({ id: reviews.id, venueId: reviews.venueId }).from(reviews).where(eq(reviews.id, reviewId));
  if (!rev) throw notFound("Review-ul");
  await db
    .update(reviews)
    .set({
      verifiedVisit: approve,
      receiptStatus: approve ? "approved" : "rejected",
    })
    .where(eq(reviews.id, reviewId));
  if (approve) {
    const [v] = await db.select({ citySlug: venues.citySlug, vertical: venues.vertical }).from(venues).where(eq(venues.id, rev.venueId));
    if (v) await recalculateCity(db, v.citySlug, v.vertical);
  }
}

/** Decizie pe un cont suspect: ignorare sau ascunderea review-urilor suspecte + recalculare scor. */
export async function decideSuspiciousAccount(db: Db, adminId: string, userId: string, decision: "dismiss" | "hide_reviews") {
  await assertAdmin(db, adminId);
  await ensureExtendedSchema(db);
  if (decision === "hide_reviews") {
    const affected = await db
      .update(reviews)
      .set({ status: "hidden" })
      .where(and(eq(reviews.authorId, userId), eq(reviews.status, "published"), gte(reviews.fakeProbability, 0.4)))
      .returning({ venueId: reviews.venueId });
    const venueIds = [...new Set(affected.map((r) => r.venueId))];
    if (venueIds.length) {
      const pairs = await db.selectDistinct({ citySlug: venues.citySlug, vertical: venues.vertical }).from(venues).where(inArray(venues.id, venueIds));
      for (const p of pairs) await recalculateCity(db, p.citySlug, p.vertical);
    }
  }
  await db.insert(moderationDecisions).values({
    targetType: "suspicious_user",
    targetId: userId,
    decision,
    decidedBy: adminId,
  });
}
