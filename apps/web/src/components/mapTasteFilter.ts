import type { Restaurant } from '../types';
import { getVenueMenu } from '../data/venueExtras';

export const MAP_TASTES = [
  { id: 'burger', label: 'Burger', terms: ['burger'] },
  { id: 'pizza', label: 'Pizza', terms: ['pizza'] },
  { id: 'pasta', label: 'Paste', terms: ['paste', 'pasta', 'spaghetti'] },
  { id: 'soup', label: 'Ciorbă / supă', terms: ['ciorb', 'sup'] },
  { id: 'dessert', label: 'Desert', terms: ['desert', 'prajitur', 'tort', 'inghetata', 'papanasi', 'tiramisu', 'cheesecake'] },
  { id: 'coffee', label: 'Cafea', terms: ['cafea', 'coffee', 'espresso', 'cappuccino'] },
  { id: 'beer', label: 'Bere', terms: ['bere', 'beer'] },
  { id: 'wine', label: 'Vin', terms: ['vin', 'wine'] },
  { id: 'cocktail', label: 'Cocktail', terms: ['cocktail'] },
  { id: 'fresh', label: 'Fresh', terms: ['fresh', 'suc proaspat'] },
  { id: 'vegetarian', label: 'Vegetarian', terms: ['vegetarian'] },
  { id: 'vegan', label: 'Vegan', terms: ['vegan'] },
  { id: 'gluten-free', label: 'Fără gluten', terms: ['fara gluten', 'gluten free'] },
] as const;

export type MapTaste = (typeof MAP_TASTES)[number]['id'];

const normalize = (value: string) => value.toLocaleLowerCase('ro').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function matchesMapTastes(restaurant: Restaurant, selected: MapTaste[]): boolean {
  if (!selected.length) return true;
  const items = getVenueMenu(restaurant).flatMap(group => group.items.map(item => ({
    text: normalize(`${group.title} ${item.name}`),
    details: normalize(`${group.title} ${item.name} ${item.description ?? ''}`),
  })));
  const foods = selected.filter(id => MAP_TASTES.slice(0, 5).some(taste => taste.id === id));
  const diets = selected.filter(id => ['vegetarian', 'vegan', 'gluten-free'].includes(id));
  const has = (text: string, id: MapTaste) => MAP_TASTES.find(taste => taste.id === id)!.terms.some(term => text.includes(term));
  const matchesDiet = (text: string, id: MapTaste) => has(text, id) && !/\b(?:nu este|nu e|contine) (?:vegan|vegetarian|fara gluten|gluten free)/.test(text);
  if (diets.length && !items.some(item => diets.every(id => matchesDiet(item.details, id)) && (!foods.length || foods.some(id => has(item.text, id))))) return false;
  return selected.filter(id => !diets.includes(id)).every(id => items.some(item => has(item.text, id)));
}
