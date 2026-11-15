'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Vertical } from '../../types';
import { StickyAction } from './table/StickyAction';
import { TableSeats } from './table/TableSeats';
import { tableTheme } from './table/theme';
import { useTablePlayers } from './table/useTablePlayers';
import { GAMES, btn, type GameMode, type Verdict } from './table/whoPaysGames';
import { VerdictReceipt } from './table/VerdictReceipt';

export interface WhoPaysMinigameProps {
  vertical: Vertical;
  /** Numele celui logat; intră automat la masă. */
  myName?: string | null;
}


export const WhoPaysMinigame: React.FC<WhoPaysMinigameProps> = ({ vertical, myName }) => {
  const theme = tableTheme(vertical);
  const { players, add, rename, remove } = useTablePlayers(myName);
  const [step, setStep] = useState<'pick' | 'play' | 'verdict'>('pick');
  const [mode, setMode] = useState<GameMode>('roulette');
  const [roundKey, setRoundKey] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [bill, setBill] = useState('');
  const game = GAMES.find((g) => g.id === mode) ?? GAMES[0];
  const newRound = () => setRoundKey((k) => k + 1);

  // Orice schimbare a mesei remontează jocul, deci runda și timerele ei se opresc.
  const seats = (
    <TableSeats
      players={players}
      theme={theme}
      min={2}
      onAdd={(name) => {
        add(name);
        newRound();
      }}
      onRename={rename}
      onRemove={(id) => {
        remove(id);
        newRound();
      }}
    />
  );

  const play = (id: GameMode) => {
    setMode(id);
    newRound();
    setStep('play');
  };

  if (step === 'verdict' && verdict) {
    const total = Number(bill.replace(',', '.'));
    const hasBill = Number.isFinite(total) && total > 0;
    const lei = (v: number) => `${Math.round(v)} lei`;
    const lines = [
      ...(hasBill && mode !== 'chaos' ? [{ label: 'Total', value: lei(total) }] : []),
      ...(verdict.tipName ? [{ label: `Bacșișul (10%): ${verdict.tipName}`, value: hasBill ? lei(total * 0.1) : '10%' }] : []),
      ...(verdict.shares ?? []).map((s) => ({
        label: s.name,
        value: s.pct === 0 ? 'Gratis!' : hasBill ? `${s.pct}% · ${lei((total * s.pct) / 100)}` : `${s.pct}%`,
      })),
    ];
    return (
      <div className="space-y-6 pb-4">
        <VerdictReceipt
          theme={theme}
          title="Masa de azi"
          loserName={verdict.loserName}
          stamp={mode === 'chaos' ? 'Ia greul' : 'Plătește'}
          note={verdict.text}
          lines={lines}
          actions={
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[15px] font-semibold">Cât a ieșit nota?</span>
                <span className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    value={bill}
                    onChange={(e) => setBill(e.target.value)}
                    className={`w-36 h-12 px-3 rounded-[4px] border-2 text-[16px] tabular-nums ${theme.seat}`}
                  />
                  <span className="text-[16px]">lei</span>
                </span>
              </label>
              <StickyAction>
                <button type="button" onClick={() => play(mode)} className={`${btn} ${theme.primary}`}>
                  Încă o rundă
                </button>
                <button type="button" onClick={() => setStep('pick')} className={`${btn} border-2 ${theme.seat}`}>
                  Alt joc
                </button>
              </StickyAction>
            </div>
          }
        />
      </div>
    );
  }

  if (step === 'play') {
    const Play = game.Play;
    return (
      <div className="space-y-5 pb-4">
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => setStep('pick')} className={`btn-press inline-flex items-center gap-1.5 min-h-11 pr-2 text-[15px] font-semibold ${theme.muted}`}>
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            Alte jocuri
          </button>
          <h1 className="font-display text-[30px] leading-none">{game.name}</h1>
        </header>
        {seats}
        <Play
          key={`${mode}-${roundKey}`}
          players={players}
          theme={theme}
          ready={players.length >= 2}
          onVerdict={(v) => {
            setVerdict(v);
            setStep('verdict');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">Cine plătește?</h1>
      {seats}
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GAMES.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => play(g.id)}
              className={`btn-press w-full h-full min-h-[120px] rounded-[6px] border-2 p-3 flex flex-col items-start gap-2 text-left ${theme.surfaceRaised}`}
            >
              <span className={`w-12 h-12 grid place-items-center rounded-full border-2 ${theme.seat}`}>
                <g.icon className={`w-6 h-6 ${theme.accent}`} />
              </span>
              <span className="font-display text-[22px] leading-none">{g.name}</span>
              <span className={`text-[13px] leading-snug ${theme.muted}`}>{g.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
