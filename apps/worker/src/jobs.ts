/** Cele 5 joburi programate (apps/worker/README.md). Fiecare poate rula și o singură dată din linia de comandă. */
import { and, eq, isNull, lt } from "drizzle-orm";
import { cities, reviewSubmissions, reviews, socialSubmissions, venues, visitProofs, type Db } from "@tftd/db";
import { discoverVenues, linkKnownVenues, processSubmission, refreshCity } from "@tftd/ingestion";
import { resolveCandidates } from "@tftd/matching";
import { freezeMonth, lastMonth } from "@tftd/leaderboard";
import { analyzeVenueReviews } from "@tftd/review-analysis";
import { recalculateCity } from "@tftd/scoring";

const VERTICALS = ["food", "drink"] as const;

async function citySlugs(db: Db) {
  return (await db.select({ slug: cities.slug }).from(cities)).map((c) => c.slug);
}

export const JOBS = {
  /** Săptămânal, per oraș: locale noi de pe Google Places. */
  async "descopera-locale"(db: Db) {
    if (!process.env.GOOGLE_PLACES_API_KEY) return log("descopera-locale", "sărit: lipsește GOOGLE_PLACES_API_KEY");
    for (const city of await citySlugs(db)) {
      // IMPORT_MAX_PAGES: câte pagini de 20 de rezultate per căutare (implicit 3); 1 = import mic și ieftin
      const pages = Number(process.env.IMPORT_MAX_PAGES ?? 3);
      for (const v of VERTICALS) log("descopera-locale", `${city}/${v}`, await discoverVenues(db, city, v, pages));
      log("descopera-locale", `${city}: localurile noastre fără Google`, await linkKnownVenues(db, city));
      log("descopera-locale", `${city}: coada de potriviri`, await resolveCandidates(db, city));
    }
  },

  /** Zilnic: ratinguri brute + review-uri noi, apoi analiză și scoruri. */
  async "actualizeaza-ratinguri"(db: Db) {
    // IMPORT_SKIP_FRESH_HOURS: sare localurile actualizate de curând (import incremental, mai puține cereri)
    const skipFreshHours = Number(process.env.IMPORT_SKIP_FRESH_HOURS ?? 0) || undefined;
    for (const city of await citySlugs(db)) log("actualizeaza-ratinguri", city, await refreshCity(db, city, { skipFreshHours }));
    await JOBS["recalculeaza-scoruri"](db, { onlyNew: true });
  },

  /** La fiecare link trimis (coadă în DB, verificată la fiecare minut). */
  async "proceseaza-linkuri"(db: Db) {
    const pending = await db.select({ id: socialSubmissions.id }).from(socialSubmissions).where(eq(socialSubmissions.status, "pending")).limit(20);
    for (const p of pending) {
      try {
        await processSubmission(db, p.id);
      } catch (error) {
        log("proceseaza-linkuri", `${p.id} a eșuat: ${String(error)}`);
      }
    }
    if (pending.length) log("proceseaza-linkuri", `${pending.length} linkuri`);
  },

  /**
   * La fiecare review nou (onlyNew: analizează doar ce n-a fost analizat) și complet noaptea.
   * Recalculează doar orașele și verticalele atinse.
   */
  async "recalculeaza-scoruri"(db: Db, opts: { onlyNew?: boolean } = {}) {
    const targets = opts.onlyNew
      ? await db
          .selectDistinct({ venueId: venues.id, citySlug: venues.citySlug, vertical: venues.vertical })
          .from(reviews)
          .innerJoin(venues, eq(venues.id, reviews.venueId))
          .where(isNull(reviews.analyzedAt))
      : await db.select({ venueId: venues.id, citySlug: venues.citySlug, vertical: venues.vertical }).from(venues);
    if (!opts.onlyNew) {
      // GDPR: pozele bonurilor fără decizie după 30 de zile se șterg (rămâne doar hash-ul).
      const stale = await db
        .update(visitProofs)
        .set({ status: "expired", image: null, decidedAt: new Date() })
        .where(and(eq(visitProofs.status, "pending"), lt(visitProofs.createdAt, new Date(Date.now() - 30 * 86_400_000))))
        .returning({ id: visitProofs.id });
      if (stale.length) log("recalculeaza-scoruri", `${stale.length} bonuri expirate, poze șterse`);
      // GDPR: amprentele de trimitere (anti-bot) se păstrează 90 de zile
      const old = await db
        .delete(reviewSubmissions)
        .where(lt(reviewSubmissions.createdAt, new Date(Date.now() - 90 * 86_400_000)))
        .returning({ id: reviewSubmissions.reviewId });
      if (old.length) log("recalculeaza-scoruri", `${old.length} amprente anti-bot șterse`);
    }
    if (!targets.length) return;
    for (const t of targets) await analyzeVenueReviews(db, t.venueId, { onlyNew: opts.onlyNew });
    const pairs = new Set(targets.map((t) => `${t.citySlug}|${t.vertical}`));
    for (const pair of pairs) {
      const [city, vertical] = pair.split("|") as [string, "food" | "drink"];
      log("recalculeaza-scoruri", pair, await recalculateCity(db, city, vertical));
    }
  },

  /** Pe 1 ale lunii la 00:05: topul lunii trecute, înghețat. */
  async "leaderboard-lunar"(db: Db) {
    const month = lastMonth();
    for (const city of await citySlugs(db)) {
      for (const v of VERTICALS) log("leaderboard-lunar", `${city}/${v}/${month}`, `${(await freezeMonth(db, city, v, month)).length} clasamente`);
    }
  },
} satisfies Record<string, (db: Db) => Promise<void>>;

export type JobName = keyof typeof JOBS;

function log(job: string, ...parts: unknown[]) {
  console.log(new Date().toISOString(), `[${job}]`, ...parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))));
}
