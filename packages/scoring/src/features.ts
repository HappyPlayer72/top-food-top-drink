/**
 * Întrebări structurate din review (Da / Nu / Nu am observat), declarațiile owner-ului și topurile tematice.
 * Fără acces la DB: aceleași reguli rulează pe server și în browser (importat ca "@tftd/scoring/features").
 * Nu citește nimic din monetizare (regula 1): ordinea topurilor tematice nu depinde de plată.
 */

export type Vertical = "food" | "drink";
export type Theme = "accesibilitate" | "lucru" | "iesiri";
export type Interest = Theme | "mancare";
export type Answer = "yes" | "no" | "not_observed";
export type Declaration = "yes" | "no";
export type TopKey = "general" | Theme;

/** Ce poate alege userul la înregistrare / în profil. Nu întrebăm de dizabilități sau diagnostice. */
export const INTERESTS: { key: Interest; label: string; hint: string }[] = [
  { key: "accesibilitate", label: "Accesibilitate", hint: "Intrare fără trepte, toaletă accesibilă, spațiu între mese" },
  { key: "lucru", label: "Locuri pentru lucru", hint: "Wi-Fi, prize, liniște" },
  { key: "iesiri", label: "Ieșiri și viață de noapte", hint: "Atmosferă, cum te-ai simțit" },
  { key: "mancare", label: "Mâncare și restaurante", hint: "Topul general, după Scorul Onest" },
];
export const INTEREST_KEYS = INTERESTS.map((i) => i.key);

export type Question = {
  key: string;
  theme: Theme;
  /** Eticheta scurtă (dashboard owner, listă de facilități). */
  label: string;
  /** Întrebarea din formularul de review, formulată la fel pentru toți. */
  question: string;
  /** Continuarea frazei „85% dintre clienți spun că …”. */
  claim: string;
  /** Owner-ul poate declara doar fapte verificabile (rampă, Wi-Fi), nu cum se simt clienții. */
  ownerDeclarable: boolean;
};

export const QUESTIONS: Question[] = [
  { key: "intrare_fara_trepte", theme: "accesibilitate", label: "Intrare fără trepte", question: "Intrarea e fără trepte (sau are rampă)?", claim: "intrarea este fără trepte", ownerDeclarable: true },
  { key: "toaleta_accesibila", theme: "accesibilitate", label: "Toaletă accesibilă", question: "Are toaletă accesibilă pentru scaun rulant?", claim: "are toaletă accesibilă", ownerDeclarable: true },
  { key: "spatiu_intre_mese", theme: "accesibilitate", label: "Spațiu între mese", question: "E destul spațiu între mese ca să treci ușor?", claim: "e destul spațiu între mese", ownerDeclarable: true },
  { key: "wifi", theme: "lucru", label: "Wi-Fi", question: "A mers Wi-Fi-ul?", claim: "Wi-Fi-ul merge", ownerDeclarable: true },
  { key: "prize", theme: "lucru", label: "Prize", question: "Ai găsit prize la mese?", claim: "există prize la mese", ownerDeclarable: true },
  { key: "liniste", theme: "lucru", label: "Liniște", question: "E destul de liniște cât să lucrezi?", claim: "e destul de liniște pentru lucru", ownerDeclarable: false },
  // Ieșiri: experiența personală, formulată la fel pentru toți; owner-ul nu o poate declara în locul clienților.
  { key: "atmosfera", theme: "iesiri", label: "Atmosferă", question: "Ți-a plăcut atmosfera?", claim: "le-a plăcut atmosfera", ownerDeclarable: false },
  { key: "siguranta", theme: "iesiri", label: "Siguranță", question: "Te-ai simțit în siguranță în local?", claim: "s-au simțit în siguranță în local", ownerDeclarable: false },
  { key: "revin_cu_prietenii", theme: "iesiri", label: "Revin cu prietenii", question: "Ai fi venit din nou cu prietenii?", claim: "ar veni din nou cu prietenii", ownerDeclarable: false },
];
export const QUESTION_BY_KEY = new Map(QUESTIONS.map((q) => [q.key, q]));
export const THEMES: { key: Theme; label: string }[] = [
  { key: "accesibilitate", label: "Accesibilitate" },
  { key: "lucru", label: "Locuri pentru lucru" },
  { key: "iesiri", label: "Ieșiri" },
];
export const themeQuestions = (theme: Theme) => QUESTIONS.filter((q) => q.theme === theme);
/** Temele care au întrebări (o temă nouă apare automat când îi adaugi întrebări). */
export const activeThemes = () => THEMES.filter((t) => themeQuestions(t.key).length > 0);

