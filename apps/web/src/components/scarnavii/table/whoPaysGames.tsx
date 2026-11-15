'use client';

// Cele 6 jocuri din „Cine plătește?”: fiecare e o componentă separată, cu timerele ei.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bomb, Dices, Flame, Percent, Shuffle, Spade } from 'lucide-react';
import { DieFace } from './DieFace';
import { SpinWheel, type WheelSegment } from './SpinWheel';
import { StickyAction } from './StickyAction';
import { buildBlackDeck, chaosSplit, eliminationSteps, rollDice, rollPair, type BlackCard, type DiceRoll } from './tableGames';
import type { TableTheme, Tone } from './theme';
import type { TablePlayer } from './useTablePlayers';

export type GameMode = 'roulette' | 'elimination' | 'cards' | 'bomb' | 'dice' | 'chaos';

export interface Verdict {
  loserName: string;
  text: string;
  tipName?: string;
  shares?: { name: string; pct: number }[];
}

interface GameProps {
  players: TablePlayer[];
  theme: TableTheme;
  ready: boolean;
  onVerdict: (v: Verdict) => void;
}

const FUNNY_VERDICTS = [
  'Cardul tău tocmai a devenit vedeta serii.',
  'Restul mesei îți mulțumește din suflet.',
  'Data viitoare sigur nu mai pici tu. Poate.',
  'Onoare și glorie — și o notă întreagă de plată!',
];
const funny = () => FUNNY_VERDICTS[Math.floor(Math.random() * FUNNY_VERDICTS.length)];
const TONES: Tone[] = ['a', 'b', 'c', 'd'];
const PAUSE_MS = 900; // cât se vede rezultatul pe masă înainte de bon
export const btn = 'btn-press rounded-[6px] disabled:opacity-60';

/** Timerele unei runde: se opresc toate la ieșire, la schimbarea jucătorilor (remontare) și la demontare. */
function useTimers() {
  const ids = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    ids.current.forEach((id) => window.clearTimeout(id));
    ids.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  const later = useCallback((fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms));
  }, []);
  return { later, clearTimers };
}

function Roulette({ players, theme, ready, onVerdict }: GameProps) {
  const { later } = useTimers();
  const [spin, setSpin] = useState({ key: 0, target: null as number | null, running: false });
  const n = players.length;
  const segments: WheelSegment[] = ready
    ? players.map((p, i) => ({ id: p.id, label: p.name, tone: n % 2 === 1 && i === n - 1 ? 'c' : i % 2 ? 'a' : 'b' }))
    : TONES.map((tone, i) => ({ id: `gol-${i}`, label: '?', tone }));
  return (
    <>
      <SpinWheel
        segments={segments}
        targetIndex={spin.target}
        spinKey={spin.key}
        theme={theme}
        onDone={(i) => later(() => onVerdict({ loserName: players[i].name, text: funny() }), PAUSE_MS)}
      />
      <StickyAction>
        <button
          type="button"
          disabled={!ready || spin.running}
          onClick={() => setSpin((s) => ({ key: s.key + 1, target: Math.floor(Math.random() * n), running: true }))}
          className={`${btn} ${theme.primary}`}
        >
          {spin.running ? 'Se învârte…' : 'Învârte'}
        </button>
      </StickyAction>
    </>
  );
}

