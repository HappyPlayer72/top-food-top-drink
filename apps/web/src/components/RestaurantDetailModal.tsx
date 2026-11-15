'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HonestValue } from './BrandPrimitives';
import { NOISE_LEVELS, quickButtonsFor, quickWarnings, type Answer, type QuickKind } from '@tftd/scoring/features';
import { ReviewQuestions } from './ReviewQuestions';
import { VenueFeatures } from './VenueFeatures';
import Link from 'next/link';
import { embedSrc } from '@/lib/embed';
import {
  Accessibility,
  AlertTriangle,
  BookOpen,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Film,
  MapPin,
  Pencil,
  Plug,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sun,
  ThumbsUp,
  Trash2,
  Truck,
  Volume2,
  X,
} from 'lucide-react';
import {
  AuthorRole,
  NoiseLevel,
  Restaurant,
  Review,
  UserAccount,
  formatHonest, formatScore,
} from '../types';
import {
  getTodayDayName,
  getVenueFacilities,
  getVenueLastUpdated,
  getVenueMenu,
  getVenueWarnings,
  getVenueWeeklyHours,
} from '../data/venueExtras';
import { getVenueMonthlyCategoryAwards } from '../data/monthlyCategoryTops';
import {
  AvertizareaCard,
  MugScore,
  PlateScore,
  CrowdMeter,
  EmployeeEcusonCard,
  InfluencerBadge,
  LocalVsTouristBars,
  LocalnicBadge,
  TuristBadge,
  PartnerBadge,
  TrapBadge,
  TrophyMedalBadge,
} from './BrandPrimitives';
import { EMPTY_VISIT_PROOF, VisitProofField, type VisitProofState } from './VisitProofField';
import { attachReceipt } from '@/app/actions/visits';
import { reviewFormToken } from '@/app/actions/user';


/** Numele platformelor cum le scrie lumea. */
const PLATFORM_LABEL: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' };

