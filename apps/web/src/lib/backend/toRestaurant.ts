/**
 * Transformă datele din backend (@tftd/api) în tipurile folosite de componente (src/types.ts).
 * Funcții pure, fără acces la DB, ca să poată fi testate și înțelese ușor.
 * Din `fallback` (datele statice, după slug) se iau doar informații reale despre local: poze, texte, meniu, livrare, facilități.
 * Scorurile, nota Google, aspectele, review-urile și poveștile owner-ului vin numai din DB: fără date, rămân goale.
 */
import type { cityPage, leaderboardPage, SocialAnalysis, topReviewers, venuePage, weekendEvents } from '@tftd/api';
import type {
  AdBanner,
  AspectScores,
  AuthorRole,
  MenuCategory,
  MonthlyAwards,
  Neighborhood,
  PriceTier,
  Restaurant,
  Review,
  ThemeTop,
  TopReviewer,
  TrapTier,
  VenueVideo,
  WeekendEvent,
} from '../../types';

type VenuePage = Awaited<ReturnType<typeof venuePage>>;
type CityPage = Awaited<ReturnType<typeof cityPage>>;
type Leaderboard = Awaited<ReturnType<typeof leaderboardPage>>;
type ApiReview = VenuePage['reviews'][number];

import { TIMISOARA_NEIGHBORHOOD_ZONES } from '../../data/timisoaraGeo';

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

