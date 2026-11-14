'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Bomb,
  Crown,
  Dices,
  Flame,
  Percent,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Spade,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { Vertical } from '../../types';

export interface WhoPaysMinigameProps {
  vertical: Vertical;
}

interface Player {
  id: string;
  name: string;
}

type GameMode =
  | 'roulette'
  | 'elimination'
  | 'cards'
  | 'bomb'
  | 'dice'
  | 'chaos-split';

interface BlackCardItem {
  cardId: string;
  outcome: 'loser' | 'tip' | 'safe';
  flippedByPlayerId: string | null;
}

interface DiceRollResult {
  d1: number;
  d2: number;
  total: number;
}

interface ChaosShare {
  playerId: string;
  pct: number;
}

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p-1', name: 'Andreea' },
  { id: 'p-2', name: 'Radu' },
  { id: 'p-3', name: 'Elena' },
];

const DEMO_EXTRA_NAMES = ['Matei', 'Ioana', 'Vlad', 'Mara'];

const FUNNY_VERDICTS = [
  'Cardul tău tocmai a devenit vedeta serii.',
  'Restul mesei îți mulțumește din suflet.',
  'Data viitoare sigur nu mai pici tu. Poate.',
  'Onoare și glorie — și o notă întreagă de plată!',
];

const MODE_OPTIONS: {
  id: GameMode;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'roulette',
    label: 'Ruleta Notei',
    hint: 'Învârte direct și pică pe cine achită nota.',
    icon: Shuffle,
  },
  {
    id: 'elimination',
    label: 'Eliminare',
    hint: 'Salvează pe rând câte o persoană — ultimul rămas plătește.',
    icon: Flame,
  },
  {
    id: 'cards',
    label: 'Cartea Neagră',
    hint: 'Cărți întoarse pe masă: una are nota, restul scapă.',
    icon: Spade,
  },
  {
    id: 'bomb',
    label: 'Bomba cu Ceas',
    hint: 'Pasează telefonul rapid — la cine explodează, plătește!',
    icon: Bomb,
  },
  {
    id: 'dice',
    label: 'Barbut (2 Zaruri)',
    hint: 'Fiecare aruncă 2d6 — cel mai mic scor achită nota.',
    icon: Dices,
  },
  {
    id: 'chaos-split',
    label: 'Împărțire Haotică %',
    hint: 'Procente inegale la noroc: cineva scapă cu 0%, altcineva ia greul.',
    icon: Percent,
  },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildBlackDeck(count: number): BlackCardItem[] {
  const outcomes: ('loser' | 'tip' | 'safe')[] = ['loser'];
  if (count >= 3) {
    outcomes.push('tip');
  }
  while (outcomes.length < count) {
    outcomes.push('safe');
  }
  return shuffleArray(outcomes).map((outcome, idx) => ({
    cardId: `card-${Date.now()}-${idx}`,
    outcome,
    flippedByPlayerId: null,
  }));
}

function generateChaosSplit(players: Player[]): ChaosShare[] {
  if (players.length < 2) return [];
  const shuffled = shuffleArray(players);
  const unlucky = shuffled[0];
  const lucky = shuffled[shuffled.length - 1];
  const others = shuffled.slice(1, -1);

  const unluckyPct = Math.min(75, Math.max(45, 50 + Math.floor(Math.random() * 16)));
  const remaining = 100 - unluckyPct;

  const shares = new Map<string, number>();
  shares.set(unlucky.id, unluckyPct);
  shares.set(lucky.id, 0);

  if (others.length === 0) {
    // 2 players: unlucky gets 70-85%, lucky gets remainder (or 0% if 100%)
    const p1 = 65 + Math.floor(Math.random() * 21);
    shares.set(unlucky.id, p1);
    shares.set(lucky.id, 100 - p1);
  } else {
    const weights = others.map(() => 1 + Math.random() * 2);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    let allocated = 0;
    others.forEach((p, idx) => {
      if (idx === others.length - 1) {
        shares.set(p.id, Math.max(1, remaining - allocated));
      } else {
        const val = Math.max(1, Math.round((weights[idx] / weightSum) * remaining));
        allocated += val;
        shares.set(p.id, val);
      }
    });
  }

  return players.map((p) => ({
    playerId: p.id,
    pct: shares.get(p.id) ?? 0,
  }));
}

