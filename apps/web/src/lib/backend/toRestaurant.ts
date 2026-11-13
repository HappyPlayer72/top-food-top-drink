/**
 * Transformă datele din backend (@tftd/api) în tipurile folosite de componente (src/types.ts).
 * Funcții pure, fără acces la DB, ca să poată fi testate și înțelese ușor.
 * Ce nu există încă în DB (poze, texte editoriale) se ia din `fallback` (datele statice), după slug.
 */
import type { cityPage, leaderboardPage, topReviewers, venuePage, weekendEvents } from '@tftd/api';
import type {
  AspectScores,
  AuthorRole,
  Neighborhood,
  PriceTier,
  Restaurant,
  Review,
  TopReviewer,
  TrapTier,
  WeekendEvent,
} from '../../types';

type VenuePage = Awaited<ReturnType<typeof venuePage>>;
type CityPage = Awaited<ReturnType<typeof cityPage>>;
type Leaderboard = Awaited<ReturnType<typeof leaderboardPage>>;
type ApiReview = VenuePage['reviews'][number];

const CATEGORY_LABEL: Record<string, string> = {
  romanesc: 'Românesc',
  pizza: 'Pizza',
  bistro: 'Bistro',
  'street-food': 'Street food',
  patiserie: 'Patiserie',
  burger: 'Burger',
  asiatic: 'Asiatic',
  vegan: 'Vegan',
  pub: 'Pub',
  club: 'Club',
  'cocktail-bar': 'Cocktail bar',
  terasa: 'Terasă',
  'cafenea-de-seara': 'Cafenea de seară',
  'muzica-live': 'Muzică live',
};
const label = (cat?: string) => (cat ? CATEGORY_LABEL[cat] ?? cat : '');

const PLACEHOLDER_PHOTO = {
  food: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  drink: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
};

const round1 = (x: number) => Math.round(x * 10) / 10;

export function trapTier(index: number | null | undefined): TrapTier {
  const i = index ?? 0;
  if (i <= 25) return 'local-staple';
  if (i <= 60) return 'mixed-fair';
  return 'tourist-trap';
}

function priceTier(avg: number | null): PriceTier {
  if (avg == null) return '$$';
  if (avg <= 30) return '$';
  if (avg <= 55) return '$$';
  if (avg <= 85) return '$$$';
  return '$$$$';
}

function relativeDate(d: Date, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return 'Azi';
  if (days === 1) return 'Ieri';
  if (days < 7) return `Acum ${days} zile`;
  if (days < 14) return 'Acum o săptămână';
  if (days < 31) return `Acum ${Math.floor(days / 7)} săptămâni`;
  if (days < 60) return 'Acum o lună';
  return `Acum ${Math.floor(days / 30)} luni`;
}

const formatFollowers = (n: number | null | undefined) =>
  n == null ? undefined : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

function reviewAuthor(r: ApiReview): { name: string; role: AuthorRole; neighborhood?: string; followers?: string } {
  if (r.author?.displayName) {
    const roles = r.author.roles ?? [];
    const role: AuthorRole = roles.includes('influencer')
      ? 'influencer'
      : r.authorType === 'local'
        ? 'verified-local'
        : r.authorType === 'tourist'
          ? 'tourist'
          : 'regular';
    return { name: r.author.displayName, role, neighborhood: r.author.neighborhood ?? undefined, followers: formatFollowers(r.author.followers) };
  }
  return { name: r.externalAuthor?.name ?? 'Anonim', role: r.authorType === 'tourist' ? 'tourist' : 'regular' };
}

export function toReview(r: ApiReview, now: Date): Review {
  const a = reviewAuthor(r);
  const reply = r.replies[0];
  return {
    id: r.id,
    authorName: a.name,
    authorRole: a.role,
    authorNeighborhood: a.neighborhood,
    followerCountText: a.followers,
    helpfulCount: r.helpfulCount,
    weightMultiplier: round1(r.weight ?? 1),
    isVerifiedVisit: r.verifiedVisit,
    isPaidCollab: r.isPaid,
    foodScore: round1(r.rating),
    // Estimarea „capcană” a unui review: nota mică de la un localnic = semnal; altfel mic
    trapEstimatePct: Math.max(0, Math.min(100, Math.round((10 - r.rating) * 10))),
    date: relativeDate(r.postedAt, now),
    text: r.text ?? '',
    language: (r.language ?? 'ro').toUpperCase(),
    ownerReply: reply?.text,
    ownerReplyAuthor: reply ? `${reply.author}, proprietar` : undefined,
    praisedEmployee: r.servedBy ?? undefined,
  };
}

