'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Crown,
  Flame,
  Plus,
  Receipt,
  RotateCcw,
  Shuffle,
  Trash2,
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

type GameMode = 'roulette' | 'elimination';

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p-1', name: 'Andreea' },
  { id: 'p-2', name: 'Radu' },
  { id: 'p-3', name: 'Elena' },
];

const FUNNY_VERDICTS = [
  'Cardul tău tocmai a devenit vedeta serii.',
  'Restul mesei îți mulțumește din suflet.',
  'Data viitoare sigur nu mai pici tu. Poate.',
  'Onoare și glorie — și o notă întreagă de plată!',
];

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

  const timerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed || players.length >= 12) return;
    setPlayers((prev) => [
      ...prev,
      { id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: trimmed },
    ]);
    setNewPlayerName('');
    setLoser(null);
    setSafeIds([]);
  };

  const handleRemovePlayer = (id: string) => {
    if (isRunning) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setSafeIds((prev) => prev.filter((s) => s !== id));
    if (loser?.id === id) setLoser(null);
  };

  const resetRound = () => {
    clearTimers();
    setIsRunning(false);
    setActivePlayerId(null);
    setSafeIds([]);
    setLoser(null);
    setVerdictText('');
  };

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
        setVerdictText(
          FUNNY_VERDICTS[Math.floor(Math.random() * FUNNY_VERDICTS.length)]
        );
        return;
      }

      step += 1;
      const progress = step / totalSteps;
      const delay = 55 + Math.round(progress * progress * 220);
      timerRef.current = window.setTimeout(tick, delay);
    };

    tick();
  };

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
          setVerdictText(
            FUNNY_VERDICTS[Math.floor(Math.random() * FUNNY_VERDICTS.length)]
          );
        }
        return;
      }

      step += 1;
      const delay = 60 + Math.round((step / totalSteps) * 140);
      timerRef.current = window.setTimeout(tick, delay);
    };

    tick();
  };

  const parsedBill = Number(billAmount);
  const hasBill = !Number.isNaN(parsedBill) && parsedBill > 0;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Receipt
            className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}
          />
          <h2 className="font-display text-[24px] sm:text-[28px] leading-tight">
            Cine plătește toată masa?
          </h2>
        </div>
        <p
          className={`text-[13px] sm:text-[14px] ${
            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
          }`}
        >
          Adaugă persoanele de la masă și lasă șansa să decidă cine achită
          întreaga notă.
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setMode('roulette');
                resetRound();
              }}
              className={`btn-press px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border ${
                mode === 'roulette'
                  ? isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                    : 'bg-[#3A2418] text-white border-[#3A2418]'
                  : isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2]/80'
                  : 'border-[#D6CFC5] text-[#3A2418]'
              }`}
            >
              Ruleta Notei (Direct)
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setMode('elimination');
                resetRound();
              }}
              className={`btn-press px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border ${
                mode === 'elimination'
                  ? isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                    : 'bg-[#3A2418] text-white border-[#3A2418]'
                  : isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2]/80'
                  : 'border-[#D6CFC5] text-[#3A2418]'
              }`}
            >
              Eliminare (Ultimul rămas)
            </button>
          </div>

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
              className={`w-24 px-2.5 py-1.5 rounded-[4px] border text-[13px] focus:outline-none ${
                isDrink
                  ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder-[#F4EEE2]/40'
                  : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder-[#8C7B70]'
              }`}
            />
            <span className="text-[12px] opacity-70">lei</span>
          </div>
        </div>

        {/* Add player form */}
        <form onSubmit={handleAddPlayer} className="flex gap-2">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Nume persoană la masă..."
            aria-label="Nume persoană la masă"
            disabled={isRunning}
            className={`flex-1 px-3 py-2 rounded-[4px] border text-[13px] focus:outline-none ${
              isDrink
                ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder-[#F4EEE2]/45 focus:border-[#F2A33A]'
                : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder-[#8C7B70] focus:border-[#3A2418]'
            }`}
          />
          <button
            type="submit"
            disabled={!newPlayerName.trim() || isRunning || players.length >= 12}
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

        {/* Players Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {players.map((p) => {
            const isHighlighted = activePlayerId === p.id;
            const isSafe = safeIds.includes(p.id);
            const isLoser = loser?.id === p.id;

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
                <span className="truncate text-[14px] font-semibold">
                  {p.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {isSafe && (
                    <span className="text-[10px] font-bold uppercase no-underline opacity-80">
                      Scăpat
                    </span>
                  )}
                  {isLoser && <Crown className="w-4 h-4" />}
                  {!isRunning && players.length > 2 && !loser && (
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {mode === 'roulette' ? (
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
          ) : (
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

          {(safeIds.length > 0 || loser) && !isRunning && (
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
            {loser.name} plătește toată masa!
          </div>
          {hasBill && (
            <div
              className={`text-[15px] font-bold ${
                isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
              }`}
            >
              Total de achitat: {parsedBill} lei
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
