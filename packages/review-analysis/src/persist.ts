/** Analizează review-urile unui local și scrie rezultatele în DB (înainte de recalcularea scorului). */
import type Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { employees, ensureExtendedSchema, reports, reviewSubmissions, reviews, users, venueManagers, venues, type Db } from "@tftd/db";
import { analyzeAspects } from "./aspects.ts";
import { adSignals, BOT_RULES, botSignals, classifyAuthor, computeTextEmbedding, detectLanguage, fakeProbability, fakeSignals, toVectorLiteral, type BotSignal } from "./rules.ts";

export async function analyzeVenueReviews(db: Db, venueId: string, opts: { onlyNew?: boolean; client?: Anthropic | null; now?: Date } = {}) {
  await ensureExtendedSchema(db);
  const now = opts.now ?? new Date();
  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId));
  if (!venue) throw new Error(`Localul ${venueId} nu există.`);

  const all = await db
    .select({
      id: reviews.id,
      authorId: reviews.authorId,
      externalAuthor: reviews.externalAuthor,
      rating: reviews.rating,
      text: reviews.text,
      postedAt: reviews.postedAt,
      source: reviews.source,
      status: reviews.status,
      botCleared: reviews.botCleared,
      isPaid: reviews.isPaid,
      analyzedAt: reviews.analyzedAt,
      localCitySlug: users.localCitySlug,
      localUntil: users.localUntil,
      avatarUrl: users.avatarUrl,
    })
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.authorId))
    .where(eq(reviews.venueId, venueId));
  const targets = opts.onlyNew ? all.filter((r) => !r.analyzedAt) : all;
  if (!targets.length) return { analyzed: 0 };

  // Owner, manageri și angajați ai localului → semnalul ownerOrStaff
  const staff = new Set<string>([
    ...(await db.select({ id: venueManagers.userId }).from(venueManagers).where(eq(venueManagers.venueId, venueId))).map((r) => r.id),
    ...(await db.select({ id: employees.userId }).from(employees).where(eq(employees.venueId, venueId)))
      .map((r) => r.id)
      .filter((x): x is string => !!x),
  ]);

  // Istoricul autorilor nativi: toate notele lor și când au postat
  const authorIds = [...new Set(targets.map((r) => r.authorId).filter((x): x is string => !!x))];
  const history = new Map<string, number[]>();
  const postTimes = new Map<string, { id: string; postedAt: Date }[]>();
  if (authorIds.length) {
    for (const r of await db
      .select({ id: reviews.id, authorId: reviews.authorId, rating: reviews.rating, postedAt: reviews.postedAt })
      .from(reviews)
      .where(inArray(reviews.authorId, authorIds))) {
      history.set(r.authorId!, [...(history.get(r.authorId!) ?? []), r.rating]);
      postTimes.set(r.authorId!, [...(postTimes.get(r.authorId!) ?? []), { id: r.id, postedAt: r.postedAt }]);
    }
  }
  const bot = await botContextData(db, venueId, targets.filter((r) => r.source === "native" && r.authorId && !r.botCleared), now);

  const aspects = new Map(
    (await analyzeAspects(targets.filter((r) => r.text).map((r) => ({ id: r.id, text: r.text! })), venue.vertical, opts.client)).map((a) => [
      a.id,
      a.aspects,
    ]),
  );

  for (const r of targets) {
    const language = detectLanguage(r.text);
    const isVerifiedLocal = r.localCitySlug === venue.citySlug && !!r.localUntil && r.localUntil > now;
    const authorRatings = r.authorId ? (history.get(r.authorId) ?? []) : [];
    const authorReviewCount = r.authorId ? authorRatings.length : (r.externalAuthor?.reviewCount ?? 1);
    const embedding = computeTextEmbedding(r.text);
    let maxEmbeddingSimilarity = 0;
    if (embedding) {
      const vecLiteral = toVectorLiteral(embedding);
      const [simRow] = await db
        .select({ sim: sql<number>`1 - (${reviews.embedding} <=> ${vecLiteral}::vector)` })
        .from(reviews)
        .where(and(eq(reviews.venueId, venueId), ne(reviews.id, r.id), isNotNull(reviews.embedding)))
        .orderBy(desc(sql`1 - (${reviews.embedding} <=> ${vecLiteral}::vector)`))
        .limit(1);
      maxEmbeddingSimilarity = Number(simRow?.sim ?? 0) || 0;
    }
    const signals = fakeSignals({
      rating: r.rating,
      text: r.text,
      postedAt: r.postedAt,
      authorReviewCount,
      authorHasPhotoOrHistory: !!r.avatarUrl || authorReviewCount > 1 || !!r.externalAuthor?.isLocalGuide,
      authorRatings,
      authorIsOwnerOrStaff: !!r.authorId && staff.has(r.authorId),
      venueReviews: all.filter((o) => o.id !== r.id),
      maxEmbeddingSimilarity,
    });
    let held = false;
    if (r.source === "native" && r.authorId && !r.botCleared) {
      const sub = bot.submissions.get(r.id);
      const found = botSignals({
        text: r.text,
        postedAt: r.postedAt,
        authorOtherPostTimes: (postTimes.get(r.authorId) ?? []).filter((p) => p.id !== r.id).map((p) => p.postedAt),
        otherVenueTexts: sub ? bot.otherVenueTexts : [],
        fillMs: sub?.fillMs ?? null,
        accountAgeSec: sub?.accountAgeSec ?? null,
        sameDeviceOtherAccounts: bot.sameDevice.get(r.id) ?? 0,
      });
      signals.push(...found);
      // Aproape sigur bot → nu apare și nu contează până decide un admin (raport automat în /admin)
      held = found.length > 0 && fakeProbability(signals) >= BOT_RULES.holdProbability && r.status === "published";
      if (held) await holdForModeration(db, r.id, found);
    }
    await db
      .update(reviews)
      .set({
        language,
        authorType: classifyAuthor({ isVerifiedLocal, language, citiesReviewed: r.externalAuthor?.citiesReviewed }),
        // Plătit rămâne true dacă influencerul l-a declarat; altfel îl detectăm din text
        isPaid: r.isPaid || adSignals(r.text).length > 0,
        fakeSignals: signals,
        fakeProbability: fakeProbability(signals),
        embedding,
        aspects: aspects.get(r.id) ?? null,
        analyzedAt: now,
        ...(held ? { status: "flagged" as const } : {}),
      })
      .where(eq(reviews.id, r.id));
  }
  return { analyzed: targets.length };
}