function aspects(scores: Record<string, number>, fallback?: AspectScores): AspectScores {
  const pick = (k: string, fb?: number) => scores[k] ?? fb ?? 7;
  return {
    food: pick('mancare', fallback?.food ?? scores['muzica']),
    service: pick('servire', fallback?.service),
    value: pick('pret', fallback?.value),
    atmosphere: pick('atmosfera', fallback?.atmosphere),
  };
}

export type MonthlyInfo = { rank: number; score: number; movement: number | null };

/** O pagină de local din backend → `Restaurant` pentru componente. */
export function toRestaurant(
  p: VenuePage,
  ctx: {
    now: Date;
    categoryAvgPriceRon: number | null;
    isSponsored: boolean;
    monthly?: MonthlyInfo;
    fallback?: Restaurant;
  },
): Restaurant {
  const v = p.venue;
  const fb = ctx.fallback;
  const s = p.scores;
  const inputs = s.explanation?.trapInputs;
  const avgMeal =
    v.vertical === 'drink'
      ? (v.drinkPrices?.beer05l ?? null)
      : v.priceMinLei && v.priceMaxLei
        ? Math.round((v.priceMinLei + v.priceMaxLei) / 2)
        : null;
  const google = p.externalRatings.find((x) => x.source === 'google');
  const kitchen = p.blog.find((b) => b.type === 'news');
  const neighborhood = (v.neighborhood ?? fb?.neighborhood ?? 'Cetate / Piața Unirii') as Neighborhood;

  return {
    id: v.slug,
    slug: v.slug,
    name: v.name,
    vertical: v.vertical,
    neighborhood,
    shortNeighborhood: v.neighborhood ?? fb?.shortNeighborhood,
    cuisine: label(v.categories[0]) || fb?.cuisine || '',
    shortCategory: label(v.categories[0]) || fb?.shortCategory,
    priceTier: priceTier(avgMeal),
    avgMealPriceRon: avgMeal ?? fb?.avgMealPriceRon ?? 0,
    categoryAvgPriceRon: ctx.categoryAvgPriceRon ?? fb?.categoryAvgPriceRon ?? 0,
    priceRangeLabel:
      v.vertical === 'drink'
        ? v.drinkPrices?.beer05l
          ? `Bere 0,5 l: ${v.drinkPrices.beer05l} lei`
          : fb?.priceRangeLabel
        : v.priceMinLei && v.priceMaxLei
          ? `${v.priceMinLei}–${v.priceMaxLei} lei`
          : fb?.priceRangeLabel,
    openUntilLabel: v.openLabel ? `${v.openLabel}.` : fb?.openUntilLabel,
    photoUrl: v.photos[0] ?? fb?.photoUrl ?? PLACEHOLDER_PHOTO[v.vertical],
    editorialHeadline: v.headline ?? fb?.editorialHeadline ?? '',
    editorialWriteup: v.writeup.length ? v.writeup : (fb?.editorialWriteup ?? []),
    whatToOrder: p.menu.length
      ? p.menu.map((m) => ({ name: m.name, priceRon: m.priceLei ?? 0, description: m.description ?? undefined, isMustOrder: m.mustOrder }))
      : (fb?.whatToOrder ?? []),
    occasionTags: v.occasionTags.length ? v.occasionTags : (fb?.occasionTags ?? []),

    foodQualityScore: s.honest ?? 0,
    localsScore: s.locals ?? s.honest ?? 0,
    touristsScore: s.tourists ?? s.honest ?? 0,
    googleRawRating: google?.rating ?? fb?.googleRawRating ?? 0,
    touristTrapIndex: s.touristTrapIndex ?? 0,
    trapTier: trapTier(s.touristTrapIndex),
    trapReasons: (s.explanation?.trapReasons ?? []).map((r) => r.text),
    trapBreakdown: {
      touristVsLocalGap: inputs?.localsScore != null && inputs.touristsScore != null ? round1(inputs.touristsScore - inputs.localsScore) : 0,
      touristZoneProximityM: Math.round(inputs?.distanceToTouristZoneM ?? 0),
      priceVsCategoryPct: inputs?.priceRatio != null ? Math.round((inputs.priceRatio - 1) * 100) : 0,
      foreignLangReviewsPct: Math.round((inputs?.foreignLanguageShare ?? 0) * 100),
      singleVisitPct: Math.round((inputs?.oneTimeVisitorShare ?? 0) * 100),
    },
    aspectScores: aspects(p.aspectScores, fb?.aspectScores),

    isSponsored: ctx.isSponsored,
    sponsoredNote: ctx.isSponsored ? 'Sponsorizat. Nu schimbă scorul.' : undefined,
    isPartner: p.isPartner,
    coordinates: v.location,
    address: v.address ?? fb?.address ?? '',
    hours: v.hoursText || fb?.hours || '',
    openNow: v.openNow,
    phone: v.phone ?? fb?.phone ?? '',

    monthlyRank: ctx.monthly?.rank,
    monthlyScore: ctx.monthly?.score,
    monthlyRankChange: ctx.monthly?.movement ?? undefined,
    monthlyStatusLabel: ctx.monthly
      ? ctx.monthly.movement == null
        ? 'intră în top'
        : ctx.monthly.movement === 0
          ? '= ca luna trecută'
          : ctx.monthly.movement > 0
            ? `urcă ${ctx.monthly.movement} ${ctx.monthly.movement === 1 ? 'loc' : 'locuri'}`
            : `coboară ${-ctx.monthly.movement} ${ctx.monthly.movement === -1 ? 'loc' : 'locuri'}`
      : undefined,

    crowdSegments: p.vibe ? (Math.max(1, Math.min(5, p.vibe.level)) as 1 | 2 | 3 | 4 | 5) : undefined,
    crowdLabel: p.vibe ? `${p.vibe.label}, acum ${p.vibe.minutesAgo} min` : undefined,
    drinkTags: v.drinkTags.length ? (v.drinkTags as Restaurant['drinkTags']) : fb?.drinkTags,

    reviewCounts: { locals: p.reviewCounts.local, tourists: p.reviewCounts.tourist, influencers: p.reviewCounts.influencer },
    reviews: p.reviews.map((r) => toReview(r, ctx.now)),
    kitchenStory: kitchen
      ? {
          author: fb?.kitchenStory?.author ?? 'Proprietarul',
          date: new Date(kitchen.publishAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }),
          title: kitchen.title,
          body: kitchen.body,
          photoUrl: kitchen.photos[0] ?? fb?.kitchenStory?.photoUrl,
        }
      : fb?.kitchenStory,
    ownerPosts: p.blog
      .filter((b) => b.type !== 'news')
      .map((b) => ({ id: b.id, type: b.type, title: b.title, content: b.body, date: new Date(b.publishAt).toLocaleDateString('ro-RO') })),
    team: p.team.map((t, i) => ({
      name: t.firstName,
      role: t.role,
      positiveMentions: t.mentionsThisMonth,
      isEmployeeOfMonth: i === 0 && t.mentionsThisMonth > 0 && t.mentionsThisMonth === Math.max(...p.team.map((x) => x.mentionsThisMonth)),
      monthLabel: 'angajatul lunii',
    })),
  };
}

