import { and, countDistinct, eq, gte, sql } from 'drizzle-orm';
import {
  accounts,
  antibot,
  cityPage,
  leaderboardPage,
  loyalty,
  myQuickVotes,
  topReviewers,
  venuePage,
  visits,
  weekendEvents,
  type Db,
  type ReviewFilter,
} from '@tftd/api';
import { checkins, cities, ensureExtendedSchema, monthlyCategoryVotes, notFound, venues } from '@tftd/db';
import { MIN_TOTAL_WEIGHT, POSSIBLE_TRAP, PRIOR_WEIGHT, TRAP, WEIGHTS } from '@tftd/scoring';
import {
  INITIAL_QUESTIONS,
  INTERESTS,
  MIN_ANSWERS,
  QUESTIONS,
  QUICK_MAX,
  THEMES,
} from '@tftd/scoring/features';
import { getDb } from '@/lib/server/db';
import { toUserAccount } from '@/lib/backend/user';
import {
  monthlyBySlug,
  toAdBanners,
  toMonthlyAwards,
  toRestaurant,
  toThemeTops,
  toTopReviewer,
  toWeekendEvent,
} from '@/lib/backend/toRestaurant';
import {
  DRINK_VENUES,
  INITIAL_RESTAURANTS,
  NEIGHBORHOODS,
  TOP_LOCAL_REVIEWERS,
  TOURIST_ZONES,
  WEEKEND_EVENTS,
} from '@/data/restaurants';
import { TIMISOARA_NEIGHBORHOOD_ZONES } from '@/data/timisoaraGeo';
import { getCurrentActiveVoteMonth, getPublicVoteCategoryTops } from '@/data/monthlyCategoryTops';
import { MAP_TASTES } from '@/components/mapTasteFilter';
import { TASTE_CATEGORIES } from '@/components/scarnavii/tasteTourLogic.ts';
import type {
  AdBanner,
  LoyaltyIconId,
  LoyaltyProgram,
  MonthlyAwards,
  QuickKind,
  Restaurant,
  ThemeTop,
  TopReviewer,
  UserAccount,
  Vertical,
  WeekendEvent,
} from '@/types';
import { hasDbConfigured } from './http';

export const DEFAULT_CITY_SLUG = 'timisoara';
export const DEFAULT_CITY_CENTER = { lat: 45.7558, lng: 21.2286 };

const STATIC_ALL = INITIAL_RESTAURANTS.concat(DRINK_VENUES);
const STATIC_BY_SLUG = new Map(STATIC_ALL.map((r) => [r.slug, r]));
const LOYALTY_ICONS: LoyaltyIconId[] = ['soup', 'coffee', 'croissant', 'pizza', 'beer', 'wine', 'heart', 'cat'];

export function asLoyaltyIcon(icon: string): LoyaltyIconId {
  return LOYALTY_ICONS.includes(icon as LoyaltyIconId) ? (icon as LoyaltyIconId) : 'heart';
}

export function getOptionalDb(): Db | null {
  return hasDbConfigured() ? getDb() : null;
}

export function absolutizeUrl(url: string | undefined, origin: string): string | undefined {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const cleanOrigin = origin.replace(/\/+$/, '');
  return url.startsWith('/') ? `${cleanOrigin}${url}` : `${cleanOrigin}/${url}`;
}

export function serializeRestaurant(r: Restaurant, origin: string): Restaurant {
  return {
    ...r,
    photoUrl: absolutizeUrl(r.photoUrl, origin) ?? r.photoUrl,
    menuCategories: r.menuCategories?.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({
        ...item,
        photoUrl: absolutizeUrl(item.photoUrl, origin),
      })),
    })),
    kitchenStory: r.kitchenStory
      ? {
          ...r.kitchenStory,
          photoUrl: absolutizeUrl(r.kitchenStory.photoUrl, origin),
        }
      : undefined,
  };
}

export function serializeAdBanner(ad: AdBanner, origin: string): AdBanner {
  return {
    ...ad,
    creativeUrl: absolutizeUrl(ad.creativeUrl, origin) ?? ad.creativeUrl,
    linkUrl: absolutizeUrl(ad.linkUrl, origin) ?? ad.linkUrl,
  };
}

