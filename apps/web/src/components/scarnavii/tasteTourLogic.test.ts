import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../../types';
import { explainNoTour, generateBestEffortTour, generateTasteTour, googleMapsDirectionsUrl, isOpenAt, parseTasteRequest, TASTE_CATEGORIES, tourTimeline } from './tasteTourLogic';
import { THEMED_TOURS } from '@tftd/api/tours';
import { INITIAL_RESTAURANTS, DRINK_VENUES } from '../../data/restaurants';

const venue = (id: string, name: string, item: string, priceRon: number, lng: number): Restaurant => ({
  id, slug: id, name, cuisine: '', coordinates: { lat: 45.75, lng },
  whatToOrder: [{ name: item, priceRon }], foodQualityScore: 8,
} as Restaurant);
const restaurants = [venue('p', 'Pizza', 'Pizza margherita', 30, 21.22), venue('d', 'Desert', 'Tort de ciocolată', 20, 21.23), venue('b', 'Bar', 'Bere artizanală', 15, 21.24)];
const start = { lat: 45.75, lng: 21.21 };

describe('Tasting Tour', () => {
  it('ia categoria din numele felului, iar titlul grupei doar dacă e neechivoc', () => {
    const menu = (id: string, title: string, name: string, lng: number) => ({ ...venue(id, id, '', 0, lng), whatToOrder: [], menuCategories: [{ title, items: [{ name, priceRon: 10 }] }] } as unknown as Restaurant);
    const pool = [
      menu('focaccia', 'Supe zilnice', 'Focaccia caldă de lângă supă', 21.211),
      menu('cannoli', 'Pizza al taglio & Desert', 'Cannoli siciliani', 21.212),
      menu('flat', 'Dulce & Cafea', 'Flat White de specialitate', 21.213),
      menu('mate', 'Fără alcool & Vinuri', 'Club-Mate rece', 21.214),
      menu('margherita', 'Pizza', 'Margherita', 21.215),
      menu('ciorba', 'Preparate', 'Ciorbă de burtă', 21.216),
      menu('feteasca', 'Vinuri la pahar', 'Fetească Neagră', 21.217),
    ];
    const ids = (category: Parameters<typeof generateTasteTour>[0]['categories'][number]) =>
      pool.filter(r => generateTasteTour({ restaurants: [r], categories: [category], excluded: [], budgetRon: 100, stopCount: 1, start })).map(r => r.id);
    expect(ids('soup')).toEqual(['ciorba']);
    expect(ids('pizza')).toEqual(['margherita']);
    expect(ids('dessert')).toEqual(['cannoli']);
    expect(ids('coffee')).toEqual(['flat']);
    expect(ids('wine')).toEqual(['feteasca']);
  });
  it('tururile tematice folosesc doar categorii din Tasting Tour', () => {
    for (const tour of THEMED_TOURS) expect(tour.categories.filter(c => !TASTE_CATEGORIES.some(entry => entry.id === c))).toEqual([]);
  });
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
  it('verifică programul, inclusiv intervalele de după miezul nopții', () => {
    const week = [{ day: 'Vineri', hours: '18:00 – 02:00' }, { day: 'Sâmbătă', hours: 'Închis' }, { day: 'Duminică', hours: '12:00 – 23:00' }];
    expect(isOpenAt(week, new Date(2026, 10, 13, 19, 0))).toBe(true); // vineri seara
    expect(isOpenAt(week, new Date(2026, 10, 13, 17, 0))).toBe(false);
    expect(isOpenAt(week, new Date(2026, 10, 14, 1, 30))).toBe(true); // sâmbătă, din programul de vineri
    expect(isOpenAt(week, new Date(2026, 10, 14, 20, 0))).toBe(false);
    expect(isOpenAt([{ day: 'Luni', hours: 'non-stop?' }], new Date(2026, 10, 16, 3, 0))).toBe(true);
  });
  it('calculează orele de sosire în ordinea opririlor', () => {
    const departure = new Date(2026, 10, 13, 19, 0);
    const [first, second] = tourTimeline(start, restaurants.slice(0, 2).map(restaurant => ({ restaurant })), departure, 4.5);
    expect(first.arrival.getTime()).toBeGreaterThan(departure.getTime());
    expect(second.arrival.getTime() - first.leave.getTime()).toBe(second.travelMinutes * 60_000);
  });
  it('trimite opririle în Google Maps după nume și adresă, nu după coordonate', () => {
    const url = new URL(googleMapsDirectionsUrl(start, [
      { restaurant: { name: 'La Focacceria', address: 'Piața Libertății nr. 4, Timișoara' } },
      { restaurant: { name: 'Berăria 700', address: 'Str. Coriolan Brediceanu nr. 4, Timișoara' } },
    ], 'walking'));
    expect(url.searchParams.get('origin')).toBe('45.75,21.21');
    expect(url.searchParams.get('waypoints')).toBe('La Focacceria, Piața Libertății nr. 4, Timișoara');
    expect(url.searchParams.get('destination')).toBe('Berăria 700, Str. Coriolan Brediceanu nr. 4, Timișoara');
    expect(url.searchParams.get('travelmode')).toBe('walking');
  });
  it('explică de ce nu iese traseul', () => {
    const base = { allRestaurants: restaurants, openRestaurants: restaurants, excluded: [], budgetRon: 100, stopCount: 2 as const, start, label: (id: string) => id };
    expect(explainNoTour({ ...base, categories: ['coffee'] })).toContain('Nu avem încă localuri cu coffee');
    expect(explainNoTour({ ...base, openRestaurants: [restaurants[0]], categories: ['pizza', 'dessert'] })).toContain('închise la ora aleasă');
    expect(explainNoTour({ ...base, categories: ['pizza'] })).toContain('Avem doar 1 local deschis');
    expect(explainNoTour({ ...base, budgetRon: 40, categories: ['pizza', 'dessert'] })).toContain('~50 lei');
  });
  it('scurtează traseul când nu sunt destule localuri, în loc să nu arate nimic', () => {
    const one = generateBestEffortTour({ restaurants, categories: ['pizza'], excluded: [], budgetRon: 100, stopCount: 2, start });
    expect(one?.tour.stops.map(stop => stop.restaurant.id)).toEqual(['p']);
    const partial = generateBestEffortTour({ restaurants, categories: ['pizza', 'coffee'], excluded: [], budgetRon: 100, stopCount: 2, start });
    expect(partial?.tour.stops.map(stop => stop.restaurant.id)).toEqual(['p']);
    expect(partial?.droppedCategories).toEqual(['coffee']);
    expect(generateBestEffortTour({ restaurants, categories: ['pizza', 'dessert'], excluded: [], budgetRon: 100, stopCount: 2, start })?.tour.stops).toHaveLength(2);
    expect(generateBestEffortTour({ restaurants, categories: ['coffee'], excluded: [], budgetRon: 100, stopCount: 2, start })).toBeNull();
  });
});
