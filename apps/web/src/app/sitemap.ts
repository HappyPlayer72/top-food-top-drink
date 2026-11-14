import type { MetadataRoute } from 'next';
import { cityPage } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { DRINK_VENUES, INITIAL_RESTAURANTS } from '@/data/restaurants';

export const dynamic = 'force-dynamic';

const SITE = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Paginile orașului + câte o pagină pentru fiecare local activ (din DB; fără DB, din datele statice). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/topfood/timisoara`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/topdrink/timisoara`, lastModified: now, changeFrequency: 'daily', priority: 1 },
  ];
  let venues: { vertical: 'food' | 'drink'; slug: string }[] = [];
  if (process.env.DATABASE_URL) {
    try {
      for (const vertical of ['food', 'drink'] as const) {
        const c = await cityPage(getDb(), { citySlug: 'timisoara', vertical, limit: 1000 });
        venues.push(...c.top.map((v) => ({ vertical, slug: v.slug })));
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
  return [
    ...pages,
    ...venues.map((v) => ({ url: `${SITE}/top${v.vertical}/timisoara/${v.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
