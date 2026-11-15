import { describe, expect, it } from 'vitest';
import { priceText, type Restaurant } from '../../types';
import { groupMenu, toRestaurant, toTopReviewer, toWeekendEvent, trapTier } from './toRestaurant';

type VenuePage = Parameters<typeof toRestaurant>[0];
const now = new Date('2026-11-14T10:00:00Z');

function page(over: Partial<VenuePage> = {}): VenuePage {
  const base = {
    venue: {
      id: 'uuid-1', name: 'Ciorba lui Sandu', slug: 'ciorba-lui-sandu', vertical: 'food', categories: ['romanesc'], neighborhood: 'Iosefin',
      address: 'Str. Exemplu', phone: null, website: null, openingHours: null, hoursText: 'Luni–Duminică 11:00–22:00', openNow: true,
      openLabel: 'Deschis până la 22:00', priceMinLei: 35, priceMaxLei: 60, drinkPrices: null, location: { lat: 45.74, lng: 21.2 },
      photos: [], headline: null, writeup: [], occasionTags: [], drinkTags: [], status: 'active',
    },
    menu: [],
    aspectScores: { mancare: 9.4, servire: 8.8, pret: 9.1 },
    loyalty: null,
    scores: {
      honest: 8.9, locals: 9.2, tourists: 8.1, touristTrapIndex: 12, trapLevel: 'none',
      explanation: {
        reviewCount: 48, localCount: 40, touristCount: 8, enoughData: true, trapLevel: 'none',
        trapReasons: [{ signal: 'price', value: 1.1, points: 3, text: 'Prețuri cu 10% peste media locală pe aceeași categorie.' }],
        trapInputs: { localsScore: 9.2, touristsScore: 8.1, distanceToTouristZoneM: 1280.4, priceRatio: 0.82, foreignLanguageShare: 0.07, oneTimeVisitorShare: 0.11 },
      },
    },
    isPartner: true,
    reviewCounts: { local: 40, tourist: 8, influencer: 1 },
    reviews: [
      {
        id: 'r1', source: 'native', rating: 9, text: 'Ciorbă foarte bună.', language: 'ro', postedAt: new Date('2026-11-11T10:00:00Z'),
        authorType: 'local', isPaid: false, verifiedVisit: true, externalAuthor: null, servedBy: 'Ioana', weight: 2.04, helpfulCount: 3,
        author: { username: 'andreea0', displayName: 'Andreea M.', neighborhood: 'Iosefin', roles: ['user', 'local'], avatarUrl: null, followers: null },
        replies: [{ reviewId: 'r1', text: 'Mulțumim!', createdAt: now, author: 'Sandu D.' }],
      },
      {
        id: 'r2', source: 'google', rating: 8, text: 'Great food', language: 'en', postedAt: new Date('2026-10-01T10:00:00Z'),
        authorType: 'tourist', isPaid: false, verifiedVisit: false, externalAuthor: { name: 'Sarah K.' }, servedBy: null, weight: 0.8, helpfulCount: 0,
        author: { username: null, displayName: null, neighborhood: null, roles: null, avatarUrl: null, followers: null },
        replies: [],
      },
    ],
    blog: [],
    team: [
      { id: 'e1', firstName: 'Ioana', role: 'ospătar', photoUrl: null, mentionsThisMonth: 7 },
      { id: 'e2', firstName: 'Mihai', role: 'bucătar', photoUrl: null, mentionsThisMonth: 0 },
    ],
    videos: [],
    externalRatings: [{ source: 'google', rating: 4.7, reviewCount: 812, url: null }],
    vibe: null,
  };
  return { ...base, ...over } as unknown as VenuePage;
}

const fallback = {
  photoUrl: 'https://exemplu/poza.jpg',
  editorialHeadline: 'Titlu static',
  editorialWriteup: ['Text static'],
  whatToOrder: [{ name: 'Ciorbă de burtă', priceRon: 28, isMustOrder: true }],
} as unknown as Restaurant;