export async function getUserAccountSafe(userId: string | null): Promise<UserAccount | null> {
  if (!userId) return null;
  const db = getOptionalDb();
  if (!db) return null;
  return toUserAccount(db, userId);
}

export function buildPlatformConfig(origin: string) {
  return {
    apiVersion: 1,
    city: {
      slug: DEFAULT_CITY_SLUG,
      name: 'Timișoara',
      center: DEFAULT_CITY_CENTER,
      neighborhoods: NEIGHBORHOODS,
      neighborhoodZones: TIMISOARA_NEIGHBORHOOD_ZONES,
      touristZones: TOURIST_ZONES,
    },
    verticals: ['food', 'drink'] as const,
    features: {
      interests: INTERESTS,
      themes: THEMES,
      questions: QUESTIONS,
      quickMax: QUICK_MAX,
      minAnswers: MIN_ANSWERS,
      initialQuestions: INITIAL_QUESTIONS,
    },
    scoringRules: {
      priorWeight: PRIOR_WEIGHT,
      minTotalWeight: MIN_TOTAL_WEIGHT,
      possibleTrap: POSSIBLE_TRAP,
      trap: TRAP,
      weights: WEIGHTS,
      visitRadiusM: visits.VISIT_RULES.venueRadiusM,
      maxReceiptBytes: visits.VISIT_RULES.maxImageBytes,
      localRules: accounts.LOCAL_RULES,
      universityDomains: accounts.UNIVERSITY_DOMAINS[DEFAULT_CITY_SLUG] ?? [],
      loyaltyQrWindowSeconds: loyalty.QR_WINDOW_SECONDS,
      loyaltyIcons: loyalty.ICONS,
      antibot: {
        minFillMs: antibot.GATE_RULES.minFillMs,
        tokenTtlMs: antibot.GATE_RULES.tokenTtlMs,
      },
    },
    discovery: {
      tasteCategories: TASTE_CATEGORIES,
      mapTastes: MAP_TASTES,
    },
    flags: {
      backendOnline: hasDbConfigured(),
      demoScan: process.env.DEMO_SCAN !== 'off',
      demoVisitGps: process.env.DEMO_VISIT_GPS !== 'off',
      demoEmailCodes: process.env.DEMO_EMAIL_CODES !== 'off',
      googlePlacesEnabled: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      googleRoutesEnabled: Boolean(process.env.GOOGLE_ROUTES_API_KEY),
    },
    links: {
      openApiUrl: `${origin}/api/v1/openapi.json`,
      designTokensUrl: `${origin}/api/v1/design-tokens`,
      assetLinksUrl: `${origin}/.well-known/assetlinks.json`,
      deepLinkPaths: {
        venueFood: '/topfood/timisoara/{slug}',
        venueDrink: '/topdrink/timisoara/{slug}',
        leaderboardFood: '/topfood/timisoara/top-luna/{month}',
        leaderboardDrink: '/topdrink/timisoara/top-luna/{month}',
        outingPoll: '/unde-iesim/{token}',
        userProfile: '/u/{username}',
      },
    },
  };
}

export type VenueQueryFilters = {
  vertical: Vertical;
  category?: string | null;
  neighborhood?: string | null;
  maxPriceLei?: number | null;
  noTraps?: boolean;
  openNow?: boolean;
  search?: string | null;
  sort?: 'honest' | 'trap_asc' | 'price_asc' | 'reviews';
  limit?: number;
};

