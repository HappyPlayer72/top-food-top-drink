/** Cele 5 joburi programate (apps/worker/README.md). Fiecare poate rula și o singură dată din linia de comandă. */
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { cities, reviewSubmissions, reviews, socialSubmissions, venues, visitProofs, type Db } from "@tftd/db";
import { discoverVenues, google, linkKnownVenues, processSubmission, refreshCity } from "@tftd/ingestion";
import { resolveCandidates } from "@tftd/matching";
import { freezeMonth, lastMonth } from "@tftd/leaderboard";
import { analyzeVenueReviews } from "@tftd/review-analysis";
import { recalculateCity } from "@tftd/scoring";

const VERTICALS = ["food", "drink"] as const;

async function citySlugs(db: Db) {
  return (await db.select({ slug: cities.slug }).from(cities)).map((c) => c.slug);
}

/**
 * Joburile care cheamă Google Places (costă bani peste pragul gratuit) pornesc doar dacă:
 * - există GOOGLE_PLACES_API_KEY (colegii nu o au: datele sunt în seed/data/google-snapshot.json);
 * - baza e cea locală, sau IMPORT_TARGET=online pentru baza online;
 * - IMPORT_CONFIRM=da. Altfel jobul doar spune câte cereri ar face și se oprește.
 * Cu IMPORT_MAX_REQUESTS (implicit 300) rularea se oprește singură la plafon.
 */
async function googleGuard(job: string, estimate: number): Promise<boolean> {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    log(job, "sărit: lipsește GOOGLE_PLACES_API_KEY (datele Google sunt deja în seed/data/google-snapshot.json)");
    return false;
  }
  const host = new URL(process.env.DATABASE_URL ?? "postgres://localhost").hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host) && process.env.IMPORT_TARGET !== "online") {
    log(job, "oprit: DATABASE_URL nu e baza locală. Pune IMPORT_TARGET=online doar dacă vrei să imporți în baza online.");
    return false;
  }
  const max = Number(process.env.IMPORT_MAX_REQUESTS ?? 300);
  if (process.env.IMPORT_CONFIRM !== "da") {
    log(job, `simulare: ar face cam ${estimate} cereri Google (plafon ${max}). Nu am trimis nimic. Ca să ruleze: IMPORT_CONFIRM=da`);
    return false;
  }
  google.limitGoogleRequests(max);
  return true;
}

const unlinkedCount = async (db: Db) =>
  ((await db.execute(sql`select count(*)::int as n from venues v where not exists (select 1 from venue_sources s where s.venue_id = v.id and s.source = 'google')`)) as unknown as [{ n: number }])[0].n;
const toRefreshCount = async (db: Db, freshHours: number) =>
  ((await db.execute(sql`select count(*)::int as n from venue_sources s where s.source = 'google' and not exists (
      select 1 from reviews r where r.venue_id = s.venue_id and r.source = 'google' and r.created_at > now() - make_interval(hours => ${freshHours}))`)) as unknown as [{ n: number }])[0].n;

export const JOBS = {
  /** Săptămânal, per oraș: locale noi de pe Google Places. */
  async "descopera-locale"(db: Db) {
    // IMPORT_MAX_PAGES: câte pagini de 20 de rezultate per căutare (implicit 1 = import mic și ieftin)
    const pages = Number(process.env.IMPORT_MAX_PAGES ?? 1);
    const cityList = await citySlugs(db);
    const estimate = cityList.length * VERTICALS.length * 5 * pages + (await unlinkedCount(db));
    if (!(await googleGuard("descopera-locale", estimate))) return;
    for (const city of cityList) {
      for (const v of VERTICALS) log("descopera-locale", `${city}/${v}`, await discoverVenues(db, city, v, pages));
      log("descopera-locale", `${city}: localurile noastre fără Google`, await linkKnownVenues(db, city));
      log("descopera-locale", `${city}: coada de potriviri`, await resolveCandidates(db, city));
    }
    log("descopera-locale", `cereri Google trimise: ${google.googleRequestsUsed()}`);
  },

  /** Zilnic: ratinguri brute + review-uri noi, apoi analiză și scoruri. */
  async "actualizeaza-ratinguri"(db: Db) {
    // IMPORT_SKIP_FRESH_HOURS: sare localurile actualizate în ultimele N ore (implicit 24; 0 = toate)
    const skipFreshHours = Number(process.env.IMPORT_SKIP_FRESH_HOURS ?? 24);
    if (!(await googleGuard("actualizeaza-ratinguri", await toRefreshCount(db, skipFreshHours || 0)))) return;
    for (const city of await citySlugs(db)) log("actualizeaza-ratinguri", city, await refreshCity(db, city, { skipFreshHours: skipFreshHours || undefined }));
    log("actualizeaza-ratinguri", `cereri Google trimise: ${google.googleRequestsUsed()}`);
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
