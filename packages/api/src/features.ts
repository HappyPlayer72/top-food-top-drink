/**
 * Datele pentru facilități și topurile tematice: răspunsurile clienților (doar review-uri publicate)
 * și declarațiile owner-ului, separat. Logica (procente, prag, Wilson) e în @tftd/scoring/features.
 * Nu citește parteneriate/sponsorizări (regula 1).
 */
import { and, eq, inArray } from "drizzle-orm";
import { reviewAnswers, reviews, venueFacilityDeclarations, type Db } from "@tftd/db";
import {
  aggregateAnswers,
  featureStatus,
  QUESTIONS,
  THEMES,
  type Declaration,
  type QuestionStats,
} from "@tftd/scoring/features";

export type VenueFeatureData = { stats: Map<string, QuestionStats>; declarations: Map<string, Declaration> };

export async function venueFeatureData(db: Db, venueIds: string[]): Promise<Map<string, VenueFeatureData>> {
  const out = new Map<string, VenueFeatureData>(venueIds.map((id) => [id, { stats: new Map(), declarations: new Map() }]));
  if (!venueIds.length) return out;
  const [answers, declarations] = await Promise.all([
    db
      .select({ venueId: reviews.venueId, questionKey: reviewAnswers.questionKey, answer: reviewAnswers.answer, weight: reviews.weight })
      .from(reviewAnswers)
      .innerJoin(reviews, eq(reviews.id, reviewAnswers.reviewId))
      // Review-urile ascunse sau semnalate nu intră în procente (același filtru ca Scorul Onest).
      .where(and(inArray(reviews.venueId, venueIds), eq(reviews.status, "published"))),
    db
      .select({ venueId: venueFacilityDeclarations.venueId, key: venueFacilityDeclarations.questionKey, value: venueFacilityDeclarations.value })
      .from(venueFacilityDeclarations)
      .where(inArray(venueFacilityDeclarations.venueId, venueIds)),
  ]);
  const byVenue = new Map<string, typeof answers>();
  for (const a of answers) byVenue.set(a.venueId, [...(byVenue.get(a.venueId) ?? []), a]);
  for (const [id, data] of out) data.stats = aggregateAnswers(byVenue.get(id) ?? []);
  for (const d of declarations) out.get(d.venueId)!.declarations.set(d.key, d.value);
  return out;
}

/** Pagina localului: fiecare întrebare cu ce știm despre ea și sursa (comunitate / declarat de local / nespecificat). */
export function venueFeatures(data: VenueFeatureData | undefined) {
  return THEMES.map((t) => ({
    theme: t.key,
    label: t.label,
    items: QUESTIONS.filter((q) => q.theme === t.key).map((q) => featureStatus(q, data?.stats.get(q.key), data?.declarations.get(q.key))),
  })).filter((t) => t.items.length);
}
