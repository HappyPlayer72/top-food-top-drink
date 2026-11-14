/**
 * Leaderboard lunar (modulul I): pe oraș × verticală × categorie, calculat pe 1 ale lunii și înghețat.
 * Intrare: ≥ 10 review-uri de la localnici în lună și nicio alertă de fraudă. Plata nu contează.
 */
import { honestScore, type ScoringReview } from "@tftd/scoring";

export const MIN_LOCAL_REVIEWS = 10;
/** Alertă de fraudă: atâtea review-uri foarte probabil false în lună. */
export const FRAUD_ALERT = { probability: 0.7, count: 3 } as const;
export const TOP_SIZE = 10;

export type MonthVenue = {
  venueId: string;
  name: string;
  categories: string[];
  /** Review-urile publicate în luna respectivă. */
  reviews: (ScoringReview & {
    servedByEmployeeId?: string | null;
    authorId?: string | null;
    authorIsInfluencer?: boolean;
    authorFollowers?: number;
  })[];
};

export type PreviousMonth = {
  /** venueId → locul de luna trecută (topul pe aceeași categorie). */
  ranks: Map<string, number>;
  /** venueId → scorul de luna trecută. */
  scores: Map<string, number>;
};

export type Entry = { rank: number; venueId: string; name: string; score: number; localReviews: number; movement: number | null };

export function eligible(v: MonthVenue): boolean {
  const locals = v.reviews.filter((r) => r.authorType === "local").length;
  const suspicious = v.reviews.filter((r) => r.fakeProbability >= FRAUD_ALERT.probability).length;
  return locals >= MIN_LOCAL_REVIEWS && suspicious < FRAUD_ALERT.count;
}

export function rankMonth(venues: MonthVenue[], cityMean: number, previous: PreviousMonth | null, now: Date, category = "all"): Entry[] {
  const pool = venues.filter((v) => (category === "all" || v.categories.includes(category)) && eligible(v));
  const scored = pool
    .map((v) => ({
      v,
      score: honestScore(v.reviews, cityMean, now).score,
      localReviews: v.reviews.filter((r) => r.authorType === "local").length,
    }))
    // la egalitate: mai multe review-uri de la localnici, apoi alfabetic (stabil)
    .sort((a, b) => b.score - a.score || b.localReviews - a.localReviews || a.v.name.localeCompare(b.v.name, "ro"));

  return scored.slice(0, TOP_SIZE).map((s, i) => {
    const prev = previous?.ranks.get(s.v.venueId);
    return {
      rank: i + 1,
      venueId: s.v.venueId,
      name: s.v.name,
      score: s.score,
      localReviews: s.localReviews,
      // pozitiv = a urcat
      movement: prev === undefined ? null : prev - (i + 1),
    };
  });
}

/** „Revelația lunii”: cea mai mare creștere de scor față de luna trecută, printre cei din top. */
export function revelation(entries: Entry[], previous: PreviousMonth | null) {
  let best: { venueId: string; from: number; to: number } | undefined;
  for (const e of entries) {
    const from = previous?.scores.get(e.venueId);
    if (from === undefined || e.score <= from) continue;
    if (!best || e.score - from > best.to - best.from) best = { venueId: e.venueId, from, to: e.score };
  }
  return best;
}

/** „Angajatul lunii”: cele mai multe mențiuni în review-uri; contează doar autorii care nu sunt conturi noi. */
export function employeeOfMonth(venues: MonthVenue[], acceptedEmployees: Map<string, string>) {
  const mentions = new Map<string, number>();
  for (const v of venues) {
    for (const r of v.reviews) {
      const id = r.servedByEmployeeId;
      if (!id || !acceptedEmployees.has(id) || r.authorReviewCount <= 1 || r.rating < 7) continue;
      mentions.set(id, (mentions.get(id) ?? 0) + 1);
    }
  }
  const top = [...mentions].sort((a, b) => b[1] - a[1])[0];
  return top ? { employeeId: top[0], venueId: acceptedEmployees.get(top[0])!, mentions: top[1] } : undefined;
}

/** „Localnicul lunii”: localnicul verificat cu cele mai multe review-uri în lună. */
export function localOfMonth(venues: MonthVenue[]) {
  const counts = new Map<string, number>();
  for (const v of venues) {
    for (const r of v.reviews) {
      if (r.authorIsVerifiedLocal && r.authorId) counts.set(r.authorId, (counts.get(r.authorId) ?? 0) + 1);
    }
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return top ? { userId: top[0], reviews: top[1] } : undefined;
}

/** „Influencerul lunii”: influencerul verificat (≥1.000 urmăritori) cu cele mai multe review-uri în lună. */
export function influencerOfMonth(venues: MonthVenue[]) {
  const counts = new Map<string, { reviews: number; followers: number }>();
  for (const v of venues) {
    for (const r of v.reviews) {
      if (!r.authorIsInfluencer || !r.authorId) continue;
      const cur = counts.get(r.authorId) ?? { reviews: 0, followers: r.authorFollowers ?? 0 };
      counts.set(r.authorId, { reviews: cur.reviews + 1, followers: Math.max(cur.followers, r.authorFollowers ?? 0) });
    }
  }
  const top = [...counts].sort((a, b) => b[1].reviews - a[1].reviews || b[1].followers - a[1].followers)[0];
  return top ? { userId: top[0], reviews: top[1].reviews, followers: top[1].followers } : undefined;
}

/** "2026-11" → "2026-10" */
export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Începutul și sfârșitul lunii, în UTC. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}
