/**
 * Ponderea unui review (docs/ARHITECTURA.md → Scoring → 1).
 * pondere = autor × verificare × (1 − p_fals) × vechime × plătit
 */
export type ScoringReview = {
  /** Nota pe scara 0–10. */
  rating: number;
  authorType: "local" | "tourist" | "unknown";
  /** Localnic cu insigna verificată (nu doar ghicit ca local). */
  authorIsVerifiedLocal: boolean;
  /** Câte review-uri are autorul în total (inclusiv pe platforma sursă). */
  authorReviewCount: number;
  verifiedVisit: boolean;
  fakeProbability: number;
  isPaid: boolean;
  postedAt: Date;
  /** TOP DRINK: vizită vineri–sâmbătă noaptea. */
  visitWeekendNight?: boolean | null;
};

export const WEIGHTS = {
  verifiedLocal: 2.0,
  experienced: 1.5,
  experiencedMinReviews: 10,
  regular: 1.0,
  newAccount: 0.3,
  verifiedVisit: 1.3,
  halfLifeDays: 180,
  paid: 0.2,
} as const;

const DAY_MS = 86_400_000;

export function authorFactor(r: Pick<ScoringReview, "authorIsVerifiedLocal" | "authorReviewCount">): number {
  if (r.authorIsVerifiedLocal) return WEIGHTS.verifiedLocal;
  if (r.authorReviewCount >= WEIGHTS.experiencedMinReviews) return WEIGHTS.experienced;
  if (r.authorReviewCount <= 1) return WEIGHTS.newAccount;
  return WEIGHTS.regular;
}

export function recencyFactor(postedAt: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - postedAt.getTime()) / DAY_MS);
  return 0.5 ** (ageDays / WEIGHTS.halfLifeDays);
}

export function reviewWeight(r: ScoringReview, now: Date = new Date()): number {
  const fake = Math.min(1, Math.max(0, r.fakeProbability));
  return (
    authorFactor(r) *
    (r.verifiedVisit ? WEIGHTS.verifiedVisit : 1) *
    (1 - fake) *
    recencyFactor(r.postedAt, now) *
    (r.isPaid ? WEIGHTS.paid : 1)
  );
}

/** 4,6★ din 5 → 9,2 din 10. */
export function toTenScale(rating: number, scale = 5): number {
  return (rating / scale) * 10;
}