function applyVenueFilters(venues: Restaurant[], q: VenueQueryFilters): Restaurant[] {
  const query = q.search?.trim().toLocaleLowerCase('ro') ?? '';
  const filtered = venues.filter((r) => {
    if (q.category) {
      const catNorm = q.category.trim().toLowerCase();
      const inCats = (r.categories ?? []).some((c) => c.toLowerCase() === catNorm);
      if (!inCats && r.cuisine.toLowerCase() !== catNorm) return false;
    }
    if (q.neighborhood) {
      const hoodNorm = q.neighborhood.trim().toLocaleLowerCase('ro');
      if (
        !r.neighborhood.toLocaleLowerCase('ro').includes(hoodNorm) &&
        !(r.shortNeighborhood ?? '').toLocaleLowerCase('ro').includes(hoodNorm)
      ) {
        return false;
      }
    }
    if (q.maxPriceLei && Number.isFinite(q.maxPriceLei) && r.avgMealPriceRon > q.maxPriceLei) {
      return false;
    }
    if (q.noTraps && r.touristTrapIndex >= POSSIBLE_TRAP) {
      return false;
    }
    if (q.openNow && !r.openNow) {
      return false;
    }
    if (query) {
      const haystack = `${r.name} ${r.cuisine} ${r.neighborhood} ${r.shortNeighborhood ?? ''} ${r.editorialHeadline}`.toLocaleLowerCase('ro');
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  if (q.sort === 'trap_asc') {
    sorted.sort((a, b) => a.touristTrapIndex - b.touristTrapIndex || b.foodQualityScore - a.foodQualityScore);
  } else if (q.sort === 'price_asc') {
    sorted.sort((a, b) => a.avgMealPriceRon - b.avgMealPriceRon || b.foodQualityScore - a.foodQualityScore);
  } else if (q.sort === 'reviews') {
    const countOf = (r: Restaurant) => (r.reviewCounts?.locals ?? 0) + (r.reviewCounts?.tourists ?? 0) + (r.reviewCounts?.influencers ?? 0);
    sorted.sort((a, b) => countOf(b) - countOf(a) || b.foodQualityScore - a.foodQualityScore);
  } else {
    sorted.sort((a, b) => b.foodQualityScore - a.foodQualityScore);
  }

  return q.limit && q.limit > 0 ? sorted.slice(0, q.limit) : sorted;
}

export async function loadVenuesCatalog(
  q: VenueQueryFilters,
  origin: string,
  now = new Date()
): Promise<{
  vertical: Vertical;
  citySlug: string;
  venues: Restaurant[];
  sponsored: Restaurant[];
  traps: { slug: string; name: string; neighborhood: string | null; touristTrapIndex: number; trapTier: Restaurant['trapTier']; reasons: string[] }[];
  themes: ThemeTop[];
  ads: AdBanner[];
  reviewCount: number;
  backendOnline: boolean;
}> {
  const db = getOptionalDb();
  if (db) {
    try {
      const city = await cityPage(db, { citySlug: DEFAULT_CITY_SLUG, vertical: q.vertical, limit: 100 }, now);
      const lb = await leaderboardPage(db, { citySlug: DEFAULT_CITY_SLUG, vertical: q.vertical });
      const monthly = monthlyBySlug(lb, city);
      const sponsoredSlugs = new Set(city.sponsored.map((s) => s.slug));
      const [c] = await db.select({ prices: cities.localAveragePrices }).from(cities).where(eq(cities.slug, DEFAULT_CITY_SLUG));
      const pages = await Promise.all(
        city.top.map((v) => venuePage(db, { citySlug: DEFAULT_CITY_SLUG, vertical: q.vertical, slug: v.slug, reviews: 'all', limit: 20 }, now))
      );
      const allVenues = pages.map((p) =>
        serializeRestaurant(
          toRestaurant(p, {
            now,
            categoryAvgPriceRon:
              q.vertical === 'drink'
                ? (c?.prices.drink.beer05l ?? null)
                : (c?.prices.food[p.venue.categories[0] ?? ''] ?? null),
            isSponsored: sponsoredSlugs.has(p.venue.slug),
            monthly: monthly.get(p.venue.slug),
            fallback: STATIC_BY_SLUG.get(p.venue.slug),
          }),
          origin
        )
      );
      const filtered = applyVenueFilters(allVenues, q);
      const sponsored = allVenues.filter((v) => v.isSponsored);
      return {
        vertical: q.vertical,
        citySlug: DEFAULT_CITY_SLUG,
        venues: filtered,
        sponsored,
        traps: city.traps.map((t) => ({
          slug: t.slug,
          name: t.name,
          neighborhood: t.neighborhood,
          touristTrapIndex: t.index ?? 0,
          trapTier: t.level === 'trap' ? 'tourist-trap' : t.level === 'possible' ? 'mixed-fair' : 'local-staple',
          reasons: t.reasons.map((r) => r.text),
        })),
        themes: toThemeTops(city.themes),
        ads: toAdBanners(city.ads).map((a) => serializeAdBanner(a, origin)),
        reviewCount: city.reviewCount,
        backendOnline: true,
      };
    } catch (e) {
      console.error('[api/v1] Eroare la încărcarea catalogului din DB, folosesc fallback static:', e);
    }
  }

  const staticSource = (q.vertical === 'drink' ? DRINK_VENUES : INITIAL_RESTAURANTS).map((r) =>
    serializeRestaurant(r, origin)
  );
  const filtered = applyVenueFilters(staticSource, q);
  const traps = staticSource
    .filter((r) => r.touristTrapIndex >= POSSIBLE_TRAP)
    .sort((a, b) => b.touristTrapIndex - a.touristTrapIndex)
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      neighborhood: r.neighborhood,
      touristTrapIndex: r.touristTrapIndex,
      trapTier: r.trapTier,
      reasons: r.trapReasons ?? [],
    }));
  const reviewCount = staticSource.reduce(
    (sum, r) => sum + (r.reviewCounts?.locals ?? 0) + (r.reviewCounts?.tourists ?? 0) + (r.reviewCounts?.influencers ?? 0),
    0
  );

  return {
    vertical: q.vertical,
    citySlug: DEFAULT_CITY_SLUG,
    venues: filtered,
    sponsored: staticSource.filter((r) => r.isSponsored),
    traps,
    themes: [],
    ads: [],
    reviewCount,
    backendOnline: false,
  };
}

