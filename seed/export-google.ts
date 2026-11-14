/**
 * Salvează datele aduse din Google Places în seed/data/google-snapshot.json, ca seed-ul să le poată
 * reîncărca fără niciun apel Google (cheia nu trebuie dată colegilor).
 *
 *   npx tsx --env-file-if-exists=.env seed/export-google.ts
 *
 * Datele sunt pentru demo, într-un repo privat: termenii Google limitează păstrarea review-urilor,
 * iar review-urile conțin numele autorilor. Fișierul se șterge după hackathon.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { createDb, reviews, venueSources, venues } from "@tftd/db";

export type SnapshotVenue = {
  slug: string;
  vertical: "food" | "drink";
  name: string;
  categories: string[];
  lat: number;
  lng: number;
  address: string | null;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  priceLevel: number | null;
  openingHours: unknown;
  google: { placeId: string; rating: number | null; reviewCount: number | null; url: string | null } | null;
  reviews: {
    externalId: string;
    author: { name: string; profileUrl?: string } | null;
    rating: number;
    originalRating: number | null;
    originalScale: number | null;
    text: string | null;
    language: string | null;
    postedAt: string;
  }[];
};

export type GoogleSnapshot = { exportedAt: string; citySlug: string; note: string; venues: SnapshotVenue[] };

const CITY = "timisoara";
const db = createDb();

const rows = await db.select().from(venues).where(and(eq(venues.citySlug, CITY), eq(venues.status, "active")));
const ids = rows.map((v) => v.id);
const sources = ids.length ? await db.select().from(venueSources).where(and(inArray(venueSources.venueId, ids), eq(venueSources.source, "google"))) : [];
const googleReviews = ids.length ? await db.select().from(reviews).where(and(inArray(reviews.venueId, ids), eq(reviews.source, "google"))) : [];

const snapshot: GoogleSnapshot = {
  exportedAt: new Date().toISOString(),
  citySlug: CITY,
  note: "Date Google Places pentru demo (repo privat). Se încarcă cu `npm run seed`, fără apeluri Google. De șters după hackathon.",
  venues: rows
    .map((v) => {
      const g = sources.find((s) => s.venueId === v.id);
      return {
        slug: v.slug,
        vertical: v.vertical,
        name: v.name,
        categories: v.categories,
        lat: v.location.y,
        lng: v.location.x,
        address: v.address,
        neighborhood: v.neighborhood,
        phone: v.phone,
        website: v.website,
        priceLevel: v.priceLevel,
        openingHours: v.openingHours,
        google: g ? { placeId: g.externalId, rating: g.rawRating, reviewCount: g.rawReviewCount, url: g.url } : null,
        reviews: googleReviews
          .filter((r) => r.venueId === v.id && r.externalId)
          .map((r) => ({
            externalId: r.externalId!,
            author: (r.externalAuthor as SnapshotVenue["reviews"][number]["author"]) ?? null,
            rating: r.rating,
            originalRating: r.originalRating,
            originalScale: r.originalScale,
            text: r.text,
            language: r.language,
            postedAt: r.postedAt.toISOString(),
          }))
          .sort((a, b) => a.externalId.localeCompare(b.externalId)),
      };
    })
    .sort((a, b) => a.vertical.localeCompare(b.vertical) || a.slug.localeCompare(b.slug)),
};

const dir = join(import.meta.dirname, "data");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "google-snapshot.json"), JSON.stringify(snapshot, null, 1) + "\n");
console.log(`Salvat: ${snapshot.venues.length} locale, ${snapshot.venues.filter((v) => v.google).length} legate de Google, ${googleReviews.length} review-uri → seed/data/google-snapshot.json`);
await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