/** Clasamentul lunii, ca hartă slug → loc/scor/mișcare. */
export function monthlyBySlug(lb: Leaderboard, city: CityPage): Map<string, MonthlyInfo> {
  const idToSlug = new Map(city.top.map((v) => [v.id, v.slug]));
  const out = new Map<string, MonthlyInfo>();
  for (const e of lb.snapshot?.entries ?? []) {
    const slug = idToSlug.get(e.venueId);
    if (slug) out.set(slug, { rank: e.rank, score: e.score, movement: e.movement });
  }
  return out;
}

export function toWeekendEvent(e: Awaited<ReturnType<typeof weekendEvents>>[number]): WeekendEvent {
  const d = new Date(e.eventAt!);
  const day = d.toLocaleDateString('ro-RO', { weekday: 'short', timeZone: 'Europe/Bucharest' }).toLowerCase();
  const dayShort: WeekendEvent['dayShort'] = day.startsWith('s') ? 'sâm.' : day.startsWith('d') ? 'dum.' : 'vin.';
  return {
    id: e.id,
    dayShort,
    dayNumber: String(Number(d.toLocaleDateString('ro-RO', { day: 'numeric', timeZone: 'Europe/Bucharest' }))),
    title: `${e.title}, ${e.venue.name}`,
    venueName: e.venue.name,
    venueId: e.venue.slug,
    details: e.body,
  };
}

export function toTopReviewer(r: Awaited<ReturnType<typeof topReviewers>>[number]): TopReviewer {
  const initials = r.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return { id: r.userId, initials, name: r.displayName, role: r.role, badgeLabel: r.badgeLabel, helpfulVotes: r.helpfulVotes };
}
