'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  castQuickVote,
  deleteReviewAction,
  loginDemo,
  loginUser,
  logoutUser,
  registerUser,
  reportCrowd,
  submitReview,
  submitVenueVideoAction,
  toggleSavedVenueAction,
  trackVenueViewAction,
  updateReviewAction,
  voteHelpful,
} from '@/app/actions/user';
import { X } from 'lucide-react';
import {
  AdBanner,
  DrinkQuickFilter,
  FoodQuickFilter,
  MonthlyAwards,
  NavSection,
  Restaurant,
  QuickKind,
  Review,
  ThemeTop,
  TopReviewer,
  WeekendEvent,
  UserAccount,
  Vertical,
} from '../types';
import {
  TOURIST_ZONES,
  recalculateRestaurantWithReview,
  recalculateRestaurantWithUpdatedReview,
  recalculateRestaurantWithoutReview,
} from '../data/restaurants';
import { LoginScreen } from './LoginScreen';
import { Navbar } from './Navbar';
import { EditorialListView } from './EditorialListView';
import { MapView } from './MapView';
import { MonthlyTopView } from './MonthlyTopView';
import { ScarnaviiView } from './ScarnaviiView';
import { FidelityView } from './FidelityView';
import { Footer } from './Footer';
import { RestaurantDetailModal } from './RestaurantDetailModal';
import { OFFLINE_DRINK, OFFLINE_FOOD } from '../data/offline';

/** Conturile de test din seed (doar pe baza locală; în producție „Acces rapid” e ascuns). */
const USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'test-user',
    name: 'Utilizator Test',
    email: 'test.user@example.invalid',
    role: 'tourist',
    badgeLabel: 'Neverificat',
    weightMultiplier: 1.0,
    description: 'Cont de test, încă neverificat ca localnic · review-urile au pondere 1,0×.',
  },
  {
    id: 'test-owner',
    name: 'Proprietar Test',
    email: 'test.owner@example.invalid',
    role: 'tourist',
    badgeLabel: 'Proprietar',
    weightMultiplier: 1.0,
    description: 'Cont de test cu un local revendicat · panoul e la /owner.',
  },
  {
    id: 'test-admin',
    name: 'Administrator Test',
    email: 'test.admin@example.invalid',
    role: 'tourist',
    badgeLabel: 'Admin',
    weightMultiplier: 1.0,
    description: 'Cont de test cu drept de moderare · panoul e la /admin.',
  },
];

const VERTICAL_TITLES: Record<Vertical, string> = {
  food: 'topfood/timișoara — Timișoara pe gustate, nu pe ghicite',
  drink: 'topdrink/timișoara — Unde bei fără să-ți pară rău de notă',
};