/** Pragul de la care afișăm procentul comunității. shortcut: constantă globală; mută-l în config/cities/ dacă orașele vor praguri diferite. */
export const MIN_ANSWERS = 5;
/** Câte întrebări vede userul înainte de „Adaugă alte detalii”. */
export const INITIAL_QUESTIONS = 3;

// ---------- Întrebările din formularul de review ----------

const DEFAULT_QUESTIONS: Record<Vertical, string[]> = {
  food: ["intrare_fara_trepte", "wifi"],
  drink: ["atmosfera", "siguranta"],
};

/** Primele întrebări vin din temele alese de user (pe rând, câte una din fiecare temă); restul stau la „Adaugă alte detalii”. */
export function questionsForReview(interests: readonly string[], vertical: Vertical): { initial: Question[]; more: Question[] } {
  const themes = THEMES.map((t) => t.key).filter((t) => interests.includes(t));
  const pools = themes.map(themeQuestions).filter((p) => p.length);
  const picked: Question[] = [];
  for (let i = 0; picked.length < INITIAL_QUESTIONS && pools.some((p) => i < p.length); i++) {
    for (const pool of pools) if (pool[i] && picked.length < INITIAL_QUESTIONS) picked.push(pool[i]!);
  }
  const initial = picked.length ? picked : DEFAULT_QUESTIONS[vertical].map((k) => QUESTION_BY_KEY.get(k)!).filter(Boolean);
  return { initial, more: QUESTIONS.filter((q) => !initial.includes(q)) };
}

/** Ordinea topurilor pe pagina orașului: întâi ce a ales userul, apoi restul. Nimic nu e ascuns. */
export function orderTops(interests: readonly string[]): TopKey[] {
  const all: TopKey[] = ["general", ...activeThemes().map((t) => t.key)];
  const chosen = (k: TopKey) => interests.includes(k === "general" ? "mancare" : k);
  return [...all.filter(chosen), ...all.filter((k) => !chosen(k))];
}

// ---------- Agregarea răspunsurilor ----------

/** yes/no = numărul brut (pentru procentul afișat și prag); w* = sumele ponderilor (pentru ordine). */
export type QuestionStats = { yes: number; no: number; wYes: number; w: number; w2: number };
export type AnswerRow = { questionKey: string; answer: Answer; weight: number | null };

/** Doar Da/Nu intră în calcul; „Nu am observat” e ignorat. Apelantul trimite doar review-uri publicate. */
export function aggregateAnswers(rows: AnswerRow[]): Map<string, QuestionStats> {
  const out = new Map<string, QuestionStats>();
  for (const r of rows) {
    if (r.answer === "not_observed" || !QUESTION_BY_KEY.has(r.questionKey)) continue;
    const s = out.get(r.questionKey) ?? { yes: 0, no: 0, wYes: 0, w: 0, w2: 0 };
    const w = Math.max(0, r.weight ?? 1);
    if (r.answer === "yes") {
      s.yes++;
      s.wYes += w;
    } else s.no++;
    s.w += w;
    s.w2 += w * w;
    out.set(r.questionKey, s);
  }
  return out;
}

/** Procentul brut afișat: Da / (Da + Nu) × 100. */
export const rawPercent = (s: QuestionStats) => Math.round((s.yes / (s.yes + s.no)) * 100);

export type FeatureStatus =
  | { key: string; label: string; state: "community"; percent: number; text: string }
  | { key: string; label: string; state: "owner"; owner: Declaration; text: string }
  | { key: string; label: string; state: "conflict"; percent: number; owner: Declaration; text: string; ownerText: string }
  | { key: string; label: string; state: "unknown"; text: string };

const ownerText = (v: Declaration) => `Declarat de local: ${v === "yes" ? "Da" : "Nu"}`;

