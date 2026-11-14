/**
 * DATE DEMO pentru preferințe / facilități / topuri tematice / voturi rapide.
 * Inventate pentru demonstrație (prezentare, teste), nu vin de la clienți reali.
 *
 * Se adaugă PESTE datele existente, fără să șteargă nimic:
 *   npm run seed:demo
 * Rulat de mai multe ori nu dublează nimic și nu suprascrie răspunsuri, declarații sau voturi existente.
 * Seed-ul complet (seed/load.ts) folosește aceeași funcție.
 */
import { pathToFileURL } from "node:url";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { createDb, reviewAnswers, reviews, users, venueFacilityDeclarations, venueManagers, venueQuickVotes, venues, type Db } from "@tftd/db";

/** Răspunsuri atașate review-urilor native existente: [Da, Nu, Nu am observat]. */
const DEMO_ANSWERS: Record<string, Record<string, [number, number, number?]>> = {
  "ciorba-lui-sandu": { intrare_fara_trepte: [7, 1, 2], toaleta_accesibila: [2, 4], spatiu_intre_mese: [5, 1] },
  "cafe-domului": { wifi: [9, 1], prize: [6, 1], liniste: [6, 2], intrare_fara_trepte: [5, 0] },
  "verde-pe-farfurie": { intrare_fara_trepte: [6, 0], toaleta_accesibila: [5, 1], spatiu_intre_mese: [4, 1], wifi: [3, 0] },
  "bistro-bega": { intrare_fara_trepte: [3, 0] }, // sub prag: rămâne „Declarat de local” (și e sponsorizat — nu urcă)
  "pizzeria-din-fabric": { wifi: [1, 5, 1] }, // contrazice declarația owner-ului
  "cafeneaua-de-noapte": { wifi: [6, 1], prize: [5, 2], intrare_fara_trepte: [2, 3] },
  "terasa-de-pe-bega": { intrare_fara_trepte: [6, 0], spatiu_intre_mese: [5, 0], atmosfera: [5, 3], siguranta: [6, 1] },
  // Ieșiri: experiența personală raportată de clienți; owner-ii nu o pot declara.
  "pivnita-cu-bolta": { intrare_fara_trepte: [0, 6], toaleta_accesibila: [0, 5], atmosfera: [9, 1], siguranta: [8, 1], revin_cu_prietenii: [7, 2] },
  "depoul-de-tramvaie": { atmosfera: [6, 2], siguranta: [3, 4, 1], revin_cu_prietenii: [5, 2] },
  "studio-19": { siguranta: [2, 1] }, // sub prag: „Nespecificat”
};

const DEMO_DECLARATIONS: Record<string, Record<string, "yes" | "no">> = {
  "ciorba-lui-sandu": { intrare_fara_trepte: "yes", toaleta_accesibila: "yes", wifi: "no" },
  "bistro-bega": { intrare_fara_trepte: "yes", toaleta_accesibila: "yes", wifi: "yes", prize: "yes" },
  "placintaria-elisabetin": { wifi: "yes" },
  "pizzeria-din-fabric": { wifi: "yes" },
  "jazz-in-pivnita": { intrare_fara_trepte: "yes" },
};

/** Voturi rapide: siguranță 1–5, zgomot 1 liniștit … 4 zgomotos; câte un vot de la useri diferiți. */
const DEMO_QUICK: Record<string, { safety?: number[]; noise?: number[] }> = {
  "pivnita-cu-bolta": { safety: [5, 4, 5, 4, 5, 4], noise: [3, 3, 4, 3, 2, 3] },
  "depoul-de-tramvaie": { safety: [2, 3, 2, 1, 2], noise: [4, 4, 3, 4, 4] }, // avertizări din voturi reale
  "cafeneaua-de-noapte": { noise: [2, 1, 2, 2, 3] },
  "cafe-domului": { noise: [1, 1, 2, 1, 1, 2] },
  "pizzeria-din-fabric": { noise: [3, 4, 3, 3, 4] }, // ascuns de „Doar liniștite” în topul Lucru
};

/** Adaugă datele demo; localurile care lipsesc din DB sunt sărite. Întoarce câte rânduri noi au intrat. */
export async function seedFeatureDemo(db: Db) {
  const slugs = [...new Set([...Object.keys(DEMO_ANSWERS), ...Object.keys(DEMO_DECLARATIONS), ...Object.keys(DEMO_QUICK)])];
  const found = await db.select({ id: venues.id, slug: venues.slug }).from(venues).where(inArray(venues.slug, slugs));
  const venueId = new Map(found.map((v) => [v.slug, v.id]));

  let answers = 0;
  for (const [slug, questions] of Object.entries(DEMO_ANSWERS)) {
    const id = venueId.get(slug);
    if (!id) continue;
    const native = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(sql`${reviews.venueId} = ${id} and ${reviews.authorId} is not null`)
      .orderBy(desc(reviews.postedAt), asc(reviews.id));
    const rows = Object.entries(questions).flatMap(([questionKey, [yes, no, notObserved = 0]]) =>
      [...Array(yes).fill("yes"), ...Array(no).fill("no"), ...Array(notObserved).fill("not_observed")]
        .slice(0, native.length)
        .map((answer, i) => ({ reviewId: native[i]!.id, questionKey, answer: answer as "yes" | "no" | "not_observed" })),
    );
    if (rows.length) answers += (await db.insert(reviewAnswers).values(rows).onConflictDoNothing().returning()).length;
  }

  const declRows = await Promise.all(
    Object.entries(DEMO_DECLARATIONS)
      .filter(([slug]) => venueId.has(slug))
      .flatMap(([slug, decl]) =>
        Object.entries(decl).map(async ([questionKey, value]) => {
          const id = venueId.get(slug)!;
          // Autorul = owner-ul localului, dacă există (în seed doar Sandu are owner).
          const [m] = await db.select({ userId: venueManagers.userId }).from(venueManagers).where(eq(venueManagers.venueId, id)).limit(1);
          return { venueId: id, questionKey, value, updatedBy: m?.userId ?? null };
        }),
      ),
  );
  const declarations = declRows.length ? (await db.insert(venueFacilityDeclarations).values(declRows).onConflictDoNothing().returning()).length : 0;

  const voters = (await db.select({ id: users.id }).from(users).orderBy(asc(users.username))).map((u) => u.id);
  const quickRows = Object.entries(DEMO_QUICK)
    .filter(([slug]) => venueId.has(slug))
    .flatMap(([slug, kinds]) =>
      (["safety", "noise"] as const).flatMap((kind) =>
        (kinds[kind] ?? []).slice(0, voters.length).map((value, i) => ({ venueId: venueId.get(slug)!, userId: voters[i]!, kind, value })),
      ),
    );
  const quickVotes = quickRows.length ? (await db.insert(venueQuickVotes).values(quickRows).onConflictDoNothing().returning()).length : 0;

  return { answers, declarations, quickVotes };
}

// Rulat direct (npm run seed:demo): doar adaugă, nu șterge nimic.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = createDb();
  const added = await seedFeatureDemo(db);
  console.log(`Date demo adăugate: ${added.answers} răspunsuri, ${added.declarations} declarații, ${added.quickVotes} voturi rapide (ce exista deja a rămas neschimbat).`);
  process.exit(0);
}