export const WhoPaysMinigame: React.FC<WhoPaysMinigameProps> = ({
  vertical,
}) => {
  const isDrink = vertical === 'drink';

  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [mode, setMode] = useState<GameMode>('roulette');

  const [isRunning, setIsRunning] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [safeIds, setSafeIds] = useState<string[]>([]);
  const [loser, setLoser] = useState<Player | null>(null);
  const [verdictText, setVerdictText] = useState<string>('');

  // Mode 3: Cartea Neagră
  const [cardsDeck, setCardsDeck] = useState<BlackCardItem[]>([]);
  const [cardTurnIndex, setCardTurnIndex] = useState<number>(0);
  const [tipPayer, setTipPayer] = useState<Player | null>(null);

  // Mode 4: Bomba cu Ceas
  const [bombActive, setBombActive] = useState(false);
  const [bombHolderIdx, setBombHolderIdx] = useState(0);
  const [bombPasses, setBombPasses] = useState(0);
  const [bombUrgency, setBombUrgency] = useState<'calm' | 'fast' | 'critical'>('calm');

  // Mode 5: Barbut (2 Zaruri)
  const [diceResults, setDiceResults] = useState<Record<string, DiceRollResult>>({});
  const [diceTieNote, setDiceTieNote] = useState<string | null>(null);

  // Mode 6: Împărțire Haotică %
  const [chaosShares, setChaosShares] = useState<ChaosShare[]>([]);

  const timerRef = useRef<number | null>(null);
  const bombFuseTimeoutRef = useRef<number | null>(null);
  const bombPhaseTimersRef = useRef<number[]>([]);
  const bombHolderRef = useRef<number>(0);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (bombFuseTimeoutRef.current !== null) {
      window.clearTimeout(bombFuseTimeoutRef.current);
      bombFuseTimeoutRef.current = null;
    }
    bombPhaseTimersRef.current.forEach((id) => window.clearTimeout(id));
    bombPhaseTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const pickFunnyVerdict = () =>
    FUNNY_VERDICTS[Math.floor(Math.random() * FUNNY_VERDICTS.length)];

  const resetRound = () => {
    clearTimers();
    setIsRunning(false);
    setActivePlayerId(null);
    setSafeIds([]);
    setLoser(null);
    setVerdictText('');
    setCardsDeck([]);
    setCardTurnIndex(0);
    setTipPayer(null);
    setBombActive(false);
    setBombHolderIdx(0);
    setBombPasses(0);
    setBombUrgency('calm');
    setDiceResults({});
    setDiceTieNote(null);
    setChaosShares([]);
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed || players.length >= 12) return;
    setPlayers((prev) => [
      ...prev,
      { id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: trimmed },
    ]);
    setNewPlayerName('');
    resetRound();
  };

  const handleAddDemoGroup = () => {
    if (isRunning || bombActive) return;
    const existingLower = new Set(players.map((p) => p.name.toLowerCase()));
    const toAdd = DEMO_EXTRA_NAMES.filter(
      (n) => !existingLower.has(n.toLowerCase())
    )
      .slice(0, Math.max(0, 12 - players.length))
      .map((name, idx) => ({
        id: `p-demo-${Date.now()}-${idx}`,
        name,
      }));
    if (toAdd.length === 0) return;
    setPlayers((prev) => [...prev, ...toAdd]);
    resetRound();
  };

  const handleResetPlayers = () => {
    if (isRunning || bombActive) return;
    setPlayers(DEFAULT_PLAYERS);
    resetRound();
  };

  const handleRemovePlayer = (id: string) => {
    if (isRunning || bombActive) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    resetRound();
  };

  // 1. Roulette
  const startRoulette = () => {
    if (isRunning || players.length < 2) return;
    resetRound();
    setIsRunning(true);

    const winnerIdx = Math.floor(Math.random() * players.length);
    const totalSteps = players.length * 3 + winnerIdx;
    let step = 0;

    const tick = () => {
      const current = players[step % players.length];
      setActivePlayerId(current.id);

      if (step >= totalSteps) {
        setIsRunning(false);
        setLoser(current);
        setVerdictText(pickFunnyVerdict());
        return;
      }

      step += 1;
      const progress = step / totalSteps;
      const delay = 55 + Math.round(progress * progress * 220);
      timerRef.current = window.setTimeout(tick, delay);
    };

    tick();
  };

  // 2. Elimination
  const runEliminationStep = () => {
    if (isRunning || players.length < 2) return;
    const remaining = players.filter((p) => !safeIds.includes(p.id));
    if (remaining.length <= 1) return;

    setIsRunning(true);
    let step = 0;
    const targetIdx = Math.floor(Math.random() * remaining.length);
    const totalSteps = Math.max(6, remaining.length * 2 + targetIdx);

    const tick = () => {
      const current = remaining[step % remaining.length];
      setActivePlayerId(current.id);

      if (step >= totalSteps) {
        const nextSafe = [...safeIds, current.id];
        setSafeIds(nextSafe);
        setActivePlayerId(null);
        setIsRunning(false);

        const stillIn = players.filter((p) => !nextSafe.includes(p.id));
        if (stillIn.length === 1) {
          setLoser(stillIn[0]);
          setVerdictText(pickFunnyVerdict());
        }
        return;
      }

      step += 1;
      const delay = 60 + Math.round((step / totalSteps) * 140);
      timerRef.current = window.setTimeout(tick, delay);
    };

    tick();
  };

  // 3. Cartea Neagră
  const startCardsRound = () => {
    if (players.length < 2) return;
    resetRound();
    setCardsDeck(buildBlackDeck(players.length));
    setCardTurnIndex(0);
  };

  const handleFlipCard = (cardId: string) => {
    if (loser) return;
    const currentPlayer = players[cardTurnIndex];
    if (!currentPlayer) return;

    const target = cardsDeck.find((c) => c.cardId === cardId);
    if (!target || target.flippedByPlayerId) return;

    const updatedDeck = cardsDeck.map((c) =>
      c.cardId === cardId ? { ...c, flippedByPlayerId: currentPlayer.id } : c
    );
    setCardsDeck(updatedDeck);

    if (target.outcome === 'tip') {
      setTipPayer(currentPlayer);
    }

    if (target.outcome === 'loser') {
      setLoser(currentPlayer);
      setVerdictText('Cartea neagră nu iartă pe nimeni!');
      return;
    }

    const nextIdx = cardTurnIndex + 1;
    setCardTurnIndex(nextIdx);
    // If only 1 unflipped card remains, auto-reveal it for the last player
    const unflipped = updatedDeck.filter((c) => !c.flippedByPlayerId);
    if (unflipped.length === 1 && players[nextIdx]) {
      const lastPlayer = players[nextIdx];
      const finalCard = unflipped[0];
      const revealedAll = updatedDeck.map((c) =>
        c.cardId === finalCard.cardId
          ? { ...c, flippedByPlayerId: lastPlayer.id }
          : c
      );
      setCardsDeck(revealedAll);
      if (finalCard.outcome === 'loser') {
        setLoser(lastPlayer);
        setVerdictText('Ultima carte rămasă pe masă a fost cea neagră!');
      } else if (finalCard.outcome === 'tip') {
        setTipPayer(lastPlayer);
      }
    }
  };

  // 4. Bomba cu Ceas
  const startBombGame = () => {
    if (players.length < 2 || bombActive) return;
    resetRound();

    const startIdx = Math.floor(Math.random() * players.length);
    const fuseMs = 4500 + Math.floor(Math.random() * 6500); // 4.5s – 11s
    bombHolderRef.current = startIdx;

    setBombActive(true);
    setBombHolderIdx(startIdx);
    setActivePlayerId(players[startIdx].id);
    setBombPasses(0);
    setBombUrgency('calm');

    const fastTimer = window.setTimeout(
      () => setBombUrgency('fast'),
      Math.round(fuseMs * 0.45)
    );
    const critTimer = window.setTimeout(
      () => setBombUrgency('critical'),
      Math.round(fuseMs * 0.75)
    );
    bombPhaseTimersRef.current = [fastTimer, critTimer];

    bombFuseTimeoutRef.current = window.setTimeout(() => {
      const explodedIdx = bombHolderRef.current % players.length;
      const victim = players[explodedIdx];
      setBombActive(false);
      setActivePlayerId(null);
      setLoser(victim);
      setVerdictText('Bomba a explodat fix în mâna ta! Nota e a ta.');
    }, fuseMs);
  };

  const passBomb = () => {
    if (!bombActive || players.length < 2) return;
    const nextIdx = (bombHolderRef.current + 1) % players.length;
    bombHolderRef.current = nextIdx;
    setBombHolderIdx(nextIdx);
    setActivePlayerId(players[nextIdx].id);
    setBombPasses((c) => c + 1);
  };

  // 5. Barbut (2 Zaruri)
  const rollDiceRound = () => {
    if (isRunning || players.length < 2) return;
    resetRound();
    setIsRunning(true);

    let step = 0;
    const totalFrames = 10;

    const animateRoll = () => {
      const temp: Record<string, DiceRollResult> = {};
      players.forEach((p) => {
        const d1 = 1 + Math.floor(Math.random() * 6);
        const d2 = 1 + Math.floor(Math.random() * 6);
        temp[p.id] = { d1, d2, total: d1 + d2 };
      });
      setDiceResults(temp);
      step += 1;

      if (step < totalFrames) {
        timerRef.current = window.setTimeout(animateRoll, 65);
        return;
      }

      // Final roll + deterministic tie-break among lowest scorers
      const finalRolls: Record<string, DiceRollResult> = { ...temp };
      const getMinIds = (rolls: Record<string, DiceRollResult>) => {
        const minVal = Math.min(...players.map((p) => rolls[p.id].total));
        return players.filter((p) => rolls[p.id].total === minVal);
      };

      let lowest = getMinIds(finalRolls);
      let tieResolved = false;
      let guard = 0;
      while (lowest.length > 1 && guard < 12) {
        tieResolved = true;
        guard += 1;
        lowest.forEach((p) => {
          const d1 = 1 + Math.floor(Math.random() * 6);
          const d2 = 1 + Math.floor(Math.random() * 6);
          finalRolls[p.id] = { d1, d2, total: d1 + d2 };
        });
        const minAmongTied = Math.min(...lowest.map((p) => finalRolls[p.id].total));
        lowest = lowest.filter((p) => finalRolls[p.id].total === minAmongTied);
      }

      // Ultimate fallback if 12 ties occurred
      const finalLoser = lowest[0];
      setDiceResults(finalRolls);
      setIsRunning(false);
      setLoser(finalLoser);
      setDiceTieNote(
        tieResolved
          ? 'A fost egalitate la cel mai mic scor — am relansat automat pentru departajare!'
          : null
      );
      setVerdictText(
        `Cel mai mic scor de la barbut (${finalRolls[finalLoser.id].total}) achită masa!`
      );
    };

    animateRoll();
  };

  // 6. Împărțire Haotică %
  const startChaosSplit = () => {
    if (isRunning || players.length < 2) return;
    resetRound();
    setIsRunning(true);

    let step = 0;
    const tick = () => {
      setChaosShares(generateChaosSplit(players));
      step += 1;
      if (step < 7) {
        timerRef.current = window.setTimeout(tick, 75);
        return;
      }
      const finalShares = generateChaosSplit(players);
      setChaosShares(finalShares);
      setIsRunning(false);
      const maxShare = finalShares.reduce((a, b) => (b.pct > a.pct ? b : a), finalShares[0]);
      const heaviestPayer = players.find((p) => p.id === maxShare.playerId) ?? null;
      if (heaviestPayer) {
        setLoser(heaviestPayer);
        setVerdictText(
          `${heaviestPayer.name} ia greul notei (${maxShare.pct}%), iar cineva de la masă scapă complet gratis!`
        );
      }
    };

    tick();
  };

  const parsedBill = Number(billAmount);
  const hasBill = !Number.isNaN(parsedBill) && parsedBill > 0;
  const activeModeMeta = MODE_OPTIONS.find((m) => m.id === mode) ?? MODE_OPTIONS[0];
  const cardCurrentPlayer = players[cardTurnIndex];

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Receipt
            className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}
          />
          <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">
            Cine plătește toată masa?
          </h1>
        </div>
        <p
          className={`text-[13px] sm:text-[14px] ${
            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
          }`}
        >
          Adaugă persoanele de la masă și alege din cele 6 moduri de joc pentru
          a decide cine achită nota.
        </p>
      </div>

      {/* Mode Switch & Optional Bill */}
      <div
        className={`rounded-[6px] border p-4 space-y-4 ${
          isDrink
            ? 'bg-[#143025] border-[#285443]'
            : 'bg-[#FAF8F5] border-[#E6DFD5]'
        }`}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
              Mod de joc ({MODE_OPTIONS.length} opțiuni)
            </span>
            <div className="flex items-center gap-2">
              <label
                htmlFor="bill-amount-input"
                className="text-[12px] font-semibold opacity-80"
              >
                Notă (opțional):
              </label>
              <input
                id="bill-amount-input"
                type="number"
                min="1"
                placeholder="ex. 240"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className={`w-24 px-2.5 py-1.5 rounded-[4px] border text-[13px] tabular-nums focus:outline-none ${
                  isDrink
                    ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder-[#F4EEE2]/40'
                    : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder-[#8C7B70]'
                }`}
              />
              <span className="text-[12px] opacity-70">lei</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isRunning || bombActive}
                  onClick={() => {
                    setMode(opt.id);
                    resetRound();
                  }}
                  className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border disabled:opacity-50 ${
                    active
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'border-[#2D5947] text-[#F4EEE2]/80 hover:border-[#F2A33A]/60'
                      : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <p
            className={`text-[12px] ${
              isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
            }`}
          >
            {activeModeMeta.hint}
          </p>
        </div>

        {/* Add player form & Quick presets */}
        <div className="space-y-2">
          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Nume persoană la masă..."
              aria-label="Nume persoană la masă"
              disabled={isRunning || bombActive}
              className={`flex-1 px-3 py-2 rounded-[4px] border text-[13px] focus:outline-none ${
                isDrink
                  ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder-[#F4EEE2]/45 focus:border-[#F2A33A]'
                  : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder-[#8C7B70] focus:border-[#3A2418]'
              }`}
            />
            <button
              type="submit"
              disabled={
                !newPlayerName.trim() ||
                isRunning ||
                bombActive ||
                players.length >= 12
              }
              className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] text-[13px] font-bold disabled:opacity-45 ${
                isDrink
                  ? 'bg-[#1E4335] border border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'bg-[#3A2418] text-white hover:opacity-90'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Adaugă</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isRunning || bombActive || players.length >= 12}
              onClick={handleAddDemoGroup}
              className={`btn-press inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] border text-[11px] font-semibold disabled:opacity-45 ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2]/80 hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#6E5649] hover:text-[#3A2418]'
              }`}
            >
              <UserPlus className="w-3 h-3" />
              <span>+ Gașcă (4 prieteni)</span>
            </button>

            {players.length !== DEFAULT_PLAYERS.length && (
              <button
                type="button"
                disabled={isRunning || bombActive}
                onClick={handleResetPlayers}
                className={`btn-press inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] border text-[11px] font-semibold disabled:opacity-45 ${
                  isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2]/80 hover:border-[#F2A33A]'
                    : 'border-[#D6CFC5] text-[#6E5649] hover:text-[#3A2418]'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resetează masa</span>
              </button>
            )}
          </div>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {players.map((p) => {
            const isHighlighted = activePlayerId === p.id;
            const isSafe = safeIds.includes(p.id);
            const isLoser = loser?.id === p.id;
            const dice = diceResults[p.id];
            const chaos = chaosShares.find((c) => c.playerId === p.id);

            return (
              <div
                key={p.id}
                className={`relative rounded-[4px] border px-3 py-2.5 flex items-center justify-between gap-2 transition-all duration-150 ${
                  isLoser
                    ? isDrink
                      ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A] font-bold scale-[1.02]'
                      : 'bg-[#B3261E] text-white border-[#B3261E] font-bold scale-[1.02]'
                    : isHighlighted
                    ? isDrink
                      ? 'bg-[#F2A33A]/25 border-[#F2A33A] text-[#F4EEE2]'
                      : 'bg-[#B3261E]/15 border-[#B3261E] text-[#3A2418]'
                    : isSafe
                    ? isDrink
                      ? 'bg-[#122B22]/50 border-[#285443] text-[#F4EEE2]/40 line-through'
                      : 'bg-[#F2EFE9]/60 border-[#E6DFD5] text-[#6E5649]/50 line-through'
                    : isDrink
                    ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                    : 'bg-white border-[#D6CFC5] text-[#3A2418]'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold">
                    {p.name}
                  </div>
                  {dice && mode === 'dice' && (
                    <div className="text-[11px] tabular-nums opacity-85">
                      [{dice.d1}] + [{dice.d2}] = <strong>{dice.total}</strong>
                    </div>
                  )}
                  {chaos && mode === 'chaos-split' && (
                    <div className="text-[11px] tabular-nums opacity-90">
                      <strong>{chaos.pct}%</strong>
                      {chaos.pct === 0 ? ' (Gratis!)' : ''}
                      {hasBill && chaos.pct > 0
                        ? ` · ${Math.round((parsedBill * chaos.pct) / 100)} lei`
                        : ''}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isSafe && (
                    <span className="text-[10px] font-bold uppercase no-underline opacity-80">
                      Scăpat
                    </span>
                  )}
                  {isLoser && <Crown className="w-4 h-4" />}
                  {!isRunning && !bombActive && players.length > 2 && !loser && (
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(p.id)}
                      aria-label={`Elimină ${p.name}`}
                      className="p-1 opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {players.length < 2 && (
          <p className="text-[12px] text-[#B3261E] font-medium">
            Adaugă cel puțin 2 persoane ca să poți juca.
          </p>
        )}

        {/* Mode-specific Play Area */}
        {mode === 'cards' && cardsDeck.length > 0 && (
          <div className="space-y-2.5 pt-1">
            {!loser && cardCurrentPlayer && (
              <div className="text-[13px] font-semibold">
                Rândul lui{' '}
                <span className={isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}>
                  {cardCurrentPlayer.name}
                </span>{' '}
                — întoarce un suport de pe masă:
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {cardsDeck.map((card, idx) => {
                const flippedPlayer = players.find(
                  (p) => p.id === card.flippedByPlayerId
                );
                const isRevealed = Boolean(flippedPlayer);
                return (
                  <button
                    key={card.cardId}
                    type="button"
                    disabled={isRevealed || Boolean(loser)}
                    onClick={() => handleFlipCard(card.cardId)}
                    className={`btn-press rounded-[6px] border p-3 text-left min-h-[76px] flex flex-col justify-between transition-all ${
                      !isRevealed
                        ? isDrink
                          ? 'bg-[#1E4335] border-[#B98A5E] text-[#F4EEE2] hover:border-[#F2A33A]'
                          : 'bg-white border-[#B98A5E] text-[#3A2418] hover:border-[#B3261E]'
                        : card.outcome === 'loser'
                        ? 'bg-[#B3261E] border-[#B3261E] text-white'
                        : card.outcome === 'tip'
                        ? 'bg-[#E0A526] border-[#E0A526] text-[#3A2418]'
                        : isDrink
                        ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/70'
                        : 'bg-[#F2EFE9] border-[#E6DFD5] text-[#6E5649]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide">
                      <span>Cartea #{idx + 1}</span>
                      {!isRevealed ? (
                        <Spade className="w-3.5 h-3.5 opacity-70" />
                      ) : card.outcome === 'loser' ? (
                        <Crown className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="text-[13px] font-bold pt-1">
                      {!isRevealed
                        ? 'Atinge să întorci'
                        : card.outcome === 'loser'
                        ? `${flippedPlayer?.name}: Achită nota!`
                        : card.outcome === 'tip'
                        ? `${flippedPlayer?.name}: Doar bacșiș (10%)`
                        : `${flippedPlayer?.name}: Scăpat!`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'bomb' && bombActive && (
          <div
            className={`rounded-[6px] border p-4 space-y-3 text-center ${
              bombUrgency === 'critical'
                ? 'bg-[#B3261E] border-[#B3261E] text-white'
                : bombUrgency === 'fast'
                ? 'bg-[#E0A526] border-[#E0A526] text-[#3A2418]'
                : isDrink
                ? 'bg-[#17382C] border-[#F2A33A] text-[#F4EEE2]'
                : 'bg-white border-[#B3261E] text-[#3A2418]'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-wider">
              <Bomb className="w-4 h-4 animate-bounce" />
              <span>
                {bombUrgency === 'critical'
                  ? 'Ticăie foarte tare! Pasează acum!'
                  : bombUrgency === 'fast'
                  ? 'Se încinge fitilul — pasează!'
                  : 'Bomba e pornită — pasează telefonul!'}
              </span>
            </div>
            <div className="font-display text-[28px] leading-tight">
              În mâna lui: {players[bombHolderIdx]?.name}
            </div>
            <button
              type="button"
              onClick={passBomb}
              className={`btn-press w-full sm:w-auto px-6 py-3 rounded-[4px] font-bold text-[15px] ${
                bombUrgency === 'critical'
                  ? 'bg-white text-[#B3261E]'
                  : isDrink
                  ? 'bg-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] text-white'
              }`}
            >
              Pasează bomba la {players[(bombHolderIdx + 1) % players.length]?.name} ({bombPasses})
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {mode === 'roulette' && (
            <button
              type="button"
              onClick={startRoulette}
              disabled={isRunning || players.length < 2}
              className={`btn-press inline-flex items-center gap-2 px-5 py-3 rounded-[4px] font-bold text-[14px] disabled:opacity-45 ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                  : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
              }`}
            >
              <Shuffle className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>
                {isRunning
                  ? 'Se învârte...'
                  : loser
                  ? 'Învârte din nou'
                  : 'Învârte pentru notă'}
              </span>
            </button>
          )}

          {mode === 'elimination' && (
            <button
              type="button"
              onClick={runEliminationStep}
              disabled={
                isRunning ||
                players.length < 2 ||
                Boolean(loser) ||
                players.length - safeIds.length <= 1
              }
              className={`btn-press inline-flex items-center gap-2 px-5 py-3 rounded-[4px] font-bold text-[14px] disabled:opacity-45 ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                  : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>
                {isRunning
                  ? 'Se alege cine scapă...'
                  : safeIds.length === 0
                  ? 'Salvează prima persoană'
                  : `Salvează următorul (${players.length - safeIds.length} rămași)`}
              </span>
            </button>
          )}

          {mode === 'cards' && (
            <button
              type="button"
              onClick={startCardsRound}
              disabled={players.length < 2}
              className={`btn-press inline-flex items-center gap-2 px-5 py-3 rounded-[4px] font-bold text-[14px] disabled:opacity-45 ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                  : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
              }`}
            >
              <Spade className="w-4 h-4" />
              <span>
                {cardsDeck.length > 0
                  ? 'Amestecă din nou cărțile'
                  : 'Împarte cărțile pe masă'}
              </span>
            </button>
          )}

          {mode === 'bomb' && !bombActive && (
            <button
              type="button"
              onClick={startBombGame}
              disabled={players.length < 2}
              className={`btn-press inline-flex items-center gap-2 px-5 py-3 rounded-[4px] font-bold text-[14px] disabled:opacity-45 ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                  : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
              }`}
            >
              <Bomb className="w-4 h-4" />
              <span>{loser ? 'Aprinde bomba din nou' : 'Pornește bomba cu ceas'}</span>
            </button>
          )}

          {mode === 'dice' && (
            <button
              type="button"
              onClick={rollDiceRound}
              disabled={isRunning || players.length < 2}
              className={`btn-press inline-flex items-center gap-2 px-5 py-3 rounded-[4px] font-bold text-[14px] disabled:opacity-45 ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                  : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
              }`}
            >
              <Dices className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>
                {isRunning
                  ? 'Se aruncă zarurile...'
                  : loser
                  ? 'Aruncă din nou'
                  : 'Aruncă zarurile pentru masă'}
              </span>
            </button>
          )}

          {mode === 'chaos-split' && (
            <button
              type="button"
              onClick={startChaosSplit}
              disabled={isRunning || players.length < 2}
              className={`btn-press inline-flex items-center gap-2 px-5 py-3 rounded-[4px] font-bold text-[14px] disabled:opacity-45 ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                  : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
              }`}
            >
              <Percent className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>
                {isRunning
                  ? 'Se împart procentele...'
                  : chaosShares.length > 0
                  ? 'Regenerează împărțirea'
                  : 'Împarte haotic nota (%)'}
              </span>
            </button>
          )}

          {(safeIds.length > 0 ||
            loser ||
            cardsDeck.length > 0 ||
            chaosShares.length > 0) &&
            !isRunning &&
            !bombActive && (
              <button
                type="button"
                onClick={resetRound}
                className={`btn-press inline-flex items-center gap-1.5 px-4 py-3 rounded-[4px] border text-[13px] font-semibold ${
                  isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                    : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetează runda</span>
              </button>
            )}
        </div>
      </div>

      {/* Verdict Banner */}
      {loser && (
        <div
          className={`rounded-[6px] border p-5 text-center space-y-2 stagger-fade-in ${
            isDrink
              ? 'bg-[#17382C] border-[#F2A33A]'
              : 'bg-white border-[#B3261E] shadow-sm'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-75">
            <Users className="w-3.5 h-3.5" />
            <span>Verdictul mesei</span>
          </div>
          <div className="font-display text-[32px] sm:text-[38px] leading-tight">
            {mode === 'chaos-split'
              ? `${loser.name} ia partea cea mai mare!`
              : `${loser.name} plătește toată masa!`}
          </div>
          {hasBill && mode !== 'chaos-split' && (
            <div
              className={`text-[15px] font-bold tabular-nums ${
                isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
              }`}
            >
              Total de achitat: {parsedBill} lei
            </div>
          )}
          {tipPayer && mode === 'cards' && (
            <div className="text-[13px] font-semibold">
              Bacșișul (10%{hasBill ? ` · ${Math.round(parsedBill * 0.1)} lei` : ''}) este
              acoperit de {tipPayer.name}.
            </div>
          )}
          {diceTieNote && (
            <div className="text-[12px] font-semibold opacity-85">
              {diceTieNote}
            </div>
          )}
          <p
            className={`text-[13px] ${
              isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
            }`}
          >
            {verdictText}
          </p>
        </div>
      )}
    </div>
  );
};
