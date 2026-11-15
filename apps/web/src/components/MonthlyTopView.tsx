'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Download,
  Lock,
  Trophy,
  Vote,
} from 'lucide-react';
import { MonthlyAwards, Restaurant, TopReviewer, UserAccount, Vertical, formatScore } from '../types';
import {
  ComputedCategoryVoteTop,
  PublicVoteNominee,
  getCurrentActiveVoteMonth,
  getPublicVoteCategoryTops,
  mergeCategoryTopWithVotes,
} from '../data/monthlyCategoryTops';
import {
  castMonthlyCategoryVote,
  getMonthlyVotesState,
  type MonthlyVotesSnapshot,
} from '../app/actions/monthly-votes';
import { EditorialVoteSeal, TrophyMedalBadge } from './BrandPrimitives';

export interface MonthlyTopViewProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  onBack: () => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  /** Din backend; lipsă = lista statică */
  topReviewers?: TopReviewer[];
  awards?: MonthlyAwards;
  selectedMonth?: string | null;
  onSelectMonth?: (month: string | null) => void;
  currentUser?: UserAccount | null;
  backendOnline?: boolean;
  onRequireLogin?: () => void;
  initialVoteSnapshot?: MonthlyVotesSnapshot;
  initialSubmenu?: 'clasament' | 'vot';
}

const LOCAL_COUNTS_KEY = 'topfood-monthly-votes-counts-v1';
const LOCAL_USER_VOTES_KEY = 'topfood-monthly-votes-by-user-v1';

interface LocalVoteStore {
  counts: Record<string, Record<string, Record<string, number>>>;
  byUser: Record<string, Record<string, string>>;
}

function readLocalVoteStore(): LocalVoteStore {
  if (typeof window === 'undefined') return { counts: {}, byUser: {} };
  try {
    const rawCounts = window.localStorage.getItem(LOCAL_COUNTS_KEY);
    const rawByUser = window.localStorage.getItem(LOCAL_USER_VOTES_KEY);
    return {
      counts: rawCounts ? (JSON.parse(rawCounts) as LocalVoteStore['counts']) : {},
      byUser: rawByUser ? (JSON.parse(rawByUser) as LocalVoteStore['byUser']) : {},
    };
  } catch {
    return { counts: {}, byUser: {} };
  }
}

function writeLocalVoteStore(store: LocalVoteStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_COUNTS_KEY, JSON.stringify(store.counts));
    window.localStorage.setItem(LOCAL_USER_VOTES_KEY, JSON.stringify(store.byUser));
  } catch {
    // Ignore storage quota errors in restricted browsers
  }
}

