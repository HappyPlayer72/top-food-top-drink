import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DRINK_VENUES,
  INITIAL_RESTAURANTS,
  NEIGHBORHOODS,
  TOP_LOCAL_REVIEWERS,
  TOURIST_ZONES,
  WEEKEND_EVENTS,
} from '../apps/web/src/data/restaurants.ts';
import { TIMISOARA_NEIGHBORHOOD_ZONES, TIMISOARA_LANDMARKS } from '../apps/web/src/data/timisoaraGeo.ts';
import { getPublicVoteCategoryTops } from '../apps/web/src/data/monthlyCategoryTops.ts';
import {
  getVenueFacilities,
  getVenueLastUpdated,
  getVenueMenu,
  getVenueWarnings,
  getVenueWeeklyHours,
} from '../apps/web/src/data/venueExtras.ts';
import { DRINK_HERO_HEADERS, FOOD_HERO_HEADERS } from '../apps/web/src/data/heroHeaders.ts';
import { INTERESTS, QUESTIONS } from '@tftd/scoring/features';
import type { LoyaltyProgram, Restaurant } from '../apps/web/src/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const assetsDir = resolve(rootDir, 'apps/android/app/src/main/assets');

function enrichVenue(venue: Restaurant): Restaurant {
  return {
    ...venue,
    menuCategories: getVenueMenu(venue),
    weeklyHours: getVenueWeeklyHours(venue),
    lastUpdated: getVenueLastUpdated(venue),
    facilities: getVenueFacilities(venue),
    warnings: getVenueWarnings(venue),
  };
}

const DEFAULT_LOYALTY_PROGRAMS: LoyaltyProgram[] = [
  {
    id: 'prog-restaurant-nora',
    venueName: 'Restaurant Nora',
    neighborhood: 'Iosefin',
    rewardTitle: 'O ciorbă de burtă din partea casei + smântână',
    stampsRequired: 6,
    iconId: 'soup',
    accentColor: '#B3261E',
    stampsCollected: 4,
    redeemedCount: 1,
    qrSeed: 'TOPFOOD:RESTAURANT-NORA:IOSEFIN:V1',
  },
  {
    id: 'prog-la-focacceria',
    venueName: 'La Focacceria',
    neighborhood: 'Cetate',
    rewardTitle: 'O focaccia artizanală la alegere (cuptor cald)',
    stampsRequired: 8,
    iconId: 'pizza',
    accentColor: '#E0A526',
    stampsCollected: 8,
    redeemedCount: 0,
    qrSeed: 'TOPFOOD:LA-FOCACCERIA:CETATE:V1',
  },
  {
    id: 'prog-scart-loc-lejer',
    venueName: 'Scârț Loc Lejer',
    neighborhood: 'Elisabetin',
    rewardTitle: 'Pahar de vin bănățean sau bere artizanală locală',
    stampsRequired: 5,
    iconId: 'wine',
    accentColor: '#17382C',
    stampsCollected: 2,
    redeemedCount: 2,
    qrSeed: 'TOPFOOD:SCART-LOC-LEJER:ELISABETIN:V1',
  },
];

const catalog = {
  version: 1,
  city: {
    slug: 'timisoara',
    name: 'Timișoara',
    center: { lat: 45.7558, lng: 21.2286 },
    neighborhoods: NEIGHBORHOODS,
    neighborhoodZones: TIMISOARA_NEIGHBORHOOD_ZONES,
    touristZones: TOURIST_ZONES,
    landmarks: TIMISOARA_LANDMARKS,
  },
  foodVenues: INITIAL_RESTAURANTS.map(enrichVenue),
  drinkVenues: DRINK_VENUES.map(enrichVenue),
  weekendEvents: WEEKEND_EVENTS,
  topReviewers: TOP_LOCAL_REVIEWERS,
  foodHeroHeaders: FOOD_HERO_HEADERS,
  drinkHeroHeaders: DRINK_HERO_HEADERS,
  publicVoteCategories: {
    food: {
      '2026-11': getPublicVoteCategoryTops('food', '2026-11'),
      '2026-10': getPublicVoteCategoryTops('food', '2026-10'),
    },
    drink: {
      '2026-11': getPublicVoteCategoryTops('drink', '2026-11'),
      '2026-10': getPublicVoteCategoryTops('drink', '2026-10'),
    },
  },
  defaultLoyaltyPrograms: DEFAULT_LOYALTY_PROGRAMS,
  interests: INTERESTS,
  questions: QUESTIONS,
};

mkdirSync(assetsDir, { recursive: true });
const outFile = resolve(assetsDir, 'timisoara_catalog.json');
writeFileSync(outFile, JSON.stringify(catalog, null, 2), 'utf8');
copyFileSync(resolve(rootDir, 'design/tokens.json'), resolve(assetsDir, 'tokens.json'));

console.log(
  `Exported Android catalog: ${catalog.foodVenues.length} food + ${catalog.drinkVenues.length} drink venues -> ${outFile}`,
);
