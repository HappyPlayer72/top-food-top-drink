import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../../types';
import { generateTasteTour, parseTasteRequest } from './tasteTourLogic';
import { INITIAL_RESTAURANTS, DRINK_VENUES } from '../../data/restaurants';

const venue = (id: string, name: string, item: string, priceRon: number, lng: number): Restaurant => ({
  id, slug: id, name, cuisine: '', coordinates: { lat: 45.75, lng },
  whatToOrder: [{ name: item, priceRon }], foodQualityScore: 8,
} as Restaurant);
const restaurants = [venue('p', 'Pizza', 'Pizza margherita', 30, 21.22), venue('d', 'Desert', 'Tort de ciocolată', 20, 21.23), venue('b', 'Bar', 'Bere artizanală', 15, 21.24)];
const start = { lat: 45.75, lng: 21.21 };

describe('Tasting Tour', () => {
  it('poate genera exemplul pizza și bere cu datele demonstrative', () => {
    const parsed = parseTasteRequest('pizza și bere');
    const result = generateTasteTour({ restaurants: [...INITIAL_RESTAURANTS, ...DRINK_VENUES], categories: parsed.categories, excluded: parsed.excluded, budgetRon: 150, stopCount: 2, start });
    expect(result?.stops.map(stop => stop.category)).toEqual(['pizza', 'beer']);
  });
  it('folosește meniurile detaliate și evită localurile semnalate drept capcane', () => {
    const parsed = parseTasteRequest('pizza și desert');
    const result = generateTasteTour({ restaurants: [...INITIAL_RESTAURANTS, ...DRINK_VENUES], categories: parsed.categories, excluded: parsed.excluded, budgetRon: 150, stopCount: 2, start });
    expect(result?.stops.map(stop => stop.category)).toEqual(['pizza', 'dessert']);
    expect(result?.stops.every(stop => stop.restaurant.touristTrapIndex < 60)).toBe(true);
  });
  it('recunoaște preferințe cu sau fără diacritice și respectă negațiile', () => {
    expect(parseTasteRequest('cafea și fără pizza')).toEqual(parseTasteRequest('cafea si fara pizza'));
    expect(parseTasteRequest('cafea și fără pizza')).toMatchObject({ categories: ['coffee'], excluded: ['pizza'] });
  });
  it('semnalează restricțiile alimentare care nu pot fi verificate', () => {
    expect(parseTasteRequest('pizza fără carne').needsClarification).toBe(true);
    expect(parseTasteRequest('pizza fără brânză').needsClarification).toBe(true);
    expect(parseTasteRequest('pizza, nu mănânc porc').needsClarification).toBe(true);
  });
  it('alege localuri diferite cu preparate potrivite și prețuri în buget', () => {
    const result = generateTasteTour({ restaurants, categories: ['pizza', 'dessert'], excluded: [], budgetRon: 60, stopCount: 2, start });
    expect(result?.stops.map(stop => stop.restaurant.id)).toEqual(['p', 'd']);
    expect(result?.totalRon).toBe(50);
  });
  it('nu inventează prețuri și nu depășește bugetul', () => {
    const unpriced = [restaurants[0], venue('d', 'Desert', 'Tort de ciocolată', 0, 21.23)];
    expect(generateTasteTour({ restaurants: unpriced, categories: ['pizza', 'dessert'], excluded: [], budgetRon: 60, stopCount: 2, start })).toBeNull();
    expect(generateTasteTour({ restaurants, categories: ['pizza', 'dessert'], excluded: [], budgetRon: 49, stopCount: 2, start })).toBeNull();
  });
  it('nu schimbă traseul în funcție de sponsorizare', () => {
    const input = { restaurants, categories: ['pizza', 'dessert'] as const, excluded: [], budgetRon: 60, stopCount: 2 as const, start };
    const first = generateTasteTour({ ...input, categories: [...input.categories] });
    const second = generateTasteTour({ ...input, categories: [...input.categories], restaurants: restaurants.map(restaurant => ({ ...restaurant, isSponsored: !restaurant.isSponsored })) });
    expect(second?.stops.map(stop => stop.restaurant.id)).toEqual(first?.stops.map(stop => stop.restaurant.id));
  });
  it('nu completează cu localuri fără legătură cu preferințele', () => {
    expect(generateTasteTour({ restaurants, categories: ['pizza'], excluded: [], budgetRon: 100, stopCount: 2, start })).toBeNull();
  });
});
