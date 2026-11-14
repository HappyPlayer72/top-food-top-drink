'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  Compass,
  Dices,
  Flame,
  Radar,
  Receipt,
  Shuffle,
  Sparkles,
  Swords,
} from 'lucide-react';
import { Restaurant, Vertical } from '../types';
import { PreferenceRecommender } from './scarnavii/PreferenceRecommender';
import { MysteryDirections } from './scarnavii/MysteryDirections';
import { WhoPaysMinigame } from './scarnavii/WhoPaysMinigame';
import { TasteDuelMinigame } from './scarnavii/TasteDuelMinigame';
import { TrapBlitzMinigame } from './scarnavii/TrapBlitzMinigame';
import { TableDaresMinigame } from './scarnavii/TableDaresMinigame';

export interface ScarnaviiViewProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  onBack: () => void;
  onSelectRestaurant: (r: Restaurant) => void;
}

type ScarnaviiModeId =
  | 'preferences'
  | 'mystery'
  | 'who-pays'
  | 'taste-duel'
  | 'trap-blitz'
  | 'table-dares';

type CategoryFilter = 'all' | 'minigame' | 'explore';

interface ScarnaviiItem {
  id: ScarnaviiModeId;
  category: Exclude<CategoryFilter, 'all'>;
  title: string;
  tag: string;
  shortTab: string;
  description: string;
  ctaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SCARNAVII_LIST: ScarnaviiItem[] = [
  {
    id: 'who-pays',
    category: 'minigame',
    title: 'Cine plătește toată masa?',
    tag: 'Minigame · 6 moduri',
    shortTab: 'Cine plătește',
    description:
      'Ruletă, Eliminare, Cartea Neagră, Bomba cu Ceas, Barbut cu 2 zaruri sau Împărțire Haotică în procente — alegeți cum decideți nota.',
    ctaLabel: 'Joacă cu masa',
    icon: Receipt,
  },
  {
    id: 'taste-duel',
    category: 'minigame',
    title: 'Turneul Poftelor (Duel 1 la 1)',
    tag: 'Minigame',
    shortTab: 'Turneu 1v1',
    description:
      'Votați la masă între 4 sau 8 localuri în dueluri eliminatorii până când rămâne un singur campion (sau dați cu banul 50/50).',
    ctaLabel: 'Pornește turneul',
    icon: Swords,
  },
  {
    id: 'trap-blitz',
    category: 'minigame',
    title: 'Radar de Capcane (Quiz)',
    tag: 'Minigame',
    shortTab: 'Quiz Capcane',
    description:
      '5 runde rapide pe date reale din Timișoara: ghiciți care local este comoară de localnic și care e capcană turistică.',
    ctaLabel: 'Testează-ți instinctul',
    icon: Radar,
  },
  {
    id: 'table-dares',
    category: 'minigame',
    title: 'Roata Provocărilor la Masă',
    tag: 'Minigame',
    shortTab: 'Provocări',
    description:
      'Provocări spontane pentru gașca de la masă — de la comenzi pe nevăzute și schimburi de farfurii până la turnul telefoanelor.',
    ctaLabel: 'Învârte roata',
    icon: Flame,
  },
  {
    id: 'preferences',
    category: 'explore',
    title: 'Recomandare doar pe preferințe',
    tag: 'Potrivire',
    shortTab: 'Preferințe',
    description:
      'Alegi bugetul, specificul, cartierul, contextul și starea de azi — iar noi îți dăm localul potrivit, fără să pierzi timp prin liste.',
    ctaLabel: 'Alege preferințele',
    icon: Sparkles,
  },
  {
    id: 'mystery',
    category: 'explore',
    title: 'Destinație secretă (doar indicații)',
    tag: 'Aventură',
    shortTab: 'Busolă secretă',
    description:
      'Te trimitem la un local random din oraș doar pe bază de busolă, direcție, distanță și indicii progresive. Îi afli numele abia la ușă.',
    ctaLabel: 'Pornește spre necunoscut',
    icon: Compass,
  },
];

export const ScarnaviiView: React.FC<ScarnaviiViewProps> = ({
  vertical,
  restaurants,
  onBack,
  onSelectRestaurant,
}) => {
  const isDrink = vertical === 'drink';

  const [activeMode, setActiveMode] = useState<ScarnaviiModeId | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [isRolling, setIsRolling] = useState(false);
  const [rollingIndex, setRollingIndex] = useState<number>(0);

  const rollIntervalRef = useRef<number | null>(null);
  const rollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) window.clearInterval(rollIntervalRef.current);
      if (rollTimeoutRef.current) window.clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  const visibleList =
    categoryFilter === 'all'
      ? SCARNAVII_LIST
      : SCARNAVII_LIST.filter((item) => item.category === categoryFilter);

