'use client';

import React, { useMemo, useState } from 'react';
import { HonestValue } from '../BrandPrimitives';
import {
  ArrowRight,
  Check,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { Restaurant, Vertical, formatHonest, formatScore } from '../../types';

export interface PreferenceRecommenderProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  onSelectRestaurant: (r: Restaurant) => void;
}

type BudgetChoice = 'any' | 'budget' | 'mid' | 'treat';
type ContextChoice = 'any' | 'quick-lunch' | 'evening' | 'group-table';

const CONTEXT_OPTIONS: { id: ContextChoice; label: string }[] = [
  { id: 'any', label: 'Oricând' },
  { id: 'quick-lunch', label: 'Prânz rapid' },
  { id: 'evening', label: 'Ieșire de seară' },
  { id: 'group-table', label: 'Masă mare de gașcă' },
];

const VIBE_OPTIONS = [
  { id: 'localnici', label: 'Autentic / Localnici' },
  { id: 'grup', label: 'Bun de gașcă' },
  { id: 'rapid', label: 'Rapid / Casual' },
  { id: 'special', label: 'Seară specială' },
] as const;

type VibeChoice = (typeof VIBE_OPTIONS)[number]['id'];

function matchesContext(r: Restaurant, context: ContextChoice): boolean {
  if (context === 'any') return true;
  const hay = [
    ...r.occasionTags,
    ...(r.drinkTags ?? []),
    r.editorialHeadline,
    r.cuisine,
    r.hours,
  ]
    .join(' ')
    .toLowerCase();

  if (context === 'quick-lunch') {
    return (
      r.avgMealPriceRon <= 55 ||
      hay.includes('prânz') ||
      hay.includes('rapid') ||
      hay.includes('street') ||
      hay.includes('patiserie')
    );
  }
  if (context === 'evening') {
    return (
      hay.includes('sear') ||
      hay.includes('vineri') ||
      hay.includes('cocktail') ||
      hay.includes('muzic') ||
      hay.includes('vin') ||
      hay.includes('bere')
    );
  }
  return (
    hay.includes('grup') ||
    hay.includes('terasă') ||
    hay.includes('pizza') ||
    hay.includes('pub') ||
    hay.includes('tradițional') ||
    (r.crowdSegments ?? 3) >= 3
  );
}

function matchesBudget(r: Restaurant, budget: BudgetChoice): boolean {
  if (budget === 'any') return true;
  if (budget === 'budget') return r.priceTier === '$' || r.avgMealPriceRon <= 50;
  if (budget === 'mid') return r.priceTier === '$$';
  return r.priceTier === '$$$' || r.priceTier === '$$$$';
}

function matchesVibe(r: Restaurant, vibe: VibeChoice | null): boolean {
  if (!vibe) return true;
  const hay = [
    ...r.occasionTags,
    ...(r.drinkTags ?? []),
    r.editorialHeadline,
    r.cuisine,
  ]
    .join(' ')
    .toLowerCase();

  if (vibe === 'localnici') {
    return (
      r.touristTrapIndex <= 25 ||
      hay.includes('local') ||
      hay.includes('fără capcane')
    );
  }
  if (vibe === 'grup') {
    return (
      hay.includes('grup') ||
      hay.includes('vineri') ||
      hay.includes('pub') ||
      hay.includes('pizza') ||
      hay.includes('terasă') ||
      hay.includes('bere')
    );
  }
  if (vibe === 'rapid') {
    return (
      hay.includes('rapid') ||
      hay.includes('street') ||
      hay.includes('patiserie') ||
      hay.includes('sub 50') ||
      r.avgMealPriceRon <= 45
    );
  }
  return (
    hay.includes('cocktail') ||
    hay.includes('bistro') ||
    hay.includes('muzica') ||
    r.priceTier === '$$' ||
    r.priceTier === '$$$'
  );
}

