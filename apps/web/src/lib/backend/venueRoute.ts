// Doar pentru server: datele pentru URL-urile publice SEO (localuri, categorii, clasament lunar).
import type { Metadata } from 'next';
import { venuePage } from '@tftd/api';
import { getDb } from '../server/db';
import { DRINK_VENUES, INITIAL_RESTAURANTS } from '../../data/restaurants';

const CITY = 'timisoara';
const CITY_NAME = 'Timișoara';
const fmt = (x: number | null | undefined) => (x == null ? null : x.toFixed(1).replace('.', ','));

export const CATEGORY_LABELS: Record<'food' | 'drink', Record<string, string>> = {
  food: {
    romanesc: 'Românesc',
    pizza: 'Pizza',
    bistro: 'Bistro',
    'street-food': 'Street food',
    patiserie: 'Patiserie',
    burger: 'Burger',
    asiatic: 'Asiatic',
    vegan: 'Vegan',
  },
  drink: {
    pub: 'Pub',
    club: 'Club',
    'cocktail-bar': 'Cocktail bar',
    terasa: 'Terasă',
    'cafenea-de-seara': 'Cafenea de seară',
    'muzica-live': 'Muzică live',
  },
};

type VenueInfo = { name: string; honest: number | null; locals: number | null; trap: number | null; headline: string | null; photo: string | null };

/** Localul din DB (sau din datele statice, fără DB); null = nu există. */
export async function findVenue(vertical: 'food' | 'drink', slug: string): Promise<VenueInfo | null> {
  if (process.env.DATABASE_URL) {
    try {
      const p = await venuePage(getDb(), { citySlug: CITY, vertical, slug, reviews: 'local', limit: 1 });
      if (p.venue.status !== 'active') return null;
      return {
        name: p.venue.name,
        honest: p.scores.honest,
        locals: p.scores.locals,
        trap: p.scores.touristTrapIndex,
        headline: p.venue.headline,
        photo: p.venue.photos[0] ?? null,
      };
    } catch {
      // nu există în DB → încercăm datele statice
    }
  }
  const r = (vertical === 'drink' ? DRINK_VENUES : INITIAL_RESTAURANTS).find((x) => x.slug === slug);
  return r
    ? { name: r.name, honest: null, locals: null, trap: null, headline: r.editorialHeadline, photo: r.photoUrl } // fără bază: fără scor inventat în titlu
    : null;
}

/** Titlul și descrierea pentru Google și pentru previzualizarea linkului (WhatsApp, Facebook). */
export async function venueMetadata(vertical: 'food' | 'drink', slug: string): Promise<Metadata> {
  const v = await findVenue(vertical, slug);
  const brand = vertical === 'drink' ? 'topdrink' : 'topfood';
  if (!v) return { title: `Local negăsit | ${brand}/${CITY}` };
  const parts = [
    v.honest != null ? `Scor onest ${fmt(v.honest)} din 10` : null,
    v.locals != null ? `localnicii îi dau ${fmt(v.locals)}` : null,
    (v.trap ?? 0) >= 60 ? 'atenție: posibilă capcană turistică' : null,
  ].filter(Boolean);
  const description = `${parts.join(', ')}. ${v.headline ?? `Ce zic localnicii din ${CITY_NAME} despre ${v.name}.`}`.trim();
  const title = `${v.name}${v.honest != null ? ` — Scor onest ${fmt(v.honest)}` : ''} | ${brand}/${CITY}`;
  return {
    title,
    description,
    alternates: { canonical: `/top${vertical}/${CITY}/${slug}` },
    openGraph: { title, description, type: 'website', locale: 'ro_RO' },
  };
}

export function categoryMetadata(vertical: 'food' | 'drink', category: string): Metadata {
  const brand = vertical === 'drink' ? 'topdrink' : 'topfood';
  const label = CATEGORY_LABELS[vertical][category] ?? category.replace(/-/g, ' ');
  const noun = vertical === 'drink' ? 'Baruri și cluburi' : 'Restaurante';
  const title = `${label} în ${CITY_NAME} — ${noun} pe gustate | ${brand}/${CITY}`;
  const description = `Cele mai bine cotate localuri din categoria ${label} în ${CITY_NAME}, după Scorul Onest și votul localnicilor.`;
  return {
    title,
    description,
    alternates: { canonical: `/top${vertical}/${CITY}/categorie/${category}` },
    openGraph: { title, description, type: 'website', locale: 'ro_RO' },
  };
}

export function monthlyMetadata(vertical: 'food' | 'drink', month?: string): Metadata {
  const brand = vertical === 'drink' ? 'topdrink' : 'topfood';
  const suffix = month ? ` · ${month}` : '';
  const title = `Topul lunii${suffix} | ${brand}/${CITY}`;
  const description = `Clasamentul lunar onest din ${CITY_NAME}${suffix}: podiumul localurilor, Revelația lunii, Localnicul, Influencerul și Angajatul lunii.`;
  const canonical = month ? `/top${vertical}/${CITY}/top-luna/${month}` : `/top${vertical}/${CITY}/top-luna`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', locale: 'ro_RO' },
  };
}
