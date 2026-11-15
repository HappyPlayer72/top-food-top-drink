'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Flame } from 'lucide-react';
import { Vertical } from '../../types';
import { PASS_PENALTIES, TABLE_DARES, type DareTier } from './table/dares';
import { SpinWheel, prefersReducedMotion, type WheelSegment } from './table/SpinWheel';
import { StickyAction } from './table/StickyAction';
import { TableSeats } from './table/TableSeats';
import { nextTurn, pickDareRound } from './table/tableGames';
import { tableTheme, type TableTheme } from './table/theme';
import { useTablePlayers } from './table/useTablePlayers';

export interface TableDaresMinigameProps {
  vertical: Vertical;
  /** Numele celui logat; intră automat la masă. */
  myName?: string | null;
}

type Intensity = 'all' | DareTier;
type Phase = 'idle' | 'spinning' | 'result' | 'scored';

const TIERS: { id: DareTier; level: number; label: string; tone: WheelSegment['tone'] }[] = [
  { id: 'chill', level: 1, label: 'Cuminte', tone: 'a' },
  { id: 'spicy', level: 2, label: 'Condimentat', tone: 'b' },
  { id: 'chaos', level: 3, label: 'Haotic', tone: 'c' },
];
const tierOf = (id: DareTier) => TIERS.find((t) => t.id === id) ?? TIERS[0];
const dareById = new Map(TABLE_DARES.map((d) => [d.id, d]));

function Peppers({ level, className = '' }: { level: number; className?: string }) {
  return (
    <span className={`inline-flex ${className}`} aria-hidden="true">
      {Array.from({ length: level }, (_, i) => (
        <Flame key={i} className="w-4 h-4 -mx-0.5" fill="currentColor" />
      ))}
    </span>
  );
}