/** Fără poză reală: o ilustrație neutră (farfurie / halbă), nu o fotografie care ar părea a localului. */
const PLACEHOLDER_PHOTO = {
  food: '/placeholder-food.svg',
  drink: '/placeholder-drink.svg',
};

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Punct în poligon (ray casting), pe coordonate [lng, lat]. */
function inside(lng: number, lat: number, ring: [number, number][]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/**
 * Cartierul unui local importat fără cartier: zona în care cade, altfel cea mai apropiată
 * (aproximativ: harta are doar cartierele centrale).
 */
export function neighborhoodAt(lat: number, lng: number): Neighborhood {
  const zone = TIMISOARA_NEIGHBORHOOD_ZONES.find((z) => z.coordinates.some((ring) => inside(lng, lat, ring)))
    ?? [...TIMISOARA_NEIGHBORHOOD_ZONES].sort((a, b) => Math.hypot(a.center[0] - lng, a.center[1] - lat) - Math.hypot(b.center[0] - lng, b.center[1] - lat))[0]!;
  return zone.cameraKey as Neighborhood;
}

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

function reviewAuthor(r: ApiReview): { name: string; username?: string; role: AuthorRole; neighborhood?: string; followers?: string } {
  if (r.author?.displayName) {
    const roles = r.author.roles ?? [];
    const role: AuthorRole = roles.includes('influencer')
      ? 'influencer'
      : r.authorType === 'local'
        ? 'verified-local'
        : r.authorType === 'tourist'
          ? 'tourist'
          : 'regular';
    return { name: r.author.displayName, username: r.author.username ?? undefined, role, neighborhood: r.author.neighborhood ?? undefined, followers: formatFollowers(r.author.followers) };
  }
  return { name: r.externalAuthor?.name ?? 'Anonim', role: r.authorType === 'tourist' ? 'tourist' : 'regular' };
}

export function toReview(r: ApiReview, now: Date): Review {
  const a = reviewAuthor(r);
  const reply = r.replies[0];
  return {
    id: r.id,
    authorId: r.authorId ?? undefined,
    authorUsername: a.username,
    authorName: a.name,
    sourceLabel: r.source === 'google' ? 'de pe Google' : r.source === 'tripadvisor' ? 'de pe Tripadvisor' : undefined,
    authorRole: a.role,
    authorNeighborhood: a.neighborhood,
    followerCountText: a.followers,
    helpfulCount: r.helpfulCount,
    weightMultiplier: round1(r.weight ?? 1),
    isVerifiedVisit: r.verifiedVisit,
    verifiedVia: r.verifiedVia ?? undefined,
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

/** Aspectele din review-urile analizate; 0 = încă nu avem date (UI-ul afișează „—”). */
function aspects(scores: Record<string, number>): AspectScores {
  const pick = (k: string) => scores[k] ?? 0;
  return {
    food: scores['mancare'] ?? pick('muzica'),
    service: pick('servire'),
    value: pick('pret'),
    atmosphere: pick('atmosfera'),
  };
}

/** Fraza din „Cum se calculează?” despre punctul de pornire al scorului (regula 3). */
export function priorNote(p?: { cityMean: number; mean: number; external: { rating5: number; count: number } | null }): string | undefined {
  if (!p) return undefined;
  const n = (x: number) => x.toLocaleString('ro-RO', { maximumFractionDigits: 1 });
  if (!p.external) return `Pornește de la media orașului (${n(p.cityMean)}), apoi review-urile analizate îl mută în sus sau în jos.`;
  return `Pornește de la nota de pe Google Maps (${n(p.external.rating5)}★ din ${p.external.count.toLocaleString('ro-RO')} de note), trasă spre media orașului (${n(p.cityMean)}): ${n(p.mean)}. Apoi review-urile analizate îl corectează.`;
}

export type MonthlyInfo = { rank: number; score: number; movement: number | null };

/** O pagină de local din backend → `Restaurant` pentru componente. */
/** Felurile din DB (în ordinea pusă de owner) → categorii, în ordinea primei apariții. */
export function groupMenu(menu: VenuePage['menu'], vertical: 'food' | 'drink'): MenuCategory[] {
  const byTitle = new Map<string, MenuCategory>();
  for (const m of menu) {
    const title = m.category || (vertical === 'drink' ? 'Băuturi' : 'Preparate');
    if (!byTitle.has(title)) byTitle.set(title, { title, items: [] });
    byTitle.get(title)!.items.push({
      name: m.name,
      priceRon: m.priceLei ?? 0,
      description: m.description ?? undefined,
      isMustOrder: m.mustOrder,
      photoUrl: m.hasPhoto ? `/api/menu-photo/${m.id}` : undefined,
    });
  }
  return [...byTitle.values()];
}

/** Topurile tematice din cityPage → doar ce afișează pagina (fără scoruri interne). */
export function toThemeTops(themes: CityPage['themes']): ThemeTop[] {
  const entry = (v: CityPage['themes'][number]['declared'][number]) => ({ slug: v.slug, name: v.name, neighborhood: v.neighborhood, facts: v.facts, quick: v.quick });
  return themes.map((t) => ({
    theme: t.theme,
    label: t.label,
    community: t.community.map((c) => ({ rank: c.rank, ...entry(c) })),
    declared: t.declared.map(entry),
  }));
}

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
  const neighborhood = (v.neighborhood ?? fb?.neighborhood ?? neighborhoodAt(v.location.lat, v.location.lng)) as Neighborhood;

  return {
    id: v.slug,
    venueId: v.id,
    slug: v.slug,
    name: v.name,
    vertical: v.vertical,
    neighborhood,
    shortNeighborhood: v.neighborhood ?? fb?.shortNeighborhood ?? neighborhood,
    cuisine: label(v.categories[0]) || fb?.cuisine || '',
    shortCategory: label(v.categories[0]) || fb?.shortCategory,
    categories: v.categories.length ? v.categories : fb?.categories,
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
    hasPhoto: !!(v.photos[0] ?? fb?.photoUrl),
    // Data reală a ultimei recalculări a scorului (nu o dată scrisă de mână)
    lastUpdated: s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Bucharest' }) : undefined,
    editorialHeadline: v.headline ?? fb?.editorialHeadline ?? '',
    editorialWriteup: v.writeup.length ? v.writeup : (fb?.editorialWriteup ?? []),
    // „Ce să comanzi” = doar felurile marcate recomandat, nu tot meniul.
    whatToOrder: p.menu.length
      ? p.menu.filter((m) => m.mustOrder).map((m) => ({ name: m.name, priceRon: m.priceLei ?? 0, description: m.description ?? undefined, isMustOrder: true }))
      : (fb?.whatToOrder ?? []),
    menuCategories: p.menu.length ? groupMenu(p.menu, v.vertical) : fb?.menuCategories,
    features: p.features,
    quick: p.quick,
    occasionTags: v.occasionTags.length ? v.occasionTags : (fb?.occasionTags ?? []),

    foodQualityScore: s.honest ?? 0,
    localsScore: s.locals ?? s.honest ?? 0,
    touristsScore: s.tourists ?? s.honest ?? 0,
    googleRawRating: google?.rating ?? 0,
    touristTrapIndex: s.touristTrapIndex ?? 0,
    trapTier: trapTier(s.touristTrapIndex),
    trapReasons: (s.explanation?.trapReasons ?? []).map((r) => r.text),
    verifiedVisitCount: s.explanation?.verifiedVisitCount,
    scorePriorNote: priorNote(s.explanation?.prior),
    trapBreakdown: {
      touristVsLocalGap: inputs?.localsScore != null && inputs.touristsScore != null ? round1(inputs.touristsScore - inputs.localsScore) : 0,
      touristZoneProximityM: Math.round(inputs?.distanceToTouristZoneM ?? 0),
      priceVsCategoryPct: inputs?.priceRatio != null ? Math.round((inputs.priceRatio - 1) * 100) : 0,
      foreignLangReviewsPct: Math.round((inputs?.foreignLanguageShare ?? 0) * 100),
      singleVisitPct: Math.round((inputs?.oneTimeVisitorShare ?? 0) * 100),
    },
    aspectScores: aspects(p.aspectScores),

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

    facilities: fb?.facilities,
    delivery: fb?.delivery,

    reviewCounts: { locals: p.reviewCounts.local, tourists: p.reviewCounts.tourist, influencers: p.reviewCounts.influencer },
    reviews: p.reviews.map((r) => toReview(r, ctx.now)),
    kitchenStory: kitchen
      ? {
          author: 'Proprietarul',
          date: new Date(kitchen.publishAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }),
          title: kitchen.title,
          body: kitchen.body,
          photoUrl: kitchen.photos[0] ?? fb?.kitchenStory?.photoUrl,
        }
      : undefined,
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
    videos: p.videos.map((vid) => toVenueVideo(vid.url, vid.platform, vid.analysis as SocialAnalysis | null, { title: vid.title, discoveredVia: vid.discoveredVia })),
  };
}

/** Transformă analiza unui link social într-un card video pentru UI. */
export function toVenueVideo(
  url: string,
  platform: string,
  a: SocialAnalysis | null,
  found: { title?: string | null; discoveredVia?: VenueVideo['discoveredVia'] } = {},
): VenueVideo {
  const isPaid = !!a?.isAd;
  const hasExplicit = (a?.adSignals ?? []).some((s) => /#|reclam|sponsor|ad\b/i.test(s));
  return {
    url,
    platform,
    title: found.title ?? a?.embed?.title ?? undefined,
    discoveredVia: found.discoveredVia ?? null,
    dishes: a?.dishes ?? [],
    prices: a?.priceMentioned != null ? [{ item: 'Menționat în video', priceLei: a.priceMentioned }] : [],
    isPaid,
    adSignal: isPaid ? (hasExplicit ? 'marcat_reclama' : 'posibil_reclama') : 'organic',
    sentiment: a?.sentiment == null ? 'neutral' : a.sentiment >= 6.5 ? 'positive' : a.sentiment < 5 ? 'negative' : 'neutral',
  };
}

/** Transformă reclamele active ale orașului într-un format serializabil pentru UI. */
export function toAdBanners(ads: CityPage['ads'] | undefined): AdBanner[] {
  return (ads ?? []).map((a) => ({
    id: a.id,
    advertiser: a.advertiser,
    creativeUrl: a.creativeUrl,
    linkUrl: a.linkUrl,
    placement: a.placement,
  }));
}

/** Transformă premiile lunii din clasament. */
export function toMonthlyAwards(lb: Leaderboard): MonthlyAwards {
  return {
    month: lb.month ?? null,
    months: lb.months ?? [],
    revelation: lb.snapshot?.awards.revelation
      ? {
          ...lb.snapshot.awards.revelation,
          neighborhood: lb.snapshot.awards.revelation.neighborhood ?? undefined,
        }
      : null,
    employee: lb.snapshot?.awards.employee ?? null,
    local: lb.snapshot?.awards.local ?? null,
    influencer: lb.snapshot?.awards.influencer ?? null,
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
    neighborhood: (e.venue as { neighborhood?: string }).neighborhood,
    address: (e.venue as { address?: string | null }).address ?? undefined,
  };
}

export function toTopReviewer(r: Awaited<ReturnType<typeof topReviewers>>[number]): TopReviewer {
  const initials = r.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return { id: r.userId, username: r.username, initials, name: r.displayName, role: r.role, badgeLabel: r.badgeLabel, helpfulVotes: r.helpfulVotes };
}
