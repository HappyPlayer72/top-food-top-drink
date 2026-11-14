import type { Coordinates, Restaurant, WeeklyHoursEntry } from '../../types';
import { getVenueMenu } from '../../data/venueExtras';

const categoryTerms = {
  pizza: ['pizza', 'pizzerie'],
  burger: ['burger', 'hamburger'],
  soup: ['ciorba', 'supa'],
  dessert: ['desert', 'deserturi', 'deserturile', 'dulce', 'prajitura', 'tort', 'inghetata', 'clatite', 'papanasi', 'cheesecake', 'tiramisu', 'cannoli', 'strudel'],
  coffee: ['cafea', 'coffee', 'espresso', 'cappuccino', 'latte', 'flat white'],
  beer: ['bere', 'beer'],
  cocktail: ['cocktail', 'cocktailuri', 'negroni', 'gin tonic', 'spritz'],
  wine: ['vin', 'vinuri', 'wine'],
  romanian: ['mancare romaneasca', 'romanesc', 'romaneasca', 'sarmale', 'mici'],
} as const;

export type TasteCategory = keyof typeof categoryTerms;
export const TASTE_CATEGORIES: { id: TasteCategory; label: string }[] = [
  { id: 'pizza', label: 'Pizza' }, { id: 'burger', label: 'Burger' },
  { id: 'soup', label: 'Ciorbă / supă' }, { id: 'dessert', label: 'Desert' },
  { id: 'coffee', label: 'Cafea' }, { id: 'beer', label: 'Bere' },
  { id: 'cocktail', label: 'Cocktail' }, { id: 'wine', label: 'Vin' },
  { id: 'romanian', label: 'Mâncare românească' },
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

export function distance(a: Coordinates, b: Coordinates): number {
  const lat = (b.lat - a.lat) * 111.32;
  const lng = (b.lng - a.lng) * 111.32 * Math.cos((a.lat + b.lat) * Math.PI / 360);
  return Math.hypot(lat, lng);
}
function validCoordinates(point: Coordinates | undefined): point is Coordinates {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 && (point.lat !== 0 || point.lng !== 0);
}

const categoriesIn = (text: string) => (Object.keys(categoryTerms) as TasteCategory[]).filter(category => categoryTerms[category].some(term => containsTerm(text, term)));

/**
 * Felul e ce spune începutul numelui („Focaccia caldă de lângă supă” nu e supă). Titlul grupei contează
 * doar pentru un nume fără niciun termen („Margherita” la „Pizza”) și doar dacă fiecare parte a lui
 * („Dulce & Cafea”) spune același lucru.
 */
function itemCategories(name: string, groupTitle: string): TasteCategory[] {
  const normalized = normalize(name);
  if (categoriesIn(normalized).length) return categoriesIn(normalized.split(/ (?:cu|de|la|pe) /)[0]);
  const parts = groupTitle.split(/&|,|\+/).map(part => categoriesIn(normalize(part)));
  return parts.length && parts.every(found => found.length === 1 && found[0] === parts[0][0]) ? parts[0] : [];
}

/** Cel mai ieftin preparat din categorie la un local eligibil (coordonate valide, fără capcane pentru turiști). */
function cheapestMatch(restaurant: Restaurant, category: TasteCategory, excluded: TasteCategory[]): { name: string; priceRon: number } | null {
  if (!validCoordinates(restaurant.coordinates) || restaurant.touristTrapIndex >= 60) return null;
  const items = [
    ...(restaurant.whatToOrder ?? []).map(item => ({ item, title: '' })),
    ...getVenueMenu(restaurant).flatMap(group => group.items.map(item => ({ item, title: group.title }))),
  ];
  const matching = items.filter(({ item, title }) => {
    if (!Number.isFinite(item.priceRon) || item.priceRon <= 0 || normalize(`${title} ${item.name}`).includes('de evitat')) return false;
    const kinds = itemCategories(item.name, title);
    return kinds.includes(category) && !kinds.some(kind => excluded.includes(kind));
  }).sort((a, b) => a.item.priceRon - b.item.priceRon || a.item.name.localeCompare(b.item.name));
  return matching[0] ? { name: matching[0].item.name, priceRon: matching[0].item.priceRon } : null;
}

/**
 * Traseul cerut sau, dacă nu sunt destule localuri, unul mai scurt (până la o singură oprire),
 * fără categoriile pentru care nu există niciun local.
 */
export function generateBestEffortTour(input: Parameters<typeof generateTasteTour>[0] & { stopCount: 2 | 3 }): { tour: TasteTour; droppedCategories: TasteCategory[] } | null {
  const wanted = [...new Set(input.categories)].filter(category => !input.excluded.includes(category));
  const usable = wanted.filter(category => input.restaurants.some(restaurant => cheapestMatch(restaurant, category, input.excluded)));
  for (let count = input.stopCount; count >= Math.max(1, usable.length); count -= 1) {
    const tour = generateTasteTour({ ...input, categories: usable, stopCount: count as 1 | 2 | 3 });
    if (tour) return { tour, droppedCategories: wanted.filter(category => !usable.includes(category)) };
  }
  return null;
}

/** De ce nu iese traseul, în ordinea în care utilizatorul poate repara: lipsă localuri, program, număr de opriri, buget. */
export function explainNoTour({ allRestaurants, openRestaurants, categories, excluded, budgetRon, stopCount, start, label }: {
  allRestaurants: Restaurant[]; openRestaurants: Restaurant[]; categories: TasteCategory[]; excluded: TasteCategory[];
  budgetRon: number; stopCount: 2 | 3; start: Coordinates; label: (category: TasteCategory) => string;
}): string {
  const venuesWith = (pool: Restaurant[], category: TasteCategory) => pool.filter(restaurant => cheapestMatch(restaurant, category, excluded)).length;
  const missing = categories.find(category => venuesWith(allRestaurants, category) === 0);
  if (missing) return `Nu avem încă localuri cu ${label(missing).toLowerCase()} în listă. Alege altă categorie.`;
  const closed = categories.find(category => venuesWith(openRestaurants, category) === 0);
  if (closed) return `Localurile cu ${label(closed).toLowerCase()} sunt închise la ora aleasă. Încearcă altă oră.`;
  const openVenues = openRestaurants.filter(restaurant => categories.some(category => cheapestMatch(restaurant, category, excluded))).length;
  if (openVenues < stopCount) return `Avem doar ${openVenues} ${openVenues === 1 ? 'local deschis' : 'localuri deschise'} pentru alegerile tale, iar traseul are ${stopCount} opriri. Adaugă o categorie sau alege mai puține opriri.`;
  const unlimited = generateTasteTour({ restaurants: openRestaurants, categories, excluded, budgetRon: Number.MAX_SAFE_INTEGER, stopCount, start });
  if (unlimited && unlimited.totalRon > budgetRon) return `Cu ${budgetRon} lei de persoană nu ajunge; cel mai ieftin traseu costă ~${unlimited.totalRon} lei. Mărește bugetul.`;
  return 'Nu am găsit un traseu pentru aceste alegeri. Încearcă alte categorii sau altă ordine.';
}

export function generateTasteTour({ restaurants, categories, excluded, budgetRon, stopCount, start }: {
  restaurants: Restaurant[]; categories: TasteCategory[]; excluded: TasteCategory[]; budgetRon: number; stopCount: 1 | 2 | 3; start: Coordinates;
}): TasteTour | null {
  const selected = [...new Set(categories)].filter(category => !excluded.includes(category));
  if (!selected.length || selected.length > stopCount || !Number.isFinite(budgetRon) || budgetRon <= 0 || ![1, 2, 3].includes(stopCount) || !validCoordinates(start)) return null;
  const candidates: TasteTourStop[] = [];
  for (const restaurant of restaurants) {
    for (const category of selected) {
      const item = cheapestMatch(restaurant, category, excluded);
      if (item) candidates.push({ restaurant, item, category });
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

// Ordinea din Date.getDay().
const WEEK_DAYS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
const toMinutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
function openRanges(hours: string | undefined): [number, number][] | null {
  if (hours === undefined) return null;
  if (/[iî]nchis/i.test(hours)) return [];
  const ranges = [...hours.matchAll(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g)].map(match => [toMinutes(match[1]), toMinutes(match[2])] as [number, number]);
  return ranges.length ? ranges : null;
}

/** Programul din fișa localului; un interval care se închide „după miezul nopții” continuă în ziua următoare. */
export function isOpenAt(week: WeeklyHoursEntry[], at: Date): boolean {
  const minute = at.getHours() * 60 + at.getMinutes();
  const hoursFor = (offset: number) => week.find(entry => entry.day === WEEK_DAYS[(at.getDay() + offset + 7) % 7])?.hours;
  const today = openRanges(hoursFor(0));
  // shortcut: un format de program necunoscut contează ca deschis; trecem pe program structurat când îl dă API-ul.
  if (today === null) return true;
  if (today.some(([open, close]) => minute >= open && (close > open ? minute < close : true))) return true;
  return (openRanges(hoursFor(-1)) ?? []).some(([open, close]) => close <= open && minute < close);
}

export const STAY_MINUTES = 45;

/** Ora de sosire la fiecare oprire, cu timp de mers estimat din distanța în linie dreaptă. */
export function tourTimeline(start: Coordinates, stops: { restaurant: Pick<Restaurant, 'coordinates'> }[], departure: Date, speedKmh: number) {
  let clock = departure.getTime();
  let from = start;
  return stops.map(({ restaurant }) => {
    // shortcut: 1,3 × linia dreaptă aproximează străzile; înlocuim cu legs din Google Routes când sunt cheile.
    const travelMinutes = Math.max(1, Math.round((distance(from, restaurant.coordinates) * 1.3 / speedKmh) * 60));
    clock += travelMinutes * 60_000;
    const arrival = new Date(clock);
    clock += STAY_MINUTES * 60_000;
    from = restaurant.coordinates;
    return { travelMinutes, arrival, leave: new Date(clock) };
  });
}

/** Link Google Maps cu opririle căutate după nume și adresă: coordonatele noastre sunt aproximative și ar arăta adrese oarecare. */
export function googleMapsDirectionsUrl(origin: Coordinates, stops: { restaurant: Pick<Restaurant, 'name' | 'address'> }[], travelMode: 'walking' | 'bicycling' | 'driving'): string {
  const places = stops.map(({ restaurant }) => `${restaurant.name}, ${restaurant.address}`);
  const params = new URLSearchParams({ api: '1', origin: `${origin.lat},${origin.lng}`, destination: places[places.length - 1], travelmode: travelMode });
  if (places.length > 1) params.set('waypoints', places.slice(0, -1).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
