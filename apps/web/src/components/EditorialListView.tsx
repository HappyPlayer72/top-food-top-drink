'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import {
  DrinkQuickFilter,
  FoodQuickFilter,
  Restaurant,
  Vertical,
  WeekendEvent,
  formatScore,
} from '../types';
import {
  AvertizareaCard,
  CarouStrip,
  CoasterScore,
  CrowdMeter,
  LocalnicBadge,
  TrapBadge,
} from './BrandPrimitives';

export interface EditorialListViewProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  drinkVenues: Restaurant[];
  weekendEvents: WeekendEvent[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  foodFilters: FoodQuickFilter[];
  onToggleFoodFilter: (f: FoodQuickFilter) => void;
  drinkFilters: DrinkQuickFilter[];
  onToggleDrinkFilter: (f: DrinkQuickFilter) => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onOpenMonthlyTop: () => void;
  onUpdateCrowdReport: (
    venueId: string,
    segments: 1 | 2 | 3 | 4 | 5,
    label: string
  ) => void;
}

const FOOD_FILTER_PILLS: { id: FoodQuickFilter; label: string }[] = [
  { id: 'fara-capcane', label: 'Fără capcane' },
  { id: 'deschis-acum', label: 'Deschis acum' },
  { id: 'sub-50-lei', label: 'Sub 50 lei' },
];

const DRINK_FILTER_PILLS: { id: DrinkQuickFilter; label: string }[] = [
  { id: 'vineri-noaptea', label: 'Vineri noaptea' },
  { id: 'in-timpul-saptamanii', label: 'În timpul săptămânii' },
  { id: 'muzica-live', label: 'Muzică live' },
  { id: 'bere-sub-15-lei', label: 'Bere sub 15 lei' },
];

const CROWD_PRESETS: {
  segments: 1 | 2 | 3 | 4 | 5;
  title: string;
  reportLabel: string;
}[] = [
  { segments: 1, title: 'Gol / Liniștit', reportLabel: 'Foarte liber, chiar acum' },
  { segments: 2, title: 'Locuri libere', reportLabel: 'Locuri libere, chiar acum' },
  { segments: 3, title: 'Animație plăcută', reportLabel: 'Atmosferă animată, chiar acum' },
  { segments: 4, title: 'Aproape plin', reportLabel: 'Aproape plin, chiar acum' },
  { segments: 5, title: 'Plin / Coadă', reportLabel: 'Coadă la intrare, chiar acum' },
];