function formatMonthRo(ym: string): string {
  const [y, m] = ym.split('-');
  const d = new Date(Date.UTC(Number(y), Math.max(0, Number(m) - 1), 1));
  if (Number.isNaN(d.getTime())) return ym;
  const formatted = new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const MonthlyTopView: React.FC<MonthlyTopViewProps> = ({
  vertical,
  restaurants,
  onBack,
  onSelectRestaurant,
  awards,
  selectedMonth: selectedMonthProp = null,
  onSelectMonth,
  currentUser = null,
  backendOnline = false,
  onRequireLogin,
  initialVoteSnapshot,
  initialSubmenu = 'clasament',
}) => {
  const isDrink = vertical === 'drink';
  const availableMonths = awards?.months ?? [];
  const activeVoteMonth = getCurrentActiveVoteMonth(availableMonths);
  const [internalMonth, setInternalMonth] = useState<string>(availableMonths[0] ?? activeVoteMonth);
  const selectedMonth = selectedMonthProp ?? internalMonth;
  const setSelectedMonth = (m: string) => {
    setInternalMonth(m);
    onSelectMonth?.(m);
  };
  const isVotingOpen = selectedMonth === activeVoteMonth;
  const [activeSubmenu, setActiveSubmenu] = useState<'clasament' | 'vot'>(initialSubmenu);
  const [selectedVoteCategory, setSelectedVoteCategory] = useState<string>('all');
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [voteFeedback, setVoteFeedback] = useState<{
    categoryId?: string;
    tone: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const [voteSnapshot, setVoteSnapshot] = useState<MonthlyVotesSnapshot>(
    initialVoteSnapshot ?? { countsByCategory: {}, myVotesByCategory: {} }
  );

  // Sincronizează voturile din DB (dacă backendOnline) sau din localStorage
  useEffect(() => {
    let cancelled = false;
    const monthKey = `${selectedMonth}:${vertical}`;
    const userKey = currentUser ? `${monthKey}:${currentUser.id}` : null;

    if (!backendOnline) {
      const store = readLocalVoteStore();
      setVoteSnapshot({
        countsByCategory: store.counts[monthKey] ?? {},
        myVotesByCategory: userKey ? store.byUser[userKey] ?? {} : {},
      });
      return;
    }

    (async () => {
      const res = await getMonthlyVotesState({ vertical, month: selectedMonth });
      if (cancelled) return;
      if (res.ok) {
        setVoteSnapshot({
          countsByCategory: res.countsByCategory,
          myVotesByCategory: res.myVotesByCategory,
        });
      } else if (res.offline) {
        const store = readLocalVoteStore();
        setVoteSnapshot({
          countsByCategory: store.counts[monthKey] ?? {},
          myVotesByCategory: userKey ? store.byUser[userKey] ?? {} : {},
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [backendOnline, vertical, selectedMonth, currentUser?.id]);

  const baseVoteCategories = useMemo(
    () => getPublicVoteCategoryTops(vertical, selectedMonth),
    [vertical, selectedMonth]
  );

  const publicVoteCategories = useMemo<ComputedCategoryVoteTop[]>(
    () =>
      baseVoteCategories.map((cat) =>
        mergeCategoryTopWithVotes(
          cat,
          restaurants,
          vertical,
          voteSnapshot.countsByCategory[cat.id] ?? {}
        )
      ),
    [baseVoteCategories, restaurants, vertical, voteSnapshot.countsByCategory]
  );

  const activeVoteCategoryId = useMemo(
    () =>
      selectedVoteCategory !== 'all' &&
      publicVoteCategories.some((c) => c.id === selectedVoteCategory)
        ? selectedVoteCategory
        : 'all',
    [publicVoteCategories, selectedVoteCategory]
  );

  const visibleVoteCategories = useMemo(
    () =>
      activeVoteCategoryId === 'all'
        ? publicVoteCategories
        : publicVoteCategories.filter((c) => c.id === activeVoteCategoryId),
    [publicVoteCategories, activeVoteCategoryId]
  );

  const votedSectionsCount = useMemo(
    () =>
      publicVoteCategories.filter((cat) => Boolean(voteSnapshot.myVotesByCategory[cat.id])).length,
    [publicVoteCategories, voteSnapshot.myVotesByCategory]
  );

  const handleCastVote = async (category: ComputedCategoryVoteTop, nominee: PublicVoteNominee) => {
    if (!isVotingOpen) {
      setVoteFeedback({
        categoryId: category.id,
        tone: 'info',
        text: 'Votul pentru această lună este închis. Poți vota în luna curentă.',
      });
      return;
    }

    if (!currentUser) {
      if (onRequireLogin) {
        onRequireLogin();
      } else {
        setVoteFeedback({
          categoryId: category.id,
          tone: 'info',
          text: 'Intră în cont ca să votezi (1 vot per secțiune pe lună).',
        });
      }
      return;
    }

    if (voteSnapshot.myVotesByCategory[category.id]) {
      setVoteFeedback({
        categoryId: category.id,
        tone: 'info',
        text: 'Ai folosit deja votul tău pentru această secțiune luna aceasta.',
      });
      return;
    }

    const voteKey = `${category.id}:${nominee.candidateSlug}`;
    setSubmittingKey(voteKey);
    setVoteFeedback(null);

    if (backendOnline) {
      const res = await castMonthlyCategoryVote({
        vertical,
        month: selectedMonth,
        activeMonth: activeVoteMonth,
        categoryId: category.id,
        venueSlug: nominee.candidateSlug,
        venueName: nominee.venueName,
      });

      if (res.ok) {
        setVoteSnapshot({
          countsByCategory: res.countsByCategory,
          myVotesByCategory: res.myVotesByCategory,
        });
        setVoteFeedback({
          categoryId: category.id,
          tone: 'success',
          text: `Vot înregistrat pentru ${nominee.venueName} la „${category.shortLabel}”.`,
        });
        setSubmittingKey(null);
        return;
      }

      if (!res.offline) {
        if (/Intră în cont/.test(res.error) && onRequireLogin) {
          onRequireLogin();
        } else {
          setVoteFeedback({
            categoryId: category.id,
            tone: 'error',
            text: res.error,
          });
        }
        setSubmittingKey(null);
        return;
      }
    }

    // Offline / fără DATABASE_URL: persistă local per user · secțiune · lună
    const monthKey = `${selectedMonth}:${vertical}`;
    const userKey = `${monthKey}:${currentUser.id}`;
    const store = readLocalVoteStore();
    const existingForUser = store.byUser[userKey]?.[category.id];
    if (existingForUser) {
      setVoteSnapshot({
        countsByCategory: store.counts[monthKey] ?? {},
        myVotesByCategory: store.byUser[userKey] ?? {},
      });
      setVoteFeedback({
        categoryId: category.id,
        tone: 'info',
        text: 'Ai votat deja în această secțiune luna aceasta.',
      });
      setSubmittingKey(null);
      return;
    }

    store.counts[monthKey] ??= {};
    store.counts[monthKey][category.id] ??= {};
    store.counts[monthKey][category.id][nominee.candidateSlug] =
      (store.counts[monthKey][category.id][nominee.candidateSlug] ?? 0) + 1;
    store.byUser[userKey] ??= {};
    store.byUser[userKey][category.id] = nominee.candidateSlug;
    writeLocalVoteStore(store);

    setVoteSnapshot({
      countsByCategory: store.counts[monthKey],
      myVotesByCategory: store.byUser[userKey],
    });
    setVoteFeedback({
      categoryId: category.id,
      tone: 'success',
      text: `Vot înregistrat pentru ${nominee.venueName} la „${category.shortLabel}”.`,
    });
    setSubmittingKey(null);
  };

  const restaurantBySlug = useMemo(
    () => new Map(restaurants.map((r) => [r.slug, r])),
    [restaurants]
  );

  // Build ranked list for the podium (1–3) and list (4–7)
  const rankedVenues = useMemo(() => {
    // Doar localurile din topul înghețat al lunii (calculat din review-uri reale); fără top, lista e goală
    const withRank = restaurants
      .filter((r) => !r.isSponsored && r.monthlyRank != null)
      .sort((a, b) => (a.monthlyRank ?? 0) - (b.monthlyRank ?? 0));

    return withRank.slice(0, 7).map((v) => ({
      ...v,
      displayScore: v.monthlyScore ?? v.foodQualityScore,
    }));
  }, [restaurants, selectedMonth]);

  const first = rankedVenues[0];
  const second = rankedVenues[1];
  const third = rankedVenues[2];
  const restRanks = rankedVenues.slice(3, 7);

  return (
    <div
      className={`min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-24 ${
        isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Top breadcrumb back row */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Înapoi"
            className={`btn-press w-11 h-11 rounded-[4px] border flex items-center justify-center ${
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
              top-luna
            </strong>
          </span>
        </div>

        {/* Title + Month dropdown */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <h1 className="font-display text-[36px] sm:text-[44px] leading-[0.95]">
              Topul lunii
            </h1>

            {availableMonths.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0 max-w-full">
              <a
                href={`/api/share/top-luna?vertical=${vertical}&month=${encodeURIComponent(selectedMonth)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] border text-[13px] font-semibold ${
                  isDrink
                    ? 'border-[#2D5947] bg-[#143025] text-[#F2A33A] hover:border-[#F2A33A]'
                    : 'border-[#D6CFC5] bg-white text-[#B3261E] hover:border-[#B3261E]'
                }`}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Imagine IG / TikTok</span>
                <span className="sr-only"> (se deschide într-o filă nouă)</span>
              </a>
              <div className="relative shrink-0 max-w-full">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label="Selectează luna"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: 'none',
                  }}
                  className={`appearance-none [-webkit-appearance:none] [-moz-appearance:none] bg-none max-w-full min-h-[44px] pl-3.5 pr-9 py-2 rounded-[4px] border text-[16px] sm:text-[13px] font-semibold cursor-pointer ${
                    isDrink
                      ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                      : 'bg-white border-[#D6CFC5] text-[#3A2418]'
                  }`}
                >
                  {availableMonths.map((m, i) => (
                    <option key={m} value={m}>
                      {formatMonthRo(m)}{i > 0 ? ' (arhivă)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="w-4 h-4 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70"
                />
              </div>
            </div>
            )}
          </div>

          <p
            className={`text-[14px] max-w-xl ${
              isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
            }`}
          >
            Se resetează pe 1 ale lunii. Contează doar review-urile verificate din
            luna curentă.
          </p>

          {/* Submeniu editorial: Clasament & Top 3 vs Votează luna asta */}
          <div
            role="tablist"
            aria-label="Submeniu Topul lunii"
            className={`grid grid-cols-2 p-1 rounded-[4px] border max-w-md ${
              isDrink
                ? 'bg-[#122B22] border-[#285443]'
                : 'bg-[#FAF8F5] border-[#E6DFD5]'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSubmenu === 'clasament'}
              onClick={() => setActiveSubmenu('clasament')}
              className={`btn-press min-h-[42px] px-3 py-1.5 rounded-[3px] text-[13px] flex items-center justify-center gap-1.5 ${
                activeSubmenu === 'clasament'
                  ? isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] font-bold'
                    : 'bg-[#3A2418] text-white font-bold'
                  : isDrink
                    ? 'text-[#F4EEE2]/75 hover:text-[#F4EEE2] font-semibold'
                    : 'text-[#6E5649] hover:text-[#3A2418] font-semibold'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Clasament &amp; Top 3</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSubmenu === 'vot'}
              onClick={() => setActiveSubmenu('vot')}
              className={`btn-press min-h-[42px] px-3 py-1.5 rounded-[3px] text-[13px] flex items-center justify-center gap-1.5 ${
                activeSubmenu === 'vot'
                  ? isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] font-bold'
                    : 'bg-[#3A2418] text-white font-bold'
                  : isDrink
                    ? 'text-[#F4EEE2]/75 hover:text-[#F4EEE2] font-semibold'
                    : 'text-[#6E5649] hover:text-[#3A2418] font-semibold'
              }`}
            >
              <Vote className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{isVotingOpen ? 'Votează luna asta' : 'Buletin arhivat'}</span>
              {isVotingOpen && currentUser && publicVoteCategories.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold tabular-nums leading-none ${
                    activeSubmenu === 'vot'
                      ? isDrink
                        ? 'bg-[#17382C]/20 text-[#17382C]'
                        : 'bg-white/20 text-white'
                      : isDrink
                        ? 'bg-[#285443] text-[#F2A33A]'
                        : 'bg-[#E6DFD5] text-[#3A2418]'
                  }`}
                >
                  {votedSectionsCount}/{publicVoteCategories.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeSubmenu === 'clasament' && (
          <>
        {/* ===================================================================
            PODIUM + RANKS 4–7
            =================================================================== */}
        {rankedVenues.length === 0 && (
          <p className={`py-8 text-center text-[15px] ${isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'}`}>
            Topul lunii apare după prima lună încheiată cu review-uri reale.
          </p>
        )}
        {rankedVenues.length > 0 && (
        <section aria-label="Podiumul lunii" className="space-y-0">
            {/* Podium Columns: logical DOM order #1 -> #2 -> #3, visual 2 - 1 - 3 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-end pt-3">
              {/* #1 Center (tallest, 1st in DOM for screen readers) */}
              {first && (
                <button
                  type="button"
                  onClick={() => onSelectRestaurant(first)}
                  className="order-2 venue-row-interactive text-center flex flex-col items-center group"
                >
                  <Trophy
                    aria-hidden="true"
                    className={`w-5 h-5 mb-1.5 ${
                      isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                    }`}
                  />
                  <div
                    className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden border-[2.5px] mb-2 shrink-0 ${
                      isDrink
                        ? 'border-[#F2A33A] bg-[#122B22]'
                        : 'border-[#B3261E] bg-[#ECE6DD]'
                    }`}
                  >
                    <img
                      src={first.photoUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover venue-photo-zoom"
                    />
                  </div>
                  <span className="font-bold text-[12px] min-[375px]:text-[13px] sm:text-[15px] leading-tight group-hover:text-[#B3261E] line-clamp-2">
                    <span className="sr-only">Locul 1: </span>
                    {first.name}
                  </span>
                  <span
                    className={`text-[11px] sm:text-[12px] mt-1 mb-2 sm:mb-2.5 leading-tight ${
                      isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                    }`}
                  >
                    {first.monthlyStatusLabel ?? '= ca luna trecută'}
                  </span>
                  <div
                    className={`podium-rise w-full h-32 sm:h-36 rounded-t-[6px] flex flex-col items-center justify-center ${
                      isDrink
                        ? 'bg-[#F2A33A] text-[#17382C]'
                        : 'bg-[#B3261E] text-white'
                    }`}
                  >
                    <span className="font-display text-[32px] sm:text-[36px] leading-none">
                      1
                    </span>
                    <span className="text-[13px] sm:text-[14px] mt-1 font-semibold tabular-nums">
                      {formatScore(first.displayScore)}
                    </span>
                  </div>
                </button>
              )}

              {/* #2 Left (2nd in DOM) */}
              {second && (
                <button
                  type="button"
                  onClick={() => onSelectRestaurant(second)}
                  className="order-1 venue-row-interactive text-center flex flex-col items-center group"
                >
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 mb-2 shrink-0 ${
                      isDrink
                        ? 'border-[#2D5947] bg-[#122B22]'
                        : 'border-[#3A2418] bg-[#ECE6DD]'
                    }`}
                  >
                    <img
                      src={second.photoUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover venue-photo-zoom"
                    />
                  </div>
                  <span className="font-bold text-[12px] min-[375px]:text-[13px] sm:text-[15px] leading-tight group-hover:text-[#B3261E] line-clamp-2">
                    <span className="sr-only">Locul 2: </span>
                    {second.name}
                  </span>
                  <span
                    className={`text-[11px] sm:text-[12px] font-semibold mt-1 mb-2 sm:mb-2.5 leading-tight ${
                      isDrink ? 'text-[#F2A33A]' : 'text-[#1F5E3B]'
                    }`}
                  >
                    {second.monthlyStatusLabel ?? '▲ 3 locuri'}
                  </span>
                  <div
                    style={{ animationDelay: '60ms' }}
                    className={`podium-rise w-full h-24 sm:h-28 rounded-t-[6px] flex flex-col items-center justify-center ${
                      isDrink
                        ? 'bg-[#285443] text-[#F4EEE2]'
                        : 'bg-[#3A2418] text-white'
                    }`}
                  >
                    <span className="font-display text-[26px] sm:text-[30px] leading-none">
                      2
                    </span>
                    <span className="text-[13px] mt-1 opacity-85 tabular-nums">
                      {formatScore(second.displayScore)}
                    </span>
                  </div>
                </button>
              )}

              {/* #3 Right (3rd in DOM) */}
              {third && (
                <button
                  type="button"
                  onClick={() => onSelectRestaurant(third)}
                  className="order-3 venue-row-interactive text-center flex flex-col items-center group"
                >
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 mb-2 shrink-0 ${
                      isDrink
                        ? 'border-[#CFA47A] bg-[#122B22]'
                        : 'border-[#E0A526] bg-[#ECE6DD]'
                    }`}
                  >
                    <img
                      src={third.photoUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover venue-photo-zoom"
                    />
                  </div>
                  <span className="font-bold text-[12px] min-[375px]:text-[13px] sm:text-[15px] leading-tight group-hover:text-[#B3261E] line-clamp-2">
                    <span className="sr-only">Locul 3: </span>
                    {third.name}
                  </span>
                  <span
                    className={`text-[11px] sm:text-[12px] font-semibold mt-1 mb-2 sm:mb-2.5 leading-tight ${
                      isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                    }`}
                  >
                    {third.monthlyStatusLabel ?? '▼ 1 loc'}
                  </span>
                  <div
                    style={{ animationDelay: '110ms' }}
                    className={`podium-rise w-full h-20 sm:h-24 rounded-t-[6px] flex flex-col items-center justify-center ${
                      isDrink
                        ? 'bg-[#CFA47A] text-[#17382C]'
                        : 'bg-[#E0A526] text-[#3A2418]'
                    }`}
                  >
                    <span className="font-display text-[24px] sm:text-[28px] leading-none">
                      3
                    </span>
                    <span className="text-[13px] mt-1 font-semibold tabular-nums">
                      {formatScore(third.displayScore)}
                    </span>
                  </div>
                </button>
              )}
            </div>

            {/* Ranks 4–7 */}
            {restRanks.length > 0 && (
              <div
                className={`border rounded-b-[6px] divide-y ${
                  isDrink
                    ? 'border-[#285443] divide-[#285443] bg-[#143025]'
                    : 'border-[#E6DFD5] divide-[#E6DFD5] bg-white'
                }`}
              >
                {restRanks.map((spot, idx) => {
                  const rankNum = idx + 4;
                  const status = spot.monthlyStatusLabel ?? '—';
                  const isUp = status.startsWith('▲');
                  const isDown = status.startsWith('▼');
                  const isNew = status === 'NOU';

                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => onSelectRestaurant(spot)}
                      style={{ '--stagger-idx': idx } as React.CSSProperties}
                      className={`venue-row-interactive stagger-fade-in w-full min-h-[60px] px-3 sm:px-4 py-3 flex items-center justify-between gap-2.5 sm:gap-4 text-left ${
                        isDrink ? 'hover:bg-[#1E4335]' : 'hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span
                          className={`font-display text-[20px] w-4 shrink-0 ${
                            isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                          }`}
                        >
                          {rankNum}
                        </span>
                        <div
                          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[4px] overflow-hidden shrink-0 border ${
                            isDrink
                              ? 'border-[#285443] bg-[#122B22]'
                              : 'border-[#E6DFD5] bg-[#ECE6DD]'
                          }`}
                        >
                          <img
                            src={spot.photoUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover venue-photo-zoom"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[15px] truncate">
                            {spot.name}
                          </div>
                          <div
                            className={`text-[13px] truncate ${
                              isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                            }`}
                          >
                            {spot.shortNeighborhood ?? spot.neighborhood}
                            {isNew ? ' · nou intrat' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                        <span
                          className={`text-[12px] font-bold ${
                            isNew
                              ? isDrink
                                ? 'text-[#F2A33A]'
                                : 'text-[#1F5E3B]'
                              : isUp
                              ? isDrink
                                ? 'text-[#F2A33A]'
                                : 'text-[#1F5E3B]'
                              : isDown
                              ? 'text-[#B3261E]'
                              : 'text-[#6E5649]'
                          }`}
                        >
                          {status}
                        </span>
                        <span className="font-display text-[22px] tabular-nums">
                          {formatScore(spot.displayScore)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ===================================================================
            VOTUL PUBLICULUI — TOP 3 PE CATEGORII (Doar clasamentul, fără butoane de vot)
            =================================================================== */}
        {publicVoteCategories.length > 0 && (
          <section
            aria-label="Votul publicului — Top 3 pe categorii"
            className="space-y-3.5 pt-2"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <EditorialVoteSeal drink={isDrink} />
                  <h2 className="font-display text-[26px] leading-tight">
                    Votul publicului · Top 3
                  </h2>
                </div>
                {isVotingOpen ? (
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu('vot')}
                    className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border text-[12px] font-bold ${
                      isDrink
                        ? 'border-[#F2A33A] bg-[#143025] text-[#F2A33A] hover:bg-[#F2A33A] hover:text-[#17382C]'
                        : 'border-[#B3261E] bg-white text-[#B3261E] hover:bg-[#B3261E] hover:text-white'
                    }`}
                  >
                    <Vote className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Votează acum</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </button>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border text-[11px] font-semibold ${
                      isDrink
                        ? 'border-[#2D5947] bg-[#122B22] text-[#F4EEE2]/80'
                        : 'border-[#D6CFC5] bg-white text-[#6E5649]'
                    }`}
                  >
                    <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
                    Arhivă închisă · Top final
                  </span>
                )}
              </div>

              <p
                className={`text-[13px] sm:text-[14px] max-w-xl ${
                  isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                }`}
              >
                {isDrink
                  ? 'Cea mai bună bere la halbă, cel mai bun cocktail și atmosfera preferată a timișorenilor. Top 3 actualizat după fiecare lună.'
                  : 'Cea mai bună shaorma, cel mai bun burger, cea mai bună pizza și alte preferate ale timișorenilor. Top 3 actualizat după fiecare lună.'}
              </p>
            </div>

            {/* Category filter pills */}
            <div
              role="group"
              aria-label="Filtrează după categorie"
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                aria-pressed={activeVoteCategoryId === 'all'}
                onClick={() => setSelectedVoteCategory('all')}
                className={`btn-press min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-[4px] border text-[13px] font-semibold whitespace-nowrap ${
                  activeVoteCategoryId === 'all'
                    ? isDrink
                      ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                      : 'bg-[#3A2418] border-[#3A2418] text-white'
                    : isDrink
                      ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                      : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                }`}
              >
                Toate ({publicVoteCategories.length})
              </button>
              {publicVoteCategories.map((cat) => {
                const selected = activeVoteCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedVoteCategory(cat.id)}
                    className={`btn-press min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-[4px] border text-[13px] font-semibold whitespace-nowrap ${
                      selected
                        ? isDrink
                          ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                          : 'bg-[#3A2418] border-[#3A2418] text-white'
                        : isDrink
                          ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                          : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                    }`}
                  >
                    {cat.shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Clean Top 3 cards */}
            <div
              className={`grid gap-3 ${
                visibleVoteCategories.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {visibleVoteCategories.map((category, catIdx) => (
                <article
                  key={`${selectedMonth}-${category.id}`}
                  style={{ '--stagger-idx': catIdx } as React.CSSProperties}
                  className={`stagger-fade-in rounded-[6px] border overflow-hidden ${
                    isDrink
                      ? 'border-[#2D5947] bg-[#143025]'
                      : 'border-[#E6DFD5] bg-[#FAF8F5]'
                  }`}
                >
                  <div
                    className={`px-4 py-3 border-b flex items-baseline justify-between gap-2 ${
                      isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                    }`}
                  >
                    <h3 className="font-display text-[20px] leading-tight">
                      {category.title}
                    </h3>
                    <span
                      className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                        isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                      }`}
                    >
                      {category.totalVotes.toLocaleString('ro-RO')} voturi
                    </span>
                  </div>

                  <ol
                    className={`divide-y ${
                      isDrink ? 'divide-[#285443]' : 'divide-[#E6DFD5]'
                    }`}
                  >
                    {category.top3.map((entry) => {
                      const matchedVenue = entry.venueSlug
                        ? restaurantBySlug.get(entry.venueSlug)
                        : undefined;
                      const isUp = entry.trendLabel.startsWith('▲');
                      const isDown = entry.trendLabel.startsWith('▼');
                      const isNew = entry.trendLabel === 'NOU';

                      const trendClass =
                        isNew || isUp
                          ? isDrink
                            ? 'text-[#F2A33A]'
                            : 'text-[var(--localnic)]'
                          : isDown
                            ? 'text-[#B3261E]'
                            : isDrink
                              ? 'text-[#F4EEE2]/65'
                              : 'text-[#6E5649]';

                      const rowContent = (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TrophyMedalBadge rank={entry.rank} categoryId={category.id} />

                            <div className="min-w-0">
                              <div className="font-bold text-[14px] sm:text-[15px] leading-snug truncate flex items-center gap-1">
                                <span className="truncate">{entry.venueName}</span>
                                {matchedVenue && (
                                  <ArrowUpRight
                                    aria-hidden="true"
                                    className={`w-3.5 h-3.5 shrink-0 opacity-65 ${
                                      isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                                    }`}
                                  />
                                )}
                              </div>
                              <div
                                className={`text-[12px] truncate ${
                                  isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                                }`}
                              >
                                {entry.dishHighlight} · {entry.neighborhood}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 text-right">
                            <span className={`text-[11px] font-bold ${trendClass}`}>
                              {entry.trendLabel}
                            </span>
                            <div>
                              <div className="font-display text-[17px] leading-none tabular-nums">
                                {entry.voteSharePct}%
                              </div>
                              <div
                                className={`text-[11px] mt-0.5 tabular-nums ${
                                  isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                                }`}
                              >
                                {entry.votes} voturi
                              </div>
                            </div>
                          </div>
                        </>
                      );

                      return (
                        <li key={`${category.id}-${entry.rank}`}>
                          {matchedVenue ? (
                            <button
                              type="button"
                              onClick={() => onSelectRestaurant(matchedVenue)}
                              className={`venue-row-interactive w-full min-h-[60px] px-4 py-2.5 flex items-center justify-between gap-3 text-left ${
                                isDrink ? 'hover:bg-[#1E4335]' : 'hover:bg-white'
                              }`}
                            >
                              {rowContent}
                            </button>
                          ) : (
                            <div className="w-full min-h-[60px] px-4 py-2.5 flex items-center justify-between gap-3">
                              {rowContent}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </article>
              ))}
            </div>
          </section>
        )}
          </>
        )}

        {/* ===================================================================
            SUBMENIU DEDICAT DE VOT: BULETINUL LUNII (1 vot / secțiune / lună)
            =================================================================== */}
        {activeSubmenu === 'vot' && (
          <section
            aria-label="Submeniu de vot — Votul lunii"
            className="space-y-4 pt-1"
          >
            {/* Editorial ballot header */}
            <div
              className={`rounded-[6px] border p-4 sm:p-5 space-y-3 ${
                isDrink
                  ? 'border-[#2D5947] bg-[#143025]'
                  : 'border-[#E6DFD5] bg-[#FAF8F5]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <EditorialVoteSeal drink={isDrink} />
                  <div>
                    <div
                      className={`text-[11px] font-bold uppercase tracking-[0.06em] ${
                        isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                      }`}
                    >
                      Buletin oficial · {formatMonthRo(selectedMonth)}
                    </div>
                    <h2 className="font-display text-[26px] leading-tight mt-0.5">
                      Votează favoritele lunii
                    </h2>
                    <p
                      className={`text-[13px] mt-1 max-w-xl ${
                        isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                      }`}
                    >
                      Ai dreptul la <strong>1 vot per secțiune pe lună</strong>. După încheierea
                      lunii, rezultatele se blochează și actualizează clasamentul Top 3.
                    </p>
                  </div>
                </div>

                {isVotingOpen ? (
                  currentUser ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border text-[12px] font-bold shrink-0 ${
                        isDrink
                          ? 'border-[#F2A33A]/50 bg-[#122B22] text-[#F2A33A]'
                          : 'border-[#2D5130]/35 bg-[#EFF5EF] text-[var(--localnic)]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {votedSectionsCount}/{publicVoteCategories.length} secțiuni votate
                    </span>
                  ) : onRequireLogin ? (
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className={`btn-press min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border text-[13px] font-bold shrink-0 ${
                        isDrink
                          ? 'border-[#F2A33A] bg-[#F2A33A] text-[#17382C] hover:bg-[#f7b963]'
                          : 'border-[#B3261E] bg-[#B3261E] text-white hover:bg-[#961f18]'
                      }`}
                    >
                      <Vote className="w-4 h-4 shrink-0" aria-hidden="true" />
                      Intră în cont pentru a vota
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border text-[12px] font-semibold shrink-0 ${
                        isDrink
                          ? 'border-[#2D5947] bg-[#122B22] text-[#F4EEE2]/80'
                          : 'border-[#D6CFC5] bg-white text-[#6E5649]'
                      }`}
                    >
                      <Vote className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      1 vot / secțiune / lună
                    </span>
                  )
                ) : (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border text-[12px] font-semibold shrink-0 ${
                      isDrink
                        ? 'border-[#2D5947] bg-[#122B22] text-[#F4EEE2]/80'
                        : 'border-[#D6CFC5] bg-white text-[#6E5649]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Arhivă închisă · Votul s-a încheiat
                  </span>
                )}
              </div>

              {voteFeedback && (
                <div
                  role="status"
                  className={`px-3 py-2 rounded-[4px] border text-[12px] font-medium ${
                    voteFeedback.tone === 'success'
                      ? isDrink
                        ? 'border-[#F2A33A]/50 bg-[#1B3F31] text-[#F4EEE2]'
                        : 'border-[#2D5130]/35 bg-[#EFF5EF] text-[#2D5130]'
                      : voteFeedback.tone === 'error'
                        ? 'border-[#B3261E]/40 bg-[#FDF2F2] text-[#B3261E]'
                        : isDrink
                          ? 'border-[#2D5947] bg-[#122B22] text-[#F4EEE2]'
                          : 'border-[#D6CFC5] bg-white text-[#3A2418]'
                  }`}
                >
                  {voteFeedback.text}
                </div>
              )}
            </div>

            {/* Category filter pills */}
            <div
              role="group"
              aria-label="Filtrează secțiunile de vot"
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                aria-pressed={activeVoteCategoryId === 'all'}
                onClick={() => setSelectedVoteCategory('all')}
                className={`btn-press min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-[4px] border text-[13px] font-semibold whitespace-nowrap ${
                  activeVoteCategoryId === 'all'
                    ? isDrink
                      ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                      : 'bg-[#3A2418] border-[#3A2418] text-white'
                    : isDrink
                      ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                      : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                }`}
              >
                Toate secțiunile ({publicVoteCategories.length})
              </button>
              {publicVoteCategories.map((cat) => {
                const selected = activeVoteCategoryId === cat.id;
                const hasVoted = Boolean(voteSnapshot.myVotesByCategory[cat.id]);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedVoteCategory(cat.id)}
                    className={`btn-press min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-[4px] border text-[13px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${
                      selected
                        ? isDrink
                          ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                          : 'bg-[#3A2418] border-[#3A2418] text-white'
                        : isDrink
                          ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                          : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                    }`}
                  >
                    <span>{cat.shortLabel}</span>
                    {hasVoted && isVotingOpen && (
                      <Check
                        aria-hidden="true"
                        className={`w-3.5 h-3.5 ${
                          selected
                            ? isDrink
                              ? 'text-[#17382C]'
                              : 'text-[#E0A526]'
                            : isDrink
                              ? 'text-[#F2A33A]'
                              : 'text-[var(--localnic)]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ballot cards per category */}
            <div className="space-y-3">
              {visibleVoteCategories.map((category, catIdx) => {
                const votedSlug = voteSnapshot.myVotesByCategory[category.id];

                return (
                  <article
                    key={`ballot-${selectedMonth}-${category.id}`}
                    style={{ '--stagger-idx': catIdx } as React.CSSProperties}
                    className={`stagger-fade-in rounded-[6px] border overflow-hidden ${
                      isDrink
                        ? 'border-[#2D5947] bg-[#143025]'
                        : 'border-[#E6DFD5] bg-[#FAF8F5]'
                    }`}
                  >
                    <div
                      className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                        isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <TrophyMedalBadge rank={1} categoryId={category.id} size="sm" />
                        <div className="min-w-0">
                          <h3 className="font-display text-[20px] leading-tight">
                            {category.title}
                          </h3>
                          <span
                            className={`text-[11px] font-semibold tabular-nums ${
                              isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                            }`}
                          >
                            {category.totalVotes.toLocaleString('ro-RO')} voturi înregistrate · {category.allNominees.length} localuri
                          </span>
                        </div>
                      </div>

                      {isVotingOpen && votedSlug && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border text-[11px] font-bold shrink-0 ${
                            isDrink
                              ? 'border-[#F2A33A]/50 bg-[#1B3F31] text-[#F2A33A]'
                              : 'border-[#2D5130]/35 bg-[#EFF5EF] text-[var(--localnic)]'
                          }`}
                        >
                          <Check className="w-3 h-3" aria-hidden="true" />
                          Vot folosit
                        </span>
                      )}
                    </div>

                    <ol
                      className={`divide-y ${
                        isDrink ? 'divide-[#285443]' : 'divide-[#E6DFD5]'
                      }`}
                    >
                      {category.allNominees.map((nominee) => {
                        const matchedVenue = nominee.venueSlug
                          ? restaurantBySlug.get(nominee.venueSlug)
                          : undefined;
                        const isVotedHere = isVotingOpen && votedSlug === nominee.candidateSlug;
                        const isSubmittingHere =
                          submittingKey === `${category.id}:${nominee.candidateSlug}`;

                        const venueInfo = (
                          <div className="flex items-center gap-2.5 min-w-0">
                            {nominee.rank <= 3 ? (
                              <TrophyMedalBadge
                                rank={nominee.rank as 1 | 2 | 3}
                                categoryId={category.id}
                                size="sm"
                              />
                            ) : (
                              <span
                                className={`w-8 h-8 rounded-[4px] border flex items-center justify-center font-display text-[15px] shrink-0 ${
                                  isDrink
                                    ? 'border-[#2D5947] bg-[#122B22] text-[#F4EEE2]/70'
                                    : 'border-[#E6DFD5] bg-white text-[#6E5649]'
                                }`}
                              >
                                #{nominee.rank}
                              </span>
                            )}

                            <div className="min-w-0">
                              <div className="font-bold text-[14px] sm:text-[15px] leading-snug truncate flex items-center gap-1">
                                <span className="truncate">{nominee.venueName}</span>
                                {matchedVenue && (
                                  <ArrowUpRight
                                    aria-hidden="true"
                                    className={`w-3.5 h-3.5 shrink-0 opacity-65 ${
                                      isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                                    }`}
                                  />
                                )}
                              </div>
                              <div
                                className={`text-[12px] truncate ${
                                  isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                                }`}
                              >
                                {nominee.dishHighlight} · {nominee.neighborhood}
                              </div>
                            </div>
                          </div>
                        );

                        return (
                          <li key={`ballot-${category.id}-${nominee.candidateSlug}`}>
                            <div
                              className={`venue-row-interactive w-full min-h-[58px] px-4 py-2.5 flex items-center justify-between gap-2.5 ${
                                isVotedHere
                                  ? isDrink
                                    ? 'bg-[#1B3F31]/80'
                                    : 'bg-[#EFF5EF]'
                                  : isDrink
                                    ? 'hover:bg-[#1E4335]'
                                    : 'hover:bg-white'
                              }`}
                            >
                              {matchedVenue ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectRestaurant(matchedVenue)}
                                  className="flex-1 min-w-0 text-left"
                                >
                                  {venueInfo}
                                </button>
                              ) : (
                                <div className="flex-1 min-w-0">{venueInfo}</div>
                              )}

                              <div className="flex items-center gap-2.5 shrink-0 text-right">
                                <div>
                                  <div className="font-display text-[16px] leading-none tabular-nums">
                                    {nominee.voteSharePct}%
                                  </div>
                                  <div
                                    className={`text-[11px] mt-0.5 tabular-nums ${
                                      isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                                    }`}
                                  >
                                    {nominee.votes} voturi
                                  </div>
                                </div>

                                {isVotingOpen && (
                                  isVotedHere ? (
                                    <span
                                      aria-label={`Ai votat ${nominee.venueName}`}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] border text-[11px] font-bold ${
                                        isDrink
                                          ? 'border-[#F2A33A] bg-[#F2A33A] text-[#17382C]'
                                          : 'border-[#2D5130] bg-[#2D5130] text-white'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" aria-hidden="true" />
                                      Votat
                                    </span>
                                  ) : !votedSlug ? (
                                    <button
                                      type="button"
                                      disabled={submittingKey !== null}
                                      onClick={() => handleCastVote(category, nominee)}
                                      aria-label={`Votează ${nominee.venueName} la ${category.title}`}
                                      className={`btn-press min-h-[44px] px-3.5 py-2 rounded-[4px] border text-[12px] font-bold disabled:opacity-50 ${
                                        isDrink
                                          ? 'border-[#F2A33A] bg-[#122B22] text-[#F2A33A] hover:bg-[#F2A33A] hover:text-[#17382C]'
                                          : 'border-[#B3261E] bg-white text-[#B3261E] hover:bg-[#B3261E] hover:text-white'
                                      }`}
                                    >
                                      {isSubmittingHere ? 'Se votează…' : 'Votează'}
                                    </button>
                                  ) : null
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </article>
                );
              })}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveSubmenu('clasament')}
                className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[4px] border text-[13px] font-semibold ${
                  isDrink
                    ? 'border-[#2D5947] bg-[#143025] text-[#F4EEE2] hover:border-[#F2A33A]'
                    : 'border-[#D6CFC5] bg-white text-[#3A2418] hover:border-[#3A2418]'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Vezi Clasament &amp; Top 3</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default MonthlyTopView;
