// Regulile jocurilor de la masă (Roata provocărilor, Cine plătește), fără React, ca să fie testate direct.

export const MAX_PLAYERS = 12;
export const MAX_NAME = 20;

type Random = () => number;

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME).trimEnd();
}

/** Pune numele celui logat primul, dacă nu e deja la masă; fără schimbare întoarce aceeași listă. */
export function withMyName(names: readonly string[], me: string | null | undefined): readonly string[] {
  const clean = cleanName(me ?? '');
  if (!clean || names.some((n) => n.toLocaleLowerCase('ro') === clean.toLocaleLowerCase('ro'))) return names;
  return [clean, ...names].slice(0, MAX_PLAYERS);
}

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function wheelLabel(label: string, segments: number): string {
  const max = segments > 8 ? 6 : 10;
  return label.length > max ? label.slice(0, max - 1) + '…' : label;
}

/** Centrul feliei, în grade, în sensul acelor de ceas de la vârf. */
export function segmentCenter(index: number, count: number): number {
  return (index * 360) / count + 180 / count;
}

/** Rotația finală (crescătoare) la care felia `index` ajunge sub indicatorul de sus. */
export function wheelTargetRotation(current: number, index: number, count: number, turns = 5, jitter = 0): number {
  const seg = 360 / count;
  const base = (((360 - segmentCenter(index, count) - (current % 360)) % 360) + 360) % 360;
  return current + turns * 360 + base + jitter * seg;
}

export function wheelIndexAt(rotation: number, count: number): number {
  const angle = (((360 - (rotation % 360)) % 360) + 360) % 360;
  return Math.floor(angle / (360 / count)) % count;
}

export function nextTurn(order: readonly string[], lastId: string | null): string | null {
  if (order.length === 0) return null;
  const idx = lastId === null ? -1 : order.indexOf(lastId);
  return idx < 0 ? order[0] : order[(idx + 1) % order.length];
}

export function parseStoredPlayers(raw: string | null): string[] {
  if (raw === null) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter((v): v is string => typeof v === 'string')
    .map(cleanName)
    .filter(Boolean)
    .slice(0, MAX_PLAYERS);
}

/** Alege provocarea (alta decât `lastId` când se poate) și feliile roții. Doar la apăsare, niciodată la randare. */
export function pickDareRound(
  poolIds: readonly string[],
  lastId: string | null,
  random: Random = Math.random,
): { segmentIds: string[]; targetIndex: number } {
  const distinct = [...new Set(poolIds)];
  if (distinct.length === 0) return { segmentIds: [], targetIndex: 0 };
  const candidates = distinct.length >= 2 ? distinct.filter((id) => id !== lastId) : distinct;
  const target = candidates[Math.floor(random() * candidates.length)];
  const others = shuffle(distinct.filter((id) => id !== target), random).slice(0, Math.min(8, distinct.length) - 1);
  const base = shuffle([target, ...others], random);
  let segmentIds = base;
  while (segmentIds.length < 4) segmentIds = [...segmentIds, ...base];
  return { segmentIds, targetIndex: segmentIds.indexOf(target) };
}

/** Câți pași face evidențierea la Eliminare: minim 6 și se oprește pe `targetIdx` (total % len === targetIdx). */
export function eliminationSteps(len: number, targetIdx: number): number {
  let total = len * 2 + targetIdx;
  while (total < 6) total += len;
  return total;
}

export interface BlackCard {
  cardId: string;
  outcome: 'loser' | 'tip' | 'safe';
  flippedByPlayerId: string | null;
}

export function buildBlackDeck(count: number, random: Random = Math.random): BlackCard[] {
  const outcomes: BlackCard['outcome'][] = ['loser'];
  if (count >= 3) outcomes.push('tip');
  while (outcomes.length < count) outcomes.push('safe');
  const stamp = Date.now();
  return shuffle(outcomes, random).map((outcome, idx) => ({
    cardId: `card-${stamp}-${idx}`,
    outcome,
    flippedByPlayerId: null,
  }));
}

/** Procente inegale: unul ia greul (2 jucători: 65–85%), unul scapă cu 0%, restul împart ce rămâne; suma e mereu 100. */
export function chaosSplit(ids: string[], random: Random = Math.random): { id: string; pct: number }[] {
  if (ids.length < 2) return [];
  const shuffled = shuffle(ids, random);
  const unlucky = shuffled[0];
  const lucky = shuffled[shuffled.length - 1];
  const others = shuffled.slice(1, -1);
  const shares = new Map<string, number>();

  if (others.length === 0) {
    const p1 = 65 + Math.floor(random() * 21);
    shares.set(unlucky, p1);
    shares.set(lucky, 100 - p1);
  } else {
    const unluckyPct = Math.min(75, Math.max(45, 50 + Math.floor(random() * 16)));
    const remaining = 100 - unluckyPct;
    shares.set(unlucky, unluckyPct);
    shares.set(lucky, 0);
    const weights = others.map(() => 1 + random() * 2);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    let allocated = 0;
    others.forEach((id, idx) => {
      // floor (nu round): suma parțială nu depășește restul, deci ultimul ia diferența și rămâne ≥ 1
      const val = idx === others.length - 1 ? remaining - allocated : Math.max(1, Math.floor((weights[idx] / weightSum) * remaining));
      allocated += val;
      shares.set(id, val);
    });
  }
  return ids.map((id) => ({ id, pct: shares.get(id) ?? 0 }));
}

export interface DiceRoll {
  d1: number;
  d2: number;
  total: number;
}

export function rollPair(random: Random = Math.random): DiceRoll {
  const d1 = 1 + Math.floor(random() * 6);
  const d2 = 1 + Math.floor(random() * 6);
  return { d1, d2, total: d1 + d2 };
}

/** Fiecare aruncă 2 zaruri; egalitatea la cel mai mic total se re-aruncă automat (max 12 ori). */
export function rollDice(
  ids: string[],
  random: Random = Math.random,
): { rolls: Record<string, DiceRoll>; loserId: string; hadTie: boolean } {
  const rolls: Record<string, DiceRoll> = {};
  ids.forEach((id) => (rolls[id] = rollPair(random)));
  const minTotal = Math.min(...ids.map((id) => rolls[id].total));
  let lowest = ids.filter((id) => rolls[id].total === minTotal);
  let hadTie = false;
  let guard = 0;
  while (lowest.length > 1 && guard < 12) {
    hadTie = true;
    guard += 1;
    lowest.forEach((id) => (rolls[id] = rollPair(random)));
    const minAmongTied = Math.min(...lowest.map((id) => rolls[id].total));
    lowest = lowest.filter((id) => rolls[id].total === minAmongTied);
  }
  return { rolls, loserId: lowest[0], hadTie };
}
