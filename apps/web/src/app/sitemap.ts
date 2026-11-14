import type { MetadataRoute } from 'next';
import { cityPage, leaderboardPage, topReviewers } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { CATEGORY_LABELS } from '@/lib/backend/venueRoute';
import { DRINK_VENUES, INITIAL_RESTAURANTS, TOP_LOCAL_REVIEWERS } from '@/data/restaurants';

export const dynamic = 'force-dynamic';

const SITE = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Paginile orașului, categoriilor, clasamentelor lunare, weekend, localurilor și profilurilor publice. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/topfood/timisoara`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/topdrink/timisoara`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/harta`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/topfood/timisoara/top-luna`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/topdrink/timisoara/top-luna`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/topdrink/timisoara/weekend`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...Object.keys(CATEGORY_LABELS.food).map((cat) => ({
      url: `${SITE}/topfood/timisoara/categorie/${cat}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...Object.keys(CATEGORY_LABELS.drink).map((cat) => ({
      url: `${SITE}/topdrink/timisoara/categorie/${cat}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];

  let venues: { vertical: 'food' | 'drink'; slug: string }[] = [];
  const monthEntries: MetadataRoute.Sitemap = [];
  const userEntries: MetadataRoute.Sitemap = [];

  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      for (const vertical of ['food', 'drink'] as const) {
        const [c, lb] = await Promise.all([
          cityPage(db, { citySlug: 'timisoara', vertical, limit: 1000 }),
          leaderboardPage(db, { citySlug: 'timisoara', vertical }),
        ]);
        venues.push(...c.top.map((v) => ({ vertical, slug: v.slug })));
        for (const m of lb.months) {
          monthEntries.push({
            url: `${SITE}/top${vertical}/timisoara/top-luna/${m}`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.6,
          });
        }
      }
      const reviewers = await topReviewers(db, 'timisoara', { limit: 50 });
      for (const r of reviewers) {
        userEntries.push({
          url: `${SITE}/u/${encodeURIComponent(r.username)}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.5,
        });
      }
    } catch {
      venues = [];
    }
  }
  if (!venues.length) {
    venues = [
      ...INITIAL_RESTAURANTS.map((r) => ({ vertical: 'food' as const, slug: r.slug })),
      ...DRINK_VENUES.map((r) => ({ vertical: 'drink' as const, slug: r.slug })),
    ];
  }
  if (!userEntries.length) {
    for (const r of TOP_LOCAL_REVIEWERS) {
      userEntries.push({
        url: `${SITE}/u/${encodeURIComponent(r.username ?? r.id)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }
  return [
    ...pages,
    ...monthEntries,
    ...venues.map((v) => ({ url: `${SITE}/top${v.vertical}/timisoara/${v.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...userEntries,
  ];
}