/** ID-urile localurilor care au review-uri neanalizate (pentru job). */
export async function venuesWithUnanalyzedReviews(db: Db): Promise<string[]> {
  const rows = await db.selectDistinct({ venueId: reviews.venueId }).from(reviews).where(and(isNull(reviews.analyzedAt)));
  return rows.map((r) => r.venueId);
}

/** Datele pentru semnalele anti-bot ale review-urilor native analizate acum. */
async function botContextData(db: Db, venueId: string, targets: { id: string; authorId: string | null }[], now: Date) {
  const submissions = new Map<string, { fillMs: number | null; accountAgeSec: number | null; clientHash: string | null; createdAt: Date }>();
  const sameDevice = new Map<string, number>();
  if (!targets.length) return { submissions, sameDevice, otherVenueTexts: [] as string[] };

  for (const s of await db.select().from(reviewSubmissions).where(inArray(reviewSubmissions.reviewId, targets.map((t) => t.id)))) {
    submissions.set(s.reviewId, s);
  }
  if (!submissions.size) return { submissions, sameDevice, otherVenueTexts: [] as string[] };

  // Același dispozitiv (HMAC de IP + browser), alte conturi, același local, ±7 zile
  const windowMs = BOT_RULES.sharedDeviceWindowDays * 86_400_000;
  for (const t of targets) {
    const s = submissions.get(t.id);
    if (!s?.clientHash) continue;
    const [row] = await db
      .select({ n: sql<number>`count(distinct ${reviewSubmissions.userId})::int` })
      .from(reviewSubmissions)
      .where(
        and(
          eq(reviewSubmissions.clientHash, s.clientHash),
          eq(reviewSubmissions.venueId, venueId),
          ne(reviewSubmissions.userId, t.authorId!),
          gte(reviewSubmissions.createdAt, new Date(s.createdAt.getTime() - windowMs)),
          lte(reviewSubmissions.createdAt, new Date(s.createdAt.getTime() + windowMs)),
        ),
      );
    sameDevice.set(t.id, row?.n ?? 0);
  }

  // Texte recente de la alte localuri: același text lipit peste tot = copy-paste de bot
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const otherVenueTexts = (
    await db
      .select({ text: reviews.text })
      .from(reviews)
      .where(and(ne(reviews.venueId, venueId), eq(reviews.source, "native"), isNotNull(reviews.text), gte(reviews.postedAt, since)))
      .limit(2000)
  ).map((r) => r.text!);
  return { submissions, sameDevice, otherVenueTexts };
}

/** Raport automat pentru admin (o singură dată per review). */
async function holdForModeration(db: Db, reviewId: string, found: BotSignal[]) {
  const [open] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.targetType, "review"), eq(reports.targetId, reviewId), eq(reports.status, "open")));
  if (open) return;
  await db.insert(reports).values({
    targetType: "review",
    targetId: reviewId,
    reportedBy: null,
    reason: `Reținut automat de filtrul anti-bot: ${found.map((f) => BOT_SIGNAL_LABELS[f]).join("; ")}.`,
  });
}

export const BOT_SIGNAL_LABELS: Record<BotSignal, string> = {
  botVelocity: `${BOT_RULES.velocityMinCount}+ review-uri de la același cont într-o oră`,
  copyPaste: "același text ca la alt local",
  sharedDevice: `${BOT_RULES.sharedDeviceMinAccounts}+ conturi de pe același dispozitiv la acest local`,
  tooFast: "formular completat mai repede decât poate un om",
  spamContent: "linkuri, contacte sau text fără sens",
  freshAccount: "cont creat chiar înainte de review",
};
