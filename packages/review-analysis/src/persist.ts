/** Analizează review-urile unui local și scrie rezultatele în DB (înainte de recalcularea scorului). */
import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { employees, reviews, users, venueManagers, venues, type Db } from "@tftd/db";
import { analyzeAspects } from "./aspects.ts";
import { adSignals, classifyAuthor, detectLanguage, fakeProbability, fakeSignals } from "./rules.ts";

export async function analyzeVenueReviews(db: Db, venueId: string, opts: { onlyNew?: boolean; client?: Anthropic | null; now?: Date } = {}) {
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

  // Istoricul autorilor nativi: toate notele lor
  const authorIds = [...new Set(targets.map((r) => r.authorId).filter((x): x is string => !!x))];
  const history = new Map<string, number[]>();
  if (authorIds.length) {
    for (const r of await db.select({ authorId: reviews.authorId, rating: reviews.rating }).from(reviews).where(inArray(reviews.authorId, authorIds))) {
      history.set(r.authorId!, [...(history.get(r.authorId!) ?? []), r.rating]);
    }
  }

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
    const signals = fakeSignals({
      rating: r.rating,
      text: r.text,
      postedAt: r.postedAt,
      authorReviewCount,
      authorHasPhotoOrHistory: !!r.avatarUrl || authorReviewCount > 1 || !!r.externalAuthor?.isLocalGuide,
      authorRatings,
      authorIsOwnerOrStaff: !!r.authorId && staff.has(r.authorId),
      venueReviews: all.filter((o) => o.id !== r.id),
    });
    await db
      .update(reviews)
      .set({
        language,
        authorType: classifyAuthor({ isVerifiedLocal, language, citiesReviewed: r.externalAuthor?.citiesReviewed }),
        // Plătit rămâne true dacă influencerul l-a declarat; altfel îl detectăm din text
        isPaid: r.isPaid || adSignals(r.text).length > 0,
        fakeSignals: signals,
        fakeProbability: fakeProbability(signals),
        aspects: aspects.get(r.id) ?? null,
        analyzedAt: now,
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
