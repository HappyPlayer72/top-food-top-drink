/**
 * Analiza unui review fără AI (modulul C): limbă, local/turist, plătit, semnale de fals.
 * La MVP semnalele de fals sunt reguli care adună puncte; mai târziu, model ML.
 */
import { franc } from "franc-min";

// ---------- Limbă ----------

const ISO3_TO_1: Record<string, string> = {
  ron: "ro", eng: "en", deu: "de", hun: "hu", ita: "it", fra: "fr", spa: "es", srp: "sr", pol: "pl", nld: "nl", por: "pt", ukr: "uk", rus: "ru",
};

/** Cod ISO 639-1 („ro”, „en”) sau null dacă textul e prea scurt ca să fim siguri. */
export function detectLanguage(text: string | null | undefined): string | null {
  if (!text || text.trim().length < 20) return null;
  // Diacriticele românești sunt un semnal foarte sigur, chiar la texte scurte
  if (/[ăâîșşțţ]/iu.test(text) && /(?<![\p{L}])(și|nu|e|la|cu|de|foarte|bun[ăa]?)(?![\p{L}])/iu.test(text)) return "ro";
  const code = franc(text, { minLength: 20 });
  return code === "und" ? null : (ISO3_TO_1[code] ?? code);
}

// ---------- Local sau turist ----------

export type AuthorFacts = {
  isVerifiedLocal: boolean;
  language: string | null;
  /** Câte orașe diferite are în review-uri (dacă platforma ne spune). */
  citiesReviewed?: number;
};

export function classifyAuthor(a: AuthorFacts): "local" | "tourist" | "unknown" {
  if (a.isVerifiedLocal) return "local";
  if (a.language && a.language !== "ro") return "tourist";
  if ((a.citiesReviewed ?? 0) >= 4) return "tourist";
  return "unknown";
}

// ---------- Plătit ----------

// `\b` din JS nu știe de diacritice, așa că folosim granițe Unicode explicite
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const AD_PATTERNS = [
  `#(ad|ads|reclama|reclamă|sponsorizat|colaborare|collab|partner|parteneriat|gifted|publicitate)${E}`,
  `${B}(în|in) colaborare cu${E}`,
  `${B}paid partnership${E}`,
  `${B}parteneriat (plătit|platit)${E}`,
  `${B}(invitat|invitată|invitati|invitați) de${E}`,
].map((p) => new RegExp(p, "iu"));

/** Semnalele de reclamă găsite în text (gol = nu pare plătit). */
export function adSignals(text: string | null | undefined): string[] {
  if (!text) return [];
  return AD_PATTERNS.flatMap((p) => {
    const m = text.match(p);
    return m ? [m[0]] : [];
  });
}

// ---------- Fals ----------

export type FakeSignal = "burst" | "similarText" | "newAccount" | "extremeOnly" | "ownerOrStaff" | "generic";

/** Cât adaugă fiecare semnal la probabilitatea de fals (se combină ca evenimente independente). */
export const FAKE_SIGNAL_WEIGHTS: Record<FakeSignal, number> = {
  burst: 0.35,
  similarText: 0.4,
  newAccount: 0.2,
  extremeOnly: 0.2,
  ownerOrStaff: 0.9,
  generic: 0.15,
};

export type FakeContext = {
  /** Nota review-ului pe scara 0–10. */
  rating: number;
  text: string | null;
  postedAt: Date;
  authorReviewCount: number;
  authorHasPhotoOrHistory: boolean;
  /** Toate notele autorului (0–10), pentru „doar 5★ sau doar 1★ peste tot”. */
  authorRatings: number[];
  authorIsOwnerOrStaff: boolean;
  /** Celelalte review-uri ale aceluiași local. */
  venueReviews: { rating: number; text: string | null; postedAt: Date }[];
  /** Similaritate maximă cosinus din pgvector (0–1), opțională. */
  maxEmbeddingSimilarity?: number;
};

export const BURST = { windowHours: 48, minCount: 5, topRating: 9 } as const;
export const SIMILARITY_THRESHOLD = 0.6;
export const EMBEDDING_DIMENSIONS = 384;
export const VECTOR_SIMILARITY_THRESHOLD = 0.85;

