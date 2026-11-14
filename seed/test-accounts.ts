/** Conturi strict pentru baze locale de dezvoltare; nu modifică utilizatorii existenți. */
import { and, asc, eq, notExists } from "drizzle-orm";
import { hashPassword } from "@tftd/accounts";
import { createDb, users, venueManagers, venues } from "@tftd/db";

const accounts = [
  { username: "test.user", displayName: "Utilizator Test", password: "TestUser2026!", roles: ["user"] as ("user" | "owner" | "admin")[] },
  { username: "test.owner", displayName: "Proprietar Test", password: "TestOwner2026!", roles: ["user", "owner"] as ("user" | "owner" | "admin")[] },
  { username: "test.admin", displayName: "Administrator Test", password: "TestAdmin2026!", roles: ["user", "admin"] as ("user" | "owner" | "admin")[] },
];

function toPascalCase(slug: string): string {
  return slug
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL lipsește din .env.");
  const host = new URL(url).hostname;
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error("Conturile demo pot fi create doar într-o bază locală, în afara mediului de producție.");
  }

  const db = createDb(url);
  const prepared: ((typeof accounts)[number] & { passwordHash: string })[] = [];
  for (const a of accounts) {
    prepared.push({ ...a, passwordHash: await hashPassword(a.password) });
  }
  const results = await db.transaction(async (tx) => {
    const outcomes: string[] = [];
    for (const a of prepared) {
      if (a.username === "test.owner") {
        const [venue] = await tx.select({ id: venues.id, name: venues.name }).from(venues)
          .where(and(eq(venues.citySlug, "timisoara"), eq(venues.status, "active"), notExists(
            tx.select({ id: venueManagers.userId }).from(venueManagers)
              .where(and(eq(venueManagers.venueId, venues.id), eq(venueManagers.role, "owner"))),
          )))
          .orderBy(asc(venues.name)).limit(1).for("update");
        if (!venue) {
          outcomes.push("test.owner: omis — nu există un local fără proprietar; rulează întâi seed-ul de locale.");
          continue;
        }
        const [owner] = await tx.select({ userId: venueManagers.userId }).from(venueManagers)
          .where(and(eq(venueManagers.venueId, venue.id), eq(venueManagers.role, "owner")));
        if (owner) throw new Error("Localul a primit între timp un proprietar; reîncearcă.");
        const [created] = await tx.insert(users).values({ username: a.username, displayName: a.displayName, email: `${a.username}@example.invalid`, passwordHash: a.passwordHash, roles: a.roles }).onConflictDoNothing().returning({ id: users.id });
        if (!created) { outcomes.push(`${a.username}: omis — username-ul sau emailul există deja; contul nu a fost modificat.`); continue; }
        await tx.insert(venueManagers).values({ venueId: venue.id, userId: created.id, role: "owner" });
        outcomes.push(`${a.username}: creat, proprietar pentru ${venue.name}.`);
      } else {
        const [created] = await tx.insert(users).values({ username: a.username, displayName: a.displayName, email: `${a.username}@example.invalid`, passwordHash: a.passwordHash, roles: a.roles }).onConflictDoNothing().returning({ id: users.id });
        outcomes.push(created ? `${a.username}: creat.` : `${a.username}: omis — username-ul sau emailul există deja; contul nu a fost modificat.`);
      }
    }

    const unownedVenues = await tx
      .select({ id: venues.id, name: venues.name, slug: venues.slug })
      .from(venues)
      .where(
        and(
          eq(venues.status, "active"),
          notExists(
            tx
              .select({ id: venueManagers.userId })
              .from(venueManagers)
              .where(and(eq(venueManagers.venueId, venues.id), eq(venueManagers.role, "owner"))),
          ),
        ),
      )
      .orderBy(asc(venues.name))
      .for("update");

    for (const venue of unownedVenues) {
      const username = `${venue.slug}.owner`;
      const password = `${toPascalCase(venue.slug)}Owner`;
      const passwordHash = await hashPassword(password);
      const [created] = await tx
        .insert(users)
        .values({
          username,
          displayName: `Proprietar ${venue.name}`,
          email: `${username}@example.invalid`,
          passwordHash,
          roles: ["user", "owner"],
        })
        .onConflictDoNothing()
        .returning({ id: users.id });
      if (!created) {
        outcomes.push(`${username}: omis — username-ul sau emailul există deja; contul nu a fost modificat.`);
        continue;
      }
      await tx.insert(venueManagers).values({ venueId: venue.id, userId: created.id, role: "owner" });
      outcomes.push(`${username}: creat, proprietar pentru ${venue.name} (parolă: ${password}).`);
    }

    return outcomes;
  });
  for (const result of results) console.log(result);
}

main().then(() => process.exit(0)).catch((error: unknown) => { console.error(error); process.exit(1); });
