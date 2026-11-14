import type { MetadataRoute } from 'next';

const SITE = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/owner', '/admin'] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
