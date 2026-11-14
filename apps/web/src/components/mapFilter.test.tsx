import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DRINK_VENUES, INITIAL_RESTAURANTS } from '../data/restaurants';
import {
  computeTierCounts,
  computeVerticalCounts,
  filterMapRestaurants,
} from './mapFilter';
import { MapView } from './MapView';

const ALL_VENUES = [...INITIAL_RESTAURANTS, ...DRINK_VENUES];

describe('filtrarea hărții comune topfood + topdrink', () => {
  it('numără corect localurile pe verticală și pe risc de capcană', () => {
    const verticalCounts = computeVerticalCounts(ALL_VENUES);
    expect(verticalCounts.food).toBe(INITIAL_RESTAURANTS.length);
    expect(verticalCounts.drink).toBe(DRINK_VENUES.length);
    expect(verticalCounts.all).toBe(ALL_VENUES.length);

    const allTiers = computeTierCounts(ALL_VENUES, 'all');
    expect(allTiers.total).toBe(ALL_VENUES.length);
    expect(allTiers.staple + allTiers.mixed + allTiers.trap).toBe(allTiers.total);

    const drinkTiers = computeTierCounts(ALL_VENUES, 'drink');
    expect(drinkTiers.total).toBe(DRINK_VENUES.length);
  });

  it('filtrează simultan după verticală, capcană și căutare', () => {
    const onlyFood = filterMapRestaurants(ALL_VENUES, {
      verticalFilter: 'food',
      tierFilter: 'all',
      selectedTastes: [],
      query: '',
    });
    expect(onlyFood.length).toBe(INITIAL_RESTAURANTS.length);
    expect(onlyFood.every((r) => r.vertical === 'food')).toBe(true);

    const onlyDrink = filterMapRestaurants(ALL_VENUES, {
      verticalFilter: 'drink',
      tierFilter: 'all',
      selectedTastes: [],
      query: '',
    });
    expect(onlyDrink.length).toBe(DRINK_VENUES.length);
    expect(onlyDrink.every((r) => r.vertical === 'drink')).toBe(true);

    const firstDrink = DRINK_VENUES[0]!;
    const searchDrink = filterMapRestaurants(ALL_VENUES, {
      verticalFilter: 'all',
      tierFilter: 'all',
      selectedTastes: [],
      query: firstDrink.name,
    });
    expect(searchDrink.some((r) => r.id === firstDrink.id)).toBe(true);
  });

  it('pune localurile de băutură primele când preferredVertical este drink', () => {
    const ordered = filterMapRestaurants(ALL_VENUES, {
      verticalFilter: 'all',
      tierFilter: 'all',
      selectedTastes: [],
      query: '',
      preferredVertical: 'drink',
    });
    expect(ordered.length).toBe(ALL_VENUES.length);
    expect(ordered[0]?.vertical).toBe('drink');
    expect(ordered[DRINK_VENUES.length - 1]?.vertical).toBe('drink');
    expect(ordered[DRINK_VENUES.length]?.vertical).toBe('food');
  });

  it('randează controalele comune Toate / Mâncare / Băutură în MapView', () => {
    const html = renderToStaticMarkup(
      <MapView
        vertical="food"
        restaurants={ALL_VENUES}
        onSelectRestaurant={() => {}}
      />
    );
    expect(html).toContain('Toate');
    expect(html).toContain('Mâncare');
    expect(html).toContain('Băutură');
  });
});
