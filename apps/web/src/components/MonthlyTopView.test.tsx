import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/embed', () => ({ embedSrc: () => null }));
vi.mock('@/app/actions/visits', () => ({ attachReceipt: async () => ({ ok: true }) }));
vi.mock('@/app/actions/user', () => ({ reviewFormToken: async () => ({ ok: false }) }));
vi.mock('../app/actions/monthly-votes', () => ({
  getMonthlyVotesState: async () => ({ ok: false, offline: true, error: 'offline' }),
  castMonthlyCategoryVote: async () => ({ ok: false, offline: true, error: 'offline' }),
}));

import { MonthlyTopView } from './MonthlyTopView';
import { RestaurantDetailModal } from './RestaurantDetailModal';
import { DRINK_VENUES, INITIAL_RESTAURANTS } from '../data/restaurants';
import {
  getPublicVoteCategoryTops,
  getVenueMonthlyCategoryAwards,
  mergeCategoryTopWithVotes,
} from '../data/monthlyCategoryTops';
import type { UserAccount } from '../types';

const DEMO_USER: UserAccount = {
  id: 'u-test-1',
  name: 'Andreea Pop',
  role: 'verified-local',
  weightMultiplier: 2,
  description: 'Localnic verificat',
};

describe('MonthlyTopView — Votul publicului Top 3', () => {
  it('afișează submeniul și păstrează ecranul principal curat doar cu clasamentul Top 3', () => {
    const html = renderToStaticMarkup(
      <MonthlyTopView
        vertical="food"
        restaurants={INITIAL_RESTAURANTS}
        currentUser={DEMO_USER}
        onBack={() => {}}
        onSelectRestaurant={() => {}}
      />
    );

    expect(html).toContain('Clasament &amp; Top 3');
    expect(html).toContain('Votează luna asta');
    expect(html).toContain('Votează acum');
    expect(html).not.toContain('Votează în submeniu');
    expect(html).toContain('Votul publicului · Top 3');
    expect(html).not.toContain('1 vot disponibil');
    expect(html).toContain('Cea mai bună shaorma');
    expect(html).toContain('Cel mai bun burger');
    expect(html).toContain('Cea mai bună pizza');
    expect(html).toContain('Cea mai bună mâncare gătită');
    expect(html).toContain('Antalya Kebab');
    expect(html).toContain("Jack&#x27;s Bistro");
    expect(html).toContain('La Focacceria');
    expect(html).toContain('Aur · Locul 1');
    expect(html).toContain('Argint · Locul 2');
    expect(html).toContain('Bronz · Locul 3');
    expect(html).not.toContain('Votul în aplicație · în curând');
    expect(html).not.toContain('Recenzenți');
    expect(html).not.toContain('Cei mai utili localnici');
    expect(html).not.toContain('Angajați');
    expect(html).not.toContain('Angajatul lunii');
    expect(html).not.toContain('Premiile lunii');
  });

  it('afișează categoriile specifice pe topdrink', () => {
    const html = renderToStaticMarkup(
      <MonthlyTopView
        vertical="drink"
        restaurants={DRINK_VENUES}
        currentUser={DEMO_USER}
        onBack={() => {}}
        onSelectRestaurant={() => {}}
      />
    );

    expect(html).toContain('Votul publicului · Top 3');
    expect(html).toContain('Cea mai bună bere la halbă');
    expect(html).toContain('Cel mai bun cocktail bar');
    expect(html).toContain('Scârț Loc Lejer');
  });

  it('închide votul pentru lunile arhivate și actualizează Top 3 între noiembrie și octombrie', () => {
    const nov = getPublicVoteCategoryTops('food', '2026-11');
    const oct = getPublicVoteCategoryTops('food', '2026-10');

    expect(nov).toHaveLength(6);
    expect(oct).toHaveLength(6);

    for (const cat of nov) {
      expect(cat.top3).toHaveLength(3);
      expect(cat.top3.map((e) => e.rank)).toEqual([1, 2, 3]);
    }

    const novBurger = nov.find((c) => c.id === 'burger')!;
    const octBurger = oct.find((c) => c.id === 'burger')!;
    expect(novBurger.totalVotes).not.toBe(octBurger.totalVotes);
    expect(novBurger.top3[1].venueName).not.toBe(octBurger.top3[1].venueName);

    const octHtml = renderToStaticMarkup(
      <MonthlyTopView
        vertical="food"
        restaurants={INITIAL_RESTAURANTS}
        selectedMonth="2026-10"
        initialSubmenu="vot"
        currentUser={DEMO_USER}
        onBack={() => {}}
        onSelectRestaurant={() => {}}
      />
    );
    expect(octHtml).toContain('Meat Busters');
    expect(octHtml).toContain('Arhivă închisă · Votul s-a încheiat');
    expect(octHtml).not.toContain('1 vot disponibil');
  });

  it('afișează submeniul dedicat de vot cu regula 1 vot per secțiune per lună și recalculează clasamentul', () => {
    const html = renderToStaticMarkup(
      <MonthlyTopView
        vertical="food"
        restaurants={INITIAL_RESTAURANTS}
        initialSubmenu="vot"
        currentUser={DEMO_USER}
        initialVoteSnapshot={{
          countsByCategory: {
            pizza: { 'la-focacceria': 1 },
          },
          myVotesByCategory: {
            pizza: 'la-focacceria',
          },
        }}
        onBack={() => {}}
        onSelectRestaurant={() => {}}
      />
    );

    expect(html).toContain('Votează favoritele lunii');
    expect(html).toContain('1 vot per secțiune pe lună');
    expect(html).toContain('1/6 secțiuni votate');
    expect(html).toContain('Vot folosit');
    expect(html).not.toContain('1 vot disponibil');
    expect(html).toContain('Ai votat La Focacceria');

    const pizzaBase = getPublicVoteCategoryTops('food', '2026-11').find((c) => c.id === 'pizza')!;
    const bumped = mergeCategoryTopWithVotes(pizzaBase, INITIAL_RESTAURANTS, 'food', {
      'pizza-napoleon': 300,
    });
    expect(bumped.top3[0].venueName).toBe('Pizza Napoleon');
    expect(bumped.totalVotes).toBe(pizzaBase.totalVotes + 300);
  });

  it('afișează trofeele din votul lunii pe profilul restaurantului', () => {
    const jacks = INITIAL_RESTAURANTS.find((r) => r.slug === 'jacks-bistro')!;
    const awards = getVenueMonthlyCategoryAwards('food', jacks.slug);
    expect(awards.some((a) => a.categoryId === 'burger' && a.rank === 1)).toBe(true);

    const profileHtml = renderToStaticMarkup(
      <RestaurantDetailModal
        restaurant={jacks}
        currentUser={null}
        onClose={() => {}}
        onAddReview={() => {}}
      />
    );
    expect(profileHtml).toContain('Distincții din votul lunii');
    expect(profileHtml).toContain('Cel mai bun burger');
    expect(profileHtml).toContain('Aur · Locul 1');
    expect(profileHtml).toContain('Votul lunii');
  });
});