describe('toRestaurant', () => {
  it('ia scorurile, slug-ul ca id și UUID-ul ca venueId', () => {
    const r = toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: false });
    expect(r).toMatchObject({ id: 'ciorba-lui-sandu', venueId: 'uuid-1', foodQualityScore: 8.9, localsScore: 9.2, touristsScore: 8.1, googleRawRating: 4.7, isPartner: true });
    expect(r.trapTier).toBe('local-staple');
    expect(r.avgMealPriceRon).toBe(48);
    expect(r.priceRangeLabel).toBe('35–60 lei');
    expect(r.openUntilLabel).toBe('Deschis până la 22:00.');
  });

  it('trapBreakdown vine din valorile brute ale semnalelor', () => {
    const r = toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: false });
    expect(r.trapBreakdown).toEqual({ touristVsLocalGap: -1.1, touristZoneProximityM: 1280, priceVsCategoryPct: -18, foreignLangReviewsPct: 7, singleVisitPct: 11 });
    expect(r.trapReasons).toEqual(['Prețuri cu 10% peste media locală pe aceeași categorie.']);
  });

  it('aspectele au numele din componente; cele fără date rămân 0, nu o notă inventată', () => {
    const r = toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: false });
    expect(r.aspectScores).toEqual({ food: 9.4, service: 8.8, value: 9.1, atmosphere: 0 });
  });

  it('ce lipsește din DB se ia din datele statice (poză, text, meniu)', () => {
    const r = toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: false, fallback });
    expect(r.photoUrl).toBe('https://exemplu/poza.jpg');
    expect(r.editorialHeadline).toBe('Titlu static');
    expect(r.whatToOrder[0]?.name).toBe('Ciorbă de burtă');
  });

  it('meniul din DB are prioritate față de cel static', () => {
    const r = toRestaurant(page({ menu: [{ name: 'Sarmale', priceLei: 32, description: null, mustOrder: true }] } as Partial<VenuePage>), { now, categoryAvgPriceRon: 45, isSponsored: false, fallback });
    expect(r.whatToOrder).toEqual([{ name: 'Sarmale', priceRon: 32, description: undefined, isMustOrder: true }]);
  });

  it('review-urile: localnicul verificat, turistul de pe Google, răspunsul owner-ului', () => {
    const [a, b] = toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: false }).reviews;
    expect(a).toMatchObject({ authorName: 'Andreea M.', authorRole: 'verified-local', authorNeighborhood: 'Iosefin', weightMultiplier: 2, helpfulCount: 3, date: 'Acum 3 zile', praisedEmployee: 'Ioana', ownerReply: 'Mulțumim!', ownerReplyAuthor: 'Sandu D., proprietar' });
    expect(b).toMatchObject({ authorName: 'Sarah K.', authorRole: 'tourist', language: 'EN' });
  });

  it('topul lunii: „urcă 2 locuri”, „intră în top”', () => {
    expect(toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: false, monthly: { rank: 1, score: 9.2, movement: 2 } }).monthlyStatusLabel).toBe('urcă 2 locuri');
    expect(toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: false, monthly: { rank: 5, score: 8.3, movement: null } }).monthlyStatusLabel).toBe('intră în top');
  });

  it('angajatul lunii = cel cu cele mai multe mențiuni', () => {
    const team = toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: false }).team!;
    expect(team[0]).toMatchObject({ name: 'Ioana', isEmployeeOfMonth: true, positiveMentions: 7 });
    expect(team[1]?.isEmployeeOfMonth).toBe(false);
  });

  it('Sponsorizat are nota care spune că nu schimbă scorul', () => {
    expect(toRestaurant(page(), { now, categoryAvgPriceRon: 45, isSponsored: true }).sponsoredNote).toBe('Sponsorizat. Nu schimbă scorul.');
  });
});

it('trapTier: pragurile din componente', () => {
  expect([trapTier(10), trapTier(40), trapTier(84), trapTier(null)]).toEqual(['local-staple', 'mixed-fair', 'tourist-trap', 'local-staple']);
});

it('evenimentul de weekend și recenzentul de top', () => {
  const e = toWeekendEvent({
    id: 'p1',
    title: 'Concert de blues',
    body: 'De la 21:00.',
    eventAt: new Date('2026-11-14T19:00:00Z'),
    venue: {
      name: 'Pivnița cu Boltă',
      slug: 'pivnita-cu-bolta',
      vertical: 'drink',
      neighborhood: 'Cetate / Piața Unirii',
      address: 'Str. Alba Iulia 1',
      categories: ['muzica-live'],
      photo: null,
    },
  });
  expect(e).toMatchObject({ dayShort: 'sâm.', dayNumber: '14', venueId: 'pivnita-cu-bolta', title: 'Concert de blues, Pivnița cu Boltă' });
  const t = toTopReviewer({ userId: 'u1', username: 'andreea0', displayName: 'Andreea M.', neighborhood: 'Iosefin', roles: ['user', 'local'], followers: null, helpfulVotes: 26, reviews: 4, role: 'verified-local', badgeLabel: 'Localnic din Iosefin' });
  expect(t).toEqual({ id: 'u1', username: 'andreea0', initials: 'AM', name: 'Andreea M.', role: 'verified-local', badgeLabel: 'Localnic din Iosefin', helpfulVotes: 26 });
});

it('groupMenu: categoriile în ordinea primei apariții, fără categorie → titlul implicit', () => {
  const row = (category: string, name: string) => ({ id: name, category, name, priceLei: 10, description: null, mustOrder: false, hasPhoto: name === 'Burtă' });
  const groups = groupMenu([row('Ciorbe', 'Burtă'), row('Desert', 'Papanași'), row('Ciorbe', 'Perișoare'), row('', 'Pâine')], 'food');
  expect(groups.map((g) => [g.title, g.items.map((i) => i.name)])).toEqual([
    ['Ciorbe', ['Burtă', 'Perișoare']],
    ['Desert', ['Papanași']],
    ['Preparate', ['Pâine']],
  ]);
  expect(groups[0]!.items.map((i) => i.photoUrl)).toEqual(['/api/menu-photo/Burtă', undefined]);
});

it('fără prețuri în lei: arată nivelul de preț Google, nu „~0 lei”', () => {
  const p = page();
  const venue = { ...p.venue, priceMinLei: null, priceMaxLei: null };
  const ctx = { now, categoryAvgPriceRon: null, isSponsored: false };
  const mid = toRestaurant({ ...p, venue: { ...venue, priceLevel: 2 } } as VenuePage, ctx);
  expect([mid.priceRangeLabel, mid.priceTier, priceText(mid, ', ')]).toEqual(['Preț mediu', '$$', ', Preț mediu']);
  const unknown = toRestaurant({ ...p, venue: { ...venue, priceLevel: null } } as VenuePage, ctx);
  expect(priceText(unknown, ', ')).toBe('');
});
