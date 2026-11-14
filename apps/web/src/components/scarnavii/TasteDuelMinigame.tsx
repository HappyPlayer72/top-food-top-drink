'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Crown,
  Dices,
  MapPin,
  RefreshCw,
  Swords,
  Trophy,
} from 'lucide-react';
import { Restaurant, Vertical, formatScore } from '../../types';

export interface TasteDuelMinigameProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  onSelectRestaurant: (r: Restaurant) => void;
}

type BracketSize = 4 | 8;

function shuffleVenues(list: Restaurant[]): Restaurant[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getRoundName(matchCountInRound: number): string {
  if (matchCountInRound >= 4) return 'Sferturi de finală';
  if (matchCountInRound === 2) return 'Semifinale';
  return 'Finala Mare';
}

export const TasteDuelMinigame: React.FC<TasteDuelMinigameProps> = ({
  vertical,
  restaurants,
  onSelectRestaurant,
}) => {
  const isDrink = vertical === 'drink';

  const [bracketSize, setBracketSize] = useState<BracketSize>(4);
  const [noTrapsOnly, setNoTrapsOnly] = useState<boolean>(true);

  const [roundVenues, setRoundVenues] = useState<Restaurant[]>([]);
  const [nextRoundWinners, setNextRoundWinners] = useState<Restaurant[]>([]);
  const [matchIndex, setMatchIndex] = useState<number>(0);
  const [champion, setChampion] = useState<Restaurant | null>(null);
  const [coinNote, setCoinNote] = useState<string | null>(null);

  const pool = useMemo(() => {
    if (!noTrapsOnly) return restaurants;
    const clean = restaurants.filter((r) => r.touristTrapIndex <= 25);
    return clean.length >= 4 ? clean : restaurants;
  }, [restaurants, noTrapsOnly]);

  const canUseEight = pool.length >= 8;
  const effectiveSize: BracketSize =
    bracketSize === 8 && canUseEight ? 8 : 4;

  const startTournament = (requestedSize?: BracketSize) => {
    const size = requestedSize ?? effectiveSize;
    const actualCount =
      size === 8 && pool.length >= 8 ? 8 : Math.min(4, pool.length);
    if (actualCount < 2) return;

    const seeded = shuffleVenues(pool).slice(0, actualCount);
    setRoundVenues(seeded);
    setNextRoundWinners([]);
    setMatchIndex(0);
    setChampion(null);
    setCoinNote(null);
  };

  const totalMatchesThisRound = Math.floor(roundVenues.length / 2);
  const leftVenue = roundVenues[matchIndex * 2];
  const rightVenue = roundVenues[matchIndex * 2 + 1];

  const handlePickWinner = (winner: Restaurant, viaCoin = false) => {
    if (!leftVenue || !rightVenue) return;
    setCoinNote(
      viaCoin ? `Soarta a ales: ${winner.name} merge mai departe!` : null
    );

    const updatedWinners = [...nextRoundWinners, winner];
    const nextMatch = matchIndex + 1;

    if (nextMatch < totalMatchesThisRound) {
      setNextRoundWinners(updatedWinners);
      setMatchIndex(nextMatch);
      return;
    }

    // Round finished
    if (updatedWinners.length === 1) {
      setChampion(updatedWinners[0]);
      setRoundVenues([]);
      setNextRoundWinners([]);
      setMatchIndex(0);
      return;
    }

    setRoundVenues(updatedWinners);
    setNextRoundWinners([]);
    setMatchIndex(0);
  };

  const handleCoinFlip = () => {
    if (!leftVenue || !rightVenue) return;
    const picked = Math.random() < 0.5 ? leftVenue : rightVenue;
    handlePickWinner(picked, true);
  };

  const isStarted = roundVenues.length >= 2 && Boolean(leftVenue && rightVenue);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Swords
            className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}
          />
          <h2 className="font-display text-[24px] sm:text-[28px] leading-tight">
            Turneul Poftelor — Duel 1 la 1
          </h2>
        </div>
        <p
          className={`text-[13px] sm:text-[14px] ${
            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
          }`}
        >
          Nu vă puteți hotărî unde să ieșiți? Puneți localurile față în față
          în sistem piramidal până rămâne un singur campion al mesei.
        </p>
      </div>

      {/* Tournament Settings */}
      <div
        className={`rounded-[6px] border p-4 space-y-3.5 ${
          isDrink
            ? 'bg-[#143025] border-[#285443]'
            : 'bg-[#FAF8F5] border-[#E6DFD5]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBracketSize(4)}
              className={`btn-press px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border ${
                effectiveSize === 4
                  ? isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                    : 'bg-[#3A2418] text-white border-[#3A2418]'
                  : isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2]/80'
                  : 'border-[#D6CFC5] text-[#3A2418]'
              }`}
            >
              4 localuri — Rapid
            </button>
            <button
              type="button"
              disabled={!canUseEight}
              onClick={() => setBracketSize(8)}
              className={`btn-press px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border disabled:opacity-45 ${
                effectiveSize === 8
                  ? isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                    : 'bg-[#3A2418] text-white border-[#3A2418]'
                  : isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2]/80'
                  : 'border-[#D6CFC5] text-[#3A2418]'
              }`}
            >
              8 localuri — Turneu complet
              {!canUseEight ? ' (necesită 8+)' : ''}
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noTrapsOnly}
              onChange={(e) => setNoTrapsOnly(e.target.checked)}
              className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'}
            />
            <span>Fără capcane turistice</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => startTournament()}
          disabled={pool.length < 2}
          className={`btn-press inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] font-bold text-[14px] disabled:opacity-45 ${
            isDrink
              ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
              : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>
            {isStarted || champion ? 'Începe un turneu nou' : 'Pornește turneul'}
          </span>
        </button>
      </div>

      {/* Active Matchup */}
      {isStarted && leftVenue && rightVenue && (
        <div className="space-y-4 stagger-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wider ${
                isDrink
                  ? 'bg-[#F2A33A]/20 text-[#F2A33A]'
                  : 'bg-[#B3261E]/10 text-[#B3261E]'
              }`}
            >
              {getRoundName(totalMatchesThisRound)} · Meci{' '}
              <span className="tabular-nums">
                {matchIndex + 1}/{totalMatchesThisRound}
              </span>
            </span>

            <button
              type="button"
              onClick={handleCoinFlip}
              className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border text-[12px] font-semibold ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Lasă soarta (50/50)</span>
            </button>
          </div>

          {coinNote && (
            <p
              className={`text-[12px] font-semibold ${
                isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
              }`}
            >
              {coinNote}
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3.5">
            {[leftVenue, rightVenue].map((venue, sideIdx) => (
              <div
                key={venue.id}
                className={`rounded-[6px] border p-4 sm:p-5 flex flex-col justify-between gap-4 ${
                  isDrink
                    ? 'bg-[#17382C] border-[#2D5947]'
                    : 'bg-white border-[#E6DFD5] shadow-sm'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                      Opțiunea {sideIdx === 0 ? 'A' : 'B'}
                    </span>
                    <span
                      className={`text-[16px] font-display tabular-nums ${
                        isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                      }`}
                    >
                      {formatScore(venue.foodQualityScore)}
                    </span>
                  </div>

                  <h3 className="font-display text-[24px] leading-tight">
                    {venue.name}
                  </h3>

                  <div
                    className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] ${
                      isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {venue.shortNeighborhood ?? venue.neighborhood}
                    </span>
                    <span>· {venue.cuisine}</span>
                    <span className="tabular-nums">
                      · ~{venue.avgMealPriceRon} lei ({venue.priceTier})
                    </span>
                  </div>

                  <p className="text-[13px] leading-relaxed opacity-90">
                    {venue.editorialHeadline}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePickWinner(venue)}
                  className={`btn-press w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[4px] font-bold text-[13px] ${
                    isDrink
                      ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                      : 'bg-[#3A2418] text-white hover:bg-[#B3261E]'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Alege localul ăsta</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Champion Banner */}
      {champion && (
        <div
          className={`rounded-[6px] border p-5 sm:p-6 space-y-4 stagger-fade-in ${
            isDrink
              ? 'bg-[#17382C] border-[#F2A33A]'
              : 'bg-white border-[#B3261E] shadow-sm'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wide bg-[#E0A526] text-[#3A2418]">
            <Crown className="w-3.5 h-3.5" />
            <span>Campionul Mesei</span>
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-[30px] sm:text-[36px] leading-tight">
              {champion.name}
            </h3>
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] ${
                isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
              }`}
            >
              <span>{champion.neighborhood}</span>
              <span>· {champion.cuisine}</span>
              <span className="tabular-nums">
                · Scor Onest {formatScore(champion.foodQualityScore)}
              </span>
            </div>
          </div>

          <p className="text-[14px]">{champion.editorialHeadline}</p>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onSelectRestaurant(champion)}
              className={`btn-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] text-[13px] font-bold ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] text-white'
              }`}
            >
              <span>Deschide fișa localului</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => startTournament()}
              className={`btn-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] border text-[13px] font-semibold ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Joacă un turneu nou</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
