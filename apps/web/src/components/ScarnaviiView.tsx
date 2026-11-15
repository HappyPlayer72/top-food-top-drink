'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  Compass,
  Dices,
  Flame,
  Receipt,
  Shuffle,
  Sparkles,
  Swords,
} from 'lucide-react';
import { Restaurant, Vertical } from '../types';
import { PreferenceRecommender } from './scarnavii/PreferenceRecommender';
import { MysteryDirections } from './scarnavii/MysteryDirections';
import { WhoPaysMinigame } from './scarnavii/WhoPaysMinigame';
import { OutingPoll } from './scarnavii/OutingPoll';
import { TableDaresMinigame } from './scarnavii/TableDaresMinigame';
import { TasteTour } from './scarnavii/TasteTour.tsx';

export interface ScarnaviiViewProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  allRestaurants: Restaurant[];
  onBack: () => void;
  onSelectRestaurant: (r: Restaurant) => void;
}

type ScarnaviiModeId =
  | 'taste-tour'
  | 'preferences'
  | 'mystery'
  | 'who-pays'
  | 'taste-duel'
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
    id: 'taste-tour',
    category: 'explore',
    title: 'Tasting Tour',
    tag: 'Traseu de gustat',
    shortTab: 'Tasting Tour',
    description: 'Spune-ne de ce ți-e poftă și descoperă localuri potrivite într-o plimbare prin oraș.',
    ctaLabel: 'Creează traseul',
    icon: Compass,
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
    id: 'taste-duel',
    category: 'minigame',
    title: 'Unde ieșim?',
    tag: 'Alegeți împreună',
    shortTab: 'Unde ieșim?',
    description:
      'Alege câteva localuri, trimite linkul prietenilor și vedeți împreună unde vreți să mergeți.',
    ctaLabel: 'Creează un sondaj',
    icon: Swords,
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
];

export const ScarnaviiView: React.FC<ScarnaviiViewProps> = ({
  vertical,
  restaurants,
  allRestaurants,
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
        isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
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
            className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] text-[12px] font-bold disabled:opacity-50 ${
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
            Trasee de gustat, jocuri și recomandări pentru ieșit în oraș:
            descoperă localuri, alege cu gașca sau pornește într-o aventură.
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
                    className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[12px] font-semibold border ${
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
        {activeMode === 'taste-tour' ? (
          <TasteTour vertical={vertical} restaurants={allRestaurants} onSelectRestaurant={onSelectRestaurant} />
        ) : activeMode === 'preferences' ? (
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
          <OutingPoll
            vertical={vertical}
            restaurants={allRestaurants}
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
                  { id: 'all', label: `Toate (${SCARNAVII_LIST.length})` },
                  { id: 'minigame', label: `Minigames la masă (${SCARNAVII_LIST.filter((item) => item.category === 'minigame').length})` },
                  { id: 'explore', label: `Explorare & Decizie (${SCARNAVII_LIST.filter((item) => item.category === 'explore').length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`btn-press min-h-[44px] px-3.5 py-2 rounded-[4px] text-[12px] font-semibold border ${
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

            <div className="grid gap-4 sm:grid-cols-2">
              {visibleList.map((item, idx) => {
                const Icon = item.icon;
                const isHighlighted = isRolling && rollingIndex === idx;
                const cardStyle = (idx + Math.floor(idx / 2)) % 2 === 0
                  ? 'scarnavii-card-orange'
                  : isDrink ? 'scarnavii-card-green' : 'scarnavii-card-red';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMode(item.id)}
                    className={`btn-press group relative w-full min-h-[250px] overflow-hidden text-left rounded-[4px] border-2 p-5 sm:p-6 transition-all duration-200 hover:-rotate-1 hover:scale-[1.015] hover:shadow-[7px_7px_0_rgba(58,36,24,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
                      isHighlighted
                        ? 'ring-4 ring-[#E0A526] ring-offset-2'
                        : 'shadow-[4px_4px_0_rgba(58,36,24,0.14)]'
                    } ${cardStyle}`}
                  >
                    <span aria-hidden="true" className="pointer-events-none absolute -right-4 -top-6 rotate-12 opacity-[0.13] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-110">
                      <Icon className="h-40 w-40" />
                    </span>
                    <div className="relative z-10 flex h-full flex-col items-start">
                      <div className="mb-5 flex w-full items-start justify-between gap-3">
                        <span
                          className="inline-flex rotate-[-2deg] items-center gap-1.5 rounded-[4px] border-2 border-current bg-white/25 px-3 py-1 text-[11px] font-black uppercase tracking-[0.13em] shadow-sm"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{item.tag}</span>
                        </span>
                        <span aria-hidden="true" className="font-display text-2xl font-black opacity-70">0{idx + 1}</span>
                      </div>

                      <h2 className="max-w-[18rem] font-display text-[28px] font-black leading-[1.02] sm:text-[32px]">
                        {item.title}
                      </h2>

                      <p
                        className="mb-6 mt-3 max-w-[25rem] text-[13px] font-medium leading-relaxed opacity-85 sm:text-[14px]"
                      >
                        {item.description}
                      </p>

                      <span className="mt-auto inline-flex -rotate-1 items-center gap-2 rounded-[4px] border-2 scarnavii-card-cta px-4 py-2.5 text-[12px] font-black uppercase tracking-wide shadow-[3px_3px_0_#3A2418] transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-[1px_1px_0_#3A2418]">
                        <span>{item.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
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
