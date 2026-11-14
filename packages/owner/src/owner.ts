/**
 * Modulul G: ce poate face proprietarul/managerul unui local.
 * Regula 2: owner-ul NU poate șterge sau ascunde review-uri — doar răspunde sau raportează (decide un admin).
 */
import { and, avg, count, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import {
  employeeRatings, employees, forbidden, invalid, leaderboardSnapshots, menuItems, notFound, ownerClaims, posts, reports, reviewReplies, reviews, ServiceError, socialSubmissions, users, venueManagers, venues, type Db,
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

/**
 * Raportarea nu ascunde review-ul; ajunge în coada de admin. Doar managerul localului review-ului raportează,
 * și doar o dată cât timp raportul e deschis (altfel un cont ar putea inunda coada de admin).
 */
export async function reportReview(db: Db, userId: string, reviewId: string, reason: string) {
  const [r] = await db.select({ venueId: reviews.venueId }).from(reviews).where(eq(reviews.id, reviewId));
  if (!r) throw notFound("Review-ul");
  await assertManager(db, userId, r.venueId);
  if (reason.trim().length < 10) throw invalid("Spune pe scurt de ce raportezi (minim 10 caractere).");
  return db.transaction(async (tx) => {
    // Lock per (user, review): rafalele paralele de cereri nu pot trece de verificarea de mai jos.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`report:${userId}:${reviewId}`}))`);
    const [open] = await tx
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.targetType, "review"), eq(reports.targetId, reviewId), eq(reports.reportedBy, userId), eq(reports.status, "open")));
    if (open) throw new ServiceError("conflict", "Ai raportat deja acest review. Decide un admin.");
    const [report] = await tx.insert(reports).values({ targetType: "review", targetId: reviewId, reportedBy: userId, reason: reason.trim() }).returning();
    return report!;
  });
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
  // Doar o invitație încă în așteptare: cine a fost scos sau a refuzat nu se poate readăuga singur.
  if (!e || e.userId !== employeeUserId || e.accepted || !e.active) throw notFound("Invitația");
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

// ---------- Citiri pentru dashboard-ul /owner ----------

/** Localele pe care userul le administrează (owner sau manager). */
export async function managedVenues(db: Db, userId: string) {
  return db
    .select({
      id: venues.id, slug: venues.slug, name: venues.name, vertical: venues.vertical, citySlug: venues.citySlug, role: venueManagers.role,
      iconSymbol: venues.ownerIconSymbol, iconColor: venues.ownerIconColor, iconImage: venues.ownerIconImage,
    })
    .from(venueManagers)
    .innerJoin(venues, eq(venues.id, venueManagers.venueId))
    .where(eq(venueManagers.userId, userId))
    .orderBy(venues.name);
}

/** Toate postările localului, inclusiv cele programate (publicul le vede doar după publishAt). */
export async function postsForOwner(db: Db, userId: string, venueId: string, now = new Date()) {
  await assertManager(db, userId, venueId);
  const rows = await db.select().from(posts).where(eq(posts.venueId, venueId)).orderBy(desc(posts.publishAt));
  return rows.map((p) => ({ ...p, scheduled: p.publishAt > now }));
}

/** Echipa văzută de owner: activi + invitații încă neacceptate (cei refuzați sau scoși au active = false). */
export async function employeesForOwner(db: Db, userId: string, venueId: string) {
  await assertManager(db, userId, venueId);
  return db
    .select({ id: employees.id, firstName: employees.firstName, role: employees.role, photoUrl: employees.photoUrl, accepted: employees.accepted, active: employees.active, userId: employees.userId })
    .from(employees)
    .where(and(eq(employees.venueId, venueId), eq(employees.active, true)))
    .orderBy(employees.createdAt);
}

/** Invitațiile primite de un user ca angajat, încă fără răspuns. */
export async function pendingInvites(db: Db, userId: string) {
  return db
    .select({ employeeId: employees.id, venueName: venues.name, role: employees.role })
    .from(employees)
    .innerJoin(venues, eq(venues.id, employees.venueId))
    .where(and(eq(employees.userId, userId), eq(employees.accepted, false), eq(employees.active, true)));
}

/** Pentru invitarea unui angajat după numele de utilizator. */
export async function userIdByUsername(db: Db, username: string): Promise<string | null> {
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.username, username.trim().toLowerCase()));
  return u?.id ?? null;
}

// ---------- Pictograma localului în lista /owner ----------

