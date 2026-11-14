'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddVenuePanel } from './AddVenuePanel';
import { ThemeTopList, TopTabs } from './ThematicTops';
import { orderTops, type TopKey } from '@tftd/scoring/features';
import { ArrowRight, X } from 'lucide-react';
import {
  DrinkQuickFilter,
  FoodQuickFilter,
  Restaurant,
  ThemeTop,
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
import { DRINK_HERO_HEADERS, FOOD_HERO_HEADERS } from '../data/heroHeaders';

function normalizeRo(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export interface EditorialListViewProps {
  /** Cu backend: sub „niciun rezultat” apar „caută pe internet” și „adaugă localul” */
  canAddVenues?: boolean;
  onRequireLogin?: () => void;
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
  onResetFilters?: () => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onOpenMonthlyTop: () => void;
  onUpdateCrowdReport: (
    venueId: string,
    segments: 1 | 2 | 3 | 4 | 5,
    label: string
  ) => void;
  initialFoodHeroIndex?: number;
  initialDrinkHeroIndex?: number;
  /** Topurile tematice din backend; lipsă = doar topul general. */
  themeTops?: { food: ThemeTop[]; drink: ThemeTop[] };
  /** Preferințele userului: aleg ordinea topurilor, nu ascund nimic. */
  interests?: readonly string[];
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
  { segments: 1, title: 'Liber / Liniștit', reportLabel: 'Liber și liniștit, chiar acum' },
  { segments: 2, title: 'Locuri la mese', reportLabel: 'Locuri libere la mese, chiar acum' },
  { segments: 3, title: 'Atmosferă lejeră / Locuri la bar', reportLabel: 'Atmosferă lejeră, locuri la bar, chiar acum' },
  { segments: 4, title: 'Animat / Aproape plin', reportLabel: 'Animat, aproape plin, chiar acum' },
  { segments: 5, title: 'Plin / Coadă la intrare', reportLabel: 'Plin, coadă la intrare, chiar acum' },
];

const HorizontalFilterStrip: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [fadeState, setFadeState] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    if (!hasOverflow) {
      setFadeState((prev) =>
        prev.left || prev.right ? { left: false, right: false } : prev
      );
      return;
    }
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setFadeState((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right }
    );
  }, []);

  useEffect(() => {
    updateFade();
    const el = scrollRef.current;
    if (!el) return;
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateFade);
      ro.observe(el);
    }
    window.addEventListener('resize', updateFade);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateFade);
    };
  }, [updateFade, children]);

  const maskImage =
    fadeState.left && fadeState.right
      ? 'linear-gradient(to right, transparent 0%, black 20px, black calc(100% - 32px), transparent 100%)'
      : fadeState.right
      ? 'linear-gradient(to right, black 0%, black calc(100% - 32px), transparent 100%)'
      : fadeState.left
      ? 'linear-gradient(to right, transparent 0%, black 20px, black 100%)'
      : undefined;

  return (
    <div
      ref={scrollRef}
      onScroll={updateFade}
      style={
        maskImage
          ? {
              maskImage,
              WebkitMaskImage: maskImage,
            }
          : undefined
      }
      className={`flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-0.5 sm:mx-0 sm:px-0 sm:py-0 sm:flex-wrap ${
        fadeState.right ? 'pr-8 sm:pr-0' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

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
  onResetFilters,
  onSelectRestaurant,
  onOpenMonthlyTop,
  onUpdateCrowdReport,
  canAddVenues = false,
  onRequireLogin,
  initialFoodHeroIndex = 0,
  initialDrinkHeroIndex = 0,
  themeTops,
  interests = [],
}) => {
  const isDrink = vertical === 'drink';
  const themes = (isDrink ? themeTops?.drink : themeTops?.food) ?? [];
  const [chosenTop, setChosenTop] = useState<TopKey | null>(null);
  // Primul top = prima preferință care are date; userul poate schimba oricând.
  const firstTop = orderTops(interests).find((k) => k === 'general' || themes.some((t) => t.theme === k)) ?? 'general';
  const activeTop: TopKey = chosenTop && (chosenTop === 'general' || themes.some((t) => t.theme === chosenTop)) ? chosenTop : firstTop;
  const activeTheme = themes.find((t) => t.theme === activeTop);
  const openBySlug = (slug: string) => {
    const r = (isDrink ? drinkVenues : restaurants).find((x) => x.slug === slug);
    if (r) onSelectRestaurant(r);
  };
  const topTabs = <TopTabs themes={themes} interests={interests} active={activeTop} onChange={setChosenTop} dark={isDrink} />;
  const [showAllTop, setShowAllTop] = useState(false);
  const [expandedTrapPreview, setExpandedTrapPreview] = useState(false);
  const [showScorOnestInfo, setShowScorOnestInfo] = useState(false);

  const activeFoodHero =
    FOOD_HERO_HEADERS[initialFoodHeroIndex % FOOD_HERO_HEADERS.length] ??
    FOOD_HERO_HEADERS[0];
  const activeDrinkHero =
    DRINK_HERO_HEADERS[initialDrinkHeroIndex % DRINK_HERO_HEADERS.length] ??
    DRINK_HERO_HEADERS[0];

  // Vibe Check modal state for topdrink
  const [isVibeModalOpen, setIsVibeModalOpen] = useState(false);
  const [vibeVenueId, setVibeVenueId] = useState<string>(
    drinkVenues[0]?.id ?? 'pivnita-cu-bolta'
  );
  const [vibeSegments, setVibeSegments] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [vibeSubmittedNotice, setVibeSubmittedNotice] = useState<string | null>(
    null
  );
  const [vibeSwipeY, setVibeSwipeY] = useState(0);
  const [isVibeSwiping, setIsVibeSwiping] = useState(false);
  const [hasVibeDragged, setHasVibeDragged] = useState(false);

  const vibeDialogRef = useRef<HTMLDivElement | null>(null);
  const vibePreviousFocusRef = useRef<HTMLElement | null>(null);
  const vibeTouchStartYRef = useRef<number | null>(null);
  const vibeCanSwipeRef = useRef(false);

  useEffect(() => {
    if (!isVibeModalOpen) return;

    setVibeSwipeY(0);
    setIsVibeSwiping(false);
    setHasVibeDragged(false);
    vibePreviousFocusRef.current = document.activeElement as HTMLElement | null;

    const getFocusableElements = (): HTMLElement[] => {
      const root = vibeDialogRef.current;
      if (!root) return [];
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      return nodes.filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
    };

    const focusTimer = window.requestAnimationFrame(() => {
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        vibeDialogRef.current?.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVibeModalOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active && vibeDialogRef.current?.contains(active);

      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      vibePreviousFocusRef.current?.focus();
    };
  }, [isVibeModalOpen]);

  const handleVibeTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    const isHandleOrHeader = Boolean(target?.closest('[data-vibe-drag-handle]'));
    const atScrollTop = (vibeDialogRef.current?.scrollTop ?? 0) <= 0;
    if (!isHandleOrHeader && (!atScrollTop || target?.closest('select'))) {
      vibeCanSwipeRef.current = false;
      return;
    }
    vibeCanSwipeRef.current = true;
    vibeTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleVibeTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!vibeCanSwipeRef.current || vibeTouchStartYRef.current === null) return;
    const deltaY = e.touches[0].clientY - vibeTouchStartYRef.current;
    if (deltaY > 4) {
      setIsVibeSwiping(true);
      setHasVibeDragged(true);
      setVibeSwipeY(deltaY);
    } else {
      setVibeSwipeY(0);
    }
  };

  const handleVibeTouchEnd = () => {
    if (!vibeCanSwipeRef.current) return;
    vibeCanSwipeRef.current = false;
    vibeTouchStartYRef.current = null;
    setIsVibeSwiping(false);
    if (vibeSwipeY >= 80) {
      setVibeSwipeY(0);
      setIsVibeModalOpen(false);
    } else {
      setVibeSwipeY(0);
    }
  };

  // Filtered Food Lists
  const filteredFoodOrganic = useMemo(() => {
    const q = normalizeRo(searchQuery.trim());
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
          const hay = normalizeRo(
            `${r.name} ${r.shortCategory ?? r.cuisine} ${
              r.shortNeighborhood ?? r.neighborhood
            } ${r.whatToOrder.map((d) => d.name).join(' ')}`
          );
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
    const q = normalizeRo(searchQuery.trim());
    return restaurants
      .filter((r) => r.touristTrapIndex >= 60)
      .filter((r) => {
        if (q) {
          const hay = normalizeRo(
            `${r.name} ${r.shortCategory ?? r.cuisine} ${
              r.shortNeighborhood ?? r.neighborhood
            } ${r.whatToOrder.map((d) => d.name).join(' ')}`
          );
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.touristTrapIndex - a.touristTrapIndex);
  }, [restaurants, foodFilters, searchQuery]);

  const totalFoodReviews = useMemo(
    () =>
      restaurants.reduce(
        (sum, r) =>
          sum +
          (r.reviewCounts
            ? r.reviewCounts.locals +
              r.reviewCounts.tourists +
              r.reviewCounts.influencers
            : r.reviews.length),
        0
      ),
    [restaurants]
  );

  const hasActiveFoodCriteria =
    searchQuery.trim().length > 0 || foodFilters.length > 0;

  const drinkHeading = drinkFilters.includes('in-timpul-saptamanii')
    ? 'Topul din timpul săptămânii'
    : drinkFilters.includes('vineri-noaptea')
    ? 'Topul de vineri'
    : 'Topul barurilor';

  const hasActiveDrinkSearch = searchQuery.trim().length > 0;

  // Filtered Drink Lists
  const filteredDrinkOrganic = useMemo(() => {
    const q = normalizeRo(searchQuery.trim());
    return drinkVenues
      .filter((r) => !r.isSponsored)
      .filter((r) => {
        for (const f of drinkFilters) {
          if (!r.drinkTags?.includes(f)) return false;
        }
        if (q) {
          const hay = normalizeRo(
            `${r.name} ${r.shortCategory ?? r.cuisine} ${
              r.shortNeighborhood ?? r.neighborhood
            } ${r.whatToOrder.map((d) => d.name).join(' ')}`
          );
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.foodQualityScore - a.foodQualityScore);
  }, [drinkVenues, drinkFilters, searchQuery]);

  const handleResetAll = () => {
    onSearchChange('');
    if (onResetFilters) {
      onResetFilters();
      return;
    }
    if (isDrink) {
      drinkFilters.forEach((f) => onToggleDrinkFilter(f));
    } else {
      foodFilters.forEach((f) => onToggleFoodFilter(f));
    }
  };

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
      CROWD_PRESETS.find((p) => p.segments === vibeSegments) ?? CROWD_PRESETS[2];
    onUpdateCrowdReport(vibeVenueId, vibeSegments, preset.reportLabel);
    const venueName =
      drinkVenues.find((d) => d.id === vibeVenueId)?.name ?? 'local';
    setVibeSubmittedNotice(
      `Raport trimis pentru ${venueName}: „${preset.reportLabel}”.`
    );
    setIsVibeModalOpen(false);
  };

  const renderSponsoredCard = (venue: Restaurant) => (
    <button
      type="button"
      onClick={() => onSelectRestaurant(venue)}
      className={
        isDrink
          ? 'btn-press w-full mt-3 px-4 py-3.5 rounded-[4px] bg-[#1E4335] border border-[#295645] flex items-center justify-between gap-4 text-left hover:border-[#F4EEE2]/30'
          : 'btn-press w-full my-2 px-4 py-3.5 rounded-[4px] bg-[#F2EFE9] flex items-center justify-between gap-4 text-left hover:bg-[#EAE5DC]'
      }
    >
      <div className="min-w-0">
        <div
          className={`text-[11px] ${
            isDrink ? 'text-[#F4EEE2]/60' : 'text-[#6E5649]'
          }`}
        >
          {venue.sponsoredNote ??
            (isDrink
              ? 'Sponsorizat. Nu schimbă scorul.'
              : 'Sponsorizat. Nu schimbă scorul și nici locul în top.')}
        </div>
        <div
          className={`font-semibold text-[15px] mt-0.5 ${
            isDrink ? 'text-[#F4EEE2]/90' : 'text-[#3A2418]'
          }`}
        >
          {venue.name}
        </div>
        <div
          className={`text-[12px] ${
            isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
          }`}
        >
          {venue.shortCategory ?? venue.cuisine},{' '}
          {venue.shortNeighborhood ?? venue.neighborhood}
          {isDrink
            ? `. ${venue.priceRangeLabel}`
            : `, ${venue.priceRangeLabel ?? `~${venue.avgMealPriceRon} lei`}`}
        </div>
      </div>
      <span
        className={`font-display-regular tabular-nums shrink-0 ${
          isDrink
            ? 'text-[22px] text-[#F4EEE2]/65'
            : 'text-[24px] leading-none text-[#6E5649]'
        }`}
      >
        {formatScore(venue.foodQualityScore)}
      </span>
    </button>
  );

  const renderFoodRow = (venue: Restaurant, rank: number, staggerIdx: number) => (
    <button
      key={venue.id}
      type="button"
      onClick={() => onSelectRestaurant(venue)}
      style={{ '--stagger-idx': staggerIdx } as React.CSSProperties}
      className="venue-row-interactive stagger-fade-in w-full py-3.5 flex items-center justify-between gap-2.5 sm:gap-3.5 text-left hover:bg-[#FAF8F5] px-0 sm:px-1.5 sm:-mx-1.5 rounded-[4px]"
    >
      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        <span className="font-display text-[22px] sm:text-[26px] leading-none text-[#3A2418] w-4 sm:w-5 pt-0.5 sm:pt-0 shrink-0">
          {rank}
        </span>
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden shrink-0 bg-[#ECE6DD] border border-[#E6DFD5]">
          <img
            src={venue.photoUrl}
            alt={venue.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center venue-photo-zoom"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-bold text-[16px] sm:text-[17px] text-[#3A2418] leading-snug line-clamp-2 sm:truncate">
            {venue.name}
          </div>
          <div className="text-[12px] sm:text-[13px] text-[#6E5649] truncate">
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
              <span className="text-[11px] text-[#6E5649] truncate max-w-full">
                {venue.whatToOrder[0].name}
              </span>
            )}
          </div>
        </div>
      </div>

      <span className="font-display text-[28px] sm:text-[38px] leading-none text-[#3A2418] tabular-nums shrink-0">
        {formatScore(venue.foodQualityScore)}
      </span>
    </button>
  );

  // ============================================================================
  // TOPDRINK / TIMIȘOARA VIEW (Page 5 — Sticlă #17382C)
  // ============================================================================
  if (isDrink) {
    return (
      <div className="min-h-screen text-[#F4EEE2] pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 space-y-6 sm:space-y-8">
          {/* Hero */}
          <section className="space-y-3.5 sm:space-y-4">
            <h1 className="font-display text-[36px] min-[375px]:text-[44px] sm:text-[56px] leading-[0.94] text-[#F4EEE2] max-w-xl text-balance">
              {activeDrinkHero}
            </h1>

            <div className="max-w-lg space-y-1.5">
              <label
                htmlFor="food-search-input"
                className="block text-[13px] font-semibold text-[#F4EEE2]"
              >
                Caută un bar, o bere sau un cartier
              </label>
              <div className="relative">
                <input
                  id="food-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="bere artizanală, jazz, Cetate..."
                  className="w-full min-h-[44px] px-3.5 py-2.5 pr-11 rounded-[4px] bg-[#122B22] border border-[#2D5947] text-[16px] sm:text-[15px] text-[#F4EEE2] placeholder:text-current placeholder:opacity-60 focus:outline-none focus:ring-1 focus:ring-[#F2A33A] focus:border-[#F2A33A]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Șterge căutarea"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#F4EEE2]/70 hover:text-[#F4EEE2]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills (Chihlimbar #F2A33A active) */}
            <HorizontalFilterStrip className="pb-0.5 sm:pb-0">
              {DRINK_FILTER_PILLS.map((pill) => {
                const active = drinkFilters.includes(pill.id);
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => onToggleDrinkFilter(pill.id)}
                    className={`btn-press shrink-0 min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-[4px] text-[13px] font-semibold border whitespace-nowrap ${
                      active
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#17382C] text-[#F4EEE2] border-[#2D5947] hover:border-[#F2A33A]/60'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </HorizontalFilterStrip>

            {vibeSubmittedNotice && (
              <div className="stagger-fade-in px-3.5 py-2 rounded-[4px] bg-[#1E4335] border border-[#F2A33A]/50 text-[13px] text-[#F4EEE2] flex items-center justify-between gap-2">
                <span>{vibeSubmittedNotice}</span>
                <button
                  type="button"
                  onClick={() => setVibeSubmittedNotice(null)}
                  className="btn-press min-h-[44px] sm:min-h-0 px-2 -mr-2 text-[#F2A33A] text-[12px] font-semibold shrink-0"
                >
                  Închide
                </button>
              </div>
            )}
          </section>

          {/* Main 12-column editorial layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* LEFT 7 COLUMNS: Dynamic drink ranking */}
            <section
              aria-label={drinkHeading}
              className="lg:col-span-7 space-y-3"
            >
              <div className="space-y-1 pb-1">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h2 className="font-display text-[26px] sm:text-[32px] leading-none text-[#F4EEE2]">
                    {activeTheme ? `Top: ${activeTheme.label}` : drinkHeading}
                  </h2>
                  {!activeTheme && (
                    <span className="text-[12px] sm:text-[13px] text-[#F4EEE2]/65">
                      plin acum, din raportări
                    </span>
                  )}
                </div>

                <div hidden={!!activeTheme}>
                  <button
                    type="button"
                    onClick={() => setShowScorOnestInfo((prev) => !prev)}
                    aria-expanded={showScorOnestInfo}
                    className="btn-press min-h-[44px] sm:min-h-0 inline-flex items-center -my-1.5 sm:my-0 text-[12px] font-semibold text-[#F2A33A] underline underline-offset-4 hover:opacity-85"
                  >
                    Cum calculăm Scorul Onest?
                  </button>

                  <div className="collapse-grid" data-open={showScorOnestInfo}>
                    <div className="collapse-inner">
                      <div className="mt-2 p-3.5 rounded-[4px] bg-[#143025] border border-[#2D5947] text-[12px] text-[#F4EEE2]/85 space-y-1 leading-relaxed">
                        <p>
                          <strong className="text-[#F4EEE2]">Localnici verificați (2,0×):</strong>{' '}
                          contribuția timișorenilor cântărește dublu.
                        </p>
                        <p>
                          <strong className="text-[#F4EEE2]">Turiști (1,0×):</strong>{' '}
                          nota vizitatorilor este afișată separat pentru a detecta capcanele turistice.
                        </p>
                        <p>
                          <strong className="text-[#F4EEE2]">Influenceri / colaborări plătite (0,2×):</strong>{' '}
                          impact limitat asupra clasamentului.
                        </p>
                        <p>
                          Localurile cu puține recenzii au media trasă spre media orașului, iar pozițiile{' '}
                          <strong className="text-[#F4EEE2]">„Sponsorizat”</strong> nu schimbă niciodată scorul sau locul în top.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {topTabs}
              {activeTheme ? (
                <ThemeTopList top={activeTheme} onSelect={openBySlug} dark />
              ) : filteredDrinkOrganic.length === 0 ? (
                <div className="py-8 border-t border-[#285443] space-y-3">
                  <p className="text-[14px] text-[#F4EEE2]/75">
                    Niciun bar nu corespunde căutării sau filtrelor selectate.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="btn-press min-h-[44px] inline-flex items-center px-4 py-2 rounded-[4px] bg-[#F2A33A] text-[#17382C] text-[13px] font-bold hover:brightness-105"
                  >
                    Resetează filtrele
                  </button>
                  {canAddVenues && searchQuery.trim().length >= 2 && (
                    <AddVenuePanel vertical="drink" query={searchQuery} onRequireLogin={onRequireLogin} />
                  )}
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
                          {!hasActiveDrinkSearch && drinkFilters.length === 1 && drinkFilters[0] === 'vineri-noaptea' && (
                            <span className="px-2.5 py-1 rounded-[3px] bg-[#F2A33A] text-[#17382C] font-bold text-[11px] leading-none">
                              #1 În topul de vineri
                            </span>
                          )}
                          <LocalnicBadge
                            label={`Localnici ${formatScore(featuredDrink.localsScore)}`}
                            size="xs"
                          />
                        </div>
                      </div>

                      <div className="p-3.5 sm:p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-display text-[28px] sm:text-[30px] leading-none text-[#F2A33A] shrink-0">
                                1
                              </span>
                              <h3 className="font-display text-[22px] sm:text-[26px] leading-[1.05] text-[#F4EEE2] line-clamp-2 sm:truncate">
                                {featuredDrink.name}
                              </h3>
                            </div>

                            <div className="text-[13px] text-[#F4EEE2]/75 leading-snug">
                              {featuredDrink.shortCategory ?? featuredDrink.cuisine},{' '}
                              {featuredDrink.shortNeighborhood ?? featuredDrink.neighborhood}.{' '}
                              {featuredDrink.priceRangeLabel}
                            </div>
                          </div>

                          <CoasterScore score={featuredDrink.foodQualityScore} size="lg" />
                        </div>

                        {featuredDrink.whatToOrder[0] && (
                          <div className="inline-flex max-w-full overflow-hidden items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[3px] bg-[#1E4335] text-[#F4EEE2]/90">
                            <span className="text-[#F2A33A] font-semibold shrink-0">
                              Ce să iei:
                            </span>
                            <span className="min-w-0 truncate">
                              {featuredDrink.whatToOrder[0].name}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums">
                              · {featuredDrink.whatToOrder[0].priceRon} lei
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
                          <div className="min-w-0">
                            {featuredDrink.crowdSegments && featuredDrink.crowdLabel && (
                              <CrowdMeter
                                segments={featuredDrink.crowdSegments}
                                label={featuredDrink.crowdLabel}
                              />
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#F2A33A] ml-auto shrink-0 pt-1">
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
                          className="venue-row-interactive stagger-fade-in w-full py-4 flex items-center justify-between gap-2.5 sm:gap-3.5 text-left hover:bg-[#1C4234] px-0 sm:px-1.5 sm:-mx-1.5 rounded-[4px]"
                        >
                          <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                            <span className="font-display text-[22px] sm:text-[24px] leading-none text-[#F4EEE2]/70 w-4 pt-1 shrink-0">
                              {idx + 2}
                            </span>

                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden shrink-0 border border-[#285443] bg-[#122B22]">
                              <img
                                src={venue.photoUrl}
                                alt={venue.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover object-center venue-photo-zoom"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[16px] sm:text-[17px] leading-snug text-[#F4EEE2] line-clamp-2 sm:truncate">
                                {venue.name}
                              </div>
                              <div className="text-[12px] sm:text-[13px] text-[#F4EEE2]/75 mt-0.5 leading-snug">
                                {venue.shortCategory ?? venue.cuisine},{' '}
                                {venue.shortNeighborhood ?? venue.neighborhood}.{' '}
                                {venue.priceRangeLabel}
                              </div>
                              {venue.whatToOrder[0] && (
                                <div className="flex items-center gap-1 text-[12px] text-[#F2A33A]/90 mt-1 min-w-0">
                                  <span className="min-w-0 truncate">
                                    Recomandat: {venue.whatToOrder[0].name}
                                  </span>
                                  <span className="shrink-0 tabular-nums">
                                    ({venue.whatToOrder[0].priceRon} lei)
                                  </span>
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
              {!activeTheme && drinkSponsored && renderSponsoredCard(drinkSponsored)}
            </section>

            {/* RIGHT 5 COLUMNS: Weekendul ăsta + Bottom CTA */}
            <aside
              aria-label="Weekendul ăsta"
              className="lg:col-span-5 space-y-6"
            >
              <div className="space-y-4">
                <h2 className="font-display text-[26px] sm:text-[32px] leading-none text-[#F4EEE2]">
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
                        className="venue-row-interactive stagger-fade-in w-full py-4 flex items-center gap-3 text-left hover:bg-[#1C4234] px-0 sm:px-1.5 sm:-mx-1.5 rounded-[4px]"
                      >
                        {targetVenue?.photoUrl && (
                          <div className="w-14 h-14 rounded-[4px] overflow-hidden shrink-0 border border-[#285443] bg-[#122B22]">
                            <img
                              src={targetVenue.photoUrl}
                              alt={targetVenue.name}
                              loading="lazy"
                              decoding="async"
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
                className="btn-press w-full min-h-[48px] py-3.5 px-5 rounded-[4px] bg-[#F2A33A] text-[#17382C] font-bold text-[15px] hover:brightness-105"
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
              ref={vibeDialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="vibe-modal-title"
              onTouchStart={handleVibeTouchStart}
              onTouchMove={handleVibeTouchMove}
              onTouchEnd={handleVibeTouchEnd}
              onTouchCancel={handleVibeTouchEnd}
              style={{
                transform:
                  vibeSwipeY > 0 ? `translateY(${vibeSwipeY}px)` : undefined,
                transition: isVibeSwiping
                  ? 'none'
                  : 'transform 200ms var(--ease-out)',
              }}
              className={`${
                hasVibeDragged ? '' : 'drawer-sheet-enter'
              } w-full max-w-full sm:max-w-md bg-[#17382C] border border-[#2D5947] text-[#F4EEE2] rounded-t-[12px] sm:rounded-[6px] px-4 pt-2 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain focus:outline-none`}
              onClick={(e) => e.stopPropagation()}
            >
              <div data-vibe-drag-handle="true" className="space-y-3">
                <div className="sm:hidden py-1.5 -my-1 cursor-grab active:cursor-grabbing">
                  <div className="w-10 h-1 rounded-full mx-auto bg-[#F4EEE2]/30" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3
                    id="vibe-modal-title"
                    className="font-display text-[22px] sm:text-[24px] leading-none"
                  >
                    Raportează cât e de plin
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsVibeModalOpen(false)}
                    aria-label="Închide"
                    className="btn-press w-11 h-11 flex items-center justify-center -mr-2 rounded-[4px] text-[#F4EEE2]/70 hover:text-[#F4EEE2]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleVibeSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="vibe-venue-select"
                    className="text-[13px] font-semibold block"
                  >
                    Unde ești acum?
                  </label>
                  <select
                    id="vibe-venue-select"
                    value={vibeVenueId}
                    onChange={(e) => setVibeVenueId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-[4px] bg-[#122B22] border border-[#2D5947] text-[#F4EEE2] text-[16px] sm:text-[14px]"
                  >
                    {drinkVenues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.shortNeighborhood ?? v.neighborhood})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="text-[13px] font-semibold block">
                    Cum e atmosfera? (expiră după 2 ore)
                  </span>
                  <div className="space-y-1.5">
                    {CROWD_PRESETS.map((preset) => {
                      const active = vibeSegments === preset.segments;
                      return (
                        <button
                          key={preset.segments}
                          type="button"
                          onClick={() => setVibeSegments(preset.segments)}
                          className={`btn-press w-full min-h-[44px] px-3 py-2.5 rounded-[4px] border flex items-center justify-between gap-2 text-left text-[13px] ${
                            active
                              ? 'bg-[#F2A33A]/15 border-[#F2A33A] text-[#F4EEE2] font-semibold'
                              : 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/80 hover:border-[#F2A33A]/50'
                          }`}
                        >
                          <span>{preset.title}</span>
                          <div className="flex items-center gap-1 shrink-0">
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
                  className="btn-press w-full min-h-[48px] py-3 rounded-[4px] bg-[#F2A33A] text-[#17382C] font-bold text-[14px] hover:brightness-105"
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
    <div className="text-[#3A2418] pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-24">
      {/* HERO BLOCK */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-5 sm:pb-6 space-y-3.5 sm:space-y-4">
        <h1 className="font-display text-[32px] min-[375px]:text-[36px] sm:text-[54px] leading-[0.96] text-[#3A2418] max-w-2xl text-balance">
          {activeFoodHero.main}
          <span>{activeFoodHero.tail}</span>
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
              className="w-full min-h-[44px] px-3.5 py-2.5 pr-11 rounded-[4px] bg-white border border-[#3A2418] text-[16px] sm:text-[15px] text-[#3A2418] placeholder-[#8C7B70] focus:outline-none focus:ring-1 focus:ring-[#3A2418]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Șterge căutarea"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#6E5649] hover:text-[#3A2418]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pills */}
        <HorizontalFilterStrip className="pt-0.5">
          {FOOD_FILTER_PILLS.map((pill) => {
            const active = foodFilters.includes(pill.id);
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onToggleFoodFilter(pill.id)}
                className={`btn-press shrink-0 min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-[4px] text-[13px] font-semibold border whitespace-nowrap ${
                  active
                    ? 'bg-[#3A2418] text-white border-[#3A2418]'
                    : 'bg-white text-[#3A2418] border-[#D6CFC5] hover:border-[#3A2418]'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </HorizontalFilterStrip>
      </section>

      {/* SINGLE CAROU STRIP ON HOME SCREEN (Rule #1: appears once!) */}
      <CarouStrip height={10} />

      {/* MAIN EDITORIAL 12-COLUMN FEED */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-7 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* LEFT 7 COLUMNS: Topul onest */}
        <section aria-label="Topul onest" className="lg:col-span-7 space-y-4">
          <div className="space-y-1 pb-1">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h2 className="font-display text-[26px] sm:text-[32px] leading-none text-[#3A2418]">
                {activeTheme ? `Top: ${activeTheme.label}` : 'Topul onest'}
              </h2>
              {!activeTheme && (
                <span className="text-[12px] sm:text-[13px] text-[#6E5649]">
                  după {totalFoodReviews.toLocaleString('ro-RO')} de review-uri
                </span>
              )}
            </div>

            <div hidden={!!activeTheme}>
              <button
                type="button"
                onClick={() => setShowScorOnestInfo((prev) => !prev)}
                aria-expanded={showScorOnestInfo}
                className="btn-press min-h-[44px] sm:min-h-0 inline-flex items-center -my-1.5 sm:my-0 text-[12px] font-semibold text-[#6E5649] underline underline-offset-4 hover:text-[#3A2418]"
              >
                Cum calculăm Scorul Onest?
              </button>

              <div className="collapse-grid" data-open={showScorOnestInfo}>
                <div className="collapse-inner">
                  <div className="mt-2 p-3.5 rounded-[4px] bg-[#FAF8F5] border border-[#E6DFD5] text-[12px] text-[#3A2418]/85 space-y-1 leading-relaxed">
                    <p>
                      <strong className="text-[#3A2418]">Localnici verificați (2,0×):</strong>{' '}
                      contribuția timișorenilor cântărește dublu.
                    </p>
                    <p>
                      <strong className="text-[#3A2418]">Turiști (1,0×):</strong>{' '}
                      nota vizitatorilor este afișată separat pentru a detecta capcanele turistice.
                    </p>
                    <p>
                      <strong className="text-[#3A2418]">Influenceri / colaborări plătite (0,2×):</strong>{' '}
                      impact limitat asupra clasamentului.
                    </p>
                    <p>
                      Localurile cu puține recenzii au media trasă spre media orașului, iar pozițiile{' '}
                      <strong className="text-[#3A2418]">„Sponsorizat”</strong> nu schimbă niciodată scorul sau locul în top.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {topTabs}
          {activeTheme ? (
            <ThemeTopList top={activeTheme} onSelect={openBySlug} dark={false} />
          ) : filteredFoodOrganic.length === 0 ? (
            <div className="py-8 border-t border-[#E6DFD5] space-y-3">
              <div className="space-y-1">
                <p className="text-[15px] text-[#3A2418] font-semibold">
                  Niciun local nu corespunde căutării.
                </p>
                <p className="text-[13px] text-[#6E5649]">
                  Încearcă alt fel de mâncare sau dezactivează filtrele active.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetAll}
                className="btn-press min-h-[44px] inline-flex items-center px-4 py-2 rounded-[4px] bg-[#3A2418] text-white text-[13px] font-semibold hover:opacity-90"
              >
                Resetează filtrele
              </button>
              {canAddVenues && searchQuery.trim().length >= 2 && (
                <AddVenuePanel vertical="food" query={searchQuery} onRequireLogin={onRequireLogin} />
              )}
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
                      {!hasActiveFoodCriteria && (
                        <span className="px-2.5 py-1 rounded-[3px] bg-[#3A2418] text-white font-bold text-[11px] leading-none">
                          #1 În topul localnicilor
                        </span>
                      )}
                      <LocalnicBadge
                        label={`Localnici ${formatScore(featuredFood.localsScore)}`}
                        size="xs"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-5 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-[30px] sm:text-[34px] leading-none text-[#B3261E] shrink-0">
                            1
                          </span>
                          <h3 className="font-display text-[24px] sm:text-[30px] leading-[1.05] text-[#3A2418] line-clamp-2 sm:truncate">
                            {featuredFood.name}
                          </h3>
                        </div>

                        <div className="text-[13px] text-[#6E5649]">
                          {featuredFood.shortCategory ?? featuredFood.cuisine},{' '}
                          {featuredFood.shortNeighborhood ?? featuredFood.neighborhood},{' '}
                          {featuredFood.priceRangeLabel ?? `~${featuredFood.avgMealPriceRon} lei`}
                        </div>
                      </div>

                      <span className="font-display text-[40px] min-[375px]:text-[44px] sm:text-[52px] leading-[0.88] text-[#3A2418] tabular-nums shrink-0">
                        {formatScore(featuredFood.foodQualityScore)}
                      </span>
                    </div>

                    <p className="text-[13px] text-[#3A2418]/85 line-clamp-2 leading-snug">
                      {featuredFood.editorialHeadline}
                    </p>

                    <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
                      {featuredFood.whatToOrder[0] ? (
                        <div className="inline-flex max-w-full overflow-hidden items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[3px] bg-white border border-[#E6DFD5] text-[#3A2418]">
                          <span className="text-[#B3261E] font-semibold shrink-0">
                            Recomandat:
                          </span>
                          <span className="min-w-0 truncate">
                            {featuredFood.whatToOrder[0].name}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            · {featuredFood.whatToOrder[0].priceRon} lei
                          </span>
                        </div>
                      ) : (
                        <span />
                      )}

                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#B3261E] ml-auto shrink-0">
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
                  {compactFirstFoodSlice.map((venue, idx) =>
                    renderFoodRow(venue, idx + 2, idx + 1)
                  )}
                </div>
              )}

              {/* Modest Sponsored Slot between #3 and #4 (Rule #3: quieter, NO photo, no rank, smaller score) */}
              {foodSponsored && renderSponsoredCard(foodSponsored)}

              {/* Ranks 4+ (Illustrated Rows) */}
              {secondFoodSlice.length > 0 && (
                <div className="divide-y divide-[#E6DFD5] border-t border-[#E6DFD5]">
                  {secondFoodSlice.map((venue, idx) =>
                    renderFoodRow(venue, idx + 4, Math.min(idx + 3, 6))
                  )}
                </div>
              )}

              <div className="pt-3 flex items-center flex-wrap gap-4 sm:gap-5 border-t border-[#E6DFD5]">
                {filteredFoodOrganic.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTop((prev) => !prev)}
                    className="btn-press min-h-[44px] inline-flex items-center text-[14px] font-semibold text-[#B3261E] underline underline-offset-4 hover:opacity-80"
                  >
                    {showAllTop
                      ? 'Arată primele 5'
                      : `Vezi tot topul (${filteredFoodOrganic.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenMonthlyTop}
                  className="btn-press min-h-[44px] inline-flex items-center text-[14px] font-semibold text-[#3A2418] underline underline-offset-4 hover:text-[#B3261E]"
                >
                  Clasamentul lunii
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
              <h2 className="font-display text-[26px] sm:text-[32px] leading-none text-[#3A2418]">
                Atenție în Piața Unirii
              </h2>
              <p className="text-[14px] text-[#6E5649] leading-snug">
                {foodTraps.length}{' '}
                {foodTraps.length === 1 ? 'local' : 'localuri'} din centru au
                scoruri mult mai mari la turiști decât la localnici.
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
                    className="venue-row-interactive stagger-fade-in w-full py-3.5 text-left hover:bg-[#FAF8F5] px-0 sm:px-1.5 sm:-mx-1.5 rounded-[4px] flex items-start gap-2.5 sm:gap-3"
                  >
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-[4px] overflow-hidden shrink-0 bg-[#ECE6DD] border border-[#E6DFD5] mt-0.5">
                      <img
                        src={trap.photoUrl}
                        alt={trap.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center venue-photo-zoom"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <span className="font-bold text-[15px] text-[#3A2418] leading-snug">
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
                      <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#FAF8F5] border border-[#E6DFD5] text-[11px] font-semibold text-[#3A2418]">
                          <span className="text-[#1F4E8C]">
                            Localnici {formatScore(trap.localsScore)}
                          </span>
                          <span className="text-[#6E5649]">vs.</span>
                          <span className="text-[#B3261E]">
                            Turiști {formatScore(trap.touristsScore)}
                          </span>
                        </span>
                        <span className="font-display text-[20px] leading-none text-[#3A2418] tabular-nums ml-auto">
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
                  className="btn-press min-h-[44px] inline-flex items-center text-left text-[13px] font-semibold text-[#B3261E] underline underline-offset-4 hover:opacity-80"
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
