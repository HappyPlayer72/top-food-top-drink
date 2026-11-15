/**
 * Review-uri de test, ca să vedem cum arată site-ul cu review-uri scrise pe platformă.
 * 50 de conturi „Nume (DevAccount)” și 184 de review-uri (seed/data/dev-reviews.json), scrise de agenți
 * după review-urile Google reale ale fiecărui local. Trec prin fluxul real (writeReview: analiză, ponderi, scoruri).
 *
 *   npm run seed:dev               # le adaugă (doar pe baza locală)
 *   npm run seed:dev -- --remove   # le șterge, cu tot cu conturi, și recalculează scorurile
 *
 * Nu intră niciodată în baza online și nici în google-snapshot.json.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, inArray, like } from "drizzle-orm";
import { hashPassword } from "@tftd/accounts";
import { writeReview } from "@tftd/api";
import { createDb, reviews, users, venues } from "@tftd/db";
import { recalculateCity } from "@tftd/scoring";

type DevAccount = {
  key: string;
  displayName: string;
  type: "local" | "regular" | "tourist";
  neighborhood: string | null;
  reviews: { slug: string; vertical: "food" | "drink"; rating: number; text: string; weekendNight: boolean | null }[];
};

const CITY = "timisoara";
const PASSWORD = "DevAccount2026!";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL lipsește din .env.");
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
  console.log("Review-urile DevAccount se pun doar pe baza locală. Nu am făcut nimic.");
  process.exit(0);
}

const db = createDb(url);
const devUsers = () => db.select({ id: users.id }).from(users).where(like(users.username, "dev.%"));

async function recalc() {
  for (const vertical of ["food", "drink"] as const) await recalculateCity(db, CITY, vertical);
}

if (process.argv.includes("--remove")) {
  const ids = (await devUsers()).map((u) => u.id);
  if (ids.length) {
    await db.delete(reviews).where(inArray(reviews.authorId, ids));
    await db.delete(users).where(inArray(users.id, ids));
  }
  await recalc();
  console.log(`Șters: ${ids.length} conturi DevAccount și review-urile lor. Scorurile sunt recalculate.`);
} else {
  const data = JSON.parse(readFileSync(join(import.meta.dirname, "data", "dev-reviews.json"), "utf8")) as { accounts: DevAccount[] };
  const venueIds = new Map((await db.select({ id: venues.id, slug: venues.slug, vertical: venues.vertical }).from(venues).where(eq(venues.citySlug, CITY))).map((v) => [`${v.vertical}/${v.slug}`, v.id]));
  const passwordHash = await hashPassword(PASSWORD);
  const yearFromNow = new Date(Date.now() + 365 * 86_400_000);
  let written = 0;
  let skipped = 0;
  for (const a of data.accounts) {
    const username = `dev.${a.key.slice(3)}`;
    const isLocal = a.type === "local";
    const [created] = await db
      .insert(users)
      .values({
        username,
        displayName: a.displayName,
        email: `${username}@example.invalid`,
        passwordHash,
        roles: isLocal ? ["user", "local"] : ["user"],
        localCitySlug: isLocal ? CITY : null,
        localNeighborhood: isLocal ? a.neighborhood : null,
        localUntil: isLocal ? yearFromNow : null,
      })
      .onConflictDoNothing()
      .returning({ id: users.id });
    const userId = created?.id ?? (await db.select({ id: users.id }).from(users).where(and(eq(users.username, username))))[0]!.id;
    for (const r of a.reviews) {
      const venueId = venueIds.get(`${r.vertical}/${r.slug}`);
      if (!venueId) { skipped++; continue; }
      try {
        await writeReview(db, userId, { venueId, rating: r.rating, text: r.text, ...(r.weekendNight === null ? {} : { weekendNight: r.weekendNight }) });
        written++;
      } catch (e) {
        skipped++; // de ex. deja scris în ultimele 30 de zile (rulat de două ori)
        if (process.env.DEBUG) console.log(username, r.slug, (e as Error).message);
      }
    }
  }
  console.log(`Gata: ${data.accounts.length} conturi DevAccount (parola ${PASSWORD}), ${written} review-uri scrise, ${skipped} sărite.`);
}
await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