/** Cheile simbolurilor și culorilor (apps/web le mapează la iconițe și la culorile din design; tipurile de acolo se potrivesc cu astea). Fără albastru: albastrul de plăcuță înseamnă doar „localnic”. */
export const ICON_SYMBOLS = ["utensils", "pizza", "beer", "wine", "coffee", "martini", "soup", "sandwich", "cake", "fish", "salad", "music"] as const;
export const ICON_COLORS = ["carou", "cafea", "sticla", "chihlimbar", "carton"] as const;

export type VenueIconInput =
  | { kind: "symbol"; symbol: string; color: string }
  | { kind: "image"; image: string }
  | { kind: "reset" };

const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_CHARS = 30_000;

/** Valorile de salvat în coloanele localului; aruncă invalid() pentru orice nu e din lista permisă. */
export function parseVenueIcon(input: VenueIconInput) {
  if (input.kind === "reset") return { ownerIconSymbol: null, ownerIconColor: null, ownerIconImage: null };
  if (input.kind === "symbol") {
    if (!(ICON_SYMBOLS as readonly string[]).includes(input.symbol) || !(ICON_COLORS as readonly string[]).includes(input.color)) {
      throw invalid("Simbolul sau culoarea nu sunt valide.");
    }
    return { ownerIconSymbol: input.symbol, ownerIconColor: input.color, ownerIconImage: null };
  }
  if (input.image.length > MAX_IMAGE_CHARS || !IMAGE_DATA_URL.test(input.image)) throw invalid("Poza trebuie să fie JPG, PNG sau WebP, mică (circa 96×96 px).");
  return { ownerIconSymbol: null, ownerIconColor: null, ownerIconImage: input.image };
}

/** Doar owner-ul (nu managerul) schimbă pictograma localului. */
export async function setVenueIcon(db: Db, userId: string, venueId: string, input: VenueIconInput) {
  const values = parseVenueIcon(input);
  if ((await assertManager(db, userId, venueId)) !== "owner") throw forbidden("Doar proprietarul poate schimba pictograma localului.");
  await db.update(venues).set(values).where(eq(venues.id, venueId));
}

// ---------- Rezumatul din pagina /owner ----------

/** Review-urile publicate fără niciun răspuns, per local administrat de user (venueId → număr). */
export async function unansweredReviews(db: Db, userId: string) {
  const rows = await db
    .select({ venueId: reviews.venueId, n: count() })
    .from(reviews)
    .innerJoin(venueManagers, and(eq(venueManagers.venueId, reviews.venueId), eq(venueManagers.userId, userId)))
    .leftJoin(reviewReplies, eq(reviewReplies.reviewId, reviews.id))
    .where(and(eq(reviews.status, "published"), isNull(reviewReplies.id)))
    .groupBy(reviews.venueId);
  return new Map(rows.map((r) => [r.venueId, r.n]));
}

/** Ultima revendicare începută (cod cerut, neconfirmat, în ultimele 24 h), ca userul să o poată continua. */
export async function pendingClaim(db: Db, userId: string) {
  const [claim] = await db
    .select({ claimId: ownerClaims.id, venueId: venues.id, venueName: venues.name, vertical: venues.vertical, sendTo: venues.phone })
    .from(ownerClaims)
    .innerJoin(venues, eq(venues.id, ownerClaims.venueId))
    .where(
      and(
        eq(ownerClaims.userId, userId),
        eq(ownerClaims.status, "pending"),
        eq(ownerClaims.method, "phone_code"),
        lt(ownerClaims.attempts, 5),
        gte(ownerClaims.createdAt, new Date(Date.now() - 86_400_000)),
        sql`not exists (select 1 from ${venueManagers} where ${venueManagers.venueId} = ${ownerClaims.venueId} and ${venueManagers.role} = 'owner')`,
      ),
    )
    .orderBy(desc(ownerClaims.createdAt))
    .limit(1);
  return claim ?? null;
}

/** Numele afișat al userului, pentru salut. */
export async function displayName(db: Db, userId: string) {
  const [u] = await db.select({ name: users.displayName }).from(users).where(eq(users.id, userId));
  return u?.name ?? null;
}

// ---------- Profil complet, contestații deschise, locul în clasament ----------

export type ChecklistInput = { hasMenu: boolean; recentPost: boolean; hasTeam: boolean; hasVideo: boolean; unanswered: number };

/** Ce ține ownerul în mână ca profilul localului să fie complet; fiecare punct duce la secțiunea unde se rezolvă. */
export function profileChecklist(i: ChecklistInput) {
  const items = [
    { key: "meniu", label: "Meniul publicat", section: "blog", done: i.hasMenu },
    { key: "postare", label: "O postare din ultimele 30 de zile", section: "blog", done: i.recentPost },
    { key: "echipa", label: "Cel puțin un om din echipă, cu invitația acceptată", section: "echipa", done: i.hasTeam },
    { key: "video", label: "Un video sau un link social", section: "videouri", done: i.hasVideo },
    { key: "review-uri", label: "Toate review-urile au un răspuns", section: "review-uri", done: i.unanswered === 0 },
  ];
  return { items, done: items.filter((x) => x.done).length, total: items.length };
}

