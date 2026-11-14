/**
 * Căutare „și pe internet” + localuri adăugate de useri.
 *
 * 1. searchPlaces: întâi în baza noastră; dacă avem cheie Google, și pe Google Places, arătând doar
 *    localurile care nu sunt deja la noi.
 * 2. addFromGoogle: userul alege un rezultat de pe Google → localul intră imediat (e verificat de Google).
 * 3. addManually: localul nu e nici pe Google → intră ca `pending` și ajunge în coada de admin.
 * Owner-ul își poate revendica apoi localul ca pe oricare altul (accounts.startClaim).
 */
import { and, eq, inArray } from "drizzle-orm";
import { invalid, reports, venueSources, venues, type Db } from "@tftd/db";
import { findMatch, linkExternalPlace, normalizeName, slugify, uniqueSlug } from "@tftd/matching";
import * as google from "./google.ts";
import { recordSearchResults, reserveGoogleAdd, reserveGoogleSearch } from "./google-limits.ts";

type Vertical = "food" | "drink";

/**
 * Căutarea pe Google se face doar pentru un user logat și în limitele din google-limits.ts.
 * `internetBlocked` = mesajul pentru user când a atins limita (căutarea la noi merge oricum).
 */
export async function searchPlaces(db: Db, q: { citySlug: string; vertical: Vertical; query: string; center?: { lat: number; lng: number }; userId?: string | null }) {
  const needle = normalizeName(q.query);
  if (needle.length < 2) throw invalid("Scrie cel puțin 2 litere.");

  const all = await db
    .select({ id: venues.id, name: venues.name, slug: venues.slug, neighborhood: venues.neighborhood, honestScore: venues.honestScore, status: venues.status })
    .from(venues)
    .where(and(eq(venues.citySlug, q.citySlug), eq(venues.vertical, q.vertical)));
  const onPlatform = all.filter((v) => v.status === "active" && normalizeName(v.name).includes(needle)).slice(0, 10);

  const none = { onPlatform, fromInternet: [] as { placeId: string; name: string; address: string | null; googleRating: number | null; googleReviews: number | null }[], internetSearched: false, internetBlocked: null as string | null, remaining: null as number | null };
  if (!process.env.GOOGLE_PLACES_API_KEY || !q.center) return none;
  if (!q.userId) return { ...none, internetBlocked: "Intră în cont ca să cauți și pe internet." };
  const slot = await reserveGoogleSearch(db, q.userId);
  if (!slot.ok) return { ...none, internetBlocked: slot.message };

  const { places } = await google.searchText(`${q.query} ${q.vertical === "food" ? "restaurant" : "bar"}`, q.center, 15000);
  const ids = places.map((p) => p.id);
  const known = ids.length
    ? new Set(
        (await db.select({ id: venueSources.externalId }).from(venueSources).where(and(eq(venueSources.source, "google"), inArray(venueSources.externalId, ids)))).map(
          (r) => r.id,
        ),
      )
    : new Set<string>();
  const fromInternet = places
    .filter((p) => !known.has(p.id) && p.location)
    .slice(0, 10)
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? null,
      googleRating: p.rating ?? null,
      googleReviews: p.userRatingCount ?? null,
    }));
  await recordSearchResults(db, slot.callId, fromInternet.map((p) => p.placeId));
  return { onPlatform, fromInternet, internetSearched: true, internetBlocked: null, remaining: slot.remaining };
}

/** Userul adaugă un local găsit pe Google: intră direct în listă (scorul vine după primele review-uri). */
export async function addFromGoogle(db: Db, userId: string, input: { citySlug: string; vertical: Vertical; placeId: string }) {
  const slot = await reserveGoogleAdd(db, userId, input.placeId);
  if (!slot.ok) throw invalid(slot.message);
  const place = await google.getPlace(input.placeId);
  if (!place.location) throw invalid("Locul nu are coordonate pe Google.");
  const result = await linkExternalPlace(db, google.toExternalPlace(place, input.citySlug, input.vertical));
  if (result.outcome === "created") await db.update(venues).set({ addedBy: userId }).where(eq(venues.id, result.venueId));
  return result;
}

/** Local care nu e nici pe Google: intră ca „în așteptare” până îl aprobă un admin. */
export async function addManually(
  db: Db,
  userId: string,
  input: { citySlug: string; vertical: Vertical; name: string; address: string; lat: number; lng: number; categories?: string[]; phone?: string; website?: string },
) {
  if (input.name.trim().length < 2) throw invalid("Numele localului e prea scurt.");
  if (input.address.trim().length < 5) throw invalid("Adaugă adresa.");

  // Poate există deja (cu nume ușor diferit)
  const known = await db
    .select({ id: venues.id, name: venues.name, slug: venues.slug, location: venues.location, phone: venues.phone, website: venues.website, status: venues.status })
    .from(venues)
    .where(and(eq(venues.citySlug, input.citySlug), eq(venues.vertical, input.vertical)));
  const d = findMatch(input, known.map((k) => ({ name: k.name, lat: k.location.y, lng: k.location.x, phone: k.phone, website: k.website })));
  if (d.status === "match") {
    const k = known[d.index]!;
    return { venueId: k.id, slug: k.slug, outcome: "already-exists" as const };
  }

  const [v] = await db
    .insert(venues)
    .values({
      citySlug: input.citySlug,
      vertical: input.vertical,
      name: input.name.trim(),
      slug: await uniqueSlug(db, input.citySlug, input.vertical, input.name),
      categories: input.categories ?? [],
      location: { x: input.lng, y: input.lat },
      address: input.address.trim(),
      phone: input.phone ?? null,
      website: input.website ?? null,
      status: "pending",
      addedBy: userId,
    })
    .returning({ id: venues.id, slug: venues.slug });
  await db.insert(reports).values({
    targetType: "venue",
    targetId: v!.id,
    reportedBy: userId,
    reason: `Local nou adăugat de un user: ${input.name.trim()}, ${input.address.trim()}${d.status === "uncertain" ? ` (seamănă cu „${known[d.index]!.name}”)` : ""}`,
  });
  return { venueId: v!.id, slug: v!.slug ?? slugify(input.name), outcome: "pending-review" as const };
}
