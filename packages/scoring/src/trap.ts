/**
 * Tourist Trap Index, 0–100 (docs/ARHITECTURA.md → Scoring → 3).
 * Fiecare semnal dă puncte până la ponderea lui; motivele se afișează la „De ce?”.
 */
export type TrapInput = {
  localsScore: number | null;
  touristsScore: number | null;
  /** Distanța până la cea mai apropiată zonă turistică, în metri (null = necunoscută). */
  distanceToTouristZoneM: number | null;
  /** Prețul localului împărțit la media locală pe aceeași categorie (1,6 = +60%). */
  priceRatio: number | null;
  /** 0–1 */
  foreignLanguageShare: number;
  /** 0–1: autori cu o singură vizită care nu revin. */
  oneTimeVisitorShare: number;
};

export type TrapReason = { signal: TrapSignal; value: number; points: number; text: string };
export type TrapSignal = "gap" | "proximity" | "price" | "foreignLanguage" | "oneTimeVisitors";
export type TrapResult = { index: number; level: "none" | "possible" | "trap"; reasons: TrapReason[] };

export const TRAP_WEIGHTS: Record<TrapSignal, number> = {
  gap: 30,
  proximity: 20,
  price: 20,
  foreignLanguage: 15,
  oneTimeVisitors: 15,
};
export const POSSIBLE_TRAP = 60;
export const TRAP = 80;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 la `from`, 1 la `to`, liniar între ele. */
const ramp = (x: number, from: number, to: number) => clamp01((x - from) / (to - from));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const fmt = (x: number) => x.toFixed(1).replace(".", ",");

export function touristTrapIndex(input: TrapInput): TrapResult {
  const reasons: TrapReason[] = [];
  const add = (signal: TrapSignal, value: number, share: number, text: string) => {
    const points = Math.round(TRAP_WEIGHTS[signal] * share * 10) / 10;
    if (points > 0) reasons.push({ signal, value, points, text });
  };

  if (input.localsScore != null && input.touristsScore != null) {
    const gap = input.touristsScore - input.localsScore;
    // 3 puncte diferență sau mai mult = punctaj maxim
    add("gap", gap, ramp(gap, 0.5, 3), `Turiștii îi dau ${fmt(input.touristsScore)}, localnicii ${fmt(input.localsScore)}.`);
  }
  if (input.distanceToTouristZoneM != null) {
    const d = input.distanceToTouristZoneM;
    // sub 300 m = maxim, peste 800 m = 0
    add("proximity", d, 1 - ramp(d, 300, 800), `La ${Math.round(d)} m de o zonă turistică.`);
  }
  if (input.priceRatio != null) {
    const r = input.priceRatio;
    // +60% față de medie = maxim
    add("price", r, ramp(r, 1.05, 1.6), `Prețuri cu ${pct(r - 1)} peste media locală pe aceeași categorie.`);
  }
  add(
    "foreignLanguage",
    input.foreignLanguageShare,
    ramp(input.foreignLanguageShare, 0.15, 0.7),
    `${pct(input.foreignLanguageShare)} din review-uri sunt în limbi străine.`,
  );
  add(
    "oneTimeVisitors",
    input.oneTimeVisitorShare,
    ramp(input.oneTimeVisitorShare, 0.3, 0.8),
    `${pct(input.oneTimeVisitorShare)} dintre clienți nu revin.`,
  );

  const index = Math.round(reasons.reduce((s, r) => s + r.points, 0));
  const level = index >= TRAP ? "trap" : index >= POSSIBLE_TRAP ? "possible" : "none";
  reasons.sort((a, b) => b.points - a.points);
  return { index, level, reasons };
}
