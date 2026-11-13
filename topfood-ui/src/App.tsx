import React, { useEffect, useMemo, useState } from 'react';
import {
  DrinkQuickFilter,
  FoodQuickFilter,
  NavSection,
  Restaurant,
  Review,
  UserAccount,
  Vertical,
} from './types';

const USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'andreea-m',
    name: 'Andreea M.',
    role: 'verified-local',
    neighborhood: 'Iosefin',
    weightMultiplier: 2.0,
    description: 'Cont verificat Timișoara · review-urile tale au pondere 2,0×.',
  },
  {
    id: 'luca-t',
    name: 'Luca T.',
    role: 'tourist',
    weightMultiplier: 1.0,
    description:
      'Cont de vizitator · review-urile tale contribuie la Scorul Turiștilor (1,0×).',
  },
];
import {
  DRINK_VENUES,
  INITIAL_RESTAURANTS,
  TOURIST_ZONES,
  WEEKEND_EVENTS,
  recalculateRestaurantWithReview,
} from './data/restaurants';
import { Navbar } from './components/Navbar';
import { EditorialListView } from './components/EditorialListView';
import { MapView } from './components/MapView';
import { MonthlyTopView } from './components/MonthlyTopView';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';

export function App() {
  const [vertical, setVertical] = useState<Vertical>('food');
  const [navSection, setNavSection] = useState<NavSection>('top');

  const [foodRestaurants, setFoodRestaurants] =
    useState<Restaurant[]>(INITIAL_RESTAURANTS);
  const [drinkVenues, setDrinkVenues] =
    useState<Restaurant[]>(DRINK_VENUES);

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
  const [currentUserId, setCurrentUserId] = useState<string>(USER_ACCOUNTS[0].id);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('topfood-dark-mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('topfood-dark-mode', String(darkMode));
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  const currentUser = useMemo(
    () => USER_ACCOUNTS.find((u) => u.id === currentUserId) ?? USER_ACCOUNTS[0],
    [currentUserId]
  );

  const handleToggleFoodFilter = (f: FoodQuickFilter) => {
    setFoodFilters((prev) =>
      prev.includes(f) ? prev.filter((id) => id !== f) : [...prev, f]
    );
  };

  const handleToggleDrinkFilter = (f: DrinkQuickFilter) => {
    setDrinkFilters((prev) =>
      prev.includes(f) ? prev.filter((id) => id !== f) : [...prev, f]
    );
  };

  const handleToggleSave = (id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allVenues = useMemo(
    () => [...foodRestaurants, ...drinkVenues],
    [foodRestaurants, drinkVenues]
  );

  const activeVerticalVenues =
    vertical === 'drink' ? drinkVenues : foodRestaurants;

  const selectedRestaurant = useMemo(() => {
    if (!selectedRestaurantId) return null;
    return allVenues.find((r) => r.id === selectedRestaurantId) ?? null;
  }, [allVenues, selectedRestaurantId]);

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
    setSelectedRestaurantId(null);
    setNavSection('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFoodFilters([]);
    setDrinkFilters([]);
    setSelectedNeighborhood('all');
  };

  const isDrink = vertical === 'drink';

  return (
    <div
      id="top"
      className={`min-h-screen flex flex-col ${
        isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
      }`}
    >
      <Navbar
        vertical={vertical}
        onVerticalChange={(v) => {
          setVertical(v);
          setSelectedRestaurantId(null);
        }}
        navSection={navSection}
        onNavSectionChange={(s) => {
          setNavSection(s);
          setSelectedRestaurantId(null);
        }}
        savedRestaurants={savedRestaurants}
        onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
        currentUser={currentUser}
        availableUsers={USER_ACCOUNTS}
        onSelectUser={setCurrentUserId}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      <main className="flex-1">
        {navSection === 'top' && (
          <EditorialListView
            vertical={vertical}
            restaurants={foodRestaurants}
            drinkVenues={drinkVenues}
            weekendEvents={WEEKEND_EVENTS}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            foodFilters={foodFilters}
            onToggleFoodFilter={handleToggleFoodFilter}
            drinkFilters={drinkFilters}
            onToggleDrinkFilter={handleToggleDrinkFilter}
            onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
            onOpenMonthlyTop={() => {
              setNavSection('monthly');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateCrowdReport={handleUpdateCrowdReport}
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
            onBack={() => {
              setNavSection('top');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectRestaurant={(r) => setSelectedRestaurantId(r.id)}
          />
        )}
      </main>

      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        currentUser={currentUser}
        onClose={() => setSelectedRestaurantId(null)}
        onAddReview={handleAddReview}
        onLocateOnMap={handleSwitchToMap}
        isSaved={
          selectedRestaurant ? savedIds.includes(selectedRestaurant.id) : false
        }
        onToggleSave={handleToggleSave}
      />
    </div>
  );
}

export default App;
