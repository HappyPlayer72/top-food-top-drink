import type { Coordinates, Restaurant } from '../../types';
import { getVenueMenu } from '../../data/venueExtras';

const categoryTerms = {
  pizza: ['pizza', 'pizzerie'],
  burger: ['burger', 'hamburger'],
  soup: ['ciorba', 'supa'],
  dessert: ['desert', 'dulce', 'prajitura', 'tort', 'inghetata', 'clatite', 'papanasi', 'cheesecake', 'tiramisu'],
  coffee: ['cafea', 'coffee', 'espresso', 'cappuccino', 'latte'],
  beer: ['bere', 'beer'],
  cocktail: ['cocktail', 'cocktailuri'],
  romanian: ['mancare romaneasca', 'romanesc', 'romaneasca', 'sarmale', 'mici'],
} as const;

export type TasteCategory = keyof typeof categoryTerms;
export const TASTE_CATEGORIES: { id: TasteCategory; label: string }[] = [
  { id: 'pizza', label: 'Pizza' }, { id: 'burger', label: 'Burger' },
  { id: 'soup', label: 'Ciorbă / supă' }, { id: 'dessert', label: 'Desert' },
  { id: 'coffee', label: 'Cafea' }, { id: 'beer', label: 'Bere' },
  { id: 'cocktail', label: 'Cocktail' }, { id: 'romanian', label: 'Mâncare românească' },
];

const normalize = (value: string) => value.toLocaleLowerCase('ro').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const containsTerm = (text: string, term: string) => (` ${text} `).includes(` ${term} `);

export function parseTasteRequest(text: string): { categories: TasteCategory[]; excluded: TasteCategory[]; needsClarification: boolean } {
  const normalized = normalize(text);
  const matches: { category: TasteCategory; index: number; excluded: boolean }[] = [];
  for (const category of Object.keys(categoryTerms) as TasteCategory[]) {
    for (const term of categoryTerms[category]) {
      const expression = new RegExp(`\\b${term}\\b`, 'g');
      for (const match of normalized.matchAll(expression)) {
        const before = normalized.slice(0, match.index).trim();
        const excluded = /(?:^|\s)(?:fara|nu vreau|nu doresc|evit|exclud)(?:\s+\w+){0,2}$/.test(before);
        matches.push({ category, index: match.index, excluded });
      }
    }
  }
  matches.sort((a, b) => a.index - b.index);
  const excluded = [...new Set(matches.filter(match => match.excluded).map(match => match.category))];
  const categories = [...new Set(matches.filter(match => !match.excluded && !excluded.includes(match.category)).map(match => match.category))];
  // ponytail: keyword parsing cannot validate dietary restrictions; ask for clarification instead of assuming safety.
  const needsClarification = categories.length === 0 || /\b(alerg|intoler|vegetarian|vegan|gluten|lactoza|arahide|fara|evit|exclud)\w*|\bnu\s+(?:mananc|vreau|doresc)/.test(normalized);
  return { categories, excluded, needsClarification };
}

export interface TasteTourStop {
  restaurant: Restaurant;
  item: { name: string; priceRon: number };
  category: TasteCategory;
}
export interface TasteTour {
  stops: TasteTourStop[];
  totalRon: number;
  approximateDistanceKm: number;
}

function distance(a: Coordinates, b: Coordinates): number {
  const lat = (b.lat - a.lat) * 111.32;
  const lng = (b.lng - a.lng) * 111.32 * Math.cos((a.lat + b.lat) * Math.PI / 360);
  return Math.hypot(lat, lng);
}
function validCoordinates(point: Coordinates | undefined): point is Coordinates {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 && (point.lat !== 0 || point.lng !== 0);
}

export function generateTasteTour({ restaurants, categories, excluded, budgetRon, stopCount, start }: {
  restaurants: Restaurant[]; categories: TasteCategory[]; excluded: TasteCategory[]; budgetRon: number; stopCount: 2 | 3; start: Coordinates;
}): TasteTour | null {
  const selected = [...new Set(categories)].filter(category => !excluded.includes(category));
  if (!selected.length || selected.length > stopCount || !Number.isFinite(budgetRon) || budgetRon <= 0 || ![2, 3].includes(stopCount) || !validCoordinates(start)) return null;
  const candidates: TasteTourStop[] = [];
  for (const restaurant of restaurants) {
    if (!validCoordinates(restaurant.coordinates) || restaurant.touristTrapIndex >= 60) continue;
    const items = [
      ...(restaurant.whatToOrder ?? []).map(item => ({ item, context: item.name })),
      ...getVenueMenu(restaurant).flatMap(group => group.items.map(item => ({ item, context: `${group.title} ${item.name}` }))),
    ];
    for (const category of selected) {
      const matching = items.filter(({ item, context }) => {
        const normalized = normalize(context);
        return !normalized.includes('de evitat') && Number.isFinite(item.priceRon) && item.priceRon > 0 && categoryTerms[category].some(term => containsTerm(normalized, term)) && !excluded.some(excludedCategory => categoryTerms[excludedCategory].some(term => containsTerm(normalized, term)));
      }).sort((a, b) => a.item.priceRon - b.item.priceRon || a.item.name.localeCompare(b.item.name));
      if (matching[0]) candidates.push({ restaurant, item: { name: matching[0].item.name, priceRon: matching[0].item.priceRon }, category });
    }
  }
  candidates.sort((a, b) => distance(start, a.restaurant.coordinates) - distance(start, b.restaurant.coordinates) || a.item.priceRon - b.item.priceRon || a.restaurant.id.localeCompare(b.restaurant.id));
  // ponytail: limit each category to 40 nearby candidates for responsive 3-stop searches; move search to server for larger cities.
  const shortlist = selected.flatMap(category => candidates.filter(candidate => candidate.category === category).slice(0, 40));
  let best: TasteTour | null = null;
  // ponytail: exhaustive search is suitable for small city datasets and 2–3 stops; shortlist candidates if datasets grow.
  const search = (stops: TasteTourStop[], totalRon: number, distanceKm: number) => {
    if (stops.length === stopCount) {
      if (selected.some(category => !stops.some(stop => stop.category === category))) return;
      if (!best || distanceKm < best.approximateDistanceKm) best = { stops: [...stops], totalRon, approximateDistanceKm: distanceKm };
      return;
    }
    for (const candidate of shortlist) {
      if (stops.some(stop => stop.restaurant.id === candidate.restaurant.id) || totalRon + candidate.item.priceRon > budgetRon) continue;
      // Keep explicit preference order (e.g. pizza, then dessert).
      const categoryIndex = selected.indexOf(candidate.category);
      if (stops.length && categoryIndex < selected.indexOf(stops[stops.length - 1].category)) continue;
      const from = stops.length ? stops[stops.length - 1].restaurant.coordinates : start;
      search([...stops, candidate], totalRon + candidate.item.priceRon, distanceKm + distance(from, candidate.restaurant.coordinates));
    }
  };
  search([], 0, 0);
  return best;
}
