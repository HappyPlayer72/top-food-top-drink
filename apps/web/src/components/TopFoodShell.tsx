'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from '../data/restaurants';
import { LoginScreen } from './LoginScreen';
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
  food: 'topfood/timișoara — Unde mănâncă timișorenii, nu turiștii',
  drink: 'topdrink/timișoara — Unde ies timișorenii, fără capcane',
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
  if (venueSlugOrId) {
    params.set('venue', venueSlugOrId);
  }
  if (showLogin) {
    params.set('login', '1');
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
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
}: TopFoodShellProps) {
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

  const urlReadyRef = useRef<boolean>(false);
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

      const venueParam = params.get('venue');
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
    document.title = VERTICAL_TITLES[vertical];
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

  const handleAddReview = (restaurantId: string, newReview: Review) => {
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
  };

  const handleUpdateCrowdReport = (
    venueId: string,
    segments: 1 | 2 | 3 | 4 | 5,
    label: string
  ) => {
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
      />
    );
  }

  return (
    <div
      id="top"
      className={`min-h-screen overflow-x-clip flex flex-col ${
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
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      <main className="flex-1">
        {navSection === 'top' && (
          <EditorialListView
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
            onBack={() => navigateToSection('top')}
          />
        )}

        {navSection === 'fidelitate' && (
          <FidelityView
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
        onRequireLogin={handleOpenLogin}
        onLocateOnMap={handleSwitchToMap}
        isSaved={
          selectedRestaurant ? savedIds.includes(selectedRestaurant.id) : false
        }
        onToggleSave={handleToggleSave}
      />

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
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
  );
}

export default TopFoodShell;