function Elimination({ players, theme, ready, onVerdict }: GameProps) {
  const { later } = useTimers();
  const [safeIds, setSafeIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const saveSomeone = () => {
    const remaining = players.filter((p) => !safeIds.includes(p.id));
    if (running || !ready || remaining.length <= 1) return;
    setRunning(true);
    const targetIdx = Math.floor(Math.random() * remaining.length);
    const totalSteps = eliminationSteps(remaining.length, targetIdx);
    let step = 0;
    const tick = () => {
      const current = remaining[step % remaining.length];
      setActiveId(current.id);
      if (step >= totalSteps) {
        const nextSafe = [...safeIds, current.id];
        setSafeIds(nextSafe);
        setActiveId(null);
        setRunning(false);
        const stillIn = players.filter((p) => !nextSafe.includes(p.id));
        if (stillIn.length === 1) later(() => onVerdict({ loserName: stillIn[0].name, text: funny() }), PAUSE_MS);
        return;
      }
      step += 1;
      later(tick, 60 + Math.round((step / totalSteps) * 140));
    };
    tick();
  };

  const left = players.length - safeIds.length;
  return (
    <>
      <ul className="grid grid-cols-3 gap-3">
        {players.map((p) => {
          const safe = safeIds.includes(p.id);
          const look = p.id === activeId ? theme.seatActive : safe ? theme.seatOut : theme.seat;
          return (
            <li key={p.id} className="relative flex flex-col items-center gap-1">
              <span className={`w-[72px] h-[72px] grid place-items-center rounded-full border-2 font-display text-[30px] ${look}`}>
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="w-full text-center text-[13px] font-semibold truncate">{p.name}</span>
              {safe && (
                <span className="table-stamp absolute top-5 left-1/2 -translate-x-1/2 -rotate-[12deg] border-[3px] border-double rounded-[4px] px-1.5 text-[13px] font-bold uppercase">
                  Scăpat
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <StickyAction>
        <button type="button" disabled={!ready || running || left <= 1} onClick={saveSomeone} className={`${btn} ${theme.primary}`}>
          {running ? 'Se alege…' : 'Salvează pe cineva'}
        </button>
      </StickyAction>
    </>
  );
}

// Spatele suportului: cerc de carton cu marginea zimțată (24 de dinți).
const COASTER_EDGE = Array.from({ length: 48 }, (_, i) => {
  const a = (i * Math.PI) / 24;
  const r = i % 2 ? 45 : 49;
  return `${(50 + r * Math.sin(a)).toFixed(1)},${(50 - r * Math.cos(a)).toFixed(1)}`;
}).join(' ');
const CARD_FACE: Record<BlackCard['outcome'], string> = { loser: 'Nota!', tip: 'Bacșișul (10%)', safe: 'Scapă' };

function BlackCards({ players, theme, ready, onVerdict }: GameProps) {
  const { later } = useTimers();
  const [deck, setDeck] = useState(() => buildBlackDeck(players.length));
  const [turn, setTurn] = useState(0);
  const [over, setOver] = useState(false);
  const tipName = useRef<string | undefined>(undefined);

  const finish = (loser: TablePlayer, text: string) => {
    setOver(true);
    later(() => onVerdict({ loserName: loser.name, text, tipName: tipName.current }), PAUSE_MS);
  };

  const flip = (cardId: string) => {
    const player = players[turn];
    const card = deck.find((c) => c.cardId === cardId);
    if (over || !player || !card || card.flippedByPlayerId) return;
    let next = deck.map((c) => (c.cardId === cardId ? { ...c, flippedByPlayerId: player.id } : c));
    if (card.outcome === 'tip') tipName.current = player.name;
    if (card.outcome === 'loser') {
      setDeck(next);
      finish(player, 'Cartea neagră nu iartă pe nimeni!');
      return;
    }
    // Când rămâne o singură carte, e a ultimului jucător: o întoarcem singuri.
    const unflipped = next.filter((c) => !c.flippedByPlayerId);
    const last = players[turn + 1];
    if (unflipped.length === 1 && last) {
      next = next.map((c) => (c.cardId === unflipped[0].cardId ? { ...c, flippedByPlayerId: last.id } : c));
      if (unflipped[0].outcome === 'tip') tipName.current = last.name;
      if (unflipped[0].outcome === 'loser') finish(last, 'Ultima carte rămasă pe masă a fost cea neagră!');
    }
    setDeck(next);
    setTurn(turn + 1);
  };

  const reshuffle = () => {
    setDeck(buildBlackDeck(players.length));
    setTurn(0);
    tipName.current = undefined;
  };

  if (!ready) return null;
  const holder = players[turn];
  return (
    <>
      {holder && !over && (
        <p className={`rounded-[6px] border-2 px-4 py-3 text-center text-[18px] font-bold ${theme.surfaceRaised}`} aria-live="polite">
          Dă telefonul lui <span className={`font-display text-[24px] ${theme.accent}`}>{holder.name}</span>
        </p>
      )}
      <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {deck.map((c, i) => {
          const by = players.find((p) => p.id === c.flippedByPlayerId);
          const face = c.outcome === 'loser' ? 'scarnavii-card-red' : c.outcome === 'tip' ? 'scarnavii-card-orange' : `border-2 ${theme.seat}`;
          return (
            <li key={c.cardId}>
              <button
                type="button"
                onClick={() => flip(c.cardId)}
                disabled={!!c.flippedByPlayerId || over}
                aria-label={by ? `Suportul ${i + 1}: ${CARD_FACE[c.outcome]} (${by.name})` : `Întoarce suportul ${i + 1}`}
                className="table-flip block w-full aspect-square"
              >
                <span className={`table-flip-inner block w-full h-full ${c.flippedByPlayerId ? 'is-flipped' : ''}`}>
                  <svg viewBox="0 0 100 100" className="table-flip-face w-full h-full" aria-hidden="true">
                    <polygon points={COASTER_EDGE} fill="#B98A5E" />
                    <circle cx="50" cy="50" r="34" fill="none" stroke="#3A2418" strokeWidth="2" strokeDasharray="4 4" />
                    <text x="50" y="51" textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="700" fill="#3A2418">
                      {i + 1}
                    </text>
                  </svg>
                  <span className={`table-flip-face table-flip-front rounded-full grid place-items-center content-center gap-0.5 p-2 text-center ${face}`}>
                    <span className="font-display text-[18px] leading-tight">{CARD_FACE[c.outcome]}</span>
                    {by && <span className="text-[12px] font-semibold truncate max-w-full">{by.name}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!over && (
        <button type="button" onClick={reshuffle} className={`${btn} min-h-12 px-5 border-2 text-[15px] font-semibold ${theme.seat}`}>
          Amestecă din nou
        </button>
      )}
    </>
  );
}

const SHAKE = { calm: 'table-shake-calm', fast: 'table-shake-fast', critical: 'table-shake-critical' } as const;

function TimeBomb({ players, theme, ready, onVerdict }: GameProps) {
  const { later } = useTimers();
  const [holder, setHolder] = useState<number | null>(null);
  const [urgency, setUrgency] = useState<keyof typeof SHAKE>('calm');
  const holderRef = useRef(0);

  const light = () => {
    if (!ready || holder !== null) return;
    const start = Math.floor(Math.random() * players.length);
    const fuseMs = 4500 + Math.floor(Math.random() * 6500); // 4,5–11 s, nu se arată
    holderRef.current = start;
    setHolder(start);
    later(() => setUrgency('fast'), Math.round(fuseMs * 0.45));
    later(() => setUrgency('critical'), Math.round(fuseMs * 0.75));
    later(() => {
      navigator.vibrate?.(200);
      onVerdict({ loserName: players[holderRef.current].name, text: 'Bomba a explodat fix în mâna ta! Nota e a ta.' });
    }, fuseMs);
  };

  const pass = () => {
    if (holder === null) return;
    holderRef.current = (holderRef.current + 1) % players.length;
    setHolder(holderRef.current);
  };

  const next = holder === null ? null : players[(holder + 1) % players.length];
  return (
    <>
      <div className="py-6 flex flex-col items-center gap-5 text-center" aria-live="polite">
        <p className="font-display text-[48px] leading-none break-words max-w-full">{holder === null ? 'Cine o ține?' : players[holder].name}</p>
        <div className={holder === null ? '' : SHAKE[urgency]}>
          <Bomb className={`w-24 h-24 ${theme.accent}`} aria-hidden="true" />
        </div>
      </div>
      <StickyAction>
        {next ? (
          <button type="button" onClick={pass} className={`${btn} min-h-[72px]! text-[20px]! ${theme.primary}`}>
            Pasează la {next.name}
          </button>
        ) : (
          <button type="button" disabled={!ready} onClick={light} className={`${btn} ${theme.primary}`}>
            Aprinde fitilul
          </button>
        )}
      </StickyAction>
    </>
  );
}

function DiceGame({ players, theme, ready, onVerdict }: GameProps) {
  const { later } = useTimers();
  const [rolls, setRolls] = useState<Record<string, DiceRoll>>({});
  const [result, setResult] = useState<{ loserId: string; hadTie: boolean } | null>(null);
  const [running, setRunning] = useState(false);

  const roll = () => {
    if (!ready || running || result) return;
    setRunning(true);
    let frame = 0;
    const animate = () => {
      frame += 1;
      if (frame < 10) {
        setRolls(Object.fromEntries(players.map((p) => [p.id, rollPair()])));
        later(animate, 65);
        return;
      }
      const final = rollDice(players.map((p) => p.id));
      const loser = players.find((p) => p.id === final.loserId)!;
      setRolls(final.rolls);
      setResult({ loserId: final.loserId, hadTie: final.hadTie });
      setRunning(false);
      const text = `Cel mai mic scor de la zaruri (${final.rolls[loser.id].total}) achită masa!`;
      later(() => onVerdict({ loserName: loser.name, text: final.hadTie ? `${text} Egalitatea s-a departajat automat.` : text }), PAUSE_MS * 2);
    };
    animate();
  };

  return (
    <>
      <ul className="space-y-2">
        {players.map((p) => {
          const r = rolls[p.id];
          const lost = result?.loserId === p.id;
          return (
            <li key={p.id} className={`flex items-center gap-3 rounded-[6px] border-2 px-3 py-2 ${lost ? theme.seatActive : theme.surface}`}>
              <span className="flex-1 min-w-0 truncate text-[16px] font-semibold">{p.name}</span>
              <DieFace value={r?.d1 ?? 1} highlight={lost} />
              <DieFace value={r?.d2 ?? 1} highlight={lost} />
              <span className="w-8 text-right font-display text-[24px] tabular-nums">{r ? r.total : '–'}</span>
            </li>
          );
        })}
      </ul>
      {result?.hadTie && <p className={`text-[14px] ${theme.muted}`}>A fost egalitate la cel mai mic scor; am re-aruncat automat.</p>}
      <StickyAction>
        <button type="button" disabled={!ready || running || !!result} onClick={roll} className={`${btn} ${theme.primary}`}>
          {running ? 'Se aruncă…' : 'Aruncă zarurile'}
        </button>
      </StickyAction>
    </>
  );
}

function ChaosGame({ players, theme, ready, onVerdict }: GameProps) {
  const { later } = useTimers();
  const [shares, setShares] = useState<{ id: string; pct: number }[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ids = players.map((p) => p.id);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '';

  const split = () => {
    if (!ready || running || done) return;
    setRunning(true);
    let step = 0;
    const tick = () => {
      const next = chaosSplit(ids);
      setShares(next);
      step += 1;
      if (step < 8) {
        later(tick, 75);
        return;
      }
      setRunning(false);
      setDone(true);
      const top = next.reduce((a, b) => (b.pct > a.pct ? b : a), next[0]);
      later(
        () =>
          onVerdict({
            loserName: nameOf(top.id),
            text: `${nameOf(top.id)} ia greul notei (${top.pct}%), iar cineva de la masă scapă complet gratis!`,
            shares: next.map((s) => ({ name: nameOf(s.id), pct: s.pct })),
          }),
        PAUSE_MS * 2,
      );
    };
    tick();
  };

  const list = shares.length ? shares : ids.map((id) => ({ id, pct: 0 }));
  return (
    <>
      <div className={`rounded-[6px] border-2 p-4 space-y-3 ${theme.surfaceRaised}`}>
        <div className="flex h-10 overflow-hidden rounded-[4px] border border-current/20" aria-hidden="true">
          {shares.map((s, i) => (
            <span key={s.id} className="h-full transition-[width] duration-150" style={{ width: `${s.pct}%`, background: theme.tones[TONES[i % 4]].fill }} />
          ))}
        </div>
        <ul className="space-y-1.5">
          {list.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 text-[16px]">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: theme.tones[TONES[i % 4]].fill }} aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate">{nameOf(s.id)}</span>
              <span className="font-bold tabular-nums">{shares.length === 0 ? '?' : s.pct === 0 ? 'Gratis!' : `${s.pct}%`}</span>
            </li>
          ))}
        </ul>
      </div>
      <StickyAction>
        <button type="button" disabled={!ready || running || done} onClick={split} className={`${btn} ${theme.primary}`}>
          {running ? 'Se împarte…' : 'Împarte nota'}
        </button>
      </StickyAction>
    </>
  );
}

export const GAMES: { id: GameMode; name: string; hint: string; icon: React.ComponentType<{ className?: string }>; Play: React.ComponentType<GameProps> }[] = [
  { id: 'roulette', name: 'Ruleta', hint: 'Roata alege cine plătește.', icon: Shuffle, Play: Roulette },
  { id: 'elimination', name: 'Eliminarea', hint: 'Salvați pe rând; ultimul plătește.', icon: Flame, Play: Elimination },
  { id: 'cards', name: 'Cartea neagră', hint: 'Un suport are nota.', icon: Spade, Play: BlackCards },
  { id: 'bomb', name: 'Bomba', hint: 'Pasați telefonul până explodează.', icon: Bomb, Play: TimeBomb },
  { id: 'dice', name: 'Zarurile', hint: 'Cel mai mic total plătește.', icon: Dices, Play: DiceGame },
  { id: 'chaos', name: 'Haosul', hint: 'Procente la noroc; unul scapă.', icon: Percent, Play: ChaosGame },
];
