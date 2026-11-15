import type { Restaurant, TrapTier, Vertical } from '../types';
import { matchesMapTastes, type MapTaste } from './mapTasteFilter';

export type MapVerticalFilter = 'all' | 'food' | 'drink';

export interface MapFilterOptions {
  verticalFilter: MapVerticalFilter;
  tierFilter: TrapTier | 'all';
  selectedTastes: MapTaste[];
  query: string;
  preferredVertical?: Vertical;
}

/** Filters venues shown on the shared map by vertical, trap tier, tastes, and text query. */
export function filterMapRestaurants(
  restaurants: Restaurant[],
  options: MapFilterOptions
): Restaurant[] {
  const normalizedQuery = options.query.trim().toLowerCase();
  const filtered = restaurants.filter((r) => {
    if (options.verticalFilter !== 'all' && r.vertical !== options.verticalFilter) {
      return false;
    }
    if (options.tierFilter !== 'all' && r.trapTier !== options.tierFilter) {
      return false;
    }
    if (!matchesMapTastes(r, options.selectedTastes)) {
      return false;
    }
    if (normalizedQuery !== '') {
      return (
        r.name.toLowerCase().includes(normalizedQuery) ||
        r.cuisine.toLowerCase().includes(normalizedQuery) ||
        r.neighborhood.toLowerCase().includes(normalizedQuery)
      );
    }
    return true;
  });

  if (options.preferredVertical === 'drink' && options.verticalFilter === 'all') {
    const drinks: Restaurant[] = [];
    const foods: Restaurant[] = [];
    for (const r of filtered) {
      if (r.vertical === 'drink') drinks.push(r);
      else foods.push(r);
    }
    return [...drinks, ...foods];
  }

  return filtered;
}

/** Computes trap-tier counts for the currently selected vertical scope. */
export function computeTierCounts(
  restaurants: Restaurant[],
  verticalFilter: MapVerticalFilter
): { staple: number; mixed: number; trap: number; total: number } {
  let staple = 0;
  let mixed = 0;
  let trap = 0;
  let total = 0;
  for (const r of restaurants) {
    if (verticalFilter !== 'all' && r.vertical !== verticalFilter) continue;
    total++;
    if (r.trapTier === 'local-staple') staple++;
    else if (r.trapTier === 'mixed-fair') mixed++;
    else trap++;
  }
  return { staple, mixed, trap, total };
}

/** Computes total venue counts per vertical for the shared map segmented filter. */
export function computeVerticalCounts(restaurants: Restaurant[]): {
  all: number;
  food: number;
  drink: number;
} {
  let food = 0;
  let drink = 0;
  for (const r of restaurants) {
    if (r.vertical === 'drink') drink++;
    else food++;
  }
  return { all: restaurants.length, food, drink };
}
