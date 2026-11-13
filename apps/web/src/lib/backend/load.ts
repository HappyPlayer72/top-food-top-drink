/**
 * Încarcă datele paginilor din backend (rulează DOAR pe server, din page.tsx).
 * Dacă baza de date nu e configurată sau nu răspunde, întoarce null și site-ul folosește
 * datele statice din src/data — așa merge și fără Docker.
 */
import { cityPage, createDb, leaderboardPage, topReviewers, venuePage, weekendEvents, type Db } from '@tftd/api';
import { cities } from '@tftd/db';
import { eq } from 'drizzle-orm';
import { DRINK_VENUES, INITIAL_RESTAURANTS } from '../../data/restaurants';
import type { Restaurant, TopReviewer, WeekendEvent } from '../../types';
import { monthlyBySlug, toRestaurant, toTopReviewer, toWeekendEvent } from './toRestaurant';

const CITY = 'timisoara';

// O singură conexiune per proces (și una singură în dev, la hot reload)
const g = globalThis as unknown as { __tftdDb?: Db };
function db(): Db | null {
  if (!process.env.DATABASE_URL) return null;
  return (g.__tftdDb ??= createDb());
}

const STATIC = new Map(INITIAL_RESTAURANTS.concat(DRINK_VENUES).map((r) => [r.slug, r]));

async function loadVertical(d: Db, vertical: 'food' | 'drink', now: Date): Promise<Restaurant[]> {
  const city = await cityPage(d, { citySlug: CITY, vertical, limit: 100 }, now);
  const lb = await leaderboardPage(d, { citySlug: CITY, vertical });
  const monthly = monthlyBySlug(lb, city);
  const sponsored = new Set(city.sponsored.map((s) => s.slug));
  const [c] = await d.select({ prices: cities.localAveragePrices }).from(cities).where(eq(cities.slug, CITY));

  const pages = await Promise.all(city.top.map((v) => venuePage(d, { citySlug: CITY, vertical, slug: v.slug, reviews: 'all', limit: 20 }, now)));
  return pages.map((p) =>
    toRestaurant(p, {
      now,
      categoryAvgPriceRon:
        vertical === 'drink' ? (c?.prices.drink.beer05l ?? null) : (c?.prices.food[p.venue.categories[0] ?? ''] ?? null),
      isSponsored: sponsored.has(p.venue.slug),
      monthly: monthly.get(p.venue.slug),
      fallback: STATIC.get(p.venue.slug),
    }),
  );
}

export type ShellData = {
  foodRestaurants: Restaurant[];
  drinkVenues: Restaurant[];
  weekendEvents: WeekendEvent[];
  topReviewers: TopReviewer[];
};

export async function loadShellData(now = new Date()): Promise<ShellData | null> {
  const d = db();
  if (!d) return null;
  try {
    const [foodRestaurants, drinkVenues, events, reviewers] = await Promise.all([
      loadVertical(d, 'food', now),
      loadVertical(d, 'drink', now),
      weekendEvents(d, CITY, now),
      topReviewers(d, CITY, {}, now),
    ]);
    return {
      foodRestaurants,
      drinkVenues,
      weekendEvents: events.map(toWeekendEvent),
      topReviewers: reviewers.map(toTopReviewer),
    };
  } catch (error) {
    console.error('[backend] Nu pot citi din baza de date, folosesc datele statice:', error);
    return null;
  }
}