export const EditorialListView: React.FC<EditorialListViewProps> = ({
  vertical,
  restaurants,
  drinkVenues,
  weekendEvents,
  searchQuery,
  onSearchChange,
  foodFilters,
  onToggleFoodFilter,
  drinkFilters,
  onToggleDrinkFilter,
  onSelectRestaurant,
  onOpenMonthlyTop,
  onUpdateCrowdReport,
}) => {
  const isDrink = vertical === 'drink';
  const [showAllTop, setShowAllTop] = useState(false);
  const [expandedTrapPreview, setExpandedTrapPreview] = useState(false);

  // Vibe Check modal state for topdrink
  const [isVibeModalOpen, setIsVibeModalOpen] = useState(false);
  const [vibeVenueId, setVibeVenueId] = useState<string>(
    drinkVenues[0]?.id ?? 'pivnita-cu-bolta'
  );
  const [vibeSegments, setVibeSegments] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [vibeSubmittedNotice, setVibeSubmittedNotice] = useState<string | null>(
    null
  );

  // Filtered Food Lists
  const filteredFoodOrganic = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return restaurants
      .filter((r) => !r.isSponsored && r.touristTrapIndex < 60)
      .filter((r) => {
        if (foodFilters.includes('fara-capcane') && r.touristTrapIndex > 25) {
          return false;
        }
        if (foodFilters.includes('deschis-acum') && !r.openNow) {
          return false;
        }
        if (foodFilters.includes('sub-50-lei') && r.avgMealPriceRon > 50) {
          return false;
        }
        if (q) {
          const hay = `${r.name} ${r.shortCategory ?? r.cuisine} ${
            r.shortNeighborhood ?? r.neighborhood
          } ${r.whatToOrder.map((d) => d.name).join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.foodQualityScore - a.foodQualityScore);
  }, [restaurants, searchQuery, foodFilters]);

  const foodSponsored = useMemo(
    () => restaurants.find((r) => r.isSponsored && r.touristTrapIndex < 80),
    [restaurants]
  );

  const foodTraps = useMemo(() => {
    if (foodFilters.includes('fara-capcane')) return [];
    return restaurants
      .filter((r) => r.touristTrapIndex >= 60)
      .sort((a, b) => b.touristTrapIndex - a.touristTrapIndex);
  }, [restaurants, foodFilters]);

  // Filtered Drink Lists
  const filteredDrinkOrganic = useMemo(() => {
    return drinkVenues
      .filter((r) => !r.isSponsored)
      .filter((r) => {
        for (const f of drinkFilters) {
          if (!r.drinkTags?.includes(f)) return false;
        }
        return true;
      })
      .sort((a, b) => b.foodQualityScore - a.foodQualityScore);
  }, [drinkVenues, drinkFilters]);

  const drinkSponsored = useMemo(
    () => drinkVenues.find((r) => r.isSponsored && r.touristTrapIndex < 80),
    [drinkVenues]
  );

  const visibleFoodTop = showAllTop
    ? filteredFoodOrganic
    : filteredFoodOrganic.slice(0, 5);
  const firstFoodSlice = visibleFoodTop.slice(0, 3);
  const featuredFood = firstFoodSlice[0];
  const compactFirstFoodSlice = firstFoodSlice.slice(1);
  const secondFoodSlice = visibleFoodTop.slice(3);

  const featuredDrink = filteredDrinkOrganic[0];
  const compactDrinkSlice = filteredDrinkOrganic.slice(1);

  const handleVibeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const preset =
      CROWD_PRESETS.find((p) => p.segments === vibeSegments) ?? CROWD_PRESETS[3];
    onUpdateCrowdReport(vibeVenueId, vibeSegments, preset.reportLabel);
    const venueName =
      drinkVenues.find((d) => d.id === vibeVenueId)?.name ?? 'local';
    setVibeSubmittedNotice(
      `Raport trimis pentru ${venueName}: „${preset.reportLabel}”.`
    );
    setIsVibeModalOpen(false);
  };

  // ============================================================================
  // TOPDRINK / TIMIȘOARA VIEW (Page 5 — Sticlă #17382C)
  // ============================================================================
  if (isDrink) {
    return (
      <div className="min-h-screen bg-[#17382C] text-[#F4EEE2] pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 space-y-8">
          {/* Hero */}
          <section className="space-y-4">
            <h1 className="font-display text-[44px] sm:text-[56px] leading-[0.94] text-[#F4EEE2] max-w-xl">
              Unde ieșim în seara asta
            </h1>

            {/* Filter Pills (Chihlimbar #F2A33A active) */}
            <div className="flex flex-wrap items-center gap-2">
              {DRINK_FILTER_PILLS.map((pill) => {
                const active = drinkFilters.includes(pill.id);
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => onToggleDrinkFilter(pill.id)}
                    className={`btn-press px-3.5 py-2 rounded-[4px] text-[13px] font-semibold border ${
                      active
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#17382C] text-[#F4EEE2] border-[#2D5947] hover:border-[#F2A33A]/60'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {vibeSubmittedNotice && (
              <div className="stagger-fade-in px-3.5 py-2 rounded-[4px] bg-[#1E4335] border border-[#F2A33A]/50 text-[13px] text-[#F4EEE2] flex items-center justify-between gap-2">
                <span>{vibeSubmittedNotice}</span>
                <button
                  type="button"
                  onClick={() => setVibeSubmittedNotice(null)}
                  className="btn-press text-[#F2A33A] text-[12px] font-semibold"
                >
                  Închide
                </button>
              </div>
            )}
          </section>

          {/* Main 12-column editorial layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* LEFT 7 COLUMNS: Topul de vineri */}
            <section
              aria-label="Topul de vineri"
              className="lg:col-span-7 space-y-3"
            >
              <div className="flex items-baseline justify-between gap-2 pb-1">
                <h2 className="font-display text-[28px] sm:text-[32px] leading-none text-[#F4EEE2]">
                  Topul de vineri
                </h2>
                <span className="text-[13px] text-[#F4EEE2]/65">
                  plin acum, din raportări
                </span>
              </div>

              {filteredDrinkOrganic.length === 0 ? (
                <div className="py-8 border-t border-[#285443] text-[14px] text-[#F4EEE2]/75">
                  Niciun bar nu corespunde tuturor filtrelor selectate. Dezactivează
                  unul dintre filtre pentru a vedea toate localurile.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Featured #1 Pub Spotlight Card */}
                  {featuredDrink && (
                    <button
                      key={featuredDrink.id}
                      type="button"
                      onClick={() => onSelectRestaurant(featuredDrink)}
                      style={{ '--stagger-idx': 0 } as React.CSSProperties}
                      className="venue-row-interactive stagger-fade-in w-full text-left rounded-[6px] border border-[#2D5947] bg-[#143025] hover:border-[#F2A33A]/70 overflow-hidden group"
                    >
                      <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-[#122B22]">
                        <img
                          src={featuredDrink.photoUrl}
                          alt={featuredDrink.name}
                          className="w-full h-full object-cover object-center venue-photo-zoom"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#143025] via-[#143025]/25 to-transparent" />
                        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-[3px] bg-[#F2A33A] text-[#17382C] font-bold text-[11px] leading-none">
                            #1 În topul de vineri
                          </span>
                          <LocalnicBadge
                            label={`Localnici ${formatScore(featuredDrink.localsScore)}`}
                            size="xs"
                          />
                        </div>
                      </div>

                      <div className="p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-display text-[30px] leading-none text-[#F2A33A]">
                              1
                            </span>
                            <h3 className="font-display text-[24px] sm:text-[26px] leading-none text-[#F4EEE2] truncate">
                              {featuredDrink.name}
                            </h3>
                          </div>

                          <div className="text-[13px] text-[#F4EEE2]/75 leading-snug">
                            {featuredDrink.shortCategory ?? featuredDrink.cuisine},{' '}
                            {featuredDrink.shortNeighborhood ?? featuredDrink.neighborhood}.{' '}
                            {featuredDrink.priceRangeLabel}
                          </div>

                          {featuredDrink.whatToOrder[0] && (
                            <div className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[3px] bg-[#1E4335] text-[#F4EEE2]/90">
                              <span className="text-[#F2A33A] font-semibold">
                                Ce să iei:
                              </span>
                              <span className="truncate">
                                {featuredDrink.whatToOrder[0].name} ·{' '}
                                {featuredDrink.whatToOrder[0].priceRon} lei
                              </span>
                            </div>
                          )}

                          {featuredDrink.crowdSegments && featuredDrink.crowdLabel && (
                            <CrowdMeter
                              segments={featuredDrink.crowdSegments}
                              label={featuredDrink.crowdLabel}
                            />
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <CoasterScore score={featuredDrink.foodQualityScore} size="lg" />
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#F2A33A]">
                            <span>Vezi fișa</span>
                            <ArrowRight className="w-3.5 h-3.5 venue-cta-arrow opacity-75" />
                          </span>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Illustrated Rows #2+ */}
                  {compactDrinkSlice.length > 0 && (
                    <div className="divide-y divide-[#285443] border-t border-[#285443]">
                      {compactDrinkSlice.map((venue, idx) => (
                        <button
                          key={venue.id}
                          type="button"
                          onClick={() => onSelectRestaurant(venue)}
                          style={{ '--stagger-idx': idx + 1 } as React.CSSProperties}
                          className="venue-row-interactive stagger-fade-in w-full py-4 flex items-center justify-between gap-3.5 text-left hover:bg-[#1C4234] px-1.5 -mx-1.5 rounded-[4px]"
                        >
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            <span className="font-display text-[24px] leading-none text-[#F4EEE2]/70 w-4 pt-1 shrink-0">
                              {idx + 2}
                            </span>

                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden shrink-0 border border-[#285443] bg-[#122B22]">
                              <img
                                src={venue.photoUrl}
                                alt={venue.name}
                                className="w-full h-full object-cover object-center venue-photo-zoom"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[17px] leading-snug text-[#F4EEE2] truncate">
                                {venue.name}
                              </div>
                              <div className="text-[13px] text-[#F4EEE2]/75 mt-0.5 leading-snug">
                                {venue.shortCategory ?? venue.cuisine},{' '}
                                {venue.shortNeighborhood ?? venue.neighborhood}.{' '}
                                {venue.priceRangeLabel}
                              </div>
                              {venue.whatToOrder[0] && (
                                <div className="text-[12px] text-[#F2A33A]/90 mt-1 truncate">
                                  Recomandat: {venue.whatToOrder[0].name} (
                                  {venue.whatToOrder[0].priceRon} lei)
                                </div>
                              )}
                              {venue.crowdSegments && venue.crowdLabel && (
                                <CrowdMeter
                                  segments={venue.crowdSegments}
                                  label={venue.crowdLabel}
                                />
                              )}
                            </div>
                          </div>

                          <CoasterScore score={venue.foodQualityScore} size="md" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modest Sponsored Slot (Rule #3: darker/quieter surface, NO photo, smaller muted score, NO coaster) */}
              {drinkSponsored && (
                <button
                  type="button"
                  onClick={() => onSelectRestaurant(drinkSponsored)}
                  className="btn-press w-full mt-3 px-4 py-3.5 rounded-[4px] bg-[#1E4335] border border-[#295645] flex items-center justify-between gap-4 text-left hover:border-[#F4EEE2]/30"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#F4EEE2]/60">
                      {drinkSponsored.sponsoredNote ??
                        'Sponsorizat. Nu schimbă scorul.'}
                    </div>
                    <div className="font-semibold text-[15px] text-[#F4EEE2]/90 mt-0.5">
                      {drinkSponsored.name}
                    </div>
                    <div className="text-[12px] text-[#F4EEE2]/65">
                      {drinkSponsored.shortCategory ?? drinkSponsored.cuisine},{' '}
                      {drinkSponsored.shortNeighborhood ??
                        drinkSponsored.neighborhood}
                      . {drinkSponsored.priceRangeLabel}
                    </div>
                  </div>
                  <span className="font-display-regular text-[22px] text-[#F4EEE2]/65 tabular-nums shrink-0">
                    {formatScore(drinkSponsored.foodQualityScore)}
                  </span>
                </button>
              )}
            </section>

            {/* RIGHT 5 COLUMNS: Weekendul ăsta + Bottom CTA */}
            <aside
              aria-label="Weekendul ăsta"
              className="lg:col-span-5 space-y-6"
            >
              <div className="space-y-4">
                <h2 className="font-display text-[28px] sm:text-[32px] leading-none text-[#F4EEE2]">
                  Weekendul ăsta
                </h2>

                <div className="divide-y divide-[#285443] border-t border-[#285443]">
                  {weekendEvents.map((evt, idx) => {
                    const targetVenue = drinkVenues.find(
                      (v) => v.id === evt.venueId
                    );
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() =>
                          targetVenue && onSelectRestaurant(targetVenue)
                        }
                        style={{ '--stagger-idx': idx } as React.CSSProperties}
                        className="venue-row-interactive stagger-fade-in w-full py-4 flex items-center gap-3 text-left hover:bg-[#1C4234] px-1.5 -mx-1.5 rounded-[4px]"
                      >
                        {targetVenue?.photoUrl && (
                          <div className="w-14 h-14 rounded-[4px] overflow-hidden shrink-0 border border-[#285443] bg-[#122B22]">
                            <img
                              src={targetVenue.photoUrl}
                              alt={targetVenue.name}
                              className="w-full h-full object-cover object-center venue-photo-zoom"
                            />
                          </div>
                        )}
                        <div className="w-11 h-14 rounded-[4px] border border-[#F2A33A] flex flex-col items-center justify-center shrink-0">
                          <span className="text-[11px] text-[#F2A33A] leading-none">
                            {evt.dayShort}
                          </span>
                          <span className="font-display text-[22px] text-[#F4EEE2] leading-none mt-1">
                            {evt.dayNumber}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[15px] text-[#F4EEE2] leading-snug">
                            {evt.title}
                          </div>
                          <div className="text-[13px] text-[#F4EEE2]/70 mt-0.5">
                            {evt.details}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Chihlimbar CTA */}
              <button
                type="button"
                onClick={() => setIsVibeModalOpen(true)}
                className="btn-press w-full py-3.5 px-5 rounded-[4px] bg-[#F2A33A] text-[#17382C] font-bold text-[15px] hover:brightness-105"
              >
                Spune cât e de plin unde ești
              </button>
            </aside>
          </div>
        </div>

        {/* Interactive Vibe Check Reporter Modal */}
        {isVibeModalOpen && (
          <div
            className="modal-backdrop-enter fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setIsVibeModalOpen(false)}
          >
            <div
              className="drawer-sheet-enter w-full sm:max-w-md bg-[#17382C] border border-[#2D5947] text-[#F4EEE2] rounded-t-[8px] sm:rounded-[6px] p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[24px] leading-none">
                  Raportează cât e de plin
                </h3>
                <button
                  type="button"
                  onClick={() => setIsVibeModalOpen(false)}
                  aria-label="Închide"
                  className="btn-press p-1 text-[#F4EEE2]/70 hover:text-[#F4EEE2]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVibeSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold block">
                    Unde ești acum?
                  </label>
                  <select
                    value={vibeVenueId}
                    onChange={(e) => setVibeVenueId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[4px] bg-[#122B22] border border-[#2D5947] text-[#F4EEE2] text-[14px]"
                  >
                    {drinkVenues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.shortNeighborhood ?? v.neighborhood})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold block">
                    Cum e atmosfera? (expiră după 2 ore)
                  </label>
                  <div className="space-y-1.5">
                    {CROWD_PRESETS.map((preset) => {
                      const active = vibeSegments === preset.segments;
                      return (
                        <button
                          key={preset.segments}
                          type="button"
                          onClick={() => setVibeSegments(preset.segments)}
                          className={`btn-press w-full px-3 py-2.5 rounded-[4px] border flex items-center justify-between text-left text-[13px] ${
                            active
                              ? 'bg-[#F2A33A]/15 border-[#F2A33A] text-[#F4EEE2] font-semibold'
                              : 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/80 hover:border-[#F2A33A]/50'
                          }`}
                        >
                          <span>{preset.title}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <span
                                key={i}
                                className={`w-4 h-1.5 rounded-[1px] ${
                                  i <= preset.segments
                                    ? 'bg-[#F2A33A]'
                                    : 'bg-[#285443]'
                                }`}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-press w-full py-3 rounded-[4px] bg-[#F2A33A] text-[#17382C] font-bold text-[14px] hover:brightness-105"
                >
                  Trimite raportarea live
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // TOPFOOD / TIMIȘOARA VIEW (Page 3 — White + Cafea + Carou)
  // ============================================================================
  return (
    <div className="bg-white text-[#3A2418] pb-24">
      {/* HERO BLOCK */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-6 space-y-4">
        <h1 className="font-display text-[44px] sm:text-[56px] leading-[0.94] text-[#3A2418] max-w-xl">
          Unde mănâncă timișorenii
          <span className="hidden sm:inline">, nu turiștii</span>
        </h1>

        <div className="max-w-lg space-y-1.5">
          <label
            htmlFor="food-search-input"
            className="block text-[13px] font-semibold text-[#3A2418]"
          >
            Caută un local sau un fel de mâncare
          </label>
          <div className="relative">
            <input
              id="food-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ciorbă, pizza, Iosefin..."
              className="w-full px-3.5 py-2.5 pr-9 rounded-[4px] bg-white border border-[#3A2418] text-[15px] text-[#3A2418] placeholder-[#8C7B70] focus:outline-none focus:ring-1 focus:ring-[#3A2418]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Șterge căutarea"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E5649] hover:text-[#3A2418]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {FOOD_FILTER_PILLS.map((pill) => {
            const active = foodFilters.includes(pill.id);
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onToggleFoodFilter(pill.id)}
                className={`btn-press px-3.5 py-2 rounded-[4px] text-[13px] font-semibold border ${
                  active
                    ? 'bg-[#3A2418] text-white border-[#3A2418]'
                    : 'bg-white text-[#3A2418] border-[#D6CFC5] hover:border-[#3A2418]'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* SINGLE CAROU STRIP ON HOME SCREEN (Rule #1: appears once!) */}
      <CarouStrip height={10} />

      {/* MAIN EDITORIAL 12-COLUMN FEED */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* LEFT 7 COLUMNS: Topul onest */}
        <section aria-label="Topul onest" className="lg:col-span-7 space-y-4">
          <div className="flex items-baseline justify-between gap-2 pb-1">
            <h2 className="font-display text-[28px] sm:text-[32px] leading-none text-[#3A2418]">
              Topul onest
            </h2>
            <span className="text-[13px] text-[#6E5649]">
              după 4.180 de review-uri
            </span>
          </div>

          {filteredFoodOrganic.length === 0 ? (
            <div className="py-8 border-t border-[#E6DFD5] space-y-2">
              <p className="text-[15px] text-[#3A2418] font-semibold">
                Niciun local nu corespunde căutării.
              </p>
              <p className="text-[13px] text-[#6E5649]">
                Încearcă alt fel de mâncare sau dezactivează filtrele active.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Featured Rank #1 Spotlight Card */}
              {featuredFood && (
                <button
                  key={featuredFood.id}
                  type="button"
                  onClick={() => onSelectRestaurant(featuredFood)}
                  style={{ '--stagger-idx': 0 } as React.CSSProperties}
                  className="venue-row-interactive stagger-fade-in w-full text-left rounded-[6px] border border-[#E6DFD5] bg-[#FAF8F5] hover:border-[#3A2418]/40 overflow-hidden group"
                >
                  <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-[#ECE6DD]">
                    <img
                      src={featuredFood.photoUrl}
                      alt={featuredFood.name}
                      className="w-full h-full object-cover object-center venue-photo-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-[3px] bg-[#3A2418] text-white font-bold text-[11px] leading-none">
                        #1 În topul localnicilor
                      </span>
                      <LocalnicBadge
                        label={`Localnici ${formatScore(featuredFood.localsScore)}`}
                        size="xs"
                      />
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-display text-[34px] leading-none text-[#B3261E] shrink-0">
                          1
                        </span>
                        <h3 className="font-display text-[26px] sm:text-[30px] leading-none text-[#3A2418] truncate">
                          {featuredFood.name}
                        </h3>
                      </div>

                      <div className="text-[13px] text-[#6E5649]">
                        {featuredFood.shortCategory ?? featuredFood.cuisine},{' '}
                        {featuredFood.shortNeighborhood ?? featuredFood.neighborhood},{' '}
                        {featuredFood.priceRangeLabel ?? `~${featuredFood.avgMealPriceRon} lei`}
                      </div>

                      <p className="text-[13px] text-[#3A2418]/85 line-clamp-2 leading-snug">
                        {featuredFood.editorialHeadline}
                      </p>

                      {featuredFood.whatToOrder[0] && (
                        <div className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[3px] bg-white border border-[#E6DFD5] text-[#3A2418]">
                          <span className="text-[#B3261E] font-semibold">
                            Recomandat:
                          </span>
                          <span className="truncate">
                            {featuredFood.whatToOrder[0].name} ·{' '}
                            {featuredFood.whatToOrder[0].priceRon} lei
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
                      <span className="font-display text-[44px] sm:text-[52px] leading-[0.88] text-[#3A2418] tabular-nums">
                        {formatScore(featuredFood.foodQualityScore)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#B3261E] mt-2">
                        <span>Vezi fișa</span>
                        <ArrowRight className="w-3.5 h-3.5 venue-cta-arrow opacity-75" />
                      </span>
                    </div>
                  </div>
                </button>
              )}

              {/* Ranks 2–3 (Illustrated Rows) */}
              {compactFirstFoodSlice.length > 0 && (
                <div className="divide-y divide-[#E6DFD5] border-t border-[#E6DFD5]">
                  {compactFirstFoodSlice.map((venue, idx) => (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => onSelectRestaurant(venue)}
                      style={{ '--stagger-idx': idx + 1 } as React.CSSProperties}
                      className="venue-row-interactive stagger-fade-in w-full py-3.5 flex items-center justify-between gap-3.5 text-left hover:bg-[#FAF8F5] px-1.5 -mx-1.5 rounded-[4px]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className="font-display text-[26px] leading-none text-[#3A2418] w-5 shrink-0">
                          {idx + 2}
                        </span>
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden shrink-0 bg-[#ECE6DD] border border-[#E6DFD5]">
                          <img
                            src={venue.photoUrl}
                            alt={venue.name}
                            className="w-full h-full object-cover object-center venue-photo-zoom"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-bold text-[17px] text-[#3A2418] leading-snug truncate">
                            {venue.name}
                          </div>
                          <div className="text-[13px] text-[#6E5649] truncate">
                            {venue.shortCategory ?? venue.cuisine},{' '}
                            {venue.shortNeighborhood ?? venue.neighborhood},{' '}
                            {venue.priceRangeLabel ?? `~${venue.avgMealPriceRon} lei`}
                          </div>
                          <p className="text-[12px] text-[#6E5649]/90 line-clamp-1">
                            {venue.editorialHeadline}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <LocalnicBadge
                              label={`Localnici ${formatScore(venue.localsScore)}`}
                              size="xs"
                            />
                            {venue.whatToOrder[0] && (
                              <span className="text-[11px] text-[#6E5649] truncate">
                                {venue.whatToOrder[0].name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="font-display text-[34px] sm:text-[38px] leading-none text-[#3A2418] tabular-nums shrink-0">
                        {formatScore(venue.foodQualityScore)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Modest Sponsored Slot between #3 and #4 (Rule #3: quieter, NO photo, no rank, smaller score) */}
              {foodSponsored && (
                <button
                  type="button"
                  onClick={() => onSelectRestaurant(foodSponsored)}
                  className="btn-press w-full my-2 px-4 py-3.5 rounded-[4px] bg-[#F2EFE9] flex items-center justify-between gap-4 text-left hover:bg-[#EAE5DC]"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#6E5649]">
                      {foodSponsored.sponsoredNote ??
                        'Sponsorizat. Nu schimbă scorul și nici locul în top.'}
                    </div>
                    <div className="font-semibold text-[15px] text-[#3A2418] mt-0.5">
                      {foodSponsored.name}
                    </div>
                    <div className="text-[12px] text-[#6E5649]">
                      {foodSponsored.shortCategory ?? foodSponsored.cuisine},{' '}
                      {foodSponsored.shortNeighborhood ??
                        foodSponsored.neighborhood}
                      ,{' '}
                      {foodSponsored.priceRangeLabel ??
                        `~${foodSponsored.avgMealPriceRon} lei`}
                    </div>
                  </div>
                  <span className="font-display-regular text-[24px] leading-none text-[#6E5649] tabular-nums shrink-0">
                    {formatScore(foodSponsored.foodQualityScore)}
                  </span>
                </button>
              )}

              {/* Ranks 4+ (Illustrated Rows) */}
              {secondFoodSlice.length > 0 && (
                <div className="divide-y divide-[#E6DFD5] border-t border-[#E6DFD5]">
                  {secondFoodSlice.map((venue, idx) => (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => onSelectRestaurant(venue)}
                      style={{ '--stagger-idx': Math.min(idx + 3, 6) } as React.CSSProperties}
                      className="venue-row-interactive stagger-fade-in w-full py-3.5 flex items-center justify-between gap-3.5 text-left hover:bg-[#FAF8F5] px-1.5 -mx-1.5 rounded-[4px]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className="font-display text-[26px] leading-none text-[#3A2418] w-5 shrink-0">
                          {idx + 4}
                        </span>
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden shrink-0 bg-[#ECE6DD] border border-[#E6DFD5]">
                          <img
                            src={venue.photoUrl}
                            alt={venue.name}
                            className="w-full h-full object-cover object-center venue-photo-zoom"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-bold text-[17px] text-[#3A2418] leading-snug truncate">
                            {venue.name}
                          </div>
                          <div className="text-[13px] text-[#6E5649] truncate">
                            {venue.shortCategory ?? venue.cuisine},{' '}
                            {venue.shortNeighborhood ?? venue.neighborhood},{' '}
                            {venue.priceRangeLabel ??
                              `~${venue.avgMealPriceRon} lei`}
                          </div>
                          <p className="text-[12px] text-[#6E5649]/90 line-clamp-1">
                            {venue.editorialHeadline}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <LocalnicBadge
                              label={`Localnici ${formatScore(venue.localsScore)}`}
                              size="xs"
                            />
                            {venue.whatToOrder[0] && (
                              <span className="text-[11px] text-[#6E5649] truncate">
                                {venue.whatToOrder[0].name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="font-display text-[34px] sm:text-[38px] leading-none text-[#3A2418] tabular-nums shrink-0">
                        {formatScore(venue.foodQualityScore)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-4 flex items-center gap-5 border-t border-[#E6DFD5]">
                {filteredFoodOrganic.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTop((prev) => !prev)}
                    className="btn-press text-[14px] font-semibold text-[#B3261E] underline underline-offset-4 hover:opacity-80"
                  >
                    {showAllTop
                      ? 'Arată primele 5'
                      : `Vezi tot topul (${filteredFoodOrganic.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenMonthlyTop}
                  className="btn-press text-[14px] font-semibold text-[#3A2418] underline underline-offset-4 hover:text-[#B3261E]"
                >
                  Clasamentul lunii noiembrie
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT 5 COLUMNS: Atenție în Piața Unirii */}
        {foodTraps.length > 0 && (
          <aside
            aria-label="Atenție în Piața Unirii"
            className="lg:col-span-5 border-t-[3px] border-[#B3261E] pt-4 space-y-4"
          >
            <div className="space-y-1.5">
              <h2 className="font-display text-[28px] sm:text-[32px] leading-none text-[#3A2418]">
                Atenție în Piața Unirii
              </h2>
              <p className="text-[14px] text-[#6E5649] leading-snug">
                Trei terase din centru au scoruri mult mai mari la turiști decât
                la localnici.
              </p>
            </div>

            <div className="divide-y divide-[#E6DFD5] border-t border-[#E6DFD5]">
              {foodTraps.map((trap, idx) => {
                const isSevere = trap.touristTrapIndex >= 80;
                return (
                  <button
                    key={trap.id}
                    type="button"
                    onClick={() => onSelectRestaurant(trap)}
                    style={{ '--stagger-idx': idx } as React.CSSProperties}
                    className="venue-row-interactive stagger-fade-in w-full py-3.5 text-left hover:bg-[#FAF8F5] px-1.5 -mx-1.5 rounded-[4px] flex items-start gap-3"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[4px] overflow-hidden shrink-0 bg-[#ECE6DD] border border-[#E6DFD5] mt-0.5">
                      <img
                        src={trap.photoUrl}
                        alt={trap.name}
                        className="w-full h-full object-cover object-center venue-photo-zoom"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[15px] text-[#3A2418] truncate">
                          {trap.name}
                        </span>
                        <TrapBadge
                          variant={isSevere ? 'severe' : 'possible'}
                          label={isSevere ? 'Capcană' : 'Posibilă capcană'}
                        />
                      </div>
                      <p className="text-[12px] text-[#6E5649] leading-snug">
                        {trap.editorialHeadline}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#FAF8F5] border border-[#E6DFD5] text-[11px] font-semibold text-[#3A2418]">
                          <span className="text-[#1F4E8C]">
                            Localnici {formatScore(trap.localsScore)}
                          </span>
                          <span className="text-[#6E5649]">vs.</span>
                          <span className="text-[#B3261E]">
                            Turiști {formatScore(trap.touristsScore)}
                          </span>
                        </span>
                        <span className="font-display text-[20px] leading-none text-[#3A2418] tabular-nums">
                          {formatScore(trap.foodQualityScore)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Page 2 Avertizarea breakdown preview */}
            {foodTraps[0] && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setExpandedTrapPreview((prev) => !prev)}
                  aria-expanded={expandedTrapPreview}
                  className="btn-press text-[13px] font-semibold text-[#B3261E] underline underline-offset-4 hover:opacity-80"
                >
                  {expandedTrapPreview
                    ? 'Ascunde exemplul de avertizare'
                    : `Vezi avertizarea completă: ${foodTraps[0].name} (${foodTraps[0].touristTrapIndex} din 100)`}
                </button>

                <div className="collapse-grid" data-open={expandedTrapPreview}>
                  <div className="collapse-inner">
                    <div className="mt-4">
                      <AvertizareaCard
                        venueName={foodTraps[0].name}
                        trapIndex={foodTraps[0].touristTrapIndex}
                        reasons={foodTraps[0].trapReasons}
                        breakdown={foodTraps[0].trapBreakdown}
                        onSelectVenue={() => onSelectRestaurant(foodTraps[0])}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default EditorialListView;