function IntensityPicker({ value, onChange, theme }: { value: Intensity; onChange: (v: Intensity) => void; theme: TableTheme }) {
  const options: { id: Intensity; level: number; label: string }[] = [...TIERS, { id: 'all', level: 0, label: 'Toate' }];
  return (
    <div role="group" aria-label="Cât de picant?" className="space-y-2">
      <h2 className="font-display text-[24px] leading-none">Cât de picant?</h2>
      <div className="grid grid-cols-4 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`btn-press min-h-[60px] rounded-[6px] border-2 flex flex-col items-center justify-center gap-1 px-1 ${value === o.id ? theme.seatActive : theme.seat}`}
          >
            {o.level > 0 ? <Peppers level={o.level} /> : <span className="text-[14px] font-bold leading-4">1–3</span>}
            <span className="text-[12px] font-semibold leading-tight">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const TableDaresMinigame: React.FC<TableDaresMinigameProps> = ({ vertical, myName }) => {
  const theme = tableTheme(vertical);
  const { players, add, rename, remove } = useTablePlayers(myName);
  const [intensity, setIntensity] = useState<Intensity>('all');
  const [round, setRound] = useState<{ segmentIds: string[]; targetIndex: number; spinKey: number; playerId: string | null } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [penalty, setPenalty] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { points: number; passes: number }>>({});
  const lastPlayerId = useRef<string | null>(null);
  const cardTitleRef = useRef<HTMLHeadingElement>(null);

  const pool = useMemo(
    () => TABLE_DARES.filter((d) => (d.vertical === 'both' || d.vertical === vertical) && (intensity === 'all' || d.tier === intensity)),
    [intensity, vertical],
  );

  // Înainte de prima învârtire: primele felii din pool, în ordinea din fișier (fără random la randare).
  const segmentIds = round?.segmentIds ?? pool.slice(0, 8).map((d) => d.id);
  const segments: WheelSegment[] = segmentIds.map((id) => {
    const dare = dareById.get(id)!;
    const tier = tierOf(dare.tier);
    return { id, label: '', marks: tier.level, tone: tier.tone };
  });
  const dare = round && phase !== 'spinning' && phase !== 'idle' ? dareById.get(round.segmentIds[round.targetIndex]) ?? null : null;
  // Dacă jucătorul de la rând a fost scos, provocarea rămâne „pentru cine vrea” și nu se mai punctează.
  const turnPlayer = round?.playerId ? players.find((p) => p.id === round.playerId) ?? null : null;

  useEffect(() => {
    if (phase !== 'result') return;
    cardTitleRef.current?.focus({ preventScroll: true });
    cardTitleRef.current?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [phase, round?.spinKey]);

  const spin = () => {
    if (phase === 'spinning' || pool.length === 0) return;
    const lastDare = round ? round.segmentIds[round.targetIndex] : null;
    const picked = pickDareRound(pool.map((d) => d.id), lastDare);
    const playerId = nextTurn(players.map((p) => p.id), lastPlayerId.current);
    lastPlayerId.current = playerId;
    setRound({ ...picked, spinKey: (round?.spinKey ?? 0) + 1, playerId });
    setPenalty(null);
    setPhase('spinning');
  };

  const mark = (outcome: 'done' | 'pass') => {
    if (phase !== 'result') return;
    if (turnPlayer) {
      setScores((prev) => {
        const s = prev[turnPlayer.id] ?? { points: 0, passes: 0 };
        return { ...prev, [turnPlayer.id]: outcome === 'done' ? { ...s, points: s.points + 1 } : { ...s, passes: s.passes + 1 } };
      });
    }
    if (outcome === 'pass') setPenalty(PASS_PENALTIES[Math.floor(Math.random() * PASS_PENALTIES.length)]);
    setPhase('scored');
  };

  // Clasamentul se construiește din jucătorii de acum, deci scorul celor scoși dispare.
  const board = players
    .map((p) => ({ ...p, ...(scores[p.id] ?? { points: 0, passes: 0 }) }))
    .sort((a, b) => b.points - a.points);
  const leaderPoints = board[0]?.points ?? 0;
  const btn = 'btn-press rounded-[6px] disabled:opacity-60';

  return (
    <div className="space-y-6 pb-4">
      <header className="space-y-1">
        <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">Roata provocărilor</h1>
        <p className={`text-[15px] ${theme.muted}`}>Învârtiți roata cât așteptați comanda.</p>
      </header>

      <div className="space-y-1">
        <TableSeats players={players} theme={theme} min={0} onAdd={add} onRename={rename} onRemove={remove} />
        {players.length === 0 && <p className={`text-[14px] ${theme.muted}`}>Opțional: pe nume, cu scor.</p>}
      </div>

      <IntensityPicker value={intensity} onChange={setIntensity} theme={theme} />

      <SpinWheel segments={segments} targetIndex={round?.targetIndex ?? null} spinKey={round?.spinKey ?? 0} onDone={() => setPhase('result')} theme={theme} />

      <div aria-live="polite">
        {dare && (
          <article className={`stagger-fade-in rounded-[6px] border-2 p-5 space-y-3 ${theme.surfaceRaised}`}>
            <p className={`text-[15px] font-semibold ${theme.accent}`}>{turnPlayer ? `E rândul lui ${turnPlayer.name}` : 'Pentru cine vrea'}</p>
            <h3 ref={cardTitleRef} tabIndex={-1} className="font-display text-[30px] leading-tight outline-none">
              {dare.title}
            </h3>
            <p className="text-[16px] leading-relaxed">{dare.rule}</p>
            <p className={`inline-flex items-center gap-1.5 text-[14px] font-semibold ${theme.muted}`}>
              <Peppers level={tierOf(dare.tier).level} className={theme.accent} />
              {tierOf(dare.tier).label}
            </p>
            {penalty && (
              <p className={`rounded-[4px] border p-3 text-[15px] ${theme.surface}`}>
                <span className="font-bold">Pedeapsă: </span>
                {penalty}.
              </p>
            )}
          </article>
        )}
      </div>

      <StickyAction>
        {phase === 'result' ? (
          <>
            <button type="button" onClick={() => mark('done')} className={`${btn} ${theme.primary}`}>
              {turnPlayer ? 'Am făcut-o! +1' : 'Am făcut-o!'}
            </button>
            <button type="button" onClick={() => mark('pass')} className={`${btn} border-2 ${theme.seat}`}>
              Dau pas
            </button>
          </>
        ) : (
          <button type="button" onClick={spin} disabled={phase === 'spinning' || pool.length === 0} className={`${btn} ${theme.primary}`}>
            {phase === 'spinning' ? 'Se învârte…' : phase === 'scored' ? 'Următoarea provocare' : 'Învârte roata'}
          </button>
        )}
      </StickyAction>

      {board.length > 0 && (
        <section aria-label="Clasamentul mesei" className={`rounded-[6px] border p-4 space-y-2 ${theme.surface}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-[22px] leading-none">Clasamentul mesei</h2>
            <button type="button" onClick={() => setScores({})} className={`min-h-11 px-2 text-[14px] font-semibold underline underline-offset-4 ${theme.muted}`}>
              Ia-o de la zero
            </button>
          </div>
          <ol className="space-y-1">
            {board.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-[15px]">
                {leaderPoints > 0 && p.points === leaderPoints ? (
                  <Crown className={`w-4 h-4 ${theme.accent}`} aria-label="Lider" />
                ) : (
                  <span className="w-4" />
                )}
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-bold tabular-nums">{p.points} p</span>
                {p.passes > 0 && <span className={`text-[13px] ${theme.muted}`}>· {p.passes} pas</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
};
