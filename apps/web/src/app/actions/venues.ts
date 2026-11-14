'use server';
/**
 * „Nu găsești localul?”: caută și pe internet (Google Places, doar cu cheie) și adaugă un local.
 * Din Google intră direct; adăugat de mână rămâne „în așteptare” până îl aprobă un admin în /admin.
 */
import { revalidatePath } from 'next/cache';
import { addFromGoogle, addManually, searchPlaces } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import { TIMISOARA_NEIGHBORHOOD_ZONES } from '@/data/timisoaraGeo';
import type { Result } from './user';

const CITY = 'timisoara';
const CENTER = { lat: 45.7558, lng: 21.2286 };
const hasDb = () => !!process.env.DATABASE_URL;
const OFFLINE = { ok: false as const, offline: true, error: 'Baza de date nu e disponibilă.' };

export type InternetResult = { placeId: string; name: string; address: string | null; googleRating: number | null };

export async function searchVenues(
  vertical: 'food' | 'drink',
  query: string,
): Promise<Result<{ internetSearched: boolean; fromInternet: InternetResult[] }>> {
  if (!hasDb()) return OFFLINE;
  try {
    const r = await searchPlaces(getDb(), { citySlug: CITY, vertical, query, center: CENTER });
    return {
      ok: true,
      internetSearched: r.internetSearched,
      fromInternet: r.fromInternet.map((p) => ({ placeId: p.placeId, name: p.name, address: p.address, googleRating: p.googleRating })),
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function addVenueFromInternet(vertical: 'food' | 'drink', placeId: string): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să adaugi un local.' };
  try {
    const r = await addFromGoogle(getDb(), userId, { citySlug: CITY, vertical, placeId });
    revalidatePath('/', 'layout');
    return {
      ok: true,
      message:
        r.outcome === 'created'
          ? 'Localul a fost adăugat. Apare în top după primele review-uri.'
          : 'Localul era deja la noi, l-am legat de rezultatul de pe Google.',
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Coordonatele sunt centrul cartierului ales (aproximativ); adminul verifică localul înainte să apară. */
export async function addVenueManually(input: {
  vertical: 'food' | 'drink';
  name: string;
  address: string;
  neighborhood: string;
}): Promise<Result<{ message: string }>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Intră în cont ca să adaugi un local.' };
  const zone = TIMISOARA_NEIGHBORHOOD_ZONES.find((z) => z.name === input.neighborhood);
  const [lng, lat] = zone?.center ?? [CENTER.lng, CENTER.lat];
  try {
    const r = await addManually(getDb(), userId, {
      citySlug: CITY,
      vertical: input.vertical,
      name: input.name,
      address: `${input.address.trim()}, ${input.neighborhood}`,
      lat,
      lng,
    });
    return {
      ok: true,
      message:
        r.outcome === 'already-exists'
          ? 'Localul există deja la noi. Caută-l după nume.'
          : 'Mulțumim! Localul apare după ce îl verificăm (de obicei în aceeași zi).',
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