export async function loadVenueDetailBySlug(
  opts: {
    vertical: Vertical;
    slug: string;
    reviews?: ReviewFilter;
    trackView?: boolean;
    userId?: string | null;
  },
  origin: string,
  now = new Date()
): Promise<{
  venue: Restaurant | null;
  myQuickVotes: Partial<Record<QuickKind, number>>;
  myVisitProofs: { reviewId: string; status: string; decision: string | null; createdAt: string }[];
  backendOnline: boolean;
}> {
  const db = getOptionalDb();
  if (db) {
    try {
      const p = await venuePage(
        db,
        {
          citySlug: DEFAULT_CITY_SLUG,
          vertical: opts.vertical,
          slug: opts.slug,
          reviews: opts.reviews ?? 'all',
          limit: 30,
          trackView: opts.trackView,
        },
        now
      );
      const [c] = await db.select({ prices: cities.localAveragePrices }).from(cities).where(eq(cities.slug, DEFAULT_CITY_SLUG));
      const [userQuick, proofs] = opts.userId
        ? await Promise.all([
            myQuickVotes(db, opts.userId).catch(() => ({})),
            visits.myVisitProofs(db, opts.userId, p.venue.id).catch(() => []),
          ])
        : [{}, []];

      const venue = serializeRestaurant(
        toRestaurant(p, {
          now,
          categoryAvgPriceRon:
            opts.vertical === 'drink'
              ? (c?.prices.drink.beer05l ?? null)
              : (c?.prices.food[p.venue.categories[0] ?? ''] ?? null),
          isSponsored: false,
          fallback: STATIC_BY_SLUG.get(p.venue.slug),
        }),
        origin
      );
      return {
        venue,
        myQuickVotes: (userQuick as Record<string, Partial<Record<QuickKind, number>>>)[p.venue.id] ?? {},
        myVisitProofs: proofs.map((pr) => ({
          reviewId: pr.reviewId,
          status: pr.status,
          decision: pr.decision ?? null,
          createdAt: pr.createdAt.toISOString(),
        })),
        backendOnline: true,
      };
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'not_found') {
        return { venue: null, myQuickVotes: {}, myVisitProofs: [], backendOnline: true };
      }
      console.error('[api/v1] Eroare la loadVenueDetailBySlug, încerc fallback static:', e);
    }
  }

  const staticPool = opts.vertical === 'drink' ? DRINK_VENUES : INITIAL_RESTAURANTS;
  const found = staticPool.find((r) => r.slug === opts.slug || r.id === opts.slug) ?? null;
  return {
    venue: found ? serializeRestaurant(found, origin) : null,
    myQuickVotes: {},
    myVisitProofs: [],
    backendOnline: false,
  };
}

