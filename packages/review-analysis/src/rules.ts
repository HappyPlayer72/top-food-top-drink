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

export type FakeSignal =
  | "burst"
  | "similarText"
  | "newAccount"
  | "extremeOnly"
  | "ownerOrStaff"
  | "generic"
  // Anti-bot (docs/ANTI-BOT.md): comportamentul contului și al dispozitivului, nu doar textul
  | BotSignal;

export type BotSignal = "botVelocity" | "copyPaste" | "sharedDevice" | "tooFast" | "spamContent" | "freshAccount";

/** Cât adaugă fiecare semnal la probabilitatea de fals (se combină ca evenimente independente). */
export const FAKE_SIGNAL_WEIGHTS: Record<FakeSignal, number> = {
  burst: 0.35,
  similarText: 0.4,
  newAccount: 0.2,
  extremeOnly: 0.2,
  ownerOrStaff: 0.9,
  generic: 0.15,
  botVelocity: 0.5,
  copyPaste: 0.6,
  sharedDevice: 0.6,
  tooFast: 0.4,
  spamContent: 0.6,
  freshAccount: 0.15,
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
};

export const BURST = { windowHours: 48, minCount: 5, topRating: 9 } as const;
export const SIMILARITY_THRESHOLD = 0.6;

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
  if (c.text && c.venueReviews.some((r) => r.text && textSimilarity(c.text!, r.text) >= SIMILARITY_THRESHOLD)) out.push("similarText");
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

// ---------- Anti-bot (docs/ANTI-BOT.md) ----------

export const BOT_SIGNALS: readonly BotSignal[] = ["botVelocity", "copyPaste", "sharedDevice", "tooFast", "spamContent", "freshAccount"];

export const BOT_RULES = {
  /** Review-uri ale aceluiași cont într-o oră (la localuri diferite). Un om nu mănâncă în 4 locuri pe oră. */
  velocityWindowMin: 60,
  velocityMinCount: 4,
  /** Același text (Jaccard pe 3 cuvinte) la alt local, de la oricine: copiat. */
  copyPasteSimilarity: 0.7,
  copyPasteMinWords: 8,
  /** Conturi diferite de pe același dispozitiv/rețea la același local, în 7 zile. */
  sharedDeviceMinAccounts: 3,
  sharedDeviceWindowDays: 7,
  /** Sub atâtea caractere pe secundă tastează un om; peste e lipit sau automat. */
  humanMaxCharsPerSec: 15,
  /** Formular trimis mai repede de atât, indiferent de lungime. */
  minFillMs: 4_000,
  /** Cont creat cu mai puțin de atât înainte de review. */
  freshAccountSec: 10 * 60,
  /** De la această probabilitate de fals, cu cel puțin un semnal de bot, review-ul așteaptă un admin. */
  holdProbability: 0.8,
} as const;

export type BotContext = {
  text: string | null;
  postedAt: Date;
  /** Când a postat autorul celelalte review-uri ale lui (oriunde). */
  authorOtherPostTimes: Date[];
  /**
   * Texte recente de la ALTE localuri (oricine le-a scris), pentru copy-paste. Gol la review-urile
   * fără amprentă de trimitere (importate, seed): verificăm doar ce se postează acum pe site.
   */
  otherVenueTexts: string[];
  /** Din `review_submissions`; null la review-urile vechi, importate sau din seed. */
  fillMs: number | null;
  accountAgeSec: number | null;
  /** Câte ALTE conturi au trimis review la același local de pe același dispozitiv, în fereastră. */
  sameDeviceOtherAccounts: number;
};

export function botSignals(c: BotContext): BotSignal[] {
  const out: BotSignal[] = [];
  const windowMs = BOT_RULES.velocityWindowMin * 60_000;
  const near = c.authorOtherPostTimes.filter((t) => Math.abs(t.getTime() - c.postedAt.getTime()) <= windowMs).length;
  if (near + 1 >= BOT_RULES.velocityMinCount) out.push("botVelocity");

  if (c.text && wordCount(c.text) >= BOT_RULES.copyPasteMinWords && c.otherVenueTexts.some((t) => textSimilarity(c.text!, t) >= BOT_RULES.copyPasteSimilarity)) {
    out.push("copyPaste");
  }
  if (c.sameDeviceOtherAccounts + 1 >= BOT_RULES.sharedDeviceMinAccounts) out.push("sharedDevice");
  if (c.fillMs !== null && isTooFast(c.fillMs, c.text?.length ?? 0)) out.push("tooFast");
  if (isSpam(c.text)) out.push("spamContent");
  if (c.accountAgeSec !== null && c.accountAgeSec < BOT_RULES.freshAccountSec) out.push("freshAccount");
  return out;
}

/** Trimis prea repede pentru un om: sub 4 secunde, sau mai repede de 15 caractere pe secundă. */
export function isTooFast(fillMs: number, chars: number): boolean {
  return fillMs < BOT_RULES.minFillMs || chars / (fillMs / 1000) > BOT_RULES.humanMaxCharsPerSec;
}

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ru|cn|xyz|top|info|biz|io|shop|click)\b)/iu;
const CONTACT_RE = /(\+?\d[\d\s.-]{8,}\d|[\w.+-]+@[\w-]+\.\w+|whats\s?app|telegram|t\.me\/)/iu;

/** Spam tipic de bot: linkuri, contacte, caractere repetate, text fără vocale sau numai majuscule. */
export function isSpam(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (URL_RE.test(t) || CONTACT_RE.test(t)) return true;
  if (/(.)\1{6,}/u.test(t)) return true; // „!!!!!!!” „aaaaaaa”
  const letters = t.match(/\p{L}/gu) ?? [];
  if (letters.length >= 20) {
    const vowels = t.match(/[aeiouăâîyAEIOUĂÂÎY]/gu)?.length ?? 0;
    if (vowels / letters.length < 0.2) return true; // „xkcdqwrtz…”
    const upper = t.match(/\p{Lu}/gu)?.length ?? 0;
    if (upper / letters.length > 0.8) return true;
  }
  return false;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
