import { describe, expect, it } from 'vitest';
import { INITIAL_RESTAURANTS } from '../data/restaurants';
import { matchesMapTastes } from './mapTasteFilter';

const venue = { ...INITIAL_RESTAURANTS[0], id: 'test-map', vertical: 'food' as const, whatToOrder: [], menuCategories: [
  { title: 'Meniu', items: [{ name: 'Burger de vită', priceRon: 30 }, { name: 'Cocktail cu fructe', priceRon: 25 }] },
] };

describe('filtrul de meniu al hărții', () => {
  it('cere ca toate preferințele să existe în același meniu', () => {
    expect(matchesMapTastes(venue, [])).toBe(true);
    expect(matchesMapTastes(venue, ['burger'])).toBe(true);
    expect(matchesMapTastes(venue, ['burger', 'cocktail'])).toBe(true);
    expect(matchesMapTastes(venue, ['burger', 'pizza'])).toBe(false);
  });
  it('verifică eticheta alimentară pe preparatul ales și permite o băutură separată', () => {
    const menu = { ...venue, menuCategories: [{ title: 'Meniu', items: [
      { name: 'Burger vegan', priceRon: 30 }, { name: 'Pizza fără gluten', priceRon: 30 }, { name: 'Fresh de portocale', priceRon: 15 },
    ] }] };
    expect(matchesMapTastes(menu, ['burger', 'vegan', 'fresh'])).toBe(true);
    expect(matchesMapTastes(menu, ['burger', 'gluten-free'])).toBe(false);
    expect(matchesMapTastes(menu, ['pizza', 'gluten-free'])).toBe(true);
    expect(matchesMapTastes(menu, ['vegetarian'])).toBe(false);
  });
  it('recunoaște diacriticele și categoriile din meniu', () => {
    const soup = { ...venue, menuCategories: [{ title: 'Ciorbe', items: [{ name: 'De legume', priceRon: 20 }] }] };
    expect(matchesMapTastes(soup, ['soup'])).toBe(true);
  });
});