export function fakeSignals(c: FakeContext): FakeSignal[] {
  const out: FakeSignal[] = [];
  const isTop = c.rating >= BURST.topRating;

  if (isTop) {
    const windowMs = BURST.windowHours * 3_600_000;
    const near = c.venueReviews.filter(
      (r) => r.rating >= BURST.topRating && Math.abs(r.postedAt.getTime() - c.postedAt.getTime()) <= windowMs,
    ).length;
    // rafală = multe note maxime în 48h, mult peste ritmul obișnuit al localului
    const spanDays = Math.max(
      30,
      (Math.max(...c.venueReviews.map((r) => r.postedAt.getTime()), c.postedAt.getTime()) -
        Math.min(...c.venueReviews.map((r) => r.postedAt.getTime()), c.postedAt.getTime())) /
        86_400_000,
    );
    const usualPer48h = (c.venueReviews.filter((r) => r.rating >= BURST.topRating).length / spanDays) * 2;
    if (near + 1 >= BURST.minCount && near + 1 > 3 * usualPer48h) out.push("burst");
  }
  if (
    (c.text && c.venueReviews.some((r) => r.text && textSimilarity(c.text!, r.text) >= SIMILARITY_THRESHOLD)) ||
    (c.maxEmbeddingSimilarity ?? 0) >= VECTOR_SIMILARITY_THRESHOLD
  ) {
    out.push("similarText");
  }
  if (c.authorReviewCount <= 1 && !c.authorHasPhotoOrHistory) out.push("newAccount");
  if (c.authorRatings.length >= 3 && (c.authorRatings.every((r) => r >= 9.5) || c.authorRatings.every((r) => r <= 2.5))) {
    out.push("extremeOnly");
  }
  if (c.authorIsOwnerOrStaff) out.push("ownerOrStaff");
  if (isGeneric(c.text)) out.push("generic");
  return out;
}

export function fakeProbability(signals: FakeSignal[]): number {
  const pNotFake = signals.reduce((p, s) => p * (1 - FAKE_SIGNAL_WEIGHTS[s]), 1);
  return Math.min(0.99, Math.round((1 - pNotFake) * 100) / 100);
}

const GENERIC = new RegExp(`${B}(super|recomand|top|excelent|perfect|cel mai bun|best|amazing|great|nice)${E}`, "iu");

/** Text scurt, fără detalii concrete („Super! Recomand!”). */
export function isGeneric(text: string | null | undefined): boolean {
  if (!text) return false;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length <= 6 && GENERIC.test(text);
}

/** Similaritate Jaccard pe grupuri de 3 cuvinte (0–1). */
export function textSimilarity(a: string, b: string): number {
  const sa = shingles(a);
  const sb = shingles(b);
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const s of sa) if (sb.has(s)) inter++;
  return inter / (sa.size + sb.size - inter);
}

function shingles(text: string, k = 3): Set<string> {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  if (words.length < k) {
    if (words.length) out.add(words.join(" "));
    return out;
  }
  for (let i = 0; i + k <= words.length; i++) out.add(words.slice(i, i + k).join(" "));
  return out;
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Embedding determinist de 384 dimensiuni (unitar L2) bazat pe unigrame, bigrame și 3-grame de caractere.
 * Folosit cu pgvector (`<=>`) pentru detectarea review-urilor parafrazate/duplicate fără apeluri externe.
 */
export function computeTextEmbedding(text: string | null | undefined): number[] | null {
  if (!text) return null;
  const words = normalizeWords(text);
  if (!words.length) return null;

  const features: { token: string; weight: number }[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    features.push({ token: `w:${w}`, weight: 2.5 });
    if (i + 1 < words.length) features.push({ token: `b:${w}_${words[i + 1]!}`, weight: 0.8 });
    if (w.length >= 4) {
      for (let j = 0; j + 3 <= w.length; j++) {
        features.push({ token: `c:${w.slice(j, j + 3)}`, weight: 0.7 });
      }
    }
  }

  const vec = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const { token, weight } of features) {
    const idx = fnv1a(token, 2166136261) % EMBEDDING_DIMENSIONS;
    const sign = (fnv1a(token, 0x9e3779b9) & 1) === 0 ? 1 : -1;
    vec[idx] = (vec[idx] ?? 0) + sign * weight;
  }

  let normSq = 0;
  for (const x of vec) normSq += x * x;
  if (normSq === 0) return null;
  const norm = Math.sqrt(normSq);
  return vec.map((x) => Math.round((x / norm) * 1e6) / 1e6);
}

export function cosineSimilarity(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a || !b || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