/** Ce afișăm pentru o întrebare: procentul comunității (de la prag), declarația owner-ului sau „Nespecificat”. */
export function featureStatus(q: Question, stats: QuestionStats | undefined, owner: Declaration | undefined): FeatureStatus {
  const n = stats ? stats.yes + stats.no : 0;
  if (stats && n >= MIN_ANSWERS) {
    const percent = rawPercent(stats);
    const text = `${percent}% dintre clienți spun că ${q.claim}`;
    // Contradicție = owner-ul spune Da, majoritatea clienților Nu (sau invers); egalitatea nu e majoritate.
    // Pe numere brute, nu pe procentul rotunjit (101 Da / 100 Nu e majoritate Da, deși se afișează 50%).
    const disagrees = owner && ((owner === "yes" && stats.yes < stats.no) || (owner === "no" && stats.yes > stats.no));
    if (owner && disagrees) return { key: q.key, label: q.label, state: "conflict", percent, owner, text, ownerText: ownerText(owner) };
    return { key: q.key, label: q.label, state: "community", percent, text };
  }
  if (owner) return { key: q.key, label: q.label, state: "owner", owner, text: ownerText(owner) };
  return { key: q.key, label: q.label, state: "unknown", text: "Nespecificat" };
}

// ---------- Topurile tematice ----------

/**
 * Limita de jos a intervalului Wilson (95%) pentru procentul de Da.
 * n = numărul efectiv de răspunsuri (Kish: (Σw)² / Σw²), ca ponderile să nu umfle certitudinea.
 */
export function wilsonLower(p: number, n: number, z = 1.96): number {
  if (n <= 0) return 0;
  const z2 = z * z;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return Math.max(0, (center - margin) / (1 + z2 / n));
}

export function questionLowerBound(s: QuestionStats | undefined): number {
  if (!s || s.w <= 0) return 0;
  return wilsonLower(s.wYes / s.w, (s.w * s.w) / s.w2);
}

/** Scorul temei = media limitelor Wilson pe toate întrebările temei; o întrebare fără răspunsuri contează 0. */
export function themeScore(theme: Theme, stats: Map<string, QuestionStats>) {
  const qs = themeQuestions(theme);
  const score = qs.reduce((sum, q) => sum + questionLowerBound(stats.get(q.key)), 0) / qs.length;
  const answers = qs.reduce((sum, q) => sum + (stats.get(q.key)?.yes ?? 0) + (stats.get(q.key)?.no ?? 0), 0);
  const eligible = qs.some((q) => (stats.get(q.key)?.yes ?? 0) + (stats.get(q.key)?.no ?? 0) >= MIN_ANSWERS);
  return { score, answers, eligible };
}

export type ThemeCandidate = {
  id: string;
  name: string;
  honestScore: number | null;
  stats: Map<string, QuestionStats>;
  declarations: Map<string, Declaration>;
};

/**
 * Două grupe, niciodată amestecate:
 * 1. „Evaluat de comunitate”: cel puțin o întrebare a temei are ≥ MIN_ANSWERS răspunsuri Da/Nu; după scorul temei.
 * 2. „Declarat de local”: restul, cu cel puțin un Da declarat de owner în temă; după numărul de Da, apoi Scorul Onest.
 */
export function rankTheme<T extends ThemeCandidate>(theme: Theme, venues: T[]) {
  const byHonest = (a: T, b: T) => (b.honestScore ?? 0) - (a.honestScore ?? 0) || a.name.localeCompare(b.name, "ro");
  const scored = venues.map((v) => ({ venue: v, ...themeScore(theme, v.stats) }));
  const community = scored
    .filter((s) => s.eligible)
    .sort((a, b) => b.score - a.score || b.answers - a.answers || byHonest(a.venue, b.venue));
  const declarable = themeQuestions(theme).filter((q) => q.ownerDeclarable);
  const declared = scored
    .filter((s) => !s.eligible)
    .map((s) => ({ ...s, declaredYes: declarable.filter((q) => s.venue.declarations.get(q.key) === "yes").length }))
    .filter((s) => s.declaredYes > 0)
    .sort((a, b) => b.declaredYes - a.declaredYes || byHonest(a.venue, b.venue));
  return { community, declared };
}
