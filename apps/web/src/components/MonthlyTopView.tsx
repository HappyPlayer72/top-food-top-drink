'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, ChevronDown, ChevronLeft, Download, Sparkles, Trophy } from 'lucide-react';
import { MonthlyAwards, Restaurant, TopReviewer, Vertical, formatScore } from '../types';
import { TOP_LOCAL_REVIEWERS } from '../data/restaurants';
import { InfluencerBadge, LocalnicBadge } from './BrandPrimitives';

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
}

type MonthlyTab = 'localuri' | 'recenzenti' | 'angajati';

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
  topReviewers = TOP_LOCAL_REVIEWERS,
  awards,
  selectedMonth: selectedMonthProp = null,
  onSelectMonth,
}) => {
  const isDrink = vertical === 'drink';
  const availableMonths = awards?.months ?? [];
  const [internalMonth, setInternalMonth] = useState<string>(availableMonths[0] ?? '');
  const selectedMonth = selectedMonthProp ?? internalMonth;
  const setSelectedMonth = (m: string) => {
    setInternalMonth(m);
    onSelectMonth?.(m);
  };
  const [activeSubTab, setActiveSubTab] = useState<MonthlyTab>('localuri');
  const [showAllReviewers, setShowAllReviewers] = useState(false);

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

  // Employee of the month list
  const topEmployees = useMemo(() => {
    const items: {
      initials: string;
      name: string;
      venue: string;
      role: string;
      mentions: number;
      venueObj: Restaurant;
    }[] = [];

    restaurants.forEach((r) => {
      r.team?.forEach((member) => {
        const parts = member.name.split(' ');
        const initials =
          parts.length > 1
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : `${member.name.slice(0, 2)}`.toUpperCase();
        items.push({
          initials,
          name: member.name,
          venue: r.name,
          role: member.role,
          mentions: member.positiveMentions,
          venueObj: r,
        });
      });
    });

    items.sort((a, b) => b.mentions - a.mentions);
    return items;
  }, [restaurants]);

  const leadEmployee = topEmployees[0];
  const revelationVenue = useMemo(() => {
    if (awards?.revelation?.slug) {
      return restaurants.find((r) => r.slug === awards.revelation!.slug) ?? null;
    }
    return [...restaurants]
      .filter((r) => !r.isSponsored && r.touristTrapIndex < 60 && (r.monthlyRankChange ?? 0) > 0)
      .sort((a, b) => (b.monthlyRankChange ?? 0) - (a.monthlyRankChange ?? 0))[0] ?? restaurants.find((r) => r.isRisingStar) ?? rankedVenues[1] ?? null;
  }, [awards?.revelation, restaurants, rankedVenues]);
  const topLocalAward = awards?.local ?? (() => {
    const r = topReviewers.find((x) => x.role === 'verified-local');
    return r ? { userId: r.id, username: r.username, displayName: r.name, neighborhood: r.badgeLabel.replace(/^Localnic din\s+/i, ''), reviews: r.helpfulVotes } : null;
  })();
  const topInfluencerAward = awards?.influencer ?? (() => {
    const r = topReviewers.find((x) => x.role === 'influencer');
    return r ? { userId: r.id, username: r.username, displayName: r.name, followers: null, reviews: r.helpfulVotes } : null;
  })();

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
        </div>

        {/* Segmented Tabs with /animate clip-path transition: Localuri | Recenzenți | Angajați */}
        {(() => {
          const tabs = [
            { id: 'localuri', label: 'Localuri' },
            { id: 'recenzenti', label: 'Recenzenți' },
            { id: 'angajati', label: 'Angajați' },
          ] as const;
          const activeIndex = tabs.findIndex((t) => t.id === activeSubTab);
          const leftPct = activeIndex * 33.3333;
          const rightPct = (2 - activeIndex) * 33.3333;

          return (
            <div
              role="tablist"
              aria-label="Secțiuni topul lunii"
              className={`relative grid grid-cols-3 p-1 rounded-[4px] ${
                isDrink ? 'bg-[#122B22]' : 'bg-[#F2EFE9]'
              }`}
            >
              {/* Base inactive layer */}
              {tabs.map((tab) => {
                const active = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`btn-press relative z-10 min-h-[44px] py-2 px-2 sm:px-3 rounded-[3px] text-[12px] min-[375px]:text-[13px] font-semibold ${
                      isDrink
                        ? 'text-[#F4EEE2]/75 hover:text-[#F4EEE2]'
                        : 'text-[#6E5649] hover:text-[#3A2418]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}

              {/* Duplicated active-styled layer clipped to active tab */}
              <div
                aria-hidden="true"
                className="tabs-clip-overlay pointer-events-none absolute inset-1 grid grid-cols-3 z-20"
                style={{
                  clipPath: `inset(0 ${rightPct}% 0 ${leftPct}% round 3px)`,
                }}
              >
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`py-2 px-3 rounded-[3px] text-[13px] font-semibold text-center flex items-center justify-center ${
                      isDrink
                        ? 'bg-[#F2A33A] text-[#17382C]'
                        : 'bg-white text-[#3A2418] shadow-xs'
                    }`}
                  >
                    {tab.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ===================================================================
            PODIUM + RANKS 4–7 (Visible on Localuri tab)
            =================================================================== */}
        {activeSubTab === 'localuri' && rankedVenues.length === 0 && (
          <p className={`py-8 text-center text-[15px] ${isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'}`}>
            Topul lunii apare după prima lună încheiată cu review-uri reale.
          </p>
        )}
        {activeSubTab === 'localuri' && rankedVenues.length > 0 && (
          <section aria-label="Podiumul lunii" className="space-y-0">
            {/* Podium Columns: logical DOM order #1 -> #2 -> #3, visual 2 - 1 - 3 */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 items-end pt-3">
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
                      alt={first.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover venue-photo-zoom"
                    />
                  </div>
                  <span className="font-bold text-[13px] sm:text-[15px] leading-tight group-hover:text-[#B3261E] line-clamp-2">
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
                      alt={second.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover venue-photo-zoom"
                    />
                  </div>
                  <span className="font-bold text-[13px] sm:text-[15px] leading-tight group-hover:text-[#B3261E] line-clamp-2">
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
                      alt={third.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover venue-photo-zoom"
                    />
                  </div>
                  <span className="font-bold text-[13px] sm:text-[15px] leading-tight group-hover:text-[#B3261E] line-clamp-2">
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
                            alt={spot.name}
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
            CEI MAI UTILI LOCALNICI (Coherent Page 2 Plăcuță & Influencer badges)
            =================================================================== */}
        {(activeSubTab === 'localuri' || activeSubTab === 'recenzenti') && (
          <section aria-label="Cei mai utili localnici" className="space-y-3 pt-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-[26px] leading-tight">
                Cei mai utili localnici
              </h2>
              <button
                type="button"
                onClick={() => setShowAllReviewers((prev) => !prev)}
                className={`btn-press min-h-[44px] inline-flex items-center px-2 -mr-2 text-[13px] font-semibold underline underline-offset-4 ${
                  isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                }`}
              >
                {showAllReviewers ? 'Restrânge' : 'Toți'}
              </button>
            </div>

            <ol
              className={`border-y divide-y ${
                isDrink
                  ? 'border-[#285443] divide-[#285443]'
                  : 'border-[#E6DFD5] divide-[#E6DFD5]'
              }`}
            >
              {(showAllReviewers
                ? topReviewers
                : topReviewers.slice(0, 3)
              ).map((reviewer, idx) => (
                <li
                  key={reviewer.id}
                  style={{ '--stagger-idx': idx } as React.CSSProperties}
                  className="stagger-fade-in py-3 flex items-center justify-between gap-3 cursor-default"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span
                      className={`font-display text-[16px] w-4 shrink-0 tabular-nums ${
                        isDrink ? 'text-[#F4EEE2]/60' : 'text-[#6E5649]'
                      }`}
                    >
                      {idx + 1}.
                    </span>

                    {/* Avatar initials */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] shrink-0 ${
                        reviewer.role === 'verified-local'
                          ? 'bg-[var(--localnic-soft)] text-[var(--localnic)]'
                          : 'bg-[#3A2418]/10 text-[#3A2418]'
                      } ${isDrink ? '!bg-[#285443] !text-[#F4EEE2]' : ''}`}
                    >
                      {reviewer.initials}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="font-semibold text-[15px] leading-tight">
                        {reviewer.username ? (
                          <Link href={`/u/${encodeURIComponent(reviewer.username)}`} className="hover:underline">
                            {reviewer.name}
                          </Link>
                        ) : (
                          reviewer.name
                        )}
                      </div>
                      <div>
                        {reviewer.role === 'verified-local' ? (
                          <LocalnicBadge label={reviewer.badgeLabel} size="xs" />
                        ) : (
                          <InfluencerBadge
                            label={reviewer.badgeLabel}
                            dark={isDrink}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-display text-[20px] leading-none tabular-nums">
                      {reviewer.helpfulVotes}
                    </div>
                    <div
                      className={`text-[11px] mt-1 ${
                        isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                      }`}
                    >
                      voturi utile
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ===================================================================
            PREMIILE LUNII (Cele 4 titluri lunare: Revelația, Localnicul, Influencerul, Angajatul)
            =================================================================== */}
        <section aria-label="Premiile lunii" className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Award className={`w-5 h-5 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`} aria-hidden="true" />
            <h2 className="font-display text-[26px] leading-tight">Premiile lunii</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {revelationVenue && (
              <button
                type="button"
                onClick={() => onSelectRestaurant(revelationVenue)}
                className={`text-left rounded-[6px] border p-4 transition-colors ${
                  isDrink ? 'border-[#2D5947] bg-[#143025] hover:border-[#F2A33A]' : 'border-[#E6DFD5] bg-[#FAF8F5] hover:border-[#3A2418]/40'
                }`}
              >
                <div className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}>
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Revelația lunii
                </div>
                <div className="font-display text-[20px] mt-1 leading-tight">{awards?.revelation?.name ?? revelationVenue.name}</div>
                <p className={`text-[12px] mt-1 ${isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>
                  {awards?.revelation
                    ? `A urcat de pe locul #${awards.revelation.from} pe #${awards.revelation.to}`
                    : revelationVenue.monthlyStatusLabel ?? 'Cea mai mare urcare a lunii'}
                </p>
              </button>
            )}

            {topLocalAward && (
              <div
                className={`rounded-[6px] border p-4 ${
                  isDrink ? 'border-[#2D5947] bg-[#143025]' : 'border-[#E6DFD5] bg-[#FAF8F5]'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--localnic)]">Localnicul lunii</div>
                <div className="font-display text-[20px] mt-1 leading-tight">
                  {topLocalAward.username ? (
                    <Link href={`/u/${encodeURIComponent(topLocalAward.username)}`} className="hover:underline">
                      {topLocalAward.displayName}
                    </Link>
                  ) : (
                    topLocalAward.displayName
                  )}
                </div>
                <p className={`text-[12px] mt-1 ${isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>
                  {topLocalAward.neighborhood ? `${topLocalAward.neighborhood} · ` : ''}{topLocalAward.reviews} contribuții apreciate
                </p>
              </div>
            )}

            {topInfluencerAward && (
              <div
                className={`rounded-[6px] border p-4 ${
                  isDrink ? 'border-[#2D5947] bg-[#143025]' : 'border-[#E6DFD5] bg-[#FAF8F5]'
                }`}
              >
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}>
                  Influencerul lunii
                </div>
                <div className="font-display text-[20px] mt-1 leading-tight">
                  {topInfluencerAward.username ? (
                    <Link href={`/u/${encodeURIComponent(topInfluencerAward.username)}`} className="hover:underline">
                      {topInfluencerAward.displayName}
                    </Link>
                  ) : (
                    topInfluencerAward.displayName
                  )}
                </div>
                <p className={`text-[12px] mt-1 ${isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>
                  {topInfluencerAward.followers ? `${topInfluencerAward.followers.toLocaleString('ro-RO')} urmăritori · ` : ''}
                  {topInfluencerAward.reviews} review-uri / postări
                </p>
              </div>
            )}

            {(awards?.employee || leadEmployee) && (
              <button
                type="button"
                onClick={() => {
                  const target = awards?.employee?.venueSlug
                    ? restaurants.find((r) => r.slug === awards.employee!.venueSlug)
                    : leadEmployee?.venueObj;
                  if (target) onSelectRestaurant(target);
                }}
                className={`text-left rounded-[6px] border p-4 transition-colors ${
                  isDrink ? 'border-[#F2A33A] bg-[#143025] hover:bg-[#1E4335]' : 'border-[#3A2418] bg-[#FAF8F5] hover:bg-[#F2EFE9]'
                }`}
              >
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}>
                  Angajatul lunii
                </div>
                <div className="font-display text-[20px] mt-1 leading-tight">
                  {awards?.employee ? `${awards.employee.firstName} · ${awards.employee.venue}` : `${leadEmployee!.name} · ${leadEmployee!.venue}`}
                </div>
                <p className={`text-[12px] mt-1 ${isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>
                  Menționat pozitiv în {awards?.employee?.mentions ?? leadEmployee!.mentions} review-uri
                </p>
              </button>
            )}
          </div>
        </section>

        {/* ===================================================================
            ANGAJATUL LUNII ÎN ORAȘ (Coherent Ecuson treatment from Pages 2 & 4)
            =================================================================== */}
        {(activeSubTab === 'localuri' || activeSubTab === 'angajati') &&
          leadEmployee && (
            <section aria-label="Angajatul lunii în oraș" className="space-y-3 pt-1">
              {(activeSubTab === 'angajati' ? topEmployees.slice(0, 4) : [leadEmployee]).map(
                (emp, idx) => (
                  <button
                    key={`${emp.venueObj.id}-${emp.name}`}
                    type="button"
                    onClick={() => onSelectRestaurant(emp.venueObj)}
                    style={{ '--stagger-idx': idx } as React.CSSProperties}
                    className={`venue-row-interactive stagger-fade-in w-full text-left rounded-[6px] border p-4 relative ${
                      isDrink
                        ? 'border-[#F2A33A] bg-[#143025] hover:bg-[#1E4335]'
                        : 'border-[#3A2418] bg-[#FAF8F5] hover:bg-[#F2EFE9]'
                    }`}
                  >
                    {/* Ecuson punch slot at top center */}
                    <span
                      className={`block w-8 h-1 rounded-full mx-auto mb-3 ${
                        isDrink ? 'bg-[#F2A33A]' : 'bg-[#3A2418]'
                      }`}
                    />
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0 ${
                          isDrink
                            ? 'bg-[#285443] text-[#F4EEE2]'
                            : 'bg-white border border-[#D6CFC5] text-[#3A2418]'
                        }`}
                      >
                        {emp.initials}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div
                          className={`text-[12px] font-bold ${
                            isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                          }`}
                        >
                          {idx === 0
                            ? 'Angajatul lunii în oraș'
                            : `Echipa apreciată · ${emp.role}`}
                        </div>
                        <div className="font-display text-[20px] sm:text-[22px] leading-tight line-clamp-2">
                          {emp.name} · {emp.venue}
                        </div>
                        <div
                          className={`text-[13px] ${
                            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                          }`}
                        >
                          Nominalizări pe nume în {emp.mentions} de review-uri.
                        </div>
                      </div>
                    </div>
                  </button>
                )
              )}
            </section>
          )}
      </div>
    </div>
  );
};

export default MonthlyTopView;
