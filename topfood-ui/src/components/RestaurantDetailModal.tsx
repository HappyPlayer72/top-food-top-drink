import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bookmark, Check, ChevronLeft, MapPin, ThumbsUp, X } from 'lucide-react';
import {
  AuthorRole,
  Restaurant,
  Review,
  UserAccount,
  formatScore,
} from '../types';
import {
  AvertizareaCard,
  CarouStrip,
  CoasterScore,
  CrowdMeter,
  EmployeeEcusonCard,
  InfluencerBadge,
  LocalVsTouristBars,
  LocalnicBadge,
  PartnerBadge,
  TrapBadge,
} from './BrandPrimitives';

export interface RestaurantDetailModalProps {
  restaurant: Restaurant | null;
  currentUser: UserAccount | null;
  onClose: () => void;
  onAddReview: (restaurantId: string, review: Review) => void;
  onRequireLogin?: () => void;
  onLocateOnMap?: (restaurant: Restaurant) => void;
  isSaved?: boolean;
  onToggleSave?: (restaurantId: string) => void;
}

type ReviewFilterTab = 'verified-local' | 'tourist' | 'influencer' | 'all';

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  restaurant,
  currentUser,
  onClose,
  onAddReview,
  onRequireLogin,
  onLocateOnMap,
  isSaved = false,
  onToggleSave,
}) => {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterTab>('verified-local');
  const [showWhyTrap, setShowWhyTrap] = useState(false);
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [helpfulVotedKeys, setHelpfulVotedKeys] = useState<Record<string, boolean>>({});

  // Review form state (identity derived from currentUser)
  const [scoreInput, setScoreInput] = useState<number>(9);
  const [gradeText, setGradeText] = useState<string>('9');
  const [markAsTrap, setMarkAsTrap] = useState<boolean>(false);
  const [praisedEmployee, setPraisedEmployee] = useState<string>('');
  const [reviewText, setReviewText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const modalOverlayRef = useRef<HTMLDivElement | null>(null);
  const reviewDrawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    const hasLocal = restaurant.reviews.some(
      (r) => r.authorRole === 'verified-local' || r.authorRole === 'regular'
    );
    setReviewFilter(hasLocal ? 'verified-local' : 'all');
    setShowWhyTrap(false);
    setIsReviewDrawerOpen(false);
    setHelpfulVotedKeys({});
    setPraisedEmployee('');
    setReviewText('');
    const initialGrade = Math.min(
      10,
      Math.max(1, Math.round(restaurant.foodQualityScore))
    );
    setScoreInput(initialGrade);
    setGradeText(String(initialGrade));
    setMarkAsTrap(false);
    setFormError(null);
    setSubmittedNotice(null);
    if (modalOverlayRef.current) {
      modalOverlayRef.current.scrollTop = 0;
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (!isReviewDrawerOpen) return;
    requestAnimationFrame(() => {
      if (reviewDrawerRef.current) {
        reviewDrawerRef.current.scrollTop = 0;
      }
    });
  }, [isReviewDrawerOpen]);

  // Close on Escape & lock background scroll
  useEffect(() => {
    if (!restaurant) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isReviewDrawerOpen) setIsReviewDrawerOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [restaurant, isReviewDrawerOpen, onClose]);

  const filteredReviews = useMemo(() => {
    if (!restaurant) return [];
    if (reviewFilter === 'all') return restaurant.reviews;
    if (reviewFilter === 'verified-local') {
      return restaurant.reviews.filter(
        (r) => r.authorRole === 'verified-local' || r.authorRole === 'regular'
      );
    }
    return restaurant.reviews.filter((r) => r.authorRole === reviewFilter);
  }, [restaurant, reviewFilter]);

  if (!restaurant) return null;

  const isDrink = restaurant.vertical === 'drink';
  const saved = onToggleSave ? isSaved : localSaved;

  const counts = restaurant.reviewCounts ?? {
    locals: restaurant.reviews.filter(
      (r) => r.authorRole === 'verified-local' || r.authorRole === 'regular'
    ).length,
    tourists: restaurant.reviews.filter((r) => r.authorRole === 'tourist').length,
    influencers: restaurant.reviews.filter((r) => r.authorRole === 'influencer').length,
  };

  const employeeOfMonth = restaurant.team?.find((m) => m.isEmployeeOfMonth);

  const handleToggleBookmark = () => {
    if (onToggleSave) onToggleSave(restaurant.id);
    else setLocalSaved((prev) => !prev);
  };

  const parseGradeInput = (raw: string): number | null => {
    const normalized = raw.trim().replace(',', '.');
    if (!normalized) return null;
    const num = Number(normalized);
    if (!Number.isFinite(num)) return null;
    return Math.round(num);
  };

  const handleGradeTextChange = (raw: string) => {
    setGradeText(raw);
    const parsed = parseGradeInput(raw);
    if (parsed !== null && parsed >= 1 && parsed <= 10) {
      setScoreInput(parsed);
    }
  };

  const handleGradeBlur = () => {
    const parsed = parseGradeInput(gradeText);
    const clamped =
      parsed === null ? scoreInput : Math.min(10, Math.max(1, parsed));
    setScoreInput(clamped);
    setGradeText(String(clamped));
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentUser) {
      setIsReviewDrawerOpen(false);
      onRequireLogin?.();
      return;
    }

    const parsedGrade = parseGradeInput(gradeText);
    if (parsedGrade === null || parsedGrade < 1 || parsedGrade > 10) {
      setFormError('Introdu o notă întreagă între 1 și 10.');
      return;
    }
    const finalGrade = parsedGrade;

    const text = reviewText.trim();
    if (text.length < 10) {
      setFormError('Scrie cel puțin câteva cuvinte concrete despre experiență.');
      return;
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      authorName: currentUser.name,
      authorRole: currentUser.role as AuthorRole,
      authorNeighborhood:
        currentUser.role === 'verified-local'
          ? currentUser.neighborhood
          : undefined,
      weightMultiplier: currentUser.weightMultiplier,
      isVerifiedVisit: currentUser.role === 'verified-local',
      isPaidCollab: false,
      foodScore: finalGrade,
      trapEstimatePct: markAsTrap
        ? 95
        : Math.min(restaurant.touristTrapIndex, 18),
      markedAsTouristTrap: markAsTrap,
      date: 'Chiar acum',
      text,
      language: 'RO',
      praisedEmployee: praisedEmployee || undefined,
      helpfulCount: 0,
    };

    onAddReview(restaurant.id, newReview);
    setReviewFilter(currentUser.role);
    setIsReviewDrawerOpen(false);
    setReviewText('');
    setPraisedEmployee('');
    setMarkAsTrap(false);
    setSubmittedNotice(
      `Review publicat ca ${currentUser.name} (${formatScore(
        currentUser.weightMultiplier
      )}×)${
        markAsTrap ? ' cu semnalare de capcană turistică' : ''
      }. Scorul s-a actualizat.`
    );
  };

  const handleFilterClick = (tab: 'verified-local' | 'tourist' | 'influencer') => {
    setReviewFilter((prev) => (prev === tab ? 'all' : tab));
  };

  const handleToggleHelpful = (key: string) => {
    setHelpfulVotedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      ref={modalOverlayRef}
      className="fixed inset-0 z-50 overflow-y-auto modal-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalii ${restaurant.name}`}
    >
      <div
        className={`modal-panel-enter min-h-screen pb-24 ${
          isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
        }`}
      >
        {/* TOP BREADCRUMB BAR (No CarouMark here so CarouStrip appears only once under score) */}
        <header
          className={`sticky top-0 z-30 border-b ${
            isDrink
              ? 'bg-[#17382C]/95 border-[#285443]'
              : 'bg-white/95 border-[#E6DFD5]'
          } backdrop-blur-sm`}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                aria-label="Înapoi la listă"
                className={`btn-press w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0 ${
                  isDrink
                    ? 'hover:bg-[#1E4335] text-[#F4EEE2]'
                    : 'hover:bg-[#FAF8F5] text-[#3A2418]'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span
                className={`text-[14px] truncate ${
                  isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                }`}
              >
                {isDrink ? 'topdrink' : 'topfood'}/timisoara/{restaurant.slug}
              </span>
            </div>

            {onLocateOnMap && (
              <button
                type="button"
                onClick={() => onLocateOnMap(restaurant)}
                className={`btn-press inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-[4px] border shrink-0 ${
                  isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                    : 'border-[#E6DFD5] text-[#3A2418] hover:border-[#3A2418]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Hartă</span>
              </button>
            )}
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 space-y-7">
          {/* VENUE PHOTO */}
          <div
            className={`w-full h-48 sm:h-64 rounded-[4px] overflow-hidden relative ${
              isDrink ? 'bg-[#122B22]' : 'bg-[#ECE6DD]'
            }`}
          >
            <img
              src={restaurant.photoUrl}
              alt={`Fotografie a localului ${restaurant.name}`}
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* TITLE + TOWERING SCORE BLOCK (Rule #5: Score is the largest number on screen) */}
          <section className="flex items-start justify-between gap-5">
            <div className="min-w-0 space-y-2">
              <h1 className="font-display text-[36px] sm:text-[46px] leading-[0.95]">
                {restaurant.name}
              </h1>

              <p
                className={`text-[14px] leading-snug ${
                  isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                }`}
              >
                {restaurant.shortCategory ?? restaurant.cuisine},{' '}
                {restaurant.shortNeighborhood ?? restaurant.neighborhood},{' '}
                {restaurant.priceRangeLabel ?? `~${restaurant.avgMealPriceRon} lei`}.{' '}
                {restaurant.openUntilLabel ?? restaurant.hours}
              </p>

              {(restaurant.isPartner || restaurant.isSponsored) && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {restaurant.isPartner && (
                    <PartnerBadge
                      label={
                        isDrink ? 'Partener TOP DRINK' : 'Partener TOP FOOD'
                      }
                      dark={isDrink}
                    />
                  )}
                  {restaurant.isSponsored && (
                    <span
                      className={`text-[12px] ${
                        isDrink ? 'text-[#F4EEE2]/60' : 'text-[#6E5649]'
                      }`}
                    >
                      Sponsorizat. Nu schimbă scorul.
                    </span>
                  )}
                </div>
              )}

              {isDrink && restaurant.crowdSegments && restaurant.crowdLabel && (
                <div className="pt-1">
                  <CrowdMeter
                    segments={restaurant.crowdSegments}
                    label={restaurant.crowdLabel}
                  />
                </div>
              )}
            </div>

            {/* Right: Score + Single CarouStrip (food) or CoasterScore (drink) */}
            <div className="shrink-0 flex flex-col items-end">
              {isDrink ? (
                <div className="flex flex-col items-center gap-1.5">
                  <CoasterScore score={restaurant.foodQualityScore} size="lg" />
                  <span className="text-[11px] text-[#F4EEE2]/70">
                    Scor onest din 10
                  </span>
                </div>
              ) : (
                <div className="min-w-[116px] flex flex-col items-end">
                  <span className="font-display text-[60px] sm:text-[68px] leading-[0.88] text-[#3A2418] tabular-nums">
                    {formatScore(restaurant.foodQualityScore)}
                  </span>
                  <div className="w-full mt-2 mb-1">
                    <CarouStrip height={8} />
                  </div>
                  <span className="text-[11px] text-[#6E5649]">
                    Scor onest din 10
                  </span>
                </div>
              )}
            </div>
          </section>

          {submittedNotice && (
            <div
              className={`px-3.5 py-2.5 rounded-[4px] border text-[13px] font-semibold flex items-center gap-2 ${
                isDrink
                  ? 'bg-[#1E4335] border-[#F2A33A] text-[#F4EEE2]'
                  : 'bg-[#FAF8F5] border-[#3A2418] text-[#3A2418]'
              }`}
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{submittedNotice}</span>
            </div>
          )}

          {/* LOCALNICI VS TURIȘTI BARS + TOURIST TRAP STATUS */}
          <section className="space-y-4">
            <LocalVsTouristBars
              localsScore={restaurant.localsScore}
              touristsScore={restaurant.touristsScore}
              showSummary={restaurant.touristTrapIndex >= 60}
              dark={isDrink}
            />

            {restaurant.touristTrapIndex >= 60 ? (
              <AvertizareaCard
                venueName={`Avertizare: ${restaurant.name}`}
                trapIndex={restaurant.touristTrapIndex}
                reasons={restaurant.trapReasons}
                breakdown={restaurant.trapBreakdown}
                defaultOpen={false}
              />
            ) : (
              <div>
                <div
                  className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[14px] ${
                    isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                  }`}
                >
                  <span className={isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'}>
                    Fără semne de capcană turistică ({restaurant.touristTrapIndex}{' '}
                    din 100).
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWhyTrap((prev) => !prev)}
                    aria-expanded={showWhyTrap}
                    className={`btn-press font-semibold underline underline-offset-4 ${
                      isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                    }`}
                  >
                    {showWhyTrap ? 'Ascunde' : 'De ce?'}
                  </button>
                </div>

                <div className="collapse-grid" data-open={showWhyTrap}>
                  <div className="collapse-inner">
                    <div
                      className={`mt-3 p-3.5 rounded-[4px] border text-[13px] space-y-2 ${
                        isDrink
                          ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]/85'
                          : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                      }`}
                    >
                      <ul className="list-disc pl-4 space-y-1">
                        {restaurant.trapReasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                      <div
                        className={`text-[12px] pt-1 ${
                          isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                        }`}
                      >
                        Distanță de centrul turistic:{' '}
                        <strong>{restaurant.trapBreakdown.touristZoneProximityM} m</strong> ·
                        Preț vs. categorie:{' '}
                        <strong>
                          {restaurant.trapBreakdown.priceVsCategoryPct > 0
                            ? `+${restaurant.trapBreakdown.priceVsCategoryPct}%`
                            : `${restaurant.trapBreakdown.priceVsCategoryPct}%`}
                        </strong>{' '}
                        · Review-uri în limbi străine:{' '}
                        <strong>{restaurant.trapBreakdown.foreignLangReviewsPct}%</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* CE COMANDĂ LOCALNICII — Signature Dishes */}
          {restaurant.whatToOrder && restaurant.whatToOrder.length > 0 && (
            <section
              aria-label="Ce comandă localnicii"
              className={`pt-5 border-t space-y-3 ${
                isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-[26px] sm:text-[30px] leading-none">
                  Ce comandă localnicii
                </h2>
                <span
                  className={`text-[12px] ${
                    isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                  }`}
                >
                  preparate menționate des
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {restaurant.whatToOrder.map((dish, idx) => (
                  <div
                    key={dish.name}
                    style={{ '--stagger-idx': idx } as React.CSSProperties}
                    className={`stagger-fade-in rounded-[4px] border p-3 flex items-start justify-between gap-3 ${
                      isDrink
                        ? 'bg-[#143025] border-[#285443]'
                        : 'bg-[#FAF8F5] border-[#E6DFD5]'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[14px] leading-snug">
                          {dish.name}
                        </span>
                        {dish.isMustOrder && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                              isDrink
                                ? 'bg-[#F2A33A] text-[#17382C]'
                                : 'bg-[#B3261E] text-white'
                            }`}
                          >
                            De neratat
                          </span>
                        )}
                      </div>
                      {dish.description && (
                        <p
                          className={`text-[12px] leading-snug ${
                            isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                          }`}
                        >
                          {dish.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`font-display text-[19px] leading-none shrink-0 tabular-nums ${
                        isDrink ? 'text-[#F2A33A]' : 'text-[#3A2418]'
                      }`}
                    >
                      {dish.priceRon} lei
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* REVIEW-URI SECTION (Page 4) */}
          <section aria-label="Review-uri" className="space-y-4">
            <h2 className="font-display text-[28px] sm:text-[32px] leading-none">
              Review-uri
            </h2>

            {/* Filter Pills: Localnici | Turiști | Influenceri */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  {
                    id: 'verified-local',
                    label: `Localnici ${counts.locals}`,
                  },
                  { id: 'tourist', label: `Turiști ${counts.tourists}` },
                  {
                    id: 'influencer',
                    label: `Influenceri ${counts.influencers}`,
                  },
                ] as const
              ).map((tab) => {
                const active = reviewFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleFilterClick(tab.id)}
                    className={`btn-press px-3.5 py-2 rounded-[4px] text-[13px] font-semibold border ${
                      active
                        ? isDrink
                          ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                          : 'bg-[#3A2418] text-white border-[#3A2418]'
                        : isDrink
                        ? 'bg-[#17382C] text-[#F4EEE2] border-[#2D5947] hover:border-[#F2A33A]/60'
                        : 'bg-white text-[#3A2418] border-[#D6CFC5] hover:border-[#3A2418]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}

              {reviewFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`btn-press text-[12px] font-semibold underline underline-offset-4 ml-1 ${
                    isDrink ? 'text-[#F2A33A]' : 'text-[#6E5649]'
                  }`}
                >
                  Toate
                </button>
              )}
            </div>

            {filteredReviews.length === 0 ? (
              <p
                className={`text-[14px] py-4 border-t ${
                  isDrink
                    ? 'border-[#285443] text-[#F4EEE2]/70'
                    : 'border-[#E6DFD5] text-[#6E5649]'
                }`}
              >
                Încă nu sunt review-uri în această categorie. Fii primul care
                scrie unul mai jos.
              </p>
            ) : (
              <div
                className={`divide-y border-t ${
                  isDrink
                    ? 'divide-[#285443] border-[#285443]'
                    : 'divide-[#E6DFD5] border-[#E6DFD5]'
                }`}
              >
                {filteredReviews.map((rev, idx) => {
                  const reviewKey = rev.id ?? `${restaurant.id}-rev-${idx}`;
                  const isHelpfulVoted = Boolean(helpfulVotedKeys[reviewKey]);
                  const helpfulTotal = (rev.helpfulCount ?? 0) + (isHelpfulVoted ? 1 : 0);

                  return (
                    <article
                      key={reviewKey}
                      style={{ '--stagger-idx': Math.min(idx, 5) } as React.CSSProperties}
                      className="stagger-fade-in py-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-[15px]">
                            {rev.authorName}
                          </span>
                          {(rev.authorRole === 'verified-local' ||
                            rev.authorRole === 'regular') && (
                            <LocalnicBadge
                              label={
                                rev.authorNeighborhood
                                  ? `Localnic din ${rev.authorNeighborhood}`
                                  : 'Localnic verificat'
                              }
                              size="xs"
                            />
                          )}
                          {rev.authorRole === 'influencer' && (
                            <InfluencerBadge
                              label={
                                rev.followerCountText
                                  ? `Influencer · ${rev.followerCountText}`
                                  : 'Influencer, colaborare plătită'
                              }
                              dark={isDrink}
                            />
                          )}
                          {rev.authorRole === 'tourist' && (
                            <span
                              className={`text-[12px] ${
                                isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                              }`}
                            >
                              Turist
                            </span>
                          )}
                          {rev.markedAsTouristTrap && (
                            <TrapBadge
                              variant="severe"
                              label="Semnalat capcană"
                            />
                          )}
                        </div>

                        <span className="font-display text-[28px] leading-none tabular-nums shrink-0">
                          {Number.isInteger(rev.foodScore)
                            ? rev.foodScore
                            : formatScore(rev.foodScore)}
                        </span>
                      </div>

                      <p className="text-[15px] leading-[1.55]">{rev.text}</p>

                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div
                          className={`text-[12px] ${
                            isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                          }`}
                        >
                          {rev.date}
                          {rev.praisedEmployee
                            ? `. Servită de ${rev.praisedEmployee}`
                            : ''}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleHelpful(reviewKey)}
                          aria-pressed={isHelpfulVoted}
                          className={`btn-press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border text-[12px] font-semibold ${
                            isHelpfulVoted
                              ? isDrink
                                ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                                : 'bg-[#3A2418] text-white border-[#3A2418]'
                              : isDrink
                              ? 'border-[#285443] text-[#F4EEE2]/80 hover:border-[#F2A33A]'
                              : 'border-[#E6DFD5] text-[#6E5649] hover:border-[#3A2418] hover:text-[#3A2418]'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>
                            Util{helpfulTotal > 0 ? ` · ${helpfulTotal}` : ''}
                          </span>
                        </button>
                      </div>

                      {rev.ownerReply && (
                        <div
                          className={`p-3 rounded-[4px] text-[13px] ${
                            isDrink
                              ? 'bg-[#1E4335] text-[#F4EEE2]/90'
                              : 'bg-[#F2EFE9] text-[#3A2418]'
                          }`}
                        >
                          <strong>
                            {rev.ownerReplyAuthor ?? 'Proprietar'}:
                          </strong>{' '}
                          {rev.ownerReply}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* DIN BUCĂTĂRIE — Owner Mini-Blog (Page 4) */}
          {restaurant.kitchenStory && (
            <section
              aria-label="Din bucătărie"
              className={`pt-5 border-t space-y-3.5 ${
                isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
              }`}
            >
              <h2 className="font-display text-[28px] sm:text-[32px] leading-none">
                Din bucătărie
              </h2>

              <div className="flex items-start gap-4">
                <div
                  className={`w-24 h-24 rounded-[4px] overflow-hidden shrink-0 ${
                    isDrink ? 'bg-[#1E4335]' : 'bg-[#ECE6DD]'
                  }`}
                >
                  {restaurant.kitchenStory.photoUrl ? (
                    <img
                      src={restaurant.kitchenStory.photoUrl}
                      alt={restaurant.kitchenStory.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 space-y-1">
                  <div
                    className={`text-[12px] ${
                      isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                    }`}
                  >
                    Scris de {restaurant.kitchenStory.author},{' '}
                    {restaurant.kitchenStory.date}
                  </div>
                  <h3 className="font-bold text-[16px] leading-snug">
                    {restaurant.kitchenStory.title}
                  </h3>
                  <p
                    className={`text-[14px] leading-snug ${
                      isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
                    }`}
                  >
                    {restaurant.kitchenStory.body}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ECHIPA — Uniform Name-Tags / Ecusoane (Page 4) */}
          {restaurant.team && restaurant.team.length > 0 && (
            <section
              aria-label="Echipa"
              className={`pt-5 border-t space-y-3.5 ${
                isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
              }`}
            >
              <h2 className="font-display text-[28px] sm:text-[32px] leading-none">
                Echipa
              </h2>

              <div className="grid grid-cols-3 gap-2.5">
                {restaurant.team.map((member) => (
                  <EmployeeEcusonCard
                    key={member.name}
                    name={member.name}
                    role={member.role}
                    isEmployeeOfMonth={member.isEmployeeOfMonth}
                    monthLabel={member.monthLabel}
                    dark={isDrink}
                  />
                ))}
              </div>

              {employeeOfMonth && (
                <p
                  className={`text-[12px] ${
                    isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                  }`}
                >
                  {employeeOfMonth.name} a fost lăudată pe nume în{' '}
                  {employeeOfMonth.positiveMentions} de review-uri luna asta.
                </p>
              )}
            </section>
          )}
        </div>

        {/* BOTTOM STICKY BAR: Scrie un review + Bookmark */}
        <div
          className={`fixed bottom-0 inset-x-0 z-40 border-t ${
            isDrink
              ? 'bg-[#17382C]/95 border-[#285443]'
              : 'bg-white/95 border-[#E6DFD5]'
          } backdrop-blur-sm`}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  onRequireLogin?.();
                  return;
                }
                setIsReviewDrawerOpen(true);
              }}
              className={`btn-press flex-1 py-3 px-5 rounded-[4px] font-bold text-[15px] hover:opacity-90 ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C]'
                  : 'bg-[#B3261E] text-white'
              }`}
            >
              {currentUser
                ? 'Scrie un review'
                : 'Intră în cont ca să scrii un review'}
            </button>

            <button
              type="button"
              onClick={handleToggleBookmark}
              aria-label={saved ? 'Salvat în listă' : 'Salvează localul'}
              title={saved ? 'Salvat' : 'Salvează localul'}
              className={`btn-press w-12 h-12 rounded-[4px] border flex items-center justify-center shrink-0 ${
                saved
                  ? isDrink
                    ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                    : 'bg-[#3A2418] border-[#3A2418] text-white'
                  : isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#3A2418] text-[#3A2418] hover:bg-[#FAF8F5]'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* INTERACTIVE REVIEW SUBMISSION DRAWER */}
        {isReviewDrawerOpen && currentUser && (
          <div
            className="modal-backdrop-enter fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setIsReviewDrawerOpen(false)}
          >
            <div
              ref={reviewDrawerRef}
              className={`drawer-sheet-enter w-full sm:max-w-lg rounded-[6px] border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${
                isDrink
                  ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                  : 'bg-white border-[#3A2418] text-[#3A2418]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[26px] leading-none">
                  Scrie un review · {restaurant.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsReviewDrawerOpen(false)}
                  aria-label="Închide formularul"
                  className="btn-press p-1 opacity-70 hover:opacity-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Account-derived author identity ("Cine scrie?") — no influencer option */}
                <div className="space-y-1.5">
                  <span className="text-[13px] font-semibold block">
                    Cine scrie?
                  </span>
                  <div
                    className={`px-3.5 py-2.5 rounded-[4px] border flex items-center justify-between gap-3 ${
                      isDrink
                        ? 'border-[#285443] bg-[#143025]'
                        : 'border-[#E6DFD5] bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[14px]">
                          {currentUser.name}
                        </span>
                        {currentUser.role === 'verified-local' ? (
                          <LocalnicBadge
                            label={`Localnic din ${
                              currentUser.neighborhood ?? 'Timișoara'
                            }`}
                            size="xs"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[3px] border text-[11px] font-semibold ${
                              isDrink
                                ? 'border-[#2D5947] text-[#F4EEE2]/80 bg-[#122B22]'
                                : 'border-[#D6CFC5] text-[#6E5649] bg-white'
                            }`}
                          >
                            Turist / Vizitator
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] ${
                          isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                        }`}
                      >
                        Stabilit din contul tău activ (fără opțiune manuală).
                      </p>
                    </div>
                    <span
                      className={`font-display text-[20px] leading-none shrink-0 tabular-nums ${
                        isDrink ? 'text-[#F2A33A]' : 'text-[#3A2418]'
                      }`}
                    >
                      {formatScore(currentUser.weightMultiplier)}×
                    </span>
                  </div>
                </div>

                {/* Grade Input: Both Typed Numeric Field + Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="rev-score-input"
                      className="text-[13px] font-semibold"
                    >
                      Nota ta din 10
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="rev-score-input"
                        type="number"
                        min={1}
                        max={10}
                        step={1}
                        inputMode="numeric"
                        value={gradeText}
                        onChange={(e) => handleGradeTextChange(e.target.value)}
                        onBlur={handleGradeBlur}
                        aria-label="Scrie nota între 1 și 10"
                        className={`w-20 px-2.5 py-1 rounded-[4px] border text-right font-display text-[24px] leading-none tabular-nums ${
                          isDrink
                            ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2]'
                            : 'bg-white border-[#3A2418] text-[#3A2418]'
                        }`}
                      />
                      <span
                        className={`text-[13px] font-semibold ${
                          isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                        }`}
                      >
                        / 10
                      </span>
                    </div>
                  </div>
                  <input
                    id="rev-score-range"
                    aria-label="Slider notă din 10"
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={scoreInput}
                    onChange={(e) => {
                      const val = Math.round(Number(e.target.value));
                      setScoreInput(val);
                      setGradeText(String(val));
                    }}
                    className={`w-full ${
                      isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'
                    }`}
                  />
                  <div
                    className={`flex justify-between text-[11px] ${
                      isDrink ? 'text-[#F4EEE2]/55' : 'text-[#6E5649]'
                    }`}
                  >
                    <span>1</span>
                    <span>Numere întregi (1–10), slider sau tastare</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Tourist Trap Flag Button */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setMarkAsTrap((prev) => !prev)}
                    aria-pressed={markAsTrap}
                    className={`btn-press w-full px-3.5 py-2.5 rounded-[4px] border flex items-center justify-between gap-3 text-left ${
                      markAsTrap
                        ? 'bg-[#B3261E] border-[#B3261E] text-white'
                        : isDrink
                        ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] hover:border-[#B3261E]'
                        : 'bg-[#FAF8F5] border-[#D6CFC5] text-[#3A2418] hover:border-[#B3261E]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          markAsTrap ? 'text-white' : 'text-[#B3261E]'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold leading-tight">
                          {markAsTrap
                            ? 'Marcat ca capcană turistică'
                            : 'Marchează ca capcană turistică'}
                        </div>
                        <div
                          className={`text-[11px] leading-snug mt-0.5 ${
                            markAsTrap
                              ? 'text-white/90'
                              : isDrink
                              ? 'text-[#F4EEE2]/65'
                              : 'text-[#6E5649]'
                          }`}
                        >
                          Prețuri umflate pentru turiști sau calitate slabă față de medie.
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-[3px] shrink-0 ${
                        markAsTrap
                          ? 'bg-white text-[#B3261E]'
                          : isDrink
                          ? 'bg-[#1E4335] text-[#F4EEE2]/80'
                          : 'bg-white border border-[#D6CFC5] text-[#6E5649]'
                      }`}
                    >
                      {markAsTrap ? 'Activ' : 'Opțional'}
                    </span>
                  </button>
                </div>

                {restaurant.team && restaurant.team.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[13px] font-semibold block">
                      Cine te-a servit? (opțional, pentru Angajatul lunii)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {restaurant.team.map((member) => (
                        <EmployeeEcusonCard
                          key={member.name}
                          name={member.name}
                          role={member.role}
                          selected={praisedEmployee === member.name}
                          onClick={() =>
                            setPraisedEmployee((prev) =>
                              prev === member.name ? '' : member.name
                            )
                          }
                          dark={isDrink}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor="rev-text"
                    className="text-[13px] font-semibold block"
                  >
                    Experiența ta
                  </label>
                  <textarea
                    id="rev-text"
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Ce ai comandat, cum a fost porția și prețul?"
                    className={`w-full px-3 py-2 rounded-[4px] border text-[14px] ${
                      isDrink
                        ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2]'
                        : 'bg-white border-[#3A2418] text-[#3A2418]'
                    }`}
                  />
                </div>

                {formError && (
                  <p className="text-[13px] font-semibold text-[#B3261E] bg-[#FEE4E2] px-3 py-2 rounded-[4px]">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className={`btn-press w-full py-3 rounded-[4px] font-bold text-[15px] ${
                    isDrink
                      ? 'bg-[#F2A33A] text-[#17382C]'
                      : 'bg-[#B3261E] text-white'
                  }`}
                >
                  Publică review-ul
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetailModal;
