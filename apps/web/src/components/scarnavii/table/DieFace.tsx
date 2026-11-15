import React from 'react';

// Pozițiile punctelor pe o față de 40×40, pentru 1–6.
const PIPS: Record<number, [number, number][]> = {
  1: [[20, 20]],
  2: [[12, 12], [28, 28]],
  3: [[12, 12], [20, 20], [28, 28]],
  4: [[12, 12], [28, 12], [12, 28], [28, 28]],
  5: [[12, 12], [28, 12], [20, 20], [12, 28], [28, 28]],
  6: [[12, 11], [28, 11], [12, 20], [28, 20], [12, 29], [28, 29]],
};

/** Zar desenat; hârtie cu puncte cafea, ca să se vadă pe ambele fundaluri. */
export function DieFace({ value, highlight = false }: { value: number; highlight?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" className="shrink-0">
      <rect x="1.5" y="1.5" width="37" height="37" rx="7" fill="#FBF6EA" stroke={highlight ? '#B3261E' : '#B98A5E'} strokeWidth="3" />
      {(PIPS[value] ?? []).map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.6" fill={highlight ? '#B3261E' : '#3A2418'} />
      ))}
    </svg>
  );
}