  const handleRollScarnavie = () => {
    if (isRolling) return;
    setIsRolling(true);

    const pool = activeMode ? SCARNAVII_LIST : visibleList;
    const candidates = activeMode
      ? pool.filter((item) => item.id !== activeMode)
      : pool;
    const finalPick =
      candidates[Math.floor(Math.random() * candidates.length)] ??
      pool[0] ??
      SCARNAVII_LIST[0];

    let step = 0;
    if (rollIntervalRef.current) window.clearInterval(rollIntervalRef.current);
    if (rollTimeoutRef.current) window.clearTimeout(rollTimeoutRef.current);

    rollIntervalRef.current = window.setInterval(() => {
      step += 1;
      setRollingIndex(step % pool.length);
    }, 80);

    rollTimeoutRef.current = window.setTimeout(() => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      setIsRolling(false);
      setActiveMode(finalPick.id);
    }, 520);
  };

  return (
    <div
      className={`min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-24 ${
        isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Top breadcrumb back row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={activeMode ? () => setActiveMode(null) : onBack}
              aria-label={
                activeMode ? 'Înapoi la lista de Scârnăvii' : 'Înapoi'
              }
              className={`btn-press w-11 h-11 sm:w-9 sm:h-9 rounded-[4px] border flex items-center justify-center ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#E6DFD5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className={`text-[14px] ${
                isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
              }`}
            >
              {isDrink ? 'topdrink' : 'topfood'}/timisoara/
              <strong
                className={`font-semibold ${
                  isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                }`}
              >
                scârnăvii
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleRollScarnavie}
            disabled={isRolling}
            className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] text-[12px] font-bold disabled:opacity-50 ${
              isDrink
                ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
            }`}
          >
            <Shuffle
              className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`}
            />
            <span>{isRolling ? 'Se alege...' : 'Trage la sorți'}</span>
          </button>
        </div>

        {/* Hero Title */}
        <section className="space-y-2">
          <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">
            Scârnăvii
          </h1>
          <p
            className={`text-[14px] sm:text-[15px] max-w-xl ${
              isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
            }`}
          >
            Șase moduri spontane și minigames pentru ieșit în oraș: ruletă și
            barbut pentru notă, duel 1v1 între localuri, quiz de capcane,
            provocări la masă, recomandări sau aventură pe busolă.
          </p>
        </section>

        {/* Quick Mode Switcher Tabs when inside a mode */}
        {activeMode && (
          <div className="flex flex-wrap items-center gap-2">
            {SCARNAVII_LIST.map((item) => {
              const Icon = item.icon;
              const active = activeMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMode(item.id)}
                  className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border ${
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
                  <span>{item.shortTab}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Interactive Mode OR Scârnăvii List */}
        {activeMode === 'preferences' ? (
          <PreferenceRecommender
            vertical={vertical}
            restaurants={restaurants}
            onSelectRestaurant={onSelectRestaurant}
          />
        ) : activeMode === 'mystery' ? (
          <MysteryDirections
            vertical={vertical}
            restaurants={restaurants}
            onSelectRestaurant={onSelectRestaurant}
          />
        ) : activeMode === 'who-pays' ? (
          <WhoPaysMinigame vertical={vertical} />
        ) : activeMode === 'taste-duel' ? (
          <TasteDuelMinigame
            vertical={vertical}
            restaurants={restaurants}
            onSelectRestaurant={onSelectRestaurant}
          />
        ) : activeMode === 'trap-blitz' ? (
          <TrapBlitzMinigame
            vertical={vertical}
            restaurants={restaurants}
            onSelectRestaurant={onSelectRestaurant}
          />
        ) : activeMode === 'table-dares' ? (
          <TableDaresMinigame vertical={vertical} />
        ) : (
          <section
            aria-label="Lista de Scârnăvii"
            className="space-y-4"
          >
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: 'Toate (6)' },
                  { id: 'minigame', label: 'Minigames la masă (4)' },
                  { id: 'explore', label: 'Explorare & Decizie (2)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`btn-press px-3.5 py-1.5 rounded-[4px] text-[12px] font-semibold border ${
                    categoryFilter === tab.id
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'border-[#2D5947] text-[#F4EEE2]/80 hover:border-[#F2A33A]/60'
                      : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {isRolling && (
              <div
                className={`rounded-[6px] border p-4 flex items-center gap-3 ${
                  isDrink
                    ? 'bg-[#143025] border-[#F2A33A]'
                    : 'bg-[#FAF8F5] border-[#B3261E]'
                }`}
              >
                <Dices
                  className={`w-5 h-5 animate-spin ${
                    isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                  }`}
                />
                <span className="font-display text-[20px]">
                  Se alege:{' '}
                  {(visibleList[rollingIndex] ?? SCARNAVII_LIST[0]).title}...
                </span>
              </div>
            )}

            <div className="grid gap-3.5">
              {visibleList.map((item, idx) => {
                const Icon = item.icon;
                const isHighlighted = isRolling && rollingIndex === idx;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMode(item.id)}
                    className={`btn-press w-full text-left rounded-[6px] border p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isHighlighted
                        ? isDrink
                          ? 'bg-[#1E4335] border-[#F2A33A]'
                          : 'bg-[#FAF8F5] border-[#B3261E]'
                        : isDrink
                        ? 'bg-[#143025] border-[#285443] hover:border-[#F2A33A]'
                        : 'bg-[#FAF8F5] border-[#E6DFD5] hover:border-[#3A2418]'
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[11px] font-bold uppercase tracking-wide ${
                            isDrink
                              ? 'bg-[#F2A33A]/20 text-[#F2A33A]'
                              : 'bg-[#B3261E]/10 text-[#B3261E]'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{item.tag}</span>
                        </span>
                      </div>

                      <h2 className="font-display text-[24px] sm:text-[26px] leading-tight">
                        {item.title}
                      </h2>

                      <p
                        className={`text-[13px] sm:text-[14px] leading-relaxed ${
                          isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] text-[13px] font-bold shrink-0 self-start sm:self-center ${
                        isDrink
                          ? 'bg-[#F2A33A] text-[#17382C]'
                          : 'bg-[#3A2418] text-white'
                      }`}
                    >
                      <span>{item.ctaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ScarnaviiView;