export interface RestaurantDetailModalProps {
  restaurant: Restaurant | null;
  currentUser: UserAccount | null;
  onClose: () => void;
  onAddReview: (
    restaurantId: string,
    review: Review,
    /** Anti-bot: tokenul formularului și câmpul capcană (docs/ANTI-BOT.md). */
    antiBot?: { formToken?: string; website?: string }
  ) => void | Promise<{ ok: boolean; message?: string; error?: string; reviewId?: string; verifiedVisit?: boolean }>;
  onEditReview?: (
    restaurantId: string,
    reviewId: string,
    updates: { foodScore: number; text: string }
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
  onDeleteReview?: (
    restaurantId: string,
    reviewId: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
  /** Cu backend: formularul arată „Dovedește vizita” (check-in GPS sau bon, ×1,3). */
  canVerifyVisit?: boolean;
  /** Cu backend: votul „util” se salvează și întoarce numărul real */
  onVoteHelpful?: (
    reviewId: string
  ) => Promise<{ ok: true; voted: boolean; helpfulCount: number } | { ok: false; error: string }>;
  onRequireLogin?: (opts?: { openReview?: boolean }) => void;
  onSubmitVideo?: (
    restaurantId: string,
    url: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onLocateOnMap?: (restaurant: Restaurant) => void;
  isSaved?: boolean;
  onToggleSave?: (restaurantId: string) => void;
  initialReviewOpen?: boolean;
  onConsumeInitialReviewOpen?: () => void;
  /** Cu backend: votul rapid al userului la acest local (siguranță 1–5, zgomot 1–4) */
  myQuickVote?: Partial<Record<QuickKind, number>>;
  /** Cu backend: salvează votul rapid; undefined = fără backend (votul rămâne local) */
  onQuickVote?: (kind: QuickKind, value: number) => Promise<{ ok: true } | { ok: false; error: string }>;
}

type ReviewFilterTab = 'verified-local' | 'tourist' | 'influencer' | 'all';

const NOISE_OPTIONS: { id: NoiseLevel; label: string }[] = [
  { id: 'linistit', label: 'Liniștit' },
  { id: 'moderat', label: 'Moderat' },
  { id: 'animat', label: 'Animat' },
  { id: 'zgomotos', label: 'Zgomotos' },
];

const NOISE_LABELS: Record<NoiseLevel, string> = {
  linistit: 'Liniștit',
  moderat: 'Moderat',
  animat: 'Animat',
  zgomotos: 'Zgomotos',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (el.closest('.collapse-grid:not([data-open="true"])')) return false;
      return true;
    }
  );
}

const SWIPE_DISMISS_THRESHOLD_PX = 72;

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  restaurant,
  currentUser,
  onClose,
  onAddReview,
  onEditReview,
  onDeleteReview,
  onVoteHelpful,
  onSubmitVideo,
  onRequireLogin,
  onLocateOnMap,
  isSaved = false,
  onToggleSave,
  initialReviewOpen = false,
  onConsumeInitialReviewOpen,
  myQuickVote,
  onQuickVote,
  canVerifyVisit = false,
}) => {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterTab>('verified-local');
  const [showScoreFormula, setShowScoreFormula] = useState(false);
  const [showWhyTrap, setShowWhyTrap] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [showGoogleCompare, setShowGoogleCompare] = useState(false);
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false);
  const [activeQuickVote, setActiveQuickVote] = useState<'safety' | 'noise' | null>(null);
  const [localSaved, setLocalSaved] = useState(false);
  const [helpfulVotedKeys, setHelpfulVotedKeys] = useState<Record<string, boolean>>({});
  /** Răspunsurile backend-ului la „util”: votat sau nu + numărul real */
  const [helpfulServer, setHelpfulServer] = useState<Record<string, { voted: boolean; count: number }>>({});

  // Review form state (identity derived from currentUser)
  const [scoreInput, setScoreInput] = useState<number>(9);
  const [gradeText, setGradeText] = useState<string>('9');
  const [markAsTrap, setMarkAsTrap] = useState<boolean>(false);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevel | null>(null);
  const [praisedEmployee, setPraisedEmployee] = useState<string>('');
  const [reviewText, setReviewText] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoStatus, setVideoStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [visitProof, setVisitProof] = useState<VisitProofState>(EMPTY_VISIT_PROOF);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  /** Anti-bot: token semnat de server la deschiderea formularului + câmpul capcană nevăzut de oameni. */
  const formTokenRef = useRef<string | undefined>(undefined);
  const honeypotRef = useRef<HTMLInputElement | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);
  /** Întrebările structurate din review (Da / Nu / Nu am observat), trimise odată cu review-ul. */
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [editingReviewKey, setEditingReviewKey] = useState<string | null>(null);
  const [editScoreText, setEditScoreText] = useState<string>('9');
  const [editText, setEditText] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [isDeletingKey, setIsDeletingKey] = useState<string | null>(null);
  const [drawerDragOffset, setDrawerDragOffset] = useState(0);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const [drawerEntered, setDrawerEntered] = useState(false);

  const modalOverlayRef = useRef<HTMLDivElement | null>(null);
  const reviewDrawerRef = useRef<HTMLDivElement | null>(null);
  const previousModalFocusRef = useRef<HTMLElement | null>(null);
  const previousDrawerFocusRef = useRef<HTMLElement | null>(null);
  const isReviewDrawerOpenRef = useRef(false);
  const drawerDragStartYRef = useRef<number | null>(null);
  const drawerDragCurrentYRef = useRef<number>(0);

  isReviewDrawerOpenRef.current = isReviewDrawerOpen;

  useEffect(() => {
    if (!restaurant) return;
    const hasLocal = restaurant.reviews.some(
      (r) => r.authorRole === 'verified-local' || r.authorRole === 'regular'
    );
    setReviewFilter(hasLocal ? 'verified-local' : 'all');
    setShowScoreFormula(false);
    setShowWhyTrap(false);
    setShowMenu(false);
    setShowHours(false);
    setShowGoogleCompare(false);
    setIsReviewDrawerOpen(false);
    setAnswers({});
    setVisitProof(EMPTY_VISIT_PROOF);
    setHelpfulVotedKeys({});
    setPraisedEmployee('');
    setReviewText('');
    setVideoUrlInput('');
    setVideoStatus(null);
    // Fără review-uri, formularul pornește de la 7 (nu de la 1, cât ar da un scor gol)
    const initialGrade = restaurant.foodQualityScore > 0
      ? Math.min(10, Math.max(1, Math.round(restaurant.foodQualityScore)))
      : 7;
    setScoreInput(initialGrade);
    setGradeText(String(initialGrade));
    setMarkAsTrap(false);
    setFormError(null);
    setSubmittedNotice(null);
    if (modalOverlayRef.current) {
      modalOverlayRef.current.scrollTop = 0;
    }
  }, [restaurant?.id]);

  const venueIdForToken = restaurant?.venueId;
  const refreshFormToken = React.useCallback(() => {
    formTokenRef.current = undefined;
    if (!canVerifyVisit || !venueIdForToken || !currentUser) return;
    reviewFormToken(venueIdForToken)
      .then((r) => {
        if (r.ok) formTokenRef.current = r.token;
      })
      .catch(() => undefined);
  }, [canVerifyVisit, venueIdForToken, currentUser]);

  useEffect(() => {
    if (isReviewDrawerOpen) refreshFormToken();
  }, [isReviewDrawerOpen, refreshFormToken]);

  useEffect(() => {
    if (!restaurant || !initialReviewOpen) return;
    setIsReviewDrawerOpen(true);
    onConsumeInitialReviewOpen?.();
  }, [restaurant, initialReviewOpen, onConsumeInitialReviewOpen]);

  useEffect(() => {
    if (!isReviewDrawerOpen) {
      drawerDragStartYRef.current = null;
      drawerDragCurrentYRef.current = 0;
      setDrawerDragOffset(0);
      setIsDraggingDrawer(false);
      setDrawerEntered(false);
      return;
    }

    previousDrawerFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const drawer = reviewDrawerRef.current;
      if (!drawer) return;
      drawer.scrollTop = 0;
      const focusables = getFocusableElements(drawer);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        drawer.focus();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      const prev = previousDrawerFocusRef.current;
      previousDrawerFocusRef.current = null;
      if (
        prev &&
        prev.isConnected &&
        modalOverlayRef.current?.isConnected
      ) {
        prev.focus();
      }
    };
  }, [isReviewDrawerOpen]);

  // Butoanele arată votul salvat pe server (și după refresh); fără vot, sunt goale.
  useEffect(() => {
    setSafetyScore(myQuickVote?.safety ?? null);
    setNoiseLevel(NOISE_LEVELS.find((l) => l.value === myQuickVote?.noise)?.id ?? null);
  }, [restaurant?.id, myQuickVote?.safety, myQuickVote?.noise]);

  const isModalOpen = Boolean(restaurant);

  // Move focus into RestaurantDetailModal on open & restore on close
  useEffect(() => {
    if (!isModalOpen) return;
    previousModalFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      if (isReviewDrawerOpenRef.current) return;
      const container = modalOverlayRef.current;
      if (!container) return;
      const focusables = getFocusableElements(container);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.focus();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      const prev = previousModalFocusRef.current;
      previousModalFocusRef.current = null;
      if (prev && prev.isConnected) {
        prev.focus();
      }
    };
  }, [isModalOpen]);

  // Close on Escape, trap Tab focus in active aria-modal overlay, & lock background scroll
  useEffect(() => {
    if (!restaurant) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isReviewDrawerOpen) setIsReviewDrawerOpen(false);
        else onClose();
        return;
      }

      if (e.key === 'Tab') {
        const activeContainer =
          isReviewDrawerOpen && reviewDrawerRef.current
            ? reviewDrawerRef.current
            : modalOverlayRef.current;
        if (!activeContainer) return;

        const focusables = getFocusableElements(activeContainer);
        if (focusables.length === 0) {
          e.preventDefault();
          activeContainer.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || !activeContainer.contains(active) || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (!active || !activeContainer.contains(active) || active === last) {
          e.preventDefault();
          first.focus();
        }
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

  const displayReviews = useMemo(() => restaurant?.reviews ?? [], [restaurant]);

  const filteredReviews = useMemo(() => {
    if (!restaurant) return [];
    if (reviewFilter === 'all') return displayReviews;
    if (reviewFilter === 'verified-local') {
      return displayReviews.filter(
        (r) => r.authorRole === 'verified-local' || r.authorRole === 'regular'
      );
    }
    return displayReviews.filter((r) => r.authorRole === reviewFilter);
  }, [restaurant, displayReviews, reviewFilter]);

  if (!restaurant) return null;

  const isDrink = restaurant.vertical === 'drink';
  const saved = onToggleSave ? isSaved : localSaved;

  const lastUpdated = getVenueLastUpdated(restaurant);
  const menuCategories = getVenueMenu(restaurant);
  const menuItemCount = menuCategories.reduce(
    (acc, cat) => acc + cat.items.length,
    0
  );
  const weeklyHours = getVenueWeeklyHours(restaurant);
  const todayDayName = getTodayDayName();
  // Ordinea și evidențierea butoanelor rapide urmează preferințele din profil.
  const quickButtons = quickButtonsFor(currentUser?.interests ?? []);
  // Cu backend: avertizările vin din voturile reale (de la prag); fără backend, din datele statice.
  const baseWarnings = restaurant.quick
    ? { ...quickWarnings(restaurant.quick), brightLights: getVenueWarnings(restaurant).brightLights }
    : getVenueWarnings(restaurant);
  const venueWarnings = {
    unsafeFeeling:
      baseWarnings.unsafeFeeling ??
      (safetyScore !== null && safetyScore <= 2
        ? `Ai semnalat că nu te-ai simțit în siguranță (${safetyScore}/5).`
        : undefined),
    veryNoisy:
      baseWarnings.veryNoisy ??
      (noiseLevel === 'zgomotos'
        ? 'Ai semnalat că este foarte zgomotos.'
        : undefined),
    brightLights: baseWarnings.brightLights,
  };
  const hasAnyWarning = Boolean(
    venueWarnings.unsafeFeeling ||
      venueWarnings.veryNoisy ||
      venueWarnings.brightLights
  );
  const venueFacilities = getVenueFacilities(restaurant);
  const googleOn10 = Number((restaurant.googleRawRating * 2).toFixed(1));
  const googleVsTopDiff = Number(
    (googleOn10 - restaurant.foodQualityScore).toFixed(1)
  );

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

  const handleReviewSubmit = async (e: React.FormEvent) => {
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

    const reviewId = `local-rev-${Date.now()}`;
    const newReview: Review = {
      id: reviewId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role as AuthorRole,
      authorNeighborhood:
        currentUser.role === 'verified-local'
          ? currentUser.neighborhood
          : undefined,
      weightMultiplier: currentUser.weightMultiplier,
      isVerifiedVisit: false,
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
      safetyScore: safetyScore ?? undefined,
      noiseLevel: noiseLevel ?? undefined,
      helpfulCount: 0,
      answers: Object.keys(answers).length ? answers : undefined,
    };

    setIsSubmittingReview(true);
    let result: Awaited<ReturnType<typeof onAddReview>>;
    let receiptNotice = '';
    try {
      result = await onAddReview(restaurant.id, newReview, {
        formToken: formTokenRef.current,
        website: honeypotRef.current?.value,
      });
      if (result && !result.ok) {
        setFormError(result.error ?? 'Review-ul nu s-a putut publica. Încearcă din nou.');
        refreshFormToken();
        return;
      }
      // Bonul pleacă după review (are nevoie de ID-ul lui); review-ul e publicat oricum.
      if (result?.reviewId && visitProof.receipt && !result.verifiedVisit) {
        const fd = new FormData();
        fd.set('reviewId', result.reviewId);
        fd.set('receipt', visitProof.receipt, 'bon.jpg');
        const r = await attachReceipt(fd);
        receiptNotice = ` ${r.ok ? r.message : `Bonul nu s-a trimis: ${r.error}`}`;
      }
    } finally {
      setIsSubmittingReview(false);
    }
    setVisitProof(EMPTY_VISIT_PROOF);
    setReviewFilter(currentUser.role);
    setIsReviewDrawerOpen(false);
    setReviewText('');
    setPraisedEmployee('');
    setMarkAsTrap(false);
    // Butoanele rapide revin la voturile salvate (sau goale, fără backend).
    setSafetyScore(myQuickVote?.safety ?? null);
    setNoiseLevel(NOISE_LEVELS.find((l) => l.value === myQuickVote?.noise)?.id ?? null);
    setAnswers({});
    setSubmittedNotice(
      result?.message ? result.message + receiptNotice :
      `Review publicat ca ${currentUser.name} (${formatScore(
        currentUser.weightMultiplier
      )}×)${
        markAsTrap ? ' cu semnalare de capcană turistică' : ''
      }. Scorul s-a actualizat.`
    );
  };

  /** Vot pe scală: cu backend se salvează (cere cont, un vot per tip, se poate schimba); fără backend rămâne local. */
  const handleScaleVote = async (kind: QuickKind, value: number) => {
    setActiveQuickVote(null);
    const noiseId = NOISE_LEVELS.find((l) => l.value === value)?.id ?? null;
    if (!currentUser) {
      onRequireLogin?.({ openReview: false });
      return;
    }
    if (!onQuickVote) {
      if (kind === 'safety') setSafetyScore((prev) => (prev === value ? null : value));
      else setNoiseLevel((prev) => (prev === noiseId ? null : noiseId));
      return;
    }
    // Optimist, dar la eroare refacem doar tipul votat acum (alt vot reușit între timp rămâne).
    const previous = kind === 'safety' ? safetyScore : noiseLevel;
    if (kind === 'safety') setSafetyScore(value);
    else setNoiseLevel(noiseId);
    const res = await onQuickVote(kind, value);
    if (!res.ok) {
      if (kind === 'safety') setSafetyScore((cur) => (cur === value ? (previous as number | null) : cur));
      else setNoiseLevel((cur) => (cur === noiseId ? (previous as NoiseLevel | null) : cur));
      setSubmittedNotice(res.error);
    } else {
      setSubmittedNotice(kind === 'safety' ? `Votul tău de siguranță (${value}/5) a fost salvat.` : `Votul tău pentru zgomot (${NOISE_LABELS[noiseId!]}) a fost salvat.`);
    }
  };

  const handleFilterClick = (tab: 'verified-local' | 'tourist' | 'influencer') => {
    setReviewFilter((prev) => (prev === tab ? 'all' : tab));
  };

  const handleToggleHelpful = async (key: string, reviewId?: string) => {
    if (onVoteHelpful && reviewId) {
      const res = await onVoteHelpful(reviewId);
      if (res.ok) setHelpfulServer((prev) => ({ ...prev, [key]: { voted: res.voted, count: res.helpfulCount } }));
      else setSubmittedNotice(res.error);
      return;
    }
    setHelpfulVotedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartEdit = (reviewKey: string, rev: Review) => {
    setConfirmDeleteKey(null);
    setEditingReviewKey(reviewKey);
    setEditScoreText(String(Math.round(rev.foodScore)));
    setEditText(rev.text);
    setEditError(null);
  };

  const handleSaveEdit = async (reviewId: string) => {
    if (!onEditReview || !restaurant) return;
    const parsed = Number(editScoreText.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 10 || !Number.isInteger(parsed)) {
      setEditError('Nota trebuie să fie un număr întreg de la 1 la 10.');
      return;
    }
    const trimmed = editText.trim();
    if (trimmed.length < 20) {
      setEditError('Scrie cel puțin 20 de caractere în review.');
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);
    const res = await onEditReview(restaurant.id, reviewId, {
      foodScore: parsed,
      text: trimmed,
    });
    setIsSavingEdit(false);
    if (!res.ok) {
      setEditError(res.error ?? 'Nu am putut actualiza review-ul.');
      return;
    }
    setEditingReviewKey(null);
    if (res.message) setSubmittedNotice(res.message);
  };

  const handleConfirmDelete = async (reviewKey: string, reviewId: string) => {
    if (!onDeleteReview || !restaurant) return;
    setIsDeletingKey(reviewKey);
    const res = await onDeleteReview(restaurant.id, reviewId);
    setIsDeletingKey(null);
    setConfirmDeleteKey(null);
    if (!res.ok) {
      setSubmittedNotice(res.error ?? 'Nu am putut șterge review-ul.');
      return;
    }
    if (editingReviewKey === reviewKey) setEditingReviewKey(null);
    if (res.message) setSubmittedNotice(res.message);
  };

  const resetDrawerDrag = () => {
    drawerDragStartYRef.current = null;
    drawerDragCurrentYRef.current = 0;
    setIsDraggingDrawer(false);
    setDrawerDragOffset(0);
  };

  const handleDrawerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('button')) return;
    drawerDragStartYRef.current = e.touches[0].clientY;
    drawerDragCurrentYRef.current = 0;
    setIsDraggingDrawer(true);
  };

  const handleDrawerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (drawerDragStartYRef.current === null || e.touches.length !== 1) return;
    const deltaY = e.touches[0].clientY - drawerDragStartYRef.current;
    if (deltaY > 0) {
      drawerDragCurrentYRef.current = deltaY;
      setDrawerDragOffset(deltaY);
    } else {
      drawerDragCurrentYRef.current = 0;
      setDrawerDragOffset(0);
    }
  };

  const handleDrawerTouchEnd = () => {
    if (drawerDragStartYRef.current === null) return;
    const finalOffset = drawerDragCurrentYRef.current;
    resetDrawerDrag();
    if (finalOffset >= SWIPE_DISMISS_THRESHOLD_PX) {
      setIsReviewDrawerOpen(false);
    }
  };

  return (
    <div
      ref={modalOverlayRef}
      tabIndex={-1}
      onClick={(e) => {
        if (
          e.target === e.currentTarget &&
          !isReviewDrawerOpen
        ) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/55 modal-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalii ${restaurant.name}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`doodle-wallpaper modal-panel-enter min-h-full flex flex-col ${
          isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
        }`}
      >
        {/* TOP BREADCRUMB BAR (fără CarouMark aici: scorul e pe farfurie / halbă) */}
        <header
          className={`sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] ${
            isDrink
              ? 'bg-[#17382C]/95 border-[#285443]'
              : 'bg-white/95 border-[#E6DFD5]'
          } backdrop-blur-sm`}
        >
          <div className="max-w-3xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                aria-label="Înapoi la listă"
                className={`btn-press w-11 h-11 rounded-[4px] flex items-center justify-center shrink-0 -ml-1.5 ${
                  isDrink
                    ? 'hover:bg-[#1E4335] text-[#F4EEE2]'
                    : 'hover:bg-[#FAF8F5] text-[#3A2418]'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span
                className={`text-[13px] sm:text-[14px] truncate ${
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
                className={`btn-press inline-flex items-center gap-1.5 min-h-[44px] text-[13px] font-semibold px-3 py-2 sm:py-1.5 rounded-[4px] border shrink-0 ${
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

        <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-7">
          {/* VENUE PHOTO */}
          <div
            className={`w-full h-48 sm:h-64 rounded-[4px] overflow-hidden relative ${
              isDrink ? 'bg-[#122B22]' : 'bg-[#ECE6DD]'
            }`}
          >
            <img
              src={restaurant.photoUrl}
              alt={restaurant.hasPhoto === false ? "" : `Fotografie a localului ${restaurant.name}`}
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* TITLE + TOWERING SCORE BLOCK (Rule #5: Score is the largest number on screen) */}
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3 sm:gap-5">
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className="font-display text-[30px] min-[375px]:text-[36px] sm:text-[46px] leading-[0.98] break-words">
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

                <div
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] ${
                    isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Actualizat: {lastUpdated}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      restaurant.openNow
                        ? isDrink
                          ? 'text-[#6EE7B7]'
                          : 'text-[#1E6B43]'
                        : isDrink
                        ? 'text-[#FCA5A5]'
                        : 'text-[#B3261E]'
                    }`}
                  >
                    {restaurant.openNow ? 'Deschis acum' : 'Închis acum'}
                  </span>
                  {restaurant.delivery && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          restaurant.delivery.available
                            ? isDrink
                              ? 'text-[#6EE7B7]'
                              : 'text-[#1E6B43]'
                            : isDrink
                            ? 'text-[#F4EEE2]/70'
                            : 'text-[#6E5649]'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {restaurant.delivery.available
                            ? restaurant.delivery.platforms?.length
                              ? `Livrare (${restaurant.delivery.platforms.join(', ')})`
                              : 'Livrare disponibilă'
                            : 'Doar în local'}
                        </span>
                      </span>
                    </>
                  )}
                </div>

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

                {(() => {
                  const monthlyCategoryAwards = getVenueMonthlyCategoryAwards(
                    isDrink ? 'drink' : 'food',
                    restaurant.slug
                  );
                  if (monthlyCategoryAwards.length === 0) return null;
                  const medalName = (r: 1 | 2 | 3) =>
                    r === 1 ? 'Aur · Locul 1' : r === 2 ? 'Argint · Locul 2' : 'Bronz · Locul 3';

                  return (
                    <div
                      aria-label="Distincții din votul lunii"
                      className="flex flex-wrap items-stretch gap-2.5 pt-1.5"
                    >
                      {monthlyCategoryAwards.map((award) => (
                        <div
                          key={award.categoryId}
                          className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-[4px] border ${
                            isDrink
                              ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2]'
                              : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                          }`}
                        >
                          <TrophyMedalBadge rank={award.rank} categoryId={award.categoryId} size="md" />
                          <div className="min-w-0 leading-tight">
                            <div
                              className={`text-[11px] font-bold uppercase tracking-[0.06em] ${
                                isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                              }`}
                            >
                              Votul lunii · {medalName(award.rank)}
                            </div>
                            <div className="font-display text-[17px] leading-tight mt-0.5">
                              {award.categoryTitle}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Dreapta: scorul ca în clasament — farfurie (food) / halbă (drink) + „Scor Onest” */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                {isDrink ? <MugScore score={restaurant.foodQualityScore} size="lg" /> : <PlateScore score={restaurant.foodQualityScore} size="lg" />}
                <span aria-hidden="true" className={`text-[13px] font-bold leading-none whitespace-nowrap ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}>
                  Scor Onest
                </span>
                {restaurant.foodQualityScore > 0 ? null : (
                  <span aria-hidden="true" className="text-[12px] font-semibold leading-tight text-center max-w-[120px]">
                    Încă nu are review-uri
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowScoreFormula((prev) => !prev)}
                  aria-expanded={showScoreFormula}
                  aria-controls="scor-onest-formula"
                  className={`btn-press min-h-[44px] inline-flex items-center -my-2 text-[11px] font-semibold underline underline-offset-2 ${
                    isDrink ? 'text-[#F2A33A] hover:opacity-80' : 'text-[#6E5649] hover:text-[#3A2418]'
                  }`}
                >
                  {showScoreFormula ? 'Ascunde formula' : 'Cum se calculează?'}
                </button>
              </div>
            </div>

            <div
              id="scor-onest-formula"
              className="collapse-grid"
              data-open={showScoreFormula}
            >
              <div className="collapse-inner">
                <div
                  className={`p-3 rounded-[4px] border text-[12px] leading-relaxed ${
                    isDrink
                      ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]/85'
                      : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                  }`}
                >
                  <p>
                    <strong>Scorul onest</strong> ponderează voturile după credibilitate:{' '}
                    <strong>2,0× localnic verificat</strong>,{' '}
                    <strong>1,0× turist</strong> și{' '}
                    <strong>0,2× influencer</strong> (colaborările plătite nu domină
                    media). O <strong>vizită verificată</strong> (check-in la local sau bonul
                    verificat de un admin) adaugă <strong>×1,3</strong>
                    {restaurant.verifiedVisitCount !== undefined &&
                      ` (${restaurant.verifiedVisitCount} ${restaurant.verifiedVisitCount === 1 ? 'review are' : 'review-uri au'} vizita verificată aici)`}
                    . Localurile cu puține review-uri sunt trase ușor spre media
                    orașului, ca un singur vot extrem să nu deformeze clasamentul.
                  </p>
                  {restaurant.scorePriorNote && <p className="mt-2">{restaurant.scorePriorNote}</p>}
                </div>
              </div>
            </div>

            {/* OPȚIUNI LOCAL: Meniu · Program de funcționare · Compară cu Google Maps */}
            <div className="pt-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-expanded={showMenu}
                  aria-controls="locale-menu-panel"
                  className={`btn-press min-h-[44px] px-3.5 py-2 rounded-[4px] border text-[13px] font-semibold inline-flex items-center gap-2 ${
                    showMenu
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'bg-[#143025] text-[#F4EEE2] border-[#2D5947] hover:border-[#F2A33A]'
                      : 'bg-[#FAF8F5] text-[#3A2418] border-[#D6CFC5] hover:border-[#3A2418]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>{showMenu ? 'Ascunde meniul' : `Vezi meniul (${menuItemCount})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHours((prev) => !prev)}
                  aria-expanded={showHours}
                  aria-controls="locale-hours-panel"
                  className={`btn-press min-h-[44px] px-3.5 py-2 rounded-[4px] border text-[13px] font-semibold inline-flex items-center gap-2 ${
                    showHours
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'bg-[#143025] text-[#F4EEE2] border-[#2D5947] hover:border-[#F2A33A]'
                      : 'bg-[#FAF8F5] text-[#3A2418] border-[#D6CFC5] hover:border-[#3A2418]'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>{showHours ? 'Ascunde programul' : 'Program de funcționare'}</span>
                </button>

                {/* Comparația are sens doar când avem și nota Google, și Scorul Onest */}
                {restaurant.googleRawRating > 0 && restaurant.foodQualityScore > 0 && (
                <button
                  type="button"
                  onClick={() => setShowGoogleCompare((prev) => !prev)}
                  aria-expanded={showGoogleCompare}
                  aria-controls="locale-google-compare-panel"
                  className={`btn-press min-h-[44px] px-3.5 py-2 rounded-[4px] border text-[13px] font-semibold inline-flex items-center gap-2 ${
                    showGoogleCompare
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'bg-[#143025] text-[#F4EEE2] border-[#2D5947] hover:border-[#F2A33A]'
                      : 'bg-[#FAF8F5] text-[#3A2418] border-[#D6CFC5] hover:border-[#3A2418]'
                  }`}
                >
                  <Scale className="w-4 h-4 shrink-0" />
                  <span>
                    {showGoogleCompare
                      ? 'Ascunde comparația'
                      : `Vs. Google Maps (${formatScore(restaurant.googleRawRating)}★)`}
                  </span>
                </button>
                )}
              </div>

              {/* Panel 1: Meniu complet */}
              <div
                id="locale-menu-panel"
                className="collapse-grid"
                data-open={showMenu}
              >
                <div className="collapse-inner">
                  <div
                    className={`p-4 rounded-[4px] border space-y-4 ${
                      isDrink
                        ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                        : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2.5 border-current/15">
                      <h3 className="font-display text-[22px] leading-none">
                        Meniu
                      </h3>
                      <span
                        className={`text-[12px] ${
                          isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                        }`}
                      >
                        Ultima actualizare: <strong>{lastUpdated}</strong>
                      </span>
                    </div>

                    {restaurant.delivery && (
                      <div
                        className={`rounded-[4px] border px-3.5 py-2.5 text-[12px] flex flex-wrap items-center justify-between gap-2 ${
                          isDrink
                            ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/85'
                            : 'bg-[#FAF7F2] border-[#E6DFD5] text-[#3A2418]'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Truck
                            className={`w-4 h-4 shrink-0 ${
                              isDrink ? 'text-[#E0A526]' : 'text-[#B3261E]'
                            }`}
                          />
                          <span className="font-semibold">
                            {restaurant.delivery.available
                              ? 'Livrare la domiciliu:'
                              : 'Fără livrare (doar în local)'}
                          </span>
                          {restaurant.delivery.available &&
                            restaurant.delivery.platforms &&
                            restaurant.delivery.platforms.length > 0 && (
                              <span>
                                {restaurant.delivery.platforms.join(', ')}
                              </span>
                            )}
                          {restaurant.delivery.ownDelivery && (
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded-[3px] font-medium ${
                                isDrink
                                  ? 'bg-[#1F4A3A] text-[#6EE7B7]'
                                  : 'bg-[#E9F3EC] text-[#1E6B43]'
                              }`}
                            >
                              Livrare proprie
                            </span>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-2 flex-wrap text-[11px] ${
                            isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                          }`}
                        >
                          {restaurant.delivery.minimumOrderRon != null && (
                            <span>
                              Comandă minimă: {restaurant.delivery.minimumOrderRon} lei
                            </span>
                          )}
                          {restaurant.delivery.estimatedTime && (
                            <span>· {restaurant.delivery.estimatedTime}</span>
                          )}
                          {restaurant.delivery.note && (
                            <span>· {restaurant.delivery.note}</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {menuCategories.map((category) => (
                        <div key={category.title} className="space-y-2">
                          <h4
                            className={`text-[11px] font-bold uppercase tracking-wider ${
                              isDrink ? 'text-[#F2A33A]' : 'text-[#6E5649]'
                            }`}
                          >
                            {category.title}
                          </h4>
                          <div
                            className={`divide-y ${
                              isDrink ? 'divide-[#285443]' : 'divide-[#E6DFD5]'
                            }`}
                          >
                            {category.items.map((item) => (
                              <div
                                key={item.name}
                                className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                              >
                                {item.photoUrl && (
                                  // onError: dacă ownerul a resalvat meniul între timp, id-ul vechi dă 404; ascundem poza ruptă.
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.photoUrl} alt="" width={56} height={56} loading="lazy" onError={(e) => { e.currentTarget.hidden = true; }} className="size-14 shrink-0 rounded-[3px] object-cover" />
                                )}
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-[14px] leading-snug">
                                      {item.name}
                                    </span>
                                    {item.isMustOrder && (
                                      <span
                                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                                          isDrink
                                            ? 'bg-[#F2A33A] text-[#17382C]'
                                            : 'bg-[#B3261E] text-white'
                                        }`}
                                      >
                                        De neratat
                                      </span>
                                    )}
                                    {item.portion && (
                                      <span
                                        className={`text-[11px] ${
                                          isDrink ? 'text-[#F4EEE2]/60' : 'text-[#6E5649]'
                                        }`}
                                      >
                                        ({item.portion})
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p
                                      className={`text-[12px] leading-snug ${
                                        isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                                      }`}
                                    >
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`font-display text-[17px] leading-none shrink-0 tabular-nums pt-0.5 ${
                                    isDrink ? 'text-[#F2A33A]' : 'text-[#3A2418]'
                                  }`}
                                >
                                  {item.priceRon === 0 ? 'Gratuit' : `${item.priceRon} lei`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 2: Program de funcționare */}
              <div
                id="locale-hours-panel"
                className="collapse-grid"
                data-open={showHours}
              >
                <div className="collapse-inner">
                  <div
                    className={`p-4 rounded-[4px] border space-y-3 ${
                      isDrink
                        ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                        : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-current/15">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-[22px] leading-none">
                          Program de funcționare
                        </h3>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-[2px] ${
                            restaurant.openNow
                              ? isDrink
                                ? 'bg-[#1E4335] text-[#6EE7B7] border border-[#2D5947]'
                                : 'bg-[#E8F5EE] text-[#1E6B43]'
                              : isDrink
                              ? 'bg-[#3B1D1D] text-[#FCA5A5]'
                              : 'bg-[#FDECEC] text-[#B3261E]'
                          }`}
                        >
                          {restaurant.openNow ? 'Deschis acum' : 'Închis'}
                        </span>
                      </div>
                      <span
                        className={`text-[12px] ${
                          isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                        }`}
                      >
                        Actualizat: <strong>{lastUpdated}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
                      {weeklyHours.map((entry) => {
                        const isToday = entry.day === todayDayName;
                        const isClosed = entry.hours.toLowerCase() === 'închis';
                        return (
                          <div
                            key={entry.day}
                            className={`flex items-center justify-between py-1 px-2 rounded-[3px] ${
                              isToday
                                ? isDrink
                                  ? 'bg-[#1E4335] font-bold text-[#F2A33A]'
                                  : 'bg-[#EFE9E0] font-bold text-[#3A2418]'
                                : ''
                            }`}
                          >
                            <span>
                              {entry.day}
                              {isToday ? ' (azi)' : ''}
                            </span>
                            <span
                              className={`tabular-nums ${
                                isClosed
                                  ? isDrink
                                    ? 'text-[#FCA5A5]/80'
                                    : 'text-[#B3261E]'
                                  : ''
                              }`}
                            >
                              {entry.hours}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 3: Comparație TOP FOOD / TOP DRINK vs. Google Maps */}
              {restaurant.googleRawRating > 0 && restaurant.foodQualityScore > 0 && (
              <div
                id="locale-google-compare-panel"
                className="collapse-grid"
                data-open={showGoogleCompare}
              >
                <div className="collapse-inner">
                  <div
                    className={`p-4 rounded-[4px] border space-y-3.5 ${
                      isDrink
                        ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                        : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2.5 border-current/15">
                      <h3 className="font-display text-[22px] leading-none">
                        {isDrink ? 'TOP DRINK' : 'TOP FOOD'} vs. Google Maps
                      </h3>
                      <span
                        className={`text-[12px] font-bold px-2 py-0.5 rounded-[2px] ${
                          googleVsTopDiff >= 1.5
                            ? isDrink
                              ? 'bg-[#3B1D1D] text-[#FCA5A5]'
                              : 'bg-[#FDECEC] text-[#B3261E]'
                            : isDrink
                            ? 'bg-[#1E4335] text-[#F2A33A]'
                            : 'bg-[#EFE9E0] text-[#3A2418]'
                        }`}
                      >
                        {googleVsTopDiff > 0
                          ? `+${formatScore(googleVsTopDiff)} pct pe Google Maps`
                          : googleVsTopDiff < 0
                          ? `${formatScore(googleVsTopDiff)} pct față de Google Maps`
                          : 'Scor identic'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* TOP FOOD / TOP DRINK bar */}
                      <div className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-[13px] font-bold">
                          {isDrink ? 'TOP DRINK' : 'TOP FOOD'}
                        </span>
                        <div
                          className={`flex-1 h-2.5 rounded-[2px] overflow-hidden ${
                            isDrink ? 'bg-[#285443]' : 'bg-[#EAE3D9]'
                          }`}
                        >
                          <div
                            className={`h-full bar-scale-fill ${
                              isDrink ? 'bg-[#F2A33A]' : 'bg-[#B3261E]'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(4, restaurant.foodQualityScore * 10))}%`,
                            }}
                          />
                        </div>
                        <span className="font-display text-[20px] leading-none tabular-nums w-14 text-right">
                          <HonestValue score={restaurant.foodQualityScore} />
                          <span className="text-[12px] font-sans opacity-70">/10</span>
                        </span>
                      </div>

                      {/* Google Maps bar */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-28 shrink-0 text-[13px] font-semibold ${
                            isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
                          }`}
                        >
                          Google Maps
                        </span>
                        <div
                          className={`flex-1 h-2.5 rounded-[2px] overflow-hidden ${
                            isDrink ? 'bg-[#285443]' : 'bg-[#EAE3D9]'
                          }`}
                        >
                          <div
                            className="h-full bg-[#9C8978] bar-scale-fill"
                            style={{
                              width: `${Math.min(100, Math.max(4, googleOn10 * 10))}%`,
                              animationDelay: '60ms',
                            }}
                          />
                        </div>
                        <span className="font-display text-[20px] leading-none tabular-nums w-14 text-right">
                          {formatScore(restaurant.googleRawRating)}
                          <span className="text-[12px] font-sans opacity-70">★</span>
                        </span>
                      </div>
                    </div>

                    <p
                      className={`text-[12px] leading-relaxed ${
                        isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                      }`}
                    >
                      Nota Google Maps ({formatScore(restaurant.googleRawRating)}★, echivalent{' '}
                      <strong>{formatScore(googleOn10)}/10</strong>) este o medie neponderată.{' '}
                      {googleVsTopDiff >= 1.5
                        ? 'Diferența mare arată că recenziile turistice și cele de trecere ridică artificial media pe Google.'
                        : Math.abs(googleVsTopDiff) <= 0.6
                        ? 'Scorurile sunt aliniate: atât localnicii, cât și vizitatorii de pe Google confirmă calitatea.'
                        : googleVsTopDiff < 0
                        ? 'Localnicii de pe platformă îl apreciază mai mult decât media generală de pe Google Maps.'
                        : 'Localnicii de pe platformă evaluează puțin mai exigent decât media generală de pe Google Maps.'}
                    </p>
                  </div>
                </div>
              </div>
              )}
            </div>
          </section>

          {/* Zona live rămâne în pagină ca anunțul să fie citit; goală, nu adaugă spațiu în plus între secțiuni. */}
          <div role="status" aria-live="polite" className="empty:mb-0">

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
          </div>

          {/* AVERTIZĂRI & FACILITĂȚI */}
          <section
            aria-label="Avertizări și facilități"
            className={`p-4 rounded-[4px] border space-y-3 ${
              isDrink
                ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
            }`}
          >
            {hasAnyWarning && (
              <div className="space-y-2">
                <h3
                  className={`text-[14px] font-bold flex items-center gap-1.5 ${
                    isDrink ? 'text-[#FCA5A5]' : 'text-[#B3261E]'
                  }`}
                >
                  {/* Triunghiul e rezervat capcanelor turistice; aici e un semn de avertizare pentru vizitatori. */}
                  <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Avertizări pentru vizitatori</span>
                </h3>
                <ul className="space-y-1.5">
                  {venueWarnings.unsafeFeeling && (
                    <li
                      className={`text-[13px] px-3 py-2 rounded-[4px] border flex items-start gap-2 ${
                        isDrink
                          ? 'bg-[#3B1D1D]/70 border-[#FCA5A5]/30 text-[#FEE2E2]'
                          : 'bg-[#FDECEC] border-[#F5C2C0] text-[#7A1812]'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Siguranță:</strong> {venueWarnings.unsafeFeeling}
                      </span>
                    </li>
                  )}
                  {venueWarnings.veryNoisy && (
                    <li
                      className={`text-[13px] px-3 py-2 rounded-[4px] border flex items-start gap-2 ${
                        isDrink
                          ? 'bg-[#3A2D14]/70 border-[#F2A33A]/35 text-[#FDE68A]'
                          : 'bg-[#FEF6E4] border-[#E8CF96] text-[#6B4A0B]'
                      }`}
                    >
                      <Volume2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Zgomot:</strong> {venueWarnings.veryNoisy}
                      </span>
                    </li>
                  )}
                  {venueWarnings.brightLights && (
                    <li
                      className={`text-[13px] px-3 py-2 rounded-[4px] border flex items-start gap-2 ${
                        isDrink
                          ? 'bg-[#3A2D14]/70 border-[#F2A33A]/35 text-[#FDE68A]'
                          : 'bg-[#FEF6E4] border-[#E8CF96] text-[#6B4A0B]'
                      }`}
                    >
                      <Sun className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Lumină puternică:</strong>{' '}
                        {venueWarnings.brightLights}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Pliabilă, închisă implicit; avertizările de deasupra rămân mereu vizibile. */}
            <details className="group">
              <summary className="owner-summary cursor-pointer min-h-[44px] flex items-center justify-between gap-2 rounded-[4px]">
                <h3
                  className={`text-[14px] font-bold ${
                    isDrink ? 'text-[#F2A33A]' : 'text-[#3A2418]'
                  }`}
                >
                  Facilități și accesibilitate
                </h3>
                <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'}`}>
                  <span className="group-open:hidden">Arată</span>
                  <span className="hidden group-open:inline">Ascunde</span>
                  <ChevronDown className="owner-chevron w-4 h-4 shrink-0" aria-hidden="true" />
                </span>
              </summary>
              <div className="pt-2">
              {restaurant.features ? (
                <VenueFeatures groups={restaurant.features} quick={restaurant.quick} dark={isDrink} />
              ) : (
              <div className="flex flex-wrap gap-2">
                {venueFacilities.disabilityFriendly !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-[4px] border ${
                      venueFacilities.disabilityFriendly
                        ? isDrink
                          ? 'bg-[#1E4335] border-[#2D5947] text-[#A7F3D0]'
                          : 'bg-[#ECF7F0] border-[#BCE3CB] text-[#1E6B43]'
                        : isDrink
                        ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/70'
                        : 'bg-white border-[#E6DFD5] text-[#6E5649]'
                    }`}
                  >
                    <Accessibility className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {typeof venueFacilities.disabilityFriendly === 'string'
                        ? venueFacilities.disabilityFriendly
                        : venueFacilities.disabilityFriendly
                        ? 'Accesibil persoane cu dizabilități'
                        : 'Acces limitat (trepte / fără rampă)'}
                    </span>
                  </span>
                )}

                {venueFacilities.hasOutlets !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-[4px] border ${
                      venueFacilities.hasOutlets
                        ? isDrink
                          ? 'bg-[#1E4335] border-[#2D5947] text-[#F4EEE2]'
                          : 'bg-white border-[#D6CFC5] text-[#3A2418]'
                        : isDrink
                        ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/65'
                        : 'bg-white border-[#E6DFD5] text-[#6E5649]'
                    }`}
                  >
                    <Plug className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {venueFacilities.hasOutlets
                        ? 'Prize la mese'
                        : 'Fără prize la mese'}
                    </span>
                  </span>
                )}

                {restaurant.delivery && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-[4px] border ${
                      isDrink
                        ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/85'
                        : 'bg-white border-[#E6DFD5] text-[#3A2418]'
                    }`}
                  >
                    <Truck className="w-3 h-3 shrink-0 opacity-75" />
                    <span>
                      {restaurant.delivery.available
                        ? restaurant.delivery.platforms?.length
                          ? `Livrare: ${restaurant.delivery.platforms.join(', ')}`
                          : 'Livrare disponibilă'
                        : 'Fără livrare (doar în local)'}
                    </span>
                  </span>
                )}
                {venueFacilities.otherFacilities?.map((fac) => (
                  <span
                    key={fac}
                    className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-[4px] border ${
                      isDrink
                        ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/85'
                        : 'bg-white border-[#E6DFD5] text-[#3A2418]'
                    }`}
                  >
                    <Check className="w-3 h-3 shrink-0 opacity-75" />
                    <span>{fac}</span>
                  </span>
                ))}
              </div>
              )}
              </div>
            </details>
          </section>

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
                dark={isDrink}
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
                    className={`btn-press min-h-[44px] inline-flex items-center px-2 -mr-2 -my-2 font-semibold underline underline-offset-4 ${
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
                            className={`text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] ${
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
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
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
                    className={`btn-press shrink-0 min-h-[44px] px-3.5 py-2 rounded-[4px] text-[13px] font-semibold border whitespace-nowrap ${
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
                  className={`btn-press shrink-0 min-h-[44px] px-2 text-[12px] font-semibold underline underline-offset-4 ${
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
                  const server = helpfulServer[reviewKey];
                  const isHelpfulVoted = server ? server.voted : Boolean(helpfulVotedKeys[reviewKey]);
                  const helpfulTotal = server
                    ? server.count
                    : (rev.helpfulCount ?? 0) + (isHelpfulVoted ? 1 : 0);
                  const isOwnReview = Boolean(
                    currentUser &&
                      rev.id &&
                      (rev.authorId
                        ? rev.authorId === currentUser.id
                        : rev.authorName === currentUser.name)
                  );
                  const isEditingThis = editingReviewKey === reviewKey;
                  const isConfirmingDelete = confirmDeleteKey === reviewKey;

                  return (
                    <article
                      key={reviewKey}
                      style={{ '--stagger-idx': Math.min(idx, 5) } as React.CSSProperties}
                      className="stagger-fade-in py-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-[15px]">
                            {rev.authorUsername ? (
                              <Link
                                href={`/u/${encodeURIComponent(rev.authorUsername)}`}
                                className="hover:underline"
                              >
                                {rev.authorName}
                              </Link>
                            ) : (
                              rev.authorName
                            )}
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
                            <TuristBadge size="xs" />
                          )}
                          {rev.isVerifiedVisit && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${
                                isDrink
                                  ? 'bg-[#1E4335] border-[#2D5947] text-[#A7F3D0]'
                                  : 'bg-[#ECF7F0] border-[#BCE3CB] text-[#1E6B43]'
                              }`}
                            >
                              <Check className="w-3 h-3" aria-hidden="true" />
                              Vizită verificată
                              {rev.verifiedVia === 'gps' ? ' · check-in' : rev.verifiedVia === 'receipt' ? ' · bon' : ''}
                              <span className="sr-only">, review-ul cântărește ×1,3</span>
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

                      {isEditingThis && rev.id ? (
                        <div
                          className={`rounded-[4px] border p-3.5 space-y-3 ${
                            isDrink
                              ? 'bg-[#143025] border-[#2D5947]'
                              : 'bg-[#FAF8F5] border-[#E6DFD5]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <label
                              htmlFor={`edit-score-${reviewKey}`}
                              className="text-[12px] font-bold"
                            >
                              Notă (1–10):
                            </label>
                            <input
                              id={`edit-score-${reviewKey}`}
                              type="number"
                              min={1}
                              max={10}
                              step={1}
                              value={editScoreText}
                              onChange={(e) => setEditScoreText(e.target.value)}
                              className={`w-24 min-h-[44px] px-3 py-2 rounded-[4px] border text-[16px] sm:text-[14px] font-bold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E0A526] ${
                                isDrink
                                  ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] focus:border-[#F2A33A]'
                                  : 'bg-white border-[#D6CFC5] text-[#3A2418] focus:border-[#3A2418]'
                              }`}
                            />
                          </div>

                          <textarea
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            aria-label="Text review editat"
                            className={`w-full min-h-[44px] px-3 py-2.5 rounded-[4px] border text-[16px] sm:text-[14px] leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E0A526] ${
                              isDrink
                                ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] focus:border-[#F2A33A]'
                                : 'bg-white border-[#D6CFC5] text-[#3A2418] focus:border-[#3A2418]'
                            }`}
                          />

                          {editError && (
                            <p className="text-[12px] font-semibold text-[#B3261E]">
                              {editError}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isSavingEdit}
                              onClick={() => handleSaveEdit(rev.id!)}
                              className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-bold disabled:opacity-50 ${
                                isDrink
                                  ? 'bg-[#F2A33A] text-[#17382C]'
                                  : 'bg-[#B3261E] text-white'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isSavingEdit ? 'Se salvează...' : 'Salvează modificările'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isSavingEdit}
                              onClick={() => {
                                setEditingReviewKey(null);
                                setEditError(null);
                              }}
                              className={`btn-press min-h-[44px] px-4 py-2 rounded-[4px] border text-[13px] font-semibold ${
                                isDrink
                                  ? 'border-[#2D5947] text-[#F4EEE2]/80'
                                  : 'border-[#D6CFC5] text-[#6E5649]'
                              }`}
                            >
                              Anulează
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[15px] leading-[1.55]">{rev.text}</p>
                      )}

                      {(rev.safetyScore !== undefined ||
                        rev.noiseLevel !== undefined) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {rev.safetyScore !== undefined && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[11px] font-semibold border ${
                                isDrink
                                  ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/90'
                                  : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              Siguranță {rev.safetyScore}/5
                            </span>
                          )}
                          {rev.noiseLevel !== undefined && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[11px] font-semibold border ${
                                isDrink
                                  ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/90'
                                  : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                              }`}
                            >
                              <Volume2 className="w-3 h-3" />
                              Zgomot: {NOISE_LABELS[rev.noiseLevel]}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div
                          className={`text-[12px] ${
                            isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                          }`}
                        >
                          {rev.date}
                          {rev.sourceLabel ? `, ${rev.sourceLabel}` : ''}
                          {rev.praisedEmployee
                            ? `. Servită de ${rev.praisedEmployee}`
                            : ''}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isOwnReview && !isEditingThis && !isConfirmingDelete && (
                            <>
                              {onEditReview && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(reviewKey, rev)}
                                  className={`btn-press inline-flex items-center gap-1 min-h-[44px] px-2.5 py-1.5 rounded-[3px] border text-[12px] font-semibold ${
                                    isDrink
                                      ? 'border-[#285443] text-[#F4EEE2]/85 hover:border-[#F2A33A]'
                                      : 'border-[#E6DFD5] text-[#6E5649] hover:border-[#3A2418] hover:text-[#3A2418]'
                                  }`}
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Editează</span>
                                </button>
                              )}
                              {onDeleteReview && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReviewKey(null);
                                    setConfirmDeleteKey(reviewKey);
                                  }}
                                  className={`btn-press inline-flex items-center gap-1 min-h-[44px] px-2.5 py-1.5 rounded-[3px] border text-[12px] font-semibold ${
                                    isDrink
                                      ? 'border-[#285443] text-[#FFB4AC] hover:border-[#FFB4AC]'
                                      : 'border-[#E6DFD5] text-[#B3261E] hover:border-[#B3261E]'
                                  }`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Șterge</span>
                                </button>
                              )}
                            </>
                          )}

                          {isConfirmingDelete && rev.id && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isDeletingKey === reviewKey}
                                onClick={() => handleConfirmDelete(reviewKey, rev.id!)}
                                className="btn-press min-h-[44px] px-3 py-1.5 rounded-[3px] bg-[#B3261E] text-white text-[12px] font-bold disabled:opacity-50"
                              >
                                {isDeletingKey === reviewKey ? 'Se șterge...' : 'Confirmă ștergerea'}
                              </button>
                              <button
                                type="button"
                                disabled={isDeletingKey === reviewKey}
                                onClick={() => setConfirmDeleteKey(null)}
                                className={`btn-press min-h-[44px] px-2.5 py-1.5 rounded-[3px] border text-[12px] font-semibold ${
                                  isDrink
                                    ? 'border-[#285443] text-[#F4EEE2]/80'
                                    : 'border-[#E6DFD5] text-[#6E5649]'
                                }`}
                              >
                                Anulează
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleHelpful(reviewKey, rev.id)}
                            aria-pressed={isHelpfulVoted}
                            className={`btn-press inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-[3px] border text-[12px] font-semibold ${
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

              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden shrink-0 ${
                    isDrink ? 'bg-[#1E4335]' : 'bg-[#ECE6DD]'
                  }`}
                >
                  {restaurant.kitchenStory.photoUrl ? (
                    <img
                      src={restaurant.kitchenStory.photoUrl}
                      alt={restaurant.kitchenStory.title}
                      loading="lazy"
                      decoding="async"
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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

          {/* VIDEOURI DIN COMUNITATE (Item 2: embed TikTok/IG/YouTube + „Lipește un link”) */}
          {((restaurant.videos && restaurant.videos.length > 0) || onSubmitVideo) && (
            <section
              aria-label="Pe social media"
              className={`pt-5 border-t space-y-3.5 ${
                isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 opacity-75" aria-hidden="true" />
                <h2 className="font-display text-[28px] sm:text-[32px] leading-none">
                  Pe social media
                </h2>
              </div>

              {restaurant.videos && restaurant.videos.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {restaurant.videos.map((vid) => {
                    const src = embedSrc(vid.url);
                    return (
                      <div
                        key={vid.url}
                        className={`rounded-[6px] border p-3 space-y-2 ${
                          isDrink ? 'border-[#285443] bg-[#143025]' : 'border-[#E6DFD5] bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider">
                          <span>{PLATFORM_LABEL[vid.platform] ?? vid.platform}</span>
                          {(vid.isPaid || vid.adSignal !== 'organic') && (
                            <span className={`rounded px-1.5 py-0.5 ${isDrink ? 'bg-[#B3261E]/25 text-[#FFB4AB]' : 'bg-[#B3261E]/15 text-[#B3261E]'}`}>
                              {vid.adSignal === 'marcat_reclama' ? 'Marcat reclamă' : 'Posibil reclamă'}
                            </span>
                          )}
                        </div>
                        {/* Titlul înaintea clipului, ca cititoarele de ecran să știe ce urmează */}
                        {vid.title && <h3 className="text-[13px] font-semibold leading-snug">{vid.title}</h3>}
                        {src && (
                          <div className="aspect-video w-full overflow-hidden rounded-[4px] bg-black/20">
                            <iframe
                              src={src}
                              title={`Video: ${vid.title ?? restaurant.name} (${PLATFORM_LABEL[vid.platform] ?? vid.platform})`}
                              className="h-full w-full border-0"
                              allowFullScreen
                              loading="lazy"
                            />
                          </div>
                        )}
                        <a href={vid.url} target="_blank" rel="noopener noreferrer" className="inline-block text-[13px] font-semibold underline">
                          Deschide pe {PLATFORM_LABEL[vid.platform] ?? vid.platform}<span className="sr-only">: {vid.title ?? restaurant.name} (se deschide într-o filă nouă)</span>
                        </a>
                        <p className={`text-[12px] ${isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'}`}>
                          {vid.discoveredVia ? `Găsit automat pe ${PLATFORM_LABEL[vid.platform] ?? vid.platform}` : 'Trimis de un utilizator'}
                        </p>
                        {(vid.dishes.length > 0 || vid.prices.length > 0) && (
                          <p className={`text-[12px] ${isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'}`}>
                            {vid.dishes.length > 0 && <>Menționat: {vid.dishes.join(', ')}</>}
                            {vid.prices.length > 0 && (
                              <> · Prețuri: {vid.prices.map((p) => `${p.item} ${p.priceLei} lei`).join(', ')}</>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-[13px] ${isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>
                  Încă nu avem postări de pe social media despre acest local.
                </p>
              )}

              {onSubmitVideo && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (videoBusy || !videoUrlInput.trim()) return;
                    setVideoBusy(true);
                    setVideoStatus(null);
                    const res = await onSubmitVideo(restaurant.id, videoUrlInput.trim());
                    setVideoBusy(false);
                    if (!res.ok) {
                      setVideoStatus({ text: res.error ?? 'Link invalid.', error: true });
                      return;
                    }
                    setVideoUrlInput('');
                    setVideoStatus({ text: 'Video adăugat și analizat.', error: false });
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="Lipește un link TikTok, Instagram, YouTube sau Facebook"
                    aria-label="Link video TikTok, Instagram, YouTube sau Facebook"
                    className={`min-w-0 w-full sm:min-w-[220px] sm:flex-1 min-h-[44px] rounded-[4px] border px-3 py-2 text-[16px] sm:text-[14px] ${
                      isDrink
                        ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder:text-[#F4EEE2]/60'
                        : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder:text-[#6E5649]'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={videoBusy || !videoUrlInput.trim()}
                    className={`btn-press min-h-[44px] rounded-[4px] px-4 py-2 text-[13px] font-bold disabled:opacity-50 ${
                      isDrink ? 'bg-[#F2A33A] text-[#17382C]' : 'bg-[#3A2418] text-white'
                    }`}
                  >
                    {videoBusy ? 'Se procesează…' : 'Adaugă video'}
                  </button>
                </form>
              )}
              {videoStatus && (
                <p className={`text-[12px] font-semibold ${videoStatus.error ? 'text-[#B3261E]' : 'text-patrunjel'}`}>
                  {videoStatus.text}
                </p>
              )}
            </section>
          )}
        </div>

        {/* BOTTOM STICKY BAR: Scrie un review + Siguranță + Gălăgie + Bookmark */}
        <div
          className={`sticky bottom-0 z-40 border-t ${
            isDrink
              ? 'bg-[#17382C]/95 border-[#285443]'
              : 'bg-white/95 border-[#E6DFD5]'
          } backdrop-blur-sm`}
        >
          {activeQuickVote && (
            <div
              className={`border-b ${
                isDrink
                  ? 'border-[#285443] bg-[#122B22]'
                  : 'border-[#E6DFD5] bg-[#FAF8F5]'
              }`}
            >
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold flex items-center gap-1.5">
                    {activeQuickVote === 'safety' ? (
                      <>
                        <ShieldCheck className="w-4 h-4 opacity-80" />
                        <span>Te-ai simțit în siguranță?</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 opacity-80" />
                        <span>E gălăgie?</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveQuickVote(null)}
                    className={`min-h-[44px] px-2.5 inline-flex items-center text-[12px] font-medium rounded-[4px] ${
                      isDrink
                        ? 'text-[#F4EEE2]/70 hover:text-[#F4EEE2]'
                        : 'text-[#6E5649] hover:text-[#3A2418]'
                    }`}
                  >
                    Închide
                  </button>
                </div>

                {activeQuickVote === 'safety' ? (
                  <div className="space-y-1">
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        const active = safetyScore === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleScaleVote('safety', lvl)}
                            aria-pressed={active}
                            aria-label={`Siguranță ${lvl} din 5`}
                            className={`btn-press min-h-[44px] rounded-[4px] border text-[13px] font-bold ${
                              active
                                ? isDrink
                                  ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                                  : 'bg-[#3A2418] text-white border-[#3A2418]'
                                : isDrink
                                ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]/85 hover:border-[#F2A33A]'
                                : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                            }`}
                          >
                            {lvl}
                          </button>
                        );
                      })}
                    </div>
                    <div
                      className={`flex justify-between text-[11px] ${
                        isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                      }`}
                    >
                      <span>Nesigur</span>
                      <span>Foarte sigur</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {NOISE_OPTIONS.map((opt) => {
                      const active = noiseLevel === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            handleScaleVote('noise', NOISE_LEVELS.find((l) => l.id === opt.id)!.value)
                          }
                          aria-pressed={active}
                          className={`btn-press min-h-[44px] px-2 rounded-[4px] border text-[12px] font-semibold ${
                            active
                              ? isDrink
                                ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                                : 'bg-[#3A2418] text-white border-[#3A2418]'
                              : isDrink
                              ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]/85 hover:border-[#F2A33A]'
                              : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  onRequireLogin?.();
                  return;
                }
                setActiveQuickVote(null);
                setIsReviewDrawerOpen(true);
              }}
              className={`btn-press flex-1 min-w-0 min-h-[44px] sm:min-h-[48px] py-2.5 sm:py-3 px-3 sm:px-5 rounded-[4px] font-bold text-[13px] min-[375px]:text-[14px] sm:text-[15px] hover:opacity-90 ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C]'
                  : 'bg-[#B3261E] text-white'
              }`}
            >
              <span className="sm:hidden truncate block">
                {currentUser ? 'Scrie review' : 'Cont pt review'}
              </span>
              <span className="hidden sm:inline truncate">
                {currentUser
                  ? 'Scrie un review'
                  : 'Intră în cont ca să scrii un review'}
              </span>
            </button>

            {/* Ordinea vine din profil și e și ordinea din DOM (tastatură, cititor de ecran). */}
            {quickButtons.order.map((kind) =>
              kind === 'safety' ? (
                <button
                  key="safety"
                  type="button"
                  onClick={() =>
                    setActiveQuickVote((prev) =>
                      prev === 'safety' ? null : 'safety'
                    )
                  }
                  aria-pressed={activeQuickVote === 'safety'}
                  title={quickButtons.highlighted.includes('safety') ? 'Relevant pentru preferințele tale (Ieșiri)' : undefined}
                  className={`btn-press min-h-[44px] sm:min-h-[48px] px-2.5 sm:px-3 rounded-[4px] border text-[12px] sm:text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0 ${
                    quickButtons.highlighted.includes('safety') && safetyScore === null ? (isDrink ? 'ring-2 ring-[#F2A33A] ' : 'ring-2 ring-[#B3261E] ') : ''
                  }${
                    safetyScore !== null || activeQuickVote === 'safety'
                      ? isDrink
                        ? 'bg-[#F2A33A]/15 border-[#F2A33A] text-[#F2A33A]'
                        : 'bg-[#3A2418] border-[#3A2418] text-white'
                      : isDrink
                      ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                      : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  {safetyScore !== null ? (
                    <span>Siguranță {safetyScore}/5</span>
                  ) : (
                    <>
                      <span className="sm:hidden">Siguranță</span>
                      <span className="hidden sm:inline">Te-ai simțit în siguranță?</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  key="noise"
                  type="button"
                  onClick={() =>
                    setActiveQuickVote((prev) => (prev === 'noise' ? null : 'noise'))
                  }
                  aria-pressed={activeQuickVote === 'noise'}
                  title={quickButtons.highlighted.includes('noise') ? 'Relevant pentru preferințele tale (Locuri pentru lucru)' : undefined}
                  className={`btn-press min-h-[44px] sm:min-h-[48px] px-2.5 sm:px-3 rounded-[4px] border text-[12px] sm:text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0 ${
                    quickButtons.highlighted.includes('noise') && noiseLevel === null ? (isDrink ? 'ring-2 ring-[#F2A33A] ' : 'ring-2 ring-[#B3261E] ') : ''
                  }${
                    noiseLevel !== null || activeQuickVote === 'noise'
                      ? isDrink
                        ? 'bg-[#F2A33A]/15 border-[#F2A33A] text-[#F2A33A]'
                        : 'bg-[#3A2418] border-[#3A2418] text-white'
                      : isDrink
                      ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                      : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                  }`}
                >
                  <Volume2 className="w-4 h-4 shrink-0" />
                  {noiseLevel !== null ? (
                    <span>{NOISE_LABELS[noiseLevel]}</span>
                  ) : (
                    <>
                      <span className="sm:hidden">Gălăgie</span>
                      <span className="hidden sm:inline">E gălăgie?</span>
                    </>
                  )}
                </button>
              )
            )}

            <button
              type="button"
              onClick={handleToggleBookmark}
              aria-label={saved ? 'Salvat în listă' : 'Salvează localul'}
              title={saved ? 'Salvat' : 'Salvează localul'}
              className={`btn-press w-11 h-11 sm:w-12 sm:h-12 rounded-[4px] border flex items-center justify-center shrink-0 ${
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
            className="modal-backdrop-enter fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
            onClick={() => setIsReviewDrawerOpen(false)}
          >
            <div
              ref={reviewDrawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-drawer-title"
              onAnimationEnd={() => setDrawerEntered(true)}
              style={
                drawerDragOffset > 0
                  ? {
                      transform: `translateY(${drawerDragOffset}px)`,
                      transition: isDraggingDrawer
                        ? 'none'
                        : 'transform 200ms var(--ease-out)',
                    }
                  : !isDraggingDrawer && drawerEntered
                  ? { transition: 'transform 200ms var(--ease-out)' }
                  : undefined
              }
              className={`${
                drawerDragOffset === 0 && !drawerEntered ? 'drawer-sheet-enter ' : ''
              }w-full max-w-full sm:max-w-lg rounded-t-[12px] sm:rounded-[6px] border px-4 pt-3 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4 max-h-[92dvh] overflow-y-auto ${
                isDrink
                  ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                  : 'bg-white border-[#3A2418] text-[#3A2418]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                onTouchStart={handleDrawerTouchStart}
                onTouchMove={handleDrawerTouchMove}
                onTouchEnd={handleDrawerTouchEnd}
                onTouchCancel={resetDrawerDrag}
                className="touch-none space-y-2.5 -mx-4 px-4 -mt-3 pt-3 sm:mx-0 sm:px-0 sm:mt-0 sm:pt-0 cursor-grab active:cursor-grabbing sm:cursor-default"
              >
                <div
                  aria-hidden="true"
                  className="sm:hidden w-10 h-1.5 rounded-full mx-auto bg-current opacity-30"
                />
                <div className="flex items-center justify-between gap-2">
                  <h3
                    id="review-drawer-title"
                    className={`font-display text-[22px] sm:text-[26px] leading-tight ${
                      isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
                    }`}
                  >
                    Scrie un review · {restaurant.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsReviewDrawerOpen(false)}
                    aria-label="Închide formularul"
                    className={`btn-press w-11 h-11 rounded-[4px] flex items-center justify-center shrink-0 -mr-2 ${
                      isDrink
                        ? 'text-[#F4EEE2] hover:text-[#F2A33A] hover:bg-[#1E4335]'
                        : 'text-[#3A2418] hover:text-[#B3261E] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Capcană anti-bot: nevăzută și nefocusabilă pentru oameni; scripturile o completează */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label htmlFor="rev-website">Website</label>
                  <input ref={honeypotRef} id="rev-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>
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
                          <TuristBadge label="Turist / Vizitator" size="xs" />
                        )}
                      </div>
                      <p
                        className={`text-[11px] ${
                          isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                        }`}
                      >
                        Publicat cu rolul contului tău (
                        {currentUser.role === 'verified-local'
                          ? 'Localnic verificat'
                          : 'Vizitator'}
                        ).
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
                        aria-invalid={Boolean(formError)}
                        aria-describedby={formError ? 'review-form-error' : undefined}
                        className={`w-20 min-h-[44px] px-2.5 py-1 rounded-[4px] border text-right font-display text-[22px] sm:text-[24px] leading-none tabular-nums ${
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
                  <div className="min-h-[44px] flex items-center">
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
                      className={`w-full min-h-[44px] touch-pan-x cursor-pointer ${
                        isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'
                      }`}
                    />
                  </div>
                  <div
                    className={`flex justify-between text-[11px] ${
                      isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
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
                    className={`btn-press w-full min-h-[44px] px-3.5 py-2.5 rounded-[4px] border flex items-center justify-between gap-3 text-left ${
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

                {canVerifyVisit && restaurant.venueId && (
                  <VisitProofField
                    venueId={restaurant.venueId}
                    value={visitProof}
                    onChange={setVisitProof}
                    isDrink={isDrink}
                  />
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
                    aria-invalid={Boolean(formError)}
                    aria-describedby={formError ? 'review-form-error' : undefined}
                    placeholder="Ce ai comandat, cum a fost porția și prețul?"
                    className={`w-full px-3 py-2 rounded-[4px] border text-[16px] sm:text-[14px] ${
                      isDrink
                        ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder:text-[#F4EEE2]/75'
                        : 'bg-white border-[#3A2418] text-[#3A2418] placeholder:text-[#6E5649]'
                    }`}
                  />
                </div>

                <ReviewQuestions
                  interests={currentUser.interests ?? []}
                  vertical={isDrink ? 'drink' : 'food'}
                  answers={answers}
                  onChange={(key, value) =>
                    setAnswers((prev) => {
                      const next = { ...prev };
                      if (value) next[key] = value;
                      else delete next[key];
                      return next;
                    })
                  }
                  dark={isDrink}
                />

                {formError && (
                  <p
                    id="review-form-error"
                    role="alert"
                    className={`text-[13px] font-semibold px-3 py-2 rounded-[4px] border ${
                      isDrink
                        ? 'bg-[#341A19] border-[#FF7A70]/75 text-[#FFE5E2]'
                        : 'review-form-error-food text-[#9E1F18] bg-[#FEE4E2] border-[#B3261E]/25'
                    }`}
                  >
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className={`btn-press w-full min-h-[48px] py-3 rounded-[4px] font-bold text-[15px] disabled:opacity-70 ${
                    isDrink
                      ? 'bg-[#F2A33A] text-[#17382C]'
                      : 'bg-[#B3261E] text-white'
                  }`}
                >
                  {isSubmittingReview ? 'Se publică…' : 'Publică review-ul'}
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