/** Checklist-ul fiecărui local administrat de user (venueId → rezultat). */
export async function profileChecklists(db: Db, userId: string, now = new Date()) {
  const mine = await db.select({ id: venueManagers.venueId }).from(venueManagers).where(eq(venueManagers.userId, userId));
  const ids = mine.map((m) => m.id);
  if (!ids.length) return new Map<string, ReturnType<typeof profileChecklist>>();
  const monthAgo = now.getTime() - 30 * 86_400_000;
  const [postRows, teamRows, videoRows, unanswered] = await Promise.all([
    db.select({ venueId: posts.venueId, type: posts.type, publishAt: posts.publishAt }).from(posts).where(inArray(posts.venueId, ids)),
    db
      .select({ venueId: employees.venueId })
      .from(employees)
      .where(and(inArray(employees.venueId, ids), eq(employees.accepted, true), eq(employees.active, true))),
    db.select({ venueId: socialSubmissions.venueId }).from(socialSubmissions).where(inArray(socialSubmissions.venueId, ids)),
    unansweredReviews(db, userId),
  ]);
  return new Map(
    ids.map((id) => {
      const published = postRows.filter((p) => p.venueId === id && p.publishAt <= now);
      return [
        id,
        profileChecklist({
          hasMenu: published.some((p) => p.type === "menu"),
          recentPost: published.some((p) => p.publishAt.getTime() >= monthAgo),
          hasTeam: teamRows.some((t) => t.venueId === id),
          hasVideo: videoRows.some((v) => v.venueId === id),
          unanswered: unanswered.get(id) ?? 0,
        }),
      ] as const;
    }),
  );
}

/** Localurile cu o contestație de capcană încă deschisă (un admin n-a decis). */
export async function openTrapAppeals(db: Db, userId: string) {
  const rows = await db
    .select({ venueId: venueManagers.venueId })
    .from(reports)
    .innerJoin(venueManagers, and(sql`${venueManagers.venueId}::text = ${reports.targetId}`, eq(venueManagers.userId, userId)))
    .where(and(eq(reports.targetType, "trap_appeal"), eq(reports.status, "open")));
  return new Set(rows.map((r) => r.venueId));
}

/** `rows` vin sortate ca topul orașului (scor descrescător). Locul, câte locuri sunt și cât lipsește până la cel de deasupra. */
export function rankStanding(rows: { id: string; name: string; score: number }[], venueId: string) {
  const i = rows.findIndex((r) => r.id === venueId);
  if (i < 0) return null;
  const above = i > 0 ? rows[i - 1]! : null;
  return {
    rank: i + 1,
    total: rows.length,
    nextName: above?.name ?? null,
    gap: above ? Math.round((above.score - rows[i]!.score) * 10) / 10 : null,
  };
}

/** Locul de acum (din scorul curent) și locul din ultimul clasament lunar înghețat. */
export async function standing(db: Db, userId: string, venueId: string) {
  await assertManager(db, userId, venueId);
  const [v] = await db.select({ citySlug: venues.citySlug, vertical: venues.vertical }).from(venues).where(eq(venues.id, venueId));
  if (!v) throw notFound("Localul");
  const rows = await db
    .select({ id: venues.id, name: venues.name, score: venues.honestScore })
    .from(venues)
    .where(and(eq(venues.citySlug, v.citySlug), eq(venues.vertical, v.vertical), eq(venues.status, "active"), isNotNull(venues.honestScore)))
    .orderBy(desc(venues.honestScore), desc(venues.totalWeight));
  const [snap] = await db
    .select({ month: leaderboardSnapshots.month, entries: leaderboardSnapshots.entries })
    .from(leaderboardSnapshots)
    .where(and(eq(leaderboardSnapshots.citySlug, v.citySlug), eq(leaderboardSnapshots.vertical, v.vertical), eq(leaderboardSnapshots.category, "all")))
    .orderBy(desc(leaderboardSnapshots.month))
    .limit(1);
  const entry = snap?.entries.find((e) => e.venueId === venueId) ?? null;
  return {
    live: rankStanding(rows.map((r) => ({ id: r.id, name: r.name, score: r.score! })), venueId),
    month: snap ? { month: snap.month, rank: entry?.rank ?? null, movement: entry?.movement ?? null, size: snap.entries.length } : null,
  };
}