export async function loadLeaderboardAndMonthlyVotes(opts: {
  vertical: Vertical;
  month?: string | null;
  userId?: string | null;
}) {
  const db = getOptionalDb();
  let publicMonths = ['2026-11', '2026-10'];
  let activePublicMonth = getCurrentActiveVoteMonth(publicMonths);
  let targetPublicMonth = opts.month && publicMonths.includes(opts.month) ? opts.month : activePublicMonth;
  let categoryTops = getPublicVoteCategoryTops(opts.vertical, targetPublicMonth);

  let lbMonth: string | null = opts.month ?? null;
  let lbMonths: string[] = [];
  let awards: MonthlyAwards = { month: null, months: [], revelation: null, employee: null, local: null, influencer: null };
  let entries: { rank: number; venueId: string; name: string; score: number; movement: number | null }[] = [];
  let countsByCategory: Record<string, Record<string, number>> = {};
  let myVotesByCategory: Record<string, string> = {};
  let backendOnline = false;

  if (db) {
    try {
      const lb = await leaderboardPage(db, {
        citySlug: DEFAULT_CITY_SLUG,
        vertical: opts.vertical,
        month: opts.month ?? undefined,
      });
      lbMonth = lb.month ?? null;
      lbMonths = lb.months ?? [];
      awards = toMonthlyAwards(lb);
      entries = lb.snapshot?.entries ?? [];
      backendOnline = true;

      if (lbMonths.length) {
        publicMonths = lbMonths;
        activePublicMonth = getCurrentActiveVoteMonth(publicMonths);
        targetPublicMonth = opts.month && publicMonths.includes(opts.month) ? opts.month : activePublicMonth;
        categoryTops = getPublicVoteCategoryTops(opts.vertical, targetPublicMonth);
      }

      if (targetPublicMonth) {
        await ensureExtendedSchema(db);
        const grouped = await db
          .select({
            categoryId: monthlyCategoryVotes.categoryId,
            venueSlug: monthlyCategoryVotes.venueSlug,
            count: sql<number>`count(*)::int`,
          })
          .from(monthlyCategoryVotes)
          .where(and(eq(monthlyCategoryVotes.month, targetPublicMonth), eq(monthlyCategoryVotes.vertical, opts.vertical)))
          .groupBy(monthlyCategoryVotes.categoryId, monthlyCategoryVotes.venueSlug);
        for (const row of grouped) {
          countsByCategory[row.categoryId] ??= {};
          countsByCategory[row.categoryId]![row.venueSlug] = row.count;
        }
        if (opts.userId) {
          const mine = await db
            .select({
              categoryId: monthlyCategoryVotes.categoryId,
              venueSlug: monthlyCategoryVotes.venueSlug,
            })
            .from(monthlyCategoryVotes)
            .where(
              and(
                eq(monthlyCategoryVotes.month, targetPublicMonth),
                eq(monthlyCategoryVotes.vertical, opts.vertical),
                eq(monthlyCategoryVotes.userId, opts.userId)
              )
            );
          for (const row of mine) {
            myVotesByCategory[row.categoryId] = row.venueSlug;
          }
        }
      }
    } catch (e) {
      console.error('[api/v1] Eroare la încărcarea leaderboard-ului din DB:', e);
    }
  }

  return {
    vertical: opts.vertical,
    month: lbMonth,
    months: lbMonths,
    awards,
    entries,
    publicVote: {
      activeMonth: activePublicMonth,
      selectedMonth: targetPublicMonth,
      months: publicMonths,
      categoryTops,
      countsByCategory,
      myVotesByCategory,
    },
    backendOnline,
  };
}

