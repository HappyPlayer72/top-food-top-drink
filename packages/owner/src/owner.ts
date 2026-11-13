/**
 * Modulul G: ce poate face proprietarul/managerul unui local.
 * Regula 2: owner-ul NU poate șterge sau ascunde review-uri — doar răspunde sau raportează (decide un admin).
 */
import { and, avg, count, desc, eq, gte, sql } from "drizzle-orm";
import {
  employeeRatings, employees, forbidden, invalid, menuItems, notFound, posts, reports, reviewReplies, reviews, venueManagers, venues, type Db,
  type OpeningHours,
} from "@tftd/db";

export async function assertManager(db: Db, userId: string, venueId: string) {
  const [m] = await db
    .select({ role: venueManagers.role })
    .from(venueManagers)
    .where(and(eq(venueManagers.venueId, venueId), eq(venueManagers.userId, userId)));
  if (!m) throw forbidden("Nu administrezi acest local.");
  return m.role;
}

// ---------- Review-uri: răspuns și raportare ----------

export async function replyToReview(db: Db, userId: string, reviewId: string, text: string) {
  const [r] = await db.select({ venueId: reviews.venueId }).from(reviews).where(eq(reviews.id, reviewId));
  if (!r) throw notFound("Review-ul");
  await assertManager(db, userId, r.venueId);
  if (!text.trim() || text.length > 2000) throw invalid("Răspunsul trebuie să aibă între 1 și 2000 de caractere.");
  const [reply] = await db.insert(reviewReplies).values({ reviewId, authorId: userId, text: text.trim() }).returning();
  return reply!;
}

/** Raportarea nu ascunde review-ul; ajunge în coada de admin. */
export async function reportReview(db: Db, userId: string, reviewId: string, reason: string) {
  const [r] = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.id, reviewId));
  if (!r) throw notFound("Review-ul");
  if (reason.trim().length < 10) throw invalid("Spune pe scurt de ce raportezi (minim 10 caractere).");
  const [report] = await db.insert(reports).values({ targetType: "review", targetId: reviewId, reportedBy: userId, reason: reason.trim() }).returning();
  return report!;
}

/** Contestația etichetei de capcană turistică → admin. */
export async function appealTrapLabel(db: Db, userId: string, venueId: string, reason: string) {
  await assertManager(db, userId, venueId);
  const [report] = await db.insert(reports).values({ targetType: "trap_appeal", targetId: venueId, reportedBy: userId, reason }).returning();
  return report!;
}

// ---------- Prezentarea localului: meniu, poze, text, program ----------

export type MenuItemInput = { name: string; priceLei?: number | null; description?: string | null; mustOrder?: boolean };

/** Înlocuiește lista „Ce să comanzi” (max 12 feluri, în ordinea dată). */
export async function setMenu(db: Db, userId: string, venueId: string, items: MenuItemInput[]) {
  await assertManager(db, userId, venueId);
  if (items.length > 12) throw invalid("Maxim 12 feluri recomandate.");
  for (const i of items) {
    if (!i.name.trim() || i.name.length > 80) throw invalid("Numele unui fel are 1–80 de caractere.");
    if (i.priceLei != null && (!Number.isInteger(i.priceLei) || i.priceLei < 0 || i.priceLei > 5000)) throw invalid("Preț invalid.");
  }
  await db.transaction(async (tx) => {
    await tx.delete(menuItems).where(eq(menuItems.venueId, venueId));
    if (items.length) {
      await tx.insert(menuItems).values(
        items.map((i, position) => ({ venueId, name: i.name.trim(), priceLei: i.priceLei ?? null, description: i.description ?? null, mustOrder: !!i.mustOrder, position })),
      );
    }
  });
}

