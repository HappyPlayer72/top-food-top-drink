'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteReviewAction, loginDemo, loginUser, logoutUser, registerUser, reportCrowd, submitReview, updateReviewAction, voteHelpful } from '@/app/actions/user';
import { X } from 'lucide-react';
import {
  DrinkQuickFilter,
  FoodQuickFilter,
  NavSection,
  Restaurant,
  Review,
  TopReviewer,
  WeekendEvent,
  UserAccount,
  Vertical,
} from '../types';
import {
  DRINK_VENUES,
  INITIAL_RESTAURANTS,
  TOURIST_ZONES,
  WEEKEND_EVENTS,
  recalculateRestaurantWithReview,
  recalculateRestaurantWithUpdatedReview,
  recalculateRestaurantWithoutReview,
} from '../data/restaurants';
import { LoginScreen } from './LoginScreen';
import { LocalVerificationPanel } from './LocalVerificationPanel';
import { Navbar } from './Navbar';
import { EditorialListView } from './EditorialListView';
import { MapView } from './MapView';
import { MonthlyTopView } from './MonthlyTopView';
import { ScarnaviiView } from './ScarnaviiView';
import { FidelityView } from './FidelityView';
import { RestaurantDetailModal } from './RestaurantDetailModal';

const USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'andreea-m',
    name: 'Andreea M.',
    email: 'andreea@e-uvt.ro',
    role: 'verified-local',
    neighborhood: 'Iosefin',
    weightMultiplier: 2.0,
    description: 'Cont verificat Timișoara · review-urile tale au pondere 2,0×.',
  },
  {
    id: 'luca-t',
    name: 'Luca T.',
    email: 'luca@visit.ro',
    role: 'tourist',
    weightMultiplier: 1.0,
    description:
      'Cont de vizitator · review-urile tale contribuie la Scorul Turiștilor (1,0×).',
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
  showLogin = false
): string {
  const basePath =
    vertical === 'drink' ? '/topdrink/timisoara' : '/topfood/timisoara';
  const params = new URLSearchParams();
  if (navSection !== 'top') {
    params.set('section', navSection);
  }
  if (showLogin) {
    params.set('login', '1');
  }
  // Localul deschis are URL propriu (/topfood/timisoara/{slug}), bun pentru Google și pentru partajat
  const path = venueSlugOrId ? `${basePath}/${encodeURIComponent(venueSlugOrId)}` : basePath;
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export interface TopFoodShellProps {
  initialVertical?: Vertical;
  initialSection?: NavSection;
  initialFoodHeroIndex?: number;
  initialDrinkHeroIndex?: number;
  /** Date din backend (src/lib/backend/load.ts); lipsă = datele statice din src/data */
  foodRestaurants?: Restaurant[];
  drinkVenues?: Restaurant[];
  weekendEvents?: WeekendEvent[];
  topReviewers?: TopReviewer[];
  /** true când datele vin din DB: login, review-uri, „util” merg pe backend */
  backendOnline?: boolean;
  /** Userul din sesiune (cookie), când backend-ul e pornit */
  initialUser?: UserAccount | null;
}

export function TopFoodShell({
  initialVertical = 'food',
  initialSection = 'top',
  initialFoodHeroIndex = 0,
  initialDrinkHeroIndex = 0,
  foodRestaurants: initialFood = INITIAL_RESTAURANTS,
  drinkVenues: initialDrink = DRINK_VENUES,
  weekendEvents = WEEKEND_EVENTS,
  topReviewers,
  backendOnline = false,
  initialUser = null,
}: TopFoodShellProps) {
  const router = useRouter();
  const [vertical, setVertical] = useState<Vertical>(initialVertical);
  const [navSection, setNavSection] = useState<NavSection>(initialSection);

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
  const [savedIds, setSavedIds] = useState<string[]>(['ciorba-lui-sandu']);
  const [accounts, setAccounts] = useState<UserAccount[]>(USER_ACCOUNTS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showLoginScreen, setShowLoginScreen] = useState<boolean>(false);
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
      const nextSection: NavSection =
        rawSection === 'map' ||
        rawSection === 'monthly' ||
        rawSection === 'scarnavii' ||
        rawSection === 'fidelitate'
          ? rawSection
          : pathname.startsWith('/fidelitate')
          ? 'fidelitate'
          : pathname.startsWith('/scarnavii')
          ? 'scarnavii'
          : initialSection;

      // /topfood/timisoara/{slug} sau vechiul ?venue={slug}
      const pathSlug = /^\/top(food|drink)\/[^/]+\/([^/?#]+)/.exec(pathname)?.[2];
      const venueParam = params.get('venue') ?? (pathSlug ? decodeURIComponent(pathSlug) : null);
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
      setOpenReviewOnMount(true);
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

  const handleOpenLogin = () => {
    preLoginScrollYRef.current = window.scrollY;
    scrollPositionsRef.current[navSection] = window.scrollY;
    setPendingReviewVenueId(selectedRestaurantId);
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

  const handleSelectUser = (userId: string) => {
    setCurrentUserId(userId);
    const matched = accounts.find((u) => u.id === userId);
    if (matched) {
      setStatusMessage(`Cont activ schimbat: ${matched.name}`);
    }
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
    document.title = selectedRestaurant
      ? `${selectedRestaurant.name} | ${VERTICAL_TITLES[vertical]}`
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
      vertical,
      navSection,
      venueKey,
      showLoginScreen
    );
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState(null, '', nextUrl);
    }
  }, [vertical, navSection, selectedRestaurantId, selectedRestaurant, showLoginScreen]);

  const savedRestaurants = useMemo(
    () => allVenues.filter((r) => savedIds.includes(r.id)),
    [allVenues, savedIds]
  );

  const handleAddReview = async (
    restaurantId: string,
    newReview: Review
  ): Promise<{ ok: boolean; message?: string; error?: string }> => {
    const venue = foodRestaurants.concat(drinkVenues).find((r) => r.id === restaurantId);
    if (backendOnline && venue?.venueId) {
      const res = await submitReview({
        venueId: venue.venueId,
        rating: newReview.foodScore,
        text: newReview.text,
        weekendNight:
          venue.vertical === 'drink' ? drinkFilters.includes('vineri-noaptea') : undefined,
      });
      if (res.ok) {
        router.refresh();
        return { ok: true, message: res.message };
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
    ? async (req: { mode: 'login' | 'register' | 'demo'; email: string; password?: string; name?: string }) => {
        const res =
          req.mode === 'demo'
            ? await loginDemo(req.email)
            : req.mode === 'register'
              ? await registerUser({ name: req.name ?? '', email: req.email, password: req.password ?? '' })
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

  const handleResetFilters = () => {
    setSearchQuery('');
    setFoodFilters([]);
    setDrinkFilters([]);
    setSelectedNeighborhood('all');
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
        demoUsers={USER_ACCOUNTS}
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
        availableUsers={accounts}
        onSelectUser={handleSelectUser}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
        profileExtra={
          backendOnline && currentUser && currentUser.role !== 'verified-local' ? (
            <LocalVerificationPanel vertical={vertical} onVerified={setStatusMessage} />
          ) : null
        }
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
            initialFoodHeroIndex={initialFoodHeroIndex}
            initialDrinkHeroIndex={initialDrinkHeroIndex}
          />
        )}

        {navSection === 'map' && (
          <MapView
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
            onBack={() => navigateToSection('top')}
            onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
          />
        )}

        {navSection === 'scarnavii' && (
          <ScarnaviiView
            vertical={vertical}
            restaurants={activeVerticalVenues}
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

      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        currentUser={currentUser}
        initialReviewOpen={openReviewOnMount}
        onConsumeInitialReviewOpen={() => setOpenReviewOnMount(false)}
        onClose={() => setSelectedRestaurantId(null)}
        onAddReview={handleAddReview}
        onEditReview={handleEditReview}
        onDeleteReview={handleDeleteReview}
        onVoteHelpful={handleVoteHelpful}
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