export const PreferenceRecommender: React.FC<PreferenceRecommenderProps> = ({
  vertical,
  restaurants,
  onSelectRestaurant,
}) => {
  const isDrink = vertical === 'drink';

  const [budget, setBudget] = useState<BudgetChoice>('any');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('any');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('any');
  const [selectedVibe, setSelectedVibe] = useState<VibeChoice | null>(null);
  const [selectedContext, setSelectedContext] = useState<ContextChoice>('any');
  const [noTrapsOnly, setNoTrapsOnly] = useState<boolean>(true);
  const [openNowOnly, setOpenNowOnly] = useState<boolean>(false);
  const [excludeLastSeen, setExcludeLastSeen] = useState<boolean>(true);
  const [showTopThree, setShowTopThree] = useState<boolean>(false);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [pickIndex, setPickIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const cuisines = useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach((r) => set.add(r.cuisine));
    return Array.from(set);
  }, [restaurants]);

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach((r) => set.add(r.neighborhood));
    return Array.from(set);
  }, [restaurants]);

  const rankedMatches = useMemo(() => {
    const scored = restaurants.map((r, idx) => {
      let score = 0;
      const reasons: string[] = [];

      if (budget !== 'any') {
        if (matchesBudget(r, budget)) {
          score += 3;
          reasons.push(
            budget === 'budget'
              ? 'Sub 50 lei'
              : budget === 'mid'
              ? 'Buget mediu'
              : 'Experiență premium'
          );
        } else {
          score -= 2;
        }
      }

      if (selectedCuisine !== 'any') {
        if (r.cuisine === selectedCuisine) {
          score += 4;
          reasons.push(r.cuisine);
        } else {
          score -= 3;
        }
      }

      if (selectedNeighborhood !== 'any') {
        if (r.neighborhood === selectedNeighborhood) {
          score += 3;
          reasons.push(r.shortNeighborhood ?? r.neighborhood);
        } else {
          score -= 2;
        }
      }

      if (selectedVibe) {
        if (matchesVibe(r, selectedVibe)) {
          score += 2;
          const label = VIBE_OPTIONS.find((v) => v.id === selectedVibe)?.label;
          if (label) reasons.push(label);
        } else {
          score -= 1;
        }
      }

      if (selectedContext !== 'any') {
        if (matchesContext(r, selectedContext)) {
          score += 2;
          const ctxLabel = CONTEXT_OPTIONS.find(
            (c) => c.id === selectedContext
          )?.label;
          if (ctxLabel) reasons.push(ctxLabel);
        } else {
          score -= 2;
        }
      }

      if (noTrapsOnly) {
        if (r.touristTrapIndex <= 25) {
          score += 2;
          reasons.push('Fără capcane turistice');
        } else {
          score -= 4;
        }
      }

      if (openNowOnly) {
        if (r.openNow) {
          score += 2;
          reasons.push('Deschis acum');
        } else {
          score -= 4;
        }
      }

      // Quality tie-breaker + deterministic-per-roll jitter
      const qualityBonus = r.foodQualityScore * 0.25;
      const jitter = (((idx + 1) * (shuffleSeed + 7)) % 11) * 0.03;
      const seenPenalty = excludeLastSeen && lastSeenId === r.id ? -3.5 : 0;

      return {
        restaurant: r,
        totalScore: score + qualityBonus + jitter + seenPenalty,
        matchScore: score,
        reasons,
        isExact:
          (budget === 'any' || matchesBudget(r, budget)) &&
          (selectedCuisine === 'any' || r.cuisine === selectedCuisine) &&
          (selectedNeighborhood === 'any' ||
            r.neighborhood === selectedNeighborhood) &&
          matchesVibe(r, selectedVibe) &&
          matchesContext(r, selectedContext) &&
          (!noTrapsOnly || r.touristTrapIndex <= 25) &&
          (!openNowOnly || r.openNow),
      };
    });

    return scored.sort((a, b) => b.totalScore - a.totalScore);
  }, [
    restaurants,
    budget,
    selectedCuisine,
    selectedNeighborhood,
    selectedVibe,
    selectedContext,
    noTrapsOnly,
    openNowOnly,
    excludeLastSeen,
    lastSeenId,
    shuffleSeed,
  ]);

  const currentPick =
    rankedMatches.length > 0
      ? rankedMatches[pickIndex % rankedMatches.length]
      : null;

  const alternativePicks = useMemo(() => {
    if (!showTopThree || rankedMatches.length <= 1) return [];
    const activeId = currentPick?.restaurant.id;
    return rankedMatches
      .filter((m) => m.restaurant.id !== activeId)
      .slice(0, 2);
  }, [showTopThree, rankedMatches, currentPick]);

  const exactCount = rankedMatches.filter((m) => m.isExact).length;

  const handleRecommend = () => {
    if (currentPick) {
      setLastSeenId(currentPick.restaurant.id);
    }
    setHasSearched(true);
    setPickIndex(0);
    setShuffleSeed((s) => s + 1);
  };

  const handleNextMatch = () => {
    if (rankedMatches.length <= 1) return;
    if (currentPick) {
      setLastSeenId(currentPick.restaurant.id);
    }
    setPickIndex((prev) => (prev + 1) % Math.min(rankedMatches.length, 5));
  };

  const chipClass = (active: boolean) =>
    `btn-press min-h-[44px] sm:min-h-[38px] inline-flex items-center px-3 py-2 rounded-[4px] text-[12px] font-semibold border transition-colors ${
      active
        ? isDrink
          ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
          : 'bg-[#3A2418] text-white border-[#3A2418]'
        : isDrink
        ? 'border-[#2D5947] text-[#F4EEE2]/85 hover:border-[#F2A33A]/60'
        : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
    }`;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles
            className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}
          />
          <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">
            Recomandare doar după preferințe
          </h1>
        </div>
        <p
          className={`text-[13px] sm:text-[14px] ${
            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
          }`}
        >
          Spune-ne ce chef ai azi și îți dăm un singur loc potrivit — fără
          scroll infinit prin liste.
        </p>
      </div>

      {/* Preferences Grid */}
      <div
        className={`rounded-[6px] border p-4 sm:p-5 space-y-4 ${
          isDrink
            ? 'bg-[#143025] border-[#285443]'
            : 'bg-[#FAF8F5] border-[#E6DFD5]'
        }`}
      >
        {/* Budget */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
            Buget
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'any', label: 'Oricare' },
                { id: 'budget', label: 'Sub 50 lei ($)' },
                { id: 'mid', label: 'Mediu ($$)' },
                { id: 'treat', label: 'Răsfăț ($$$+)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setBudget(opt.id);
                  setPickIndex(0);
                }}
                className={chipClass(budget === opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cuisine / Style */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
            {isDrink ? 'Tip local' : 'Specific'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedCuisine('any');
                setPickIndex(0);
              }}
              className={chipClass(selectedCuisine === 'any')}
            >
              Orice
            </button>
            {cuisines.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedCuisine(c);
                  setPickIndex(0);
                }}
                className={chipClass(selectedCuisine === c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <details
          className={`group border-t pt-3 ${
            isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
          }`}
        >
          <summary className="min-h-[44px] cursor-pointer list-none flex items-center justify-between gap-2 text-[13px] font-bold select-none">
            <span>Mai multe filtre (cartier, ocazie, opțiuni)</span>
            <span
              aria-hidden="true"
              className={`text-[12px] transition-transform group-open:rotate-180 ${
                isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
              }`}
            >
              ▼
            </span>
          </summary>

          <div className="space-y-4 pt-3">
            {/* Neighborhood */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                Cartier
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNeighborhood('any');
                    setPickIndex(0);
                  }}
                  className={chipClass(selectedNeighborhood === 'any')}
                >
                  Oriunde în Timișoara
                </button>
                {neighborhoods.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setSelectedNeighborhood(n);
                      setPickIndex(0);
                    }}
                    className={chipClass(selectedNeighborhood === n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                Stare / Ocazie
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVibe((prev) => (prev === v.id ? null : v.id));
                      setPickIndex(0);
                    }}
                    className={chipClass(selectedVibe === v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Context / Moment */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                Momentul / Contextul
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CONTEXT_OPTIONS.map((ctx) => (
                  <button
                    key={ctx.id}
                    type="button"
                    onClick={() => {
                      setSelectedContext(ctx.id);
                      setPickIndex(0);
                    }}
                    className={chipClass(selectedContext === ctx.id)}
                  >
                    {ctx.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
              <label className="min-h-[44px] inline-flex items-center gap-2 text-[12px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noTrapsOnly}
                  onChange={(e) => {
                    setNoTrapsOnly(e.target.checked);
                    setPickIndex(0);
                  }}
                  className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'}
                />
                <span>Fără capcane turistice (Index ≤ 25%)</span>
              </label>
              <label className="min-h-[44px] inline-flex items-center gap-2 text-[12px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={openNowOnly}
                  onChange={(e) => {
                    setOpenNowOnly(e.target.checked);
                    setPickIndex(0);
                  }}
                  className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'}
                />
                <span>Doar deschis acum</span>
              </label>
              <label className="min-h-[44px] inline-flex items-center gap-2 text-[12px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludeLastSeen}
                  onChange={(e) => setExcludeLastSeen(e.target.checked)}
                  className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'}
                />
                <span>Exclude ultimul local văzut</span>
              </label>
              <label className="min-h-[44px] inline-flex items-center gap-2 text-[12px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTopThree}
                  onChange={(e) => setShowTopThree(e.target.checked)}
                  className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'}
                />
                <span>Arată top 3 alternative</span>
              </label>
            </div>
          </div>
        </details>

        {/* CTA */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleRecommend}
            disabled={restaurants.length === 0}
            className={`btn-press min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[4px] font-bold text-[14px] ${
              isDrink
                ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Recomandă-mi localul potrivit</span>
          </button>
        </div>
      </div>

      {/* Recommendation Result */}
      {hasSearched && currentPick && (
        <div
          className={`rounded-[6px] border p-5 space-y-4 stagger-fade-in ${
            isDrink
              ? 'bg-[#17382C] border-[#F2A33A]/50'
              : 'bg-white border-[#3A2418]/25 shadow-sm'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wide ${
                currentPick.isExact
                  ? isDrink
                    ? 'bg-[#F2A33A]/20 text-[#F2A33A]'
                    : 'bg-[#B3261E]/10 text-[#B3261E]'
                  : isDrink
                  ? 'bg-[#285443] text-[#F4EEE2]'
                  : 'bg-[#F2EFE9] text-[#6E5649]'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {currentPick.isExact
                ? `Potrivire exactă (${exactCount} ${
                    exactCount === 1 ? 'opțiune' : 'opțiuni'
                  })`
                : 'Cea mai apropiată potrivire'}
            </span>

            <span className="text-[12px] font-semibold opacity-75">
              Scor Onest: <HonestValue score={currentPick.restaurant.foodQualityScore} /> /
              10
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-display text-[28px] sm:text-[32px] leading-tight">
              {currentPick.restaurant.name}
            </h3>
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] ${
                isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {currentPick.restaurant.neighborhood}
              </span>
              <span>· {currentPick.restaurant.cuisine}</span>
              <span>
                · ~{currentPick.restaurant.avgMealPriceRon} lei (
                {currentPick.restaurant.priceTier})
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Trap Index {currentPick.restaurant.touristTrapIndex}%
              </span>
            </div>
          </div>

          <p
            className={`text-[14px] leading-relaxed ${
              isDrink ? 'text-[#F4EEE2]/90' : 'text-[#3A2418]'
            }`}
          >
            {currentPick.restaurant.editorialHeadline}
          </p>

          {currentPick.restaurant.whatToOrder[0] && (
            <div
              className={`rounded-[4px] px-3.5 py-2.5 text-[13px] ${
                isDrink ? 'bg-[#143025]' : 'bg-[#FAF8F5]'
              }`}
            >
              <span className="font-bold">Ce să comanzi: </span>
              <span>{currentPick.restaurant.whatToOrder[0].name}</span>
              <span className="opacity-70">
                {' '}
                ({currentPick.restaurant.whatToOrder[0].priceRon} lei)
              </span>
            </div>
          )}

          {currentPick.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentPick.reasons.map((reason) => (
                <span
                  key={reason}
                  className={`text-[11px] px-2 py-0.5 rounded-[3px] font-medium ${
                    isDrink
                      ? 'bg-[#1E4335] text-[#F4EEE2]/85'
                      : 'bg-[#F2EFE9] text-[#3A2418]'
                  }`}
                >
                  ✓ {reason}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onSelectRestaurant(currentPick.restaurant)}
              className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] text-[13px] font-bold ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] text-white'
              }`}
            >
              <span>Vezi localul complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {rankedMatches.length > 1 && (
              <button
                type="button"
                onClick={handleNextMatch}
                className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] border text-[13px] font-semibold ${
                  isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                    : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Altă variantă</span>
              </button>
            )}
          </div>

          {alternativePicks.length > 0 && (
            <div
              className={`pt-4 border-t space-y-2.5 ${
                isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                Alte 2 variante potrivite
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {alternativePicks.map((alt) => (
                  <button
                    key={alt.restaurant.id}
                    type="button"
                    onClick={() => onSelectRestaurant(alt.restaurant)}
                    className={`btn-press rounded-[4px] border p-3 text-left space-y-1 transition-colors ${
                      isDrink
                        ? 'bg-[#143025] border-[#285443] hover:border-[#F2A33A]'
                        : 'bg-[#FAF8F5] border-[#E6DFD5] hover:border-[#3A2418]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[14px] truncate">
                        {alt.restaurant.name}
                      </span>
                      <span
                        className={`text-[12px] font-bold tabular-nums shrink-0 ${
                          isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                        }`}
                      >
                        <HonestValue score={alt.restaurant.foodQualityScore} />
                      </span>
                    </div>
                    <div className="text-[12px] opacity-75 truncate">
                      {alt.restaurant.shortNeighborhood ??
                        alt.restaurant.neighborhood}{' '}
                      · {alt.restaurant.cuisine} · ~
                      {alt.restaurant.avgMealPriceRon} lei
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