/** Titlu, text de prezentare, ocazii, poze și program. Poze = URL-uri deja încărcate de aplicație. */
export async function updatePresentation(
  db: Db,
  userId: string,
  venueId: string,
  input: { headline?: string; writeup?: string[]; occasionTags?: string[]; drinkTags?: string[]; photos?: string[]; openingHours?: OpeningHours },
) {
  await assertManager(db, userId, venueId);
  if (input.headline && input.headline.length > 140) throw invalid("Titlul are maxim 140 de caractere.");
  if (input.writeup && input.writeup.join("").length > 3000) throw invalid("Textul are maxim 3000 de caractere.");
  if (input.photos && (input.photos.length > 30 || input.photos.some((p) => !/^https:\/\//.test(p)))) throw invalid("Maxim 30 de poze, cu linkuri https.");
  if (input.openingHours) validateHours(input.openingHours);
  const [v] = await db
    .update(venues)
    .set({
      ...(input.headline !== undefined ? { editorialHeadline: input.headline.trim() || null } : {}),
      ...(input.writeup !== undefined ? { editorialWriteup: input.writeup.map((p) => p.trim()).filter(Boolean) } : {}),
      ...(input.occasionTags !== undefined ? { occasionTags: input.occasionTags } : {}),
      ...(input.drinkTags !== undefined ? { drinkTags: input.drinkTags } : {}),
      ...(input.photos !== undefined ? { photos: input.photos } : {}),
      ...(input.openingHours !== undefined ? { openingHours: input.openingHours } : {}),
    })
    .where(eq(venues.id, venueId))
    .returning();
  return v!;
}

function validateHours(h: OpeningHours) {
  for (const ranges of Object.values(h)) {
    for (const [a, b] of ranges ?? []) {
      if (!/^\d{2}:\d{2}$/.test(a) || !/^\d{2}:\d{2}$/.test(b)) throw invalid("Ora se scrie HH:MM (ex. 11:00).");
    }
  }
}

// ---------- Mini-blog ----------

export type PostInput = { type: "menu" | "event" | "offer" | "news"; title: string; body: string; photos?: string[]; eventAt?: Date | null; publishAt?: Date };

export async function createPost(db: Db, userId: string, venueId: string, input: PostInput) {
  await assertManager(db, userId, venueId);
  validatePost(input);
  const [post] = await db
    .insert(posts)
    .values({ venueId, authorId: userId, ...input, photos: input.photos ?? [], publishAt: input.publishAt ?? new Date() })
    .returning();
  return post!;
}

export async function updatePost(db: Db, userId: string, postId: string, input: Partial<PostInput>) {
  const [p] = await db.select({ venueId: posts.venueId }).from(posts).where(eq(posts.id, postId));
  if (!p) throw notFound("Postarea");
  await assertManager(db, userId, p.venueId);
  const [post] = await db.update(posts).set(input).where(eq(posts.id, postId)).returning();
  return post!;
}

/** Postările sunt ale owner-ului: pe ele le poate șterge (nu și review-urile). */
export async function deletePost(db: Db, userId: string, postId: string) {
  const [p] = await db.select({ venueId: posts.venueId }).from(posts).where(eq(posts.id, postId));
  if (!p) throw notFound("Postarea");
  await assertManager(db, userId, p.venueId);
  await db.delete(posts).where(eq(posts.id, postId));
}

function validatePost(i: PostInput) {
  if (!i.title.trim() || i.title.length > 140) throw invalid("Titlul trebuie să aibă între 1 și 140 de caractere.");
  if (!i.body.trim() || i.body.length > 5000) throw invalid("Textul trebuie să aibă între 1 și 5000 de caractere.");
  if (i.type === "event" && !i.eventAt) throw invalid("Un eveniment are nevoie de dată și oră.");
}

// ---------- Angajați (rate the employee, opțional) ----------

export async function inviteEmployee(db: Db, userId: string, venueId: string, input: { firstName: string; role: string; userId?: string }) {
  await assertManager(db, userId, venueId);
  const [e] = await db
    .insert(employees)
    .values({ venueId, firstName: input.firstName.trim(), role: input.role.trim(), userId: input.userId ?? null, accepted: false })
    .returning();
  return e!;
}

/** Angajatul apare public doar după ce acceptă (GDPR). */
export async function respondToInvite(db: Db, employeeUserId: string, employeeId: string, accept: boolean) {
  const [e] = await db.select().from(employees).where(eq(employees.id, employeeId));
  if (!e || e.userId !== employeeUserId) throw notFound("Invitația");
  await db.update(employees).set({ accepted: accept, active: accept }).where(eq(employees.id, employeeId));
}

/** Angajatul poate ieși oricând; datele lui publice dispar. Owner-ul îl poate scoate și el. */
export async function removeEmployee(db: Db, actorId: string, employeeId: string) {
  const [e] = await db.select().from(employees).where(eq(employees.id, employeeId));
  if (!e) throw notFound("Angajatul");
  if (e.userId !== actorId) await assertManager(db, actorId, e.venueId);
  await db.update(employees).set({ active: false, accepted: false }).where(eq(employees.id, employeeId));
}

/** Un client notează angajatul care l-a servit: un rating per angajat per lună. */
export async function rateEmployee(
  db: Db,
  userId: string,
  input: { employeeId: string; reviewId?: string; friendliness: number; speed: number; comment?: string },
  now = new Date(),
) {
  const [e] = await db.select().from(employees).where(eq(employees.id, input.employeeId));
  if (!e || !e.accepted || !e.active) throw notFound("Angajatul");
  for (const v of [input.friendliness, input.speed]) if (!Number.isInteger(v) || v < 1 || v > 5) throw invalid("Notele sunt de la 1 la 5.");
  const month = now.toISOString().slice(0, 7);
  const [row] = await db
    .insert(employeeRatings)
    .values({ employeeId: e.id, reviewId: input.reviewId ?? null, userId, month, friendliness: input.friendliness, speed: input.speed, comment: input.comment ?? null })
    .onConflictDoNothing()
    .returning();
  if (!row) throw invalid("Ai notat deja acest angajat luna asta.");
  return row;
}

/** Privat, doar pentru owner: toate notele, inclusiv cele negative. */
export async function employeeRatingsForOwner(db: Db, userId: string, venueId: string) {
  await assertManager(db, userId, venueId);
  return db
    .select({
      employeeId: employees.id,
      firstName: employees.firstName,
      ratings: count(employeeRatings.id),
      friendliness: avg(employeeRatings.friendliness),
      speed: avg(employeeRatings.speed),
    })
    .from(employees)
    .leftJoin(employeeRatings, eq(employeeRatings.employeeId, employees.id))
    .where(eq(employees.venueId, venueId))
    .groupBy(employees.id, employees.firstName);
}

// ---------- Statistici ----------

export async function venueStats(db: Db, userId: string, venueId: string, now = new Date()) {
  await assertManager(db, userId, venueId);
  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId));
  if (!venue) throw notFound("Localul");
  const since = new Date(now.getTime() - 180 * 86_400_000);

  const byMonth = await db
    .select({
      month: sql<string>`to_char(${reviews.postedAt}, 'YYYY-MM')`,
      authorType: reviews.authorType,
      reviews: count(),
      avgRating: avg(reviews.rating),
    })
    .from(reviews)
    .where(and(eq(reviews.venueId, venueId), eq(reviews.status, "published"), gte(reviews.postedAt, since)))
    .groupBy(sql`1`, reviews.authorType)
    .orderBy(sql`1`);

  // Media pe aspecte (ce laudă / ce critică lumea)
  const aspectRows = await db.select({ aspects: reviews.aspects }).from(reviews).where(and(eq(reviews.venueId, venueId), gte(reviews.postedAt, since)));
  const sums: Record<string, { sum: number; n: number }> = {};
  for (const r of aspectRows) {
    for (const [k, v] of Object.entries(r.aspects ?? {})) {
      sums[k] = { sum: (sums[k]?.sum ?? 0) + v, n: (sums[k]?.n ?? 0) + 1 };
    }
  }
  const aspects = Object.fromEntries(Object.entries(sums).map(([k, s]) => [k, Math.round((s.sum / s.n) * 100) / 100]));

  const recentReports = await db
    .select()
    .from(reports)
    .where(and(eq(reports.targetType, "trap_appeal"), eq(reports.targetId, venueId)))
    .orderBy(desc(reports.createdAt))
    .limit(5);

  return {
    scores: {
      honest: venue.honestScore,
      locals: venue.localsScore,
      tourists: venue.touristsScore,
      touristTrapIndex: venue.touristTrapIndex,
      explanation: venue.scoreExplanation,
    },
    byMonth,
    aspects,
    trapAppeals: recentReports,
  };
}