export async function loadWeekendEventsList(now = new Date()): Promise<{ events: WeekendEvent[]; backendOnline: boolean }> {
  const db = getOptionalDb();
  if (db) {
    try {
      const rows = await weekendEvents(db, DEFAULT_CITY_SLUG, now);
      return { events: rows.map(toWeekendEvent), backendOnline: true };
    } catch (e) {
      console.error('[api/v1] Eroare la weekendEvents:', e);
    }
  }
  return { events: WEEKEND_EVENTS, backendOnline: false };
}

export async function loadTopReviewersList(now = new Date()): Promise<{ reviewers: TopReviewer[]; backendOnline: boolean }> {
  const db = getOptionalDb();
  if (db) {
    try {
      const rows = await topReviewers(db, DEFAULT_CITY_SLUG, {}, now);
      return { reviewers: rows.map(toTopReviewer), backendOnline: true };
    } catch (e) {
      console.error('[api/v1] Eroare la topReviewers:', e);
    }
  }
  return { reviewers: TOP_LOCAL_REVIEWERS, backendOnline: false };
}

export async function loadLoyaltyProgramsForUser(userId: string | null): Promise<{
  programs: LoyaltyProgram[];
  loggedIn: boolean;
  backendOnline: boolean;
}> {
  const db = getOptionalDb();
  if (!db) {
    return { programs: [], loggedIn: false, backendOnline: false };
  }
  const [venuePrograms, cards] = await Promise.all([
    loyalty.cityPrograms(db, DEFAULT_CITY_SLUG),
    userId ? loyalty.myCards(db, userId) : Promise.resolve([]),
  ]);
  const byProgram = new Map(cards.map((c) => [c.programId, c]));
  const programs: LoyaltyProgram[] = [
    ...cards
      .filter((c) => c.personal)
      .map((c) => ({
        id: c.programId,
        venueName: c.venueName,
        neighborhood: 'Card personal',
        rewardTitle: c.rewardTitle,
        stampsRequired: c.stampsRequired,
        iconId: asLoyaltyIcon(c.icon),
        accentColor: c.accentColor ?? '#3A2418',
        stampsCollected: c.stamps,
        redeemedCount: c.redeemed,
        qrSeed: `TOPFOOD:CARD:${c.cardId}`,
        isCustomVendor: true,
      })),
    ...venuePrograms.map((p) => {
      const c = byProgram.get(p.id);
      return {
        id: p.id,
        venueName: p.venueName,
        neighborhood: p.neighborhood ?? 'Timișoara',
        rewardTitle: p.rewardTitle,
        stampsRequired: p.stampsRequired,
        iconId: asLoyaltyIcon(p.icon),
        accentColor: p.accentColor ?? (p.vertical === 'drink' ? '#17382C' : '#B3261E'),
        stampsCollected: c?.stamps ?? 0,
        redeemedCount: c?.redeemed ?? 0,
        qrSeed: `TOPFOOD:PROGRAM:${p.id}`,
      };
    }),
  ];
  return { programs, loggedIn: Boolean(userId), backendOnline: true };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveVenueId(db: Db, slugOrId: string, vertical?: Vertical): Promise<string> {
  if (UUID_RE.test(slugOrId)) return slugOrId;
  const [row] = await db
    .select({ id: venues.id })
    .from(venues)
    .where(
      and(
        eq(venues.citySlug, DEFAULT_CITY_SLUG),
        eq(venues.slug, slugOrId),
        ...(vertical ? [eq(venues.vertical, vertical)] : [])
      )
    );
  if (!row) throw notFound('Localul');
  return row.id;
}

export async function getUserLocalCheckinDays(db: Db, userId: string): Promise<number> {
  const since = new Date(Date.now() - accounts.LOCAL_RULES.windowDays * 86_400_000).toISOString().slice(0, 10);
  const [r] = await db
    .select({ days: countDistinct(checkins.day) })
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.citySlug, DEFAULT_CITY_SLUG), gte(checkins.day, since)));
  return r?.days ?? 0;
}