function buildUrlForState(
  vertical: Vertical,
  navSection: NavSection,
  venueSlugOrId: string | null,
  showLogin = false,
  selectedCategory: string | null = null,
  selectedMonth: string | null = null
): string {
  const basePath =
    vertical === 'drink' ? '/topdrink/timisoara' : '/topfood/timisoara';
  const params = new URLSearchParams();
  if (showLogin) {
    params.set('login', '1');
  }
  let path = basePath;
  if (venueSlugOrId) {
    path = `${basePath}/${encodeURIComponent(venueSlugOrId)}`;
  } else if (navSection === 'monthly') {
    path = selectedMonth
      ? `${basePath}/top-luna/${encodeURIComponent(selectedMonth)}`
      : `${basePath}/top-luna`;
  } else if (navSection === 'top' && selectedCategory) {
    path = `${basePath}/categorie/${encodeURIComponent(selectedCategory)}`;
  } else if (navSection !== 'top') {
    params.set('section', navSection);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export interface TopFoodShellProps {
  initialVertical?: Vertical;
  initialSection?: NavSection;
  initialCategory?: string | null;
  initialMonth?: string | null;
  initialFoodHeroIndex?: number;
  initialDrinkHeroIndex?: number;
  /** Date din backend (src/lib/backend/load.ts); lipsă = datele statice din src/data */
  foodRestaurants?: Restaurant[];
  drinkVenues?: Restaurant[];
  foodAds?: AdBanner[];
  drinkAds?: AdBanner[];
  foodAwards?: MonthlyAwards;
  drinkAwards?: MonthlyAwards;
  weekendEvents?: WeekendEvent[];
  topReviewers?: TopReviewer[];
  /** true când datele vin din DB: login, review-uri, „util” merg pe backend */
  backendOnline?: boolean;
  /** Userul din sesiune (cookie), când backend-ul e pornit */
  initialUser?: UserAccount | null;
  /** Topurile tematice din backend (Accesibilitate, Locuri pentru lucru…) */
  themeTops?: { food: ThemeTop[]; drink: ThemeTop[] };
  /** Voturile rapide ale userului din sesiune (venueId → siguranță / zgomot) */
  myQuickVotes?: Record<string, Partial<Record<QuickKind, number>>>;
}

export function TopFoodShell({
  initialVertical = 'food',
  initialSection = 'top',
  initialCategory = null,
  initialMonth = null,
  initialFoodHeroIndex = 0,
  initialDrinkHeroIndex = 0,
  // Fără bază de date: doar informațiile reale din datele statice, fără scoruri și review-uri scrise de mână
  foodRestaurants: initialFood = OFFLINE_FOOD,
  drinkVenues: initialDrink = OFFLINE_DRINK,
  foodAds = [],
  drinkAds = [],
  foodAwards,
  drinkAwards,
  weekendEvents = [], // fără bază de date nu arătăm evenimente scrise de mână
  topReviewers,
  backendOnline = false,
  initialUser = null,
  themeTops,
  myQuickVotes: initialQuickVotes,
}: TopFoodShellProps) {
  const [myQuickVotes, setMyQuickVotes] = useState(initialQuickVotes ?? {});
  // După router.refresh() vin voturile de pe server (referință nouă doar când se schimbă datele).
  useEffect(() => {
    if (initialQuickVotes) setMyQuickVotes(initialQuickVotes);
  }, [initialQuickVotes]);
  const router = useRouter();
  const [vertical, setVertical] = useState<Vertical>(initialVertical);
  const [navSection, setNavSection] = useState<NavSection>(initialSection);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(initialMonth);

  const [foodRestaurants, setFoodRestaurants] =
    useState<Restaurant[]>(initialFood);
  const [drinkVenues, setDrinkVenues] =
    useState<Restaurant[]>(initialDrink);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [foodFilters, setFoodFilters] = useState<FoodQuickFilter[]>([]);
  const [drinkFilters, setDrinkFilters] = useState<DrinkQuickFilter[]>([
    'vineri-noaptea',
  ]);
  const [selectedNeighborhood, setSelectedNeighborhood] =
    useState<string>('all');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [savedIds, setSavedIds] = useState<string[]>(['restaurant-nora']);
  const [accounts, setAccounts] = useState<UserAccount[]>(USER_ACCOUNTS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showLoginScreen, setShowLoginScreen] = useState<boolean>(false);
  const [pendingOpenReview, setPendingOpenReview] = useState(true);
  const [pendingReviewVenueId, setPendingReviewVenueId] = useState<
    string | null
  >(null);
  const [openReviewOnMount, setOpenReviewOnMount] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [storageHydrated, setStorageHydrated] = useState<boolean>(false);
  const [showHamsterEasterEgg, setShowHamsterEasterEgg] =
    useState<boolean>(false);

  const urlReadyRef = useRef<boolean>(false);
  const lastTrackedVenueIdRef = useRef<string | null>(null);
  const hamsterKeyBufferRef = useRef<string>('');
  const hamsterSearchTriggeredRef = useRef<boolean>(false);
  const scrollPositionsRef = useRef<Partial<Record<NavSection, number>>>({});
  const preLoginScrollYRef = useRef<number>(0);
  const pendingScrollYRef = useRef<number | null>(null);
  const pendingSyncRef = useRef<{
    vertical: Vertical;
    navSection: NavSection;
    selectedRestaurantId: string | null;
    showLoginScreen: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const savedDark = localStorage.getItem('topfood-dark-mode') === 'true';
      setDarkMode(savedDark);
      const rawSaved = localStorage.getItem('topfood-saved-ids');
      if (rawSaved !== null) {
        const parsedSaved = JSON.parse(rawSaved) as unknown;
        if (
          Array.isArray(parsedSaved) &&
          parsedSaved.every((item) => typeof item === 'string')
        ) {
          setSavedIds(parsedSaved);
        }
      }
      const rawCustom = sessionStorage.getItem('topfood-custom-accounts');
      if (rawCustom) {
        const parsed = JSON.parse(rawCustom) as UserAccount[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts([
            ...USER_ACCOUNTS,
            ...parsed.filter(
              (c) => !USER_ACCOUNTS.some((u) => u.id === c.id)
            ),
          ]);
        }
      }
      const savedUserId = sessionStorage.getItem('topfood-current-user-id');
      if (savedUserId) {
        setCurrentUserId(savedUserId);
      }
    } catch {
      // ignore storage errors
    } finally {
      setStorageHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!storageHydrated) return;
    try {
      const customAccounts = accounts.filter(
        (acc) => !USER_ACCOUNTS.some((u) => u.id === acc.id)
      );
      sessionStorage.setItem(
        'topfood-custom-accounts',
        JSON.stringify(customAccounts)
      );
      if (currentUserId) {
        sessionStorage.setItem('topfood-current-user-id', currentUserId);
      } else {
        sessionStorage.removeItem('topfood-current-user-id');
      }
    } catch {
      // ignore storage errors
    }
  }, [accounts, currentUserId, storageHydrated]);

  // Cu backend pornit, sesiunea din cookie decide cine e logat (nu sessionStorage)
  useEffect(() => {
    if (!storageHydrated || !backendOnline) return;
    if (initialUser) {
      // înlocuim și varianta veche (ex. turist → localnic verificat după router.refresh())
      setAccounts((prev) => [...prev.filter((a) => a.id !== initialUser.id), initialUser]);
      setCurrentUserId(initialUser.id);
      if (initialUser.savedVenueSlugs) {
        setSavedIds(initialUser.savedVenueSlugs);
      }
    } else {
      setCurrentUserId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageHydrated, backendOnline, initialUser?.id, initialUser?.role]);

  // După router.refresh(), datele noi din DB înlocuiesc lista din memorie
  useEffect(() => setFoodRestaurants(initialFood), [initialFood]);
  useEffect(() => setDrinkVenues(initialDrink), [initialDrink]);

  useEffect(() => {
    if (!storageHydrated) return;
    try {
      localStorage.setItem('topfood-saved-ids', JSON.stringify(savedIds));
    } catch {
      // ignore storage errors
    }
  }, [savedIds, storageHydrated]);

  useEffect(() => {
    document.documentElement.dataset.vertical = vertical;
  }, [vertical]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    if (!storageHydrated) return;
    try {
      localStorage.setItem('topfood-dark-mode', String(darkMode));
    } catch {
      // ignore storage errors
    }
  }, [darkMode, storageHydrated]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    const syncFromLocation = () => {
      const { pathname, search } = window.location;
      const params = new URLSearchParams(search);

      const nextVertical: Vertical = pathname.startsWith('/topdrink')
        ? 'drink'
        : pathname.startsWith('/topfood')
        ? 'food'
        : initialVertical;

      const rawSection = params.get('section');
      const monthMatch = /^\/top(food|drink)\/[^/]+\/top-luna(?:\/([^/?#]+))?/.exec(pathname);
      const categoryMatch = /^\/top(food|drink)\/[^/]+\/categorie\/([^/?#]+)/.exec(pathname);
      const nextSection: NavSection =
        rawSection === 'map' ||
        rawSection === 'monthly' ||
        rawSection === 'scarnavii' ||
        rawSection === 'fidelitate'
          ? rawSection
          : monthMatch
          ? 'monthly'
          : pathname.startsWith('/fidelitate')
          ? 'fidelitate'
          : pathname.startsWith('/scarnavii')
          ? 'scarnavii'
          : initialSection;

      const nextCategory = categoryMatch ? decodeURIComponent(categoryMatch[2]!) : null;
      const nextMonth = monthMatch?.[2] ? decodeURIComponent(monthMatch[2]) : null;

      // /topfood/timisoara/{slug} sau vechiul ?venue={slug}, evitând subrutele rezervate
      const pathSlug = /^\/top(food|drink)\/[^/]+\/([^/?#]+)/.exec(pathname)?.[2];
      const reserved = pathSlug && ['top-luna', 'categorie', 'weekend'].includes(pathSlug);
      const venueParam = params.get('venue') ?? (pathSlug && !reserved ? decodeURIComponent(pathSlug) : null);
      const matchedVenue = venueParam
        ? initialFood.concat(initialDrink).find(
            (r) => r.slug === venueParam || r.id === venueParam
          ) ?? null
        : null;
      const nextVenueId = matchedVenue ? matchedVenue.id : null;
      const nextShowLogin = params.get('login') === '1';

      pendingSyncRef.current = {
        vertical: nextVertical,
        navSection: nextSection,
        selectedRestaurantId: nextVenueId,
        showLoginScreen: nextShowLogin,
      };
      setVertical(nextVertical);
      setNavSection(nextSection);
      setSelectedCategory(nextCategory);
      setSelectedMonth(nextMonth);
      setSelectedRestaurantId(nextVenueId);
      setShowLoginScreen(nextShowLogin);
    };

    syncFromLocation();
    urlReadyRef.current = true;

    const handlePopState = () => {
      syncFromLocation();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialVertical]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (showLoginScreen || selectedRestaurantId !== null) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      const target = e.target as HTMLElement | null;
      const active = document.activeElement as HTMLElement | null;
      const el = target ?? active;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      if (navSection !== 'top') {
        setNavSection('top');
        window.requestAnimationFrame(() => {
          const input = document.getElementById(
            'food-search-input'
          ) as HTMLInputElement | null;
          input?.focus();
        });
      } else {
        const input = document.getElementById(
          'food-search-input'
        ) as HTMLInputElement | null;
        input?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLoginScreen, selectedRestaurantId, navSection]);

  const currentUser = useMemo(
    () =>
      currentUserId
        ? accounts.find((u) => u.id === currentUserId) ?? null
        : null,
    [accounts, currentUserId]
  );

  const navigateToSection = (nextSection: NavSection) => {
    setSelectedRestaurantId(null);
    if (nextSection === navSection) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    scrollPositionsRef.current[navSection] = window.scrollY;
    pendingScrollYRef.current =
      nextSection === 'top' ? scrollPositionsRef.current.top ?? 0 : 0;
    setNavSection(nextSection);
  };

  useEffect(() => {
    if (pendingScrollYRef.current === null) return;
    const targetY = pendingScrollYRef.current;
    pendingScrollYRef.current = null;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'auto' });
    });
  }, [navSection, showLoginScreen, vertical]);

  const handleLoginSuccess = (user: UserAccount) => {
    setAccounts((prev) =>
      prev.some((acc) => acc.id === user.id) ? prev : [...prev, user]
    );
    setCurrentUserId(user.id);
    pendingScrollYRef.current = pendingReviewVenueId
      ? null
      : preLoginScrollYRef.current;
    setShowLoginScreen(false);
    if (pendingReviewVenueId) {
      setSelectedRestaurantId(pendingReviewVenueId);
      if (pendingOpenReview) setOpenReviewOnMount(true);
      setPendingReviewVenueId(null);
    }
    setStatusMessage(`Autentificat ca ${user.name}`);
  };

  const handleContinueAsGuest = () => {
    setCurrentUserId(null);
    setPendingReviewVenueId(null);
    pendingScrollYRef.current = preLoginScrollYRef.current;
    setShowLoginScreen(false);
  };

  /** `openReview: false` = după login revii la local fără să se deschidă review-ul (ex. vot rapid). */
  const handleOpenLogin = (opts?: { openReview?: boolean }) => {
    preLoginScrollYRef.current = window.scrollY;
    scrollPositionsRef.current[navSection] = window.scrollY;
    setPendingReviewVenueId(selectedRestaurantId);
    setPendingOpenReview(opts?.openReview !== false);
    setSelectedRestaurantId(null);
    pendingScrollYRef.current = 0;
    setShowLoginScreen(true);
  };

  const handleLogout = () => {
    if (backendOnline) {
      void logoutUser().then(() => router.refresh());
    }
    setCurrentUserId(null);
    setSelectedRestaurantId(null);
    setShowLoginScreen(false);
    setStatusMessage('Te-ai deconectat. Navighezi ca vizitator.');
  };


  const handleToggleFoodFilter = (f: FoodQuickFilter) => {
    setFoodFilters((prev) =>
      prev.includes(f) ? prev.filter((id) => id !== f) : [...prev, f]
    );
  };

  const handleToggleDrinkFilter = (f: DrinkQuickFilter) => {
    setDrinkFilters((prev) => {
      if (prev.includes(f)) {
        return prev.filter((id) => id !== f);
      }
      const next =
        f === 'vineri-noaptea'
          ? prev.filter((id) => id !== 'in-timpul-saptamanii')
          : f === 'in-timpul-saptamanii'
          ? prev.filter((id) => id !== 'vineri-noaptea')
          : prev;
      return [...next, f];
    });
  };

  const allVenues = useMemo(
    () => [...foodRestaurants, ...drinkVenues],
    [foodRestaurants, drinkVenues]
  );

  const handleToggleSave = (id: string) => {
    const isAlreadySaved = savedIds.includes(id);
    const venueName = allVenues.find((r) => r.id === id)?.name;
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (backendOnline && currentUser) {
      void toggleSavedVenueAction(id, !isAlreadySaved);
    }
    if (isAlreadySaved) {
      setStatusMessage(
        venueName ? `Scos din salvate: ${venueName}` : 'Local scos din salvate'
      );
    } else {
      setStatusMessage(venueName ? `Salvat: ${venueName}` : 'Local salvat');
    }
  };

  const activeVerticalVenues =
    vertical === 'drink' ? drinkVenues : foodRestaurants;

  const selectedRestaurant = useMemo(() => {
    if (!selectedRestaurantId) return null;
    return allVenues.find((r) => r.id === selectedRestaurantId) ?? null;
  }, [allVenues, selectedRestaurantId]);

  useEffect(() => {
    if (!backendOnline || !selectedRestaurant?.venueId) return;
    if (lastTrackedVenueIdRef.current === selectedRestaurant.venueId) return;
    lastTrackedVenueIdRef.current = selectedRestaurant.venueId;
    void trackVenueViewAction(selectedRestaurant.venueId);
  }, [backendOnline, selectedRestaurant?.venueId]);

  useEffect(() => {
    const pageVertical = selectedRestaurant?.vertical ?? vertical;
    document.title = selectedRestaurant
      ? `${selectedRestaurant.name} | ${VERTICAL_TITLES[pageVertical]}`
      : VERTICAL_TITLES[vertical];
    if (!urlReadyRef.current) return;

    if (pendingSyncRef.current) {
      const pending = pendingSyncRef.current;
      if (
        pending.vertical === vertical &&
        pending.navSection === navSection &&
        pending.selectedRestaurantId === selectedRestaurantId &&
        pending.showLoginScreen === showLoginScreen
      ) {
        pendingSyncRef.current = null;
      }
      return;
    }

    const venueKey = selectedRestaurant
      ? selectedRestaurant.slug || selectedRestaurant.id
      : null;
    const nextUrl = buildUrlForState(
      pageVertical,
      navSection,
      venueKey,
      showLoginScreen,
      selectedCategory,
      selectedMonth
    );
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState(null, '', nextUrl);
    }
  }, [vertical, navSection, selectedRestaurantId, selectedRestaurant, showLoginScreen, selectedCategory, selectedMonth]);

  const savedRestaurants = useMemo(
    () => allVenues.filter((r) => savedIds.includes(r.id)),
    [allVenues, savedIds]
  );

  const handleAddReview = async (
    restaurantId: string,
    newReview: Review,
    antiBot?: { formToken?: string; website?: string }
  ): Promise<{ ok: boolean; message?: string; error?: string; reviewId?: string; verifiedVisit?: boolean }> => {
    const venue = foodRestaurants.concat(drinkVenues).find((r) => r.id === restaurantId);
    if (backendOnline && venue?.venueId) {
      const res = await submitReview({
        venueId: venue.venueId,
        rating: newReview.foodScore,
        text: newReview.text,
        answers: newReview.answers,
        weekendNight:
          venue.vertical === 'drink' ? drinkFilters.includes('vineri-noaptea') : undefined,
        ...antiBot,
      });
      if (res.ok) {
        router.refresh();
        return { ok: true, message: res.message, reviewId: res.reviewId, verifiedVisit: res.verifiedVisit };
      }
      if (!res.offline) return { ok: false, error: res.error };
    }
    setFoodRestaurants((prev) =>
      prev.map((r) =>
        r.id === restaurantId ? recalculateRestaurantWithReview(r, newReview) : r
      )
    );
    setDrinkVenues((prev) =>
      prev.map((r) =>
        r.id === restaurantId ? recalculateRestaurantWithReview(r, newReview) : r
      )
    );
    return { ok: true };
  };

  /** Vot rapid (siguranță / zgomot) pe backend; undefined = fără backend (modalul ține votul local) */
  const handleQuickVote = backendOnline
    ? async (venueId: string, kind: QuickKind, value: number) => {
        const res = await castQuickVote(venueId, kind, value);
        if (res.ok) {
          setMyQuickVotes((prev) => ({ ...prev, [venueId]: { ...prev[venueId], [kind]: value } }));
          router.refresh();
        } else if (/Intră în cont/.test(res.error)) handleOpenLogin();
        return res;
      }
    : undefined;
  const handleEditReview = async (
    restaurantId: string,
    reviewId: string,
    updates: { foodScore: number; text: string }
  ): Promise<{ ok: boolean; message?: string; error?: string }> => {
    const venue = foodRestaurants.concat(drinkVenues).find((r) => r.id === restaurantId);
    if (backendOnline && venue?.venueId && !reviewId.startsWith('local-rev-')) {
      const res = await updateReviewAction({
        reviewId,
        rating: updates.foodScore,
        text: updates.text,
      });
      if (res.ok) {
        router.refresh();
        return { ok: true, message: res.message };
      }
      if (!res.offline) return { ok: false, error: res.error };
    }
    setFoodRestaurants((prev) =>
      prev.map((r) =>
        r.id === restaurantId
          ? recalculateRestaurantWithUpdatedReview(r, reviewId, updates)
          : r
      )
    );
    setDrinkVenues((prev) =>
      prev.map((r) =>
        r.id === restaurantId
          ? recalculateRestaurantWithUpdatedReview(r, reviewId, updates)
          : r
      )
    );
    return { ok: true, message: 'Review-ul a fost actualizat.' };
  };

  const handleDeleteReview = async (
    restaurantId: string,
    reviewId: string
  ): Promise<{ ok: boolean; message?: string; error?: string }> => {
    const venue = foodRestaurants.concat(drinkVenues).find((r) => r.id === restaurantId);
    if (backendOnline && venue?.venueId && !reviewId.startsWith('local-rev-')) {
      const res = await deleteReviewAction(reviewId);
      if (res.ok) {
        router.refresh();
        return { ok: true, message: res.message };
      }
      if (!res.offline) return { ok: false, error: res.error };
    }
    setFoodRestaurants((prev) =>
      prev.map((r) =>
        r.id === restaurantId ? recalculateRestaurantWithoutReview(r, reviewId) : r
      )
    );
    setDrinkVenues((prev) =>
      prev.map((r) =>
        r.id === restaurantId ? recalculateRestaurantWithoutReview(r, reviewId) : r
      )
    );
    return { ok: true, message: 'Review-ul a fost șters.' };
  };

  /** „Util” pe backend; undefined = fără backend (modalul numără local) */
  const handleVoteHelpful = backendOnline
    ? async (reviewId: string) => {
        const res = await voteHelpful(reviewId);
        if (!res.ok && /Intră în cont/.test(res.error)) handleOpenLogin();
        return res;
      }
    : undefined;

  /** Login / cont nou / cont demo pe backend */
  const handleAuthenticate = backendOnline
    ? async (req: { mode: 'login' | 'register' | 'demo'; email: string; password?: string; name?: string; interests?: string[] }) => {
        const res =
          req.mode === 'demo'
            ? await loginDemo(req.email)
            : req.mode === 'register'
              ? await registerUser({ name: req.name ?? '', email: req.email, password: req.password ?? '', interests: req.interests })
              : await loginUser({ email: req.email, password: req.password ?? '' });
        if (res.ok) router.refresh();
        return res;
      }
    : undefined;

  const handleUpdateCrowdReport = (
    venueId: string,
    segments: 1 | 2 | 3 | 4 | 5,
    label: string
  ) => {
    const venue = drinkVenues.find((v) => v.id === venueId);
    if (backendOnline && venue?.venueId) {
      void reportCrowd(venue.venueId, segments).then((res) => {
        if (!res.ok && !res.offline) setStatusMessage(res.error);
      });
    }
    setDrinkVenues((prev) =>
      prev.map((v) =>
        v.id === venueId
          ? { ...v, crowdSegments: segments, crowdLabel: label }
          : v
      )
    );
  };

  const handleSwitchToMap = (restaurant?: Restaurant) => {
    if (restaurant) {
      setSelectedNeighborhood(restaurant.neighborhood);
    }
    navigateToSection('map');
  };

  const handleSubmitVideo = async (
    restaurantId: string,
    url: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const venue = foodRestaurants.concat(drinkVenues).find((r) => r.id === restaurantId);
    if (!backendOnline || !venue?.venueId) {
      return { ok: false, error: 'Trimiterea linkurilor video este disponibilă cu baza de date pornită.' };
    }
    const res = await submitVenueVideoAction({ venueId: venue.venueId, url });
    if (!res.ok) return { ok: false, error: res.error };
    if (res.video) {
      const addVid = (list: Restaurant[]) =>
        list.map((r) => (r.id === restaurantId ? { ...r, videos: [res.video!, ...(r.videos ?? [])] } : r));
      setFoodRestaurants(addVid);
      setDrinkVenues(addVid);
    }
    setStatusMessage('Video analizat și adăugat la local.');
    router.refresh();
    return { ok: true };
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFoodFilters([]);
    setDrinkFilters([]);
    setSelectedNeighborhood('all');
    setSelectedCategory(null);
  };

  const isDrink = vertical === 'drink';

  useEffect(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (
      normalized === 'hamster' &&
      navSection === 'top' &&
      !showLoginScreen &&
      selectedRestaurantId === null
    ) {
      if (!hamsterSearchTriggeredRef.current) {
        hamsterSearchTriggeredRef.current = true;
        setShowHamsterEasterEgg(true);
      }
    } else {
      hamsterSearchTriggeredRef.current = false;
    }
  }, [searchQuery, navSection, showLoginScreen, selectedRestaurantId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showHamsterEasterEgg) {
        setShowHamsterEasterEgg(false);
        return;
      }

      if (
        navSection !== 'top' ||
        showLoginScreen ||
        selectedRestaurantId !== null ||
        showHamsterEasterEgg
      ) {
        return;
      }

      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        hamsterKeyBufferRef.current = (
          hamsterKeyBufferRef.current + event.key.toLowerCase()
        ).slice(-7);
        if (hamsterKeyBufferRef.current === 'hamster') {
          hamsterKeyBufferRef.current = '';
          setShowHamsterEasterEgg(true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navSection, showLoginScreen, selectedRestaurantId, showHamsterEasterEgg]);

  const handleCloseHamsterEasterEgg = () => setShowHamsterEasterEgg(false);

  if (showLoginScreen) {
    return (
      <LoginScreen
        vertical={vertical}
        onVerticalChange={setVertical}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        demoUsers={process.env.NODE_ENV !== 'production' ? USER_ACCOUNTS : []}
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={handleContinueAsGuest}
        authenticate={handleAuthenticate}
      />
    );
  }

  return (
    <div
      id="top"
      className={`doodle-wallpaper min-h-screen overflow-x-clip flex flex-col ${
        isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
      }`}
    >
      <Navbar
        vertical={vertical}
        onVerticalChange={(v) => {
          scrollPositionsRef.current = {};
          pendingScrollYRef.current = 0;
          setVertical(v);
          setNavSection('top');
          setSelectedRestaurantId(null);
        }}
        navSection={navSection}
        onNavSectionChange={navigateToSection}
        savedRestaurants={savedRestaurants}
        onToggleSave={handleToggleSave}
        onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
        currentUser={currentUser}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      <main className="flex-1">
        {navSection === 'top' && (
          <EditorialListView
            canAddVenues={backendOnline}
            onRequireLogin={handleOpenLogin}
            vertical={vertical}
            restaurants={foodRestaurants}
            drinkVenues={drinkVenues}
            ads={isDrink ? drinkAds : foodAds}
            selectedCategory={selectedCategory}
            onClearCategory={() => setSelectedCategory(null)}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            weekendEvents={weekendEvents}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            foodFilters={foodFilters}
            onToggleFoodFilter={handleToggleFoodFilter}
            drinkFilters={drinkFilters}
            onToggleDrinkFilter={handleToggleDrinkFilter}
            onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
            onOpenMonthlyTop={() => navigateToSection('monthly')}
            onUpdateCrowdReport={handleUpdateCrowdReport}
            onResetFilters={handleResetFilters}
            themeTops={themeTops}
            interests={currentUser?.interests}
            initialFoodHeroIndex={initialFoodHeroIndex}
            initialDrinkHeroIndex={initialDrinkHeroIndex}
          />
        )}

        {navSection === 'map' && (
          <MapView
            darkMode={darkMode}
            vertical={vertical}
            restaurants={activeVerticalVenues}
            onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
            selectedRestaurant={selectedRestaurant}
            selectedNeighborhood={selectedNeighborhood}
            onSelectNeighborhood={(n) => setSelectedNeighborhood(n)}
            touristZones={TOURIST_ZONES}
            onResetFilters={handleResetFilters}
          />
        )}

        {navSection === 'monthly' && (
          <MonthlyTopView
            vertical={vertical}
            restaurants={activeVerticalVenues}
            topReviewers={topReviewers}
            awards={isDrink ? drinkAwards : foodAwards}
            selectedMonth={selectedMonth}
            onSelectMonth={(m) => setSelectedMonth(m)}
            onBack={() => navigateToSection('top')}
            onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
          />
        )}

        {navSection === 'scarnavii' && (
          <ScarnaviiView
            vertical={vertical}
            restaurants={activeVerticalVenues}
            allRestaurants={allVenues}
            onBack={() => navigateToSection('top')}
            onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
          />
        )}

        {navSection === 'fidelitate' && (
          <FidelityView
            useBackend={backendOnline}
            vertical={vertical}
            currentUser={currentUser}
            onRequireLogin={handleOpenLogin}
            onBack={() => navigateToSection('top')}
          />
        )}
      </main>

      <Footer
        vertical={vertical}
        onVerticalChange={(v) => {
          scrollPositionsRef.current = {};
          pendingScrollYRef.current = 0;
          setVertical(v);
          setNavSection('top');
          setSelectedRestaurantId(null);
          setSelectedCategory(null);
        }}
        onNavigateSection={navigateToSection}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          navigateToSection('top');
        }}
        onOpenLogin={handleOpenLogin}
        isLoggedIn={Boolean(currentUser)}
        hasBottomNav
      />

      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        currentUser={currentUser}
        initialReviewOpen={openReviewOnMount}
        onConsumeInitialReviewOpen={() => setOpenReviewOnMount(false)}
        onClose={() => setSelectedRestaurantId(null)}
        onAddReview={handleAddReview}
        onEditReview={handleEditReview}
        onDeleteReview={handleDeleteReview}
        canVerifyVisit={backendOnline}
        onVoteHelpful={handleVoteHelpful}
        myQuickVote={selectedRestaurant?.venueId ? myQuickVotes[selectedRestaurant.venueId] : undefined}
        onQuickVote={
          handleQuickVote && selectedRestaurant?.venueId
            ? (kind, value) => handleQuickVote(selectedRestaurant.venueId!, kind, value)
            : undefined
        }
        onSubmitVideo={backendOnline ? handleSubmitVideo : undefined}
        onRequireLogin={handleOpenLogin}
        onLocateOnMap={handleSwitchToMap}
        isSaved={
          selectedRestaurant ? savedIds.includes(selectedRestaurant.id) : false
        }
        onToggleSave={handleToggleSave}
      />

      {showHamsterEasterEgg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hamster"
          onClick={handleCloseHamsterEasterEgg}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-sm rounded-xl overflow-hidden bg-[#181412] border border-white/15 shadow-2xl"
          >
            <button
              type="button"
              onClick={handleCloseHamsterEasterEgg}
              aria-label="Închide"
              className="btn-press absolute top-2.5 right-2.5 z-10 w-11 h-11 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src="/easter-hamster.jpg"
              alt="Hamster"
              className="block w-full h-auto max-h-[80dvh] object-contain"
            />
          </div>
        </div>
      )}

      <div role="status" aria-live="polite">
      {statusMessage && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[60] px-4 w-max max-w-[calc(100vw-2rem)] ${
            selectedRestaurant !== null
              ? 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))]'
              : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6'
          }`}
        >
          <div
            className={`flex items-center gap-3 px-4 py-2.5 rounded-[6px] border shadow-lg text-[13px] font-semibold ${
              isDrink
                ? 'bg-[#143025] border-[#F2A33A]/60 text-[#F4EEE2]'
                : 'bg-[#3A2418] border-[#3A2418] text-white'
            }`}
          >
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              aria-label="Închide notificarea"
              className="btn-press opacity-75 hover:opacity-100 w-9 h-9 -mr-2 -my-1.5 flex items-center justify-center rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default TopFoodShell;
