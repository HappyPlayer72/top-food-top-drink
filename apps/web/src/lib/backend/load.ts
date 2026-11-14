/**
 * Încarcă datele paginilor din backend (rulează DOAR pe server, din page.tsx).
 * Dacă baza de date nu e configurată sau nu răspunde, întoarce null și site-ul folosește
 * datele statice din src/data — așa merge și fără Docker.
 */
import { cityPage, leaderboardPage, topReviewers, venuePage, weekendEvents, type Db } from '@tftd/api';
import { getDb } from '../server/db';
import { cities } from '@tftd/db';
import { eq } from 'drizzle-orm';
import { DRINK_VENUES, INITIAL_RESTAURANTS } from '../../data/restaurants';
import type { AdBanner, MonthlyAwards, Restaurant, TopReviewer, UserAccount, WeekendEvent } from '../../types';
import { getUserId } from '../server/session';
import { toUserAccount } from './user';
import { monthlyBySlug, toAdBanners, toMonthlyAwards, toRestaurant, toTopReviewer, toWeekendEvent } from './toRestaurant';

const CITY = 'timisoara';

// Aceeași conexiune ca restul serverului (lib/server/db.ts); fără DATABASE_URL → date statice
function db(): Db | null {
  return process.env.DATABASE_URL ? getDb() : null;
}

const STATIC = new Map(INITIAL_RESTAURANTS.concat(DRINK_VENUES).map((r) => [r.slug, r]));

async function loadVertical(d: Db, vertical: 'food' | 'drink', now: Date): Promise<{
  restaurants: Restaurant[];
  ads: AdBanner[];
  awards: MonthlyAwards;
}> {
  const city = await cityPage(d, { citySlug: CITY, vertical, limit: 100 }, now);
  const lb = await leaderboardPage(d, { citySlug: CITY, vertical });
  const monthly = monthlyBySlug(lb, city);
  const sponsored = new Set(city.sponsored.map((s) => s.slug));
  const [c] = await d.select({ prices: cities.localAveragePrices }).from(cities).where(eq(cities.slug, CITY));

  const pages = await Promise.all(city.top.map((v) => venuePage(d, { citySlug: CITY, vertical, slug: v.slug, reviews: 'all', limit: 20 }, now)));
  const restaurants = pages.map((p) =>
    toRestaurant(p, {
      now,
      categoryAvgPriceRon:
        vertical === 'drink' ? (c?.prices.drink.beer05l ?? null) : (c?.prices.food[p.venue.categories[0] ?? ''] ?? null),
      isSponsored: sponsored.has(p.venue.slug),
      monthly: monthly.get(p.venue.slug),
      fallback: STATIC.get(p.venue.slug),
    }),
  );
  return {
    restaurants,
    ads: toAdBanners(city.ads),
    awards: toMonthlyAwards(lb),
  };
}

export type ShellData = {
  foodRestaurants: Restaurant[];
  drinkVenues: Restaurant[];
  foodAds: AdBanner[];
  drinkAds: AdBanner[];
  foodAwards: MonthlyAwards;
  drinkAwards: MonthlyAwards;
  weekendEvents: WeekendEvent[];
  topReviewers: TopReviewer[];
  /** true = datele vin din DB; acțiunile userilor merg pe backend */
  backendOnline: true;
  /** Userul din cookie-ul de sesiune (null = vizitator) */
  initialUser: UserAccount | null;
};

export async function loadShellData(now = new Date()): Promise<ShellData | null> {
  const d = db();
  if (!d) return null;
  try {
    const userId = await getUserId();
    const [foodData, drinkData, events, reviewers, initialUser] = await Promise.all([
      loadVertical(d, 'food', now),
      loadVertical(d, 'drink', now),
      weekendEvents(d, CITY, now),
      topReviewers(d, CITY, {}, now),
      userId ? toUserAccount(d, userId, now) : Promise.resolve(null),
    ]);
    return {
      foodRestaurants: foodData.restaurants,
      drinkVenues: drinkData.restaurants,
      foodAds: foodData.ads,
      drinkAds: drinkData.ads,
      foodAwards: foodData.awards,
      drinkAwards: drinkData.awards,
      weekendEvents: events.map(toWeekendEvent),
      topReviewers: reviewers.map(toTopReviewer),
      backendOnline: true,
      initialUser,
    };
  } catch (error) {
    console.error('[backend] Nu pot citi din baza de date, folosesc datele statice:', error);
    return null;
  }
}
