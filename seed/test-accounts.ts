/**
 * Conturile cu care testăm totul (în locul userilor generați): test.user, test.owner, test.admin.
 * Doar pe baza locală; nu modifică utilizatorii existenți. Rulat automat de `npm run seed`.
 */
import { pathToFileURL } from "node:url";
import { hashPassword } from "@tftd/accounts";
import { createDb, users } from "@tftd/db";

const accounts = [
  { username: "test.user", displayName: "Utilizator Test", password: "TestUser2026!", roles: ["user"] as ("user" | "owner" | "admin")[] },
  { username: "test.owner", displayName: "Proprietar Test", password: "TestOwner2026!", roles: ["user", "owner"] as ("user" | "owner" | "admin")[] },
  { username: "test.admin", displayName: "Administrator Test", password: "TestAdmin2026!", roles: ["user", "admin"] as ("user" | "owner" | "admin")[] },
];

export async function createTestAccounts() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL lipsește din .env.");
  const host = new URL(url).hostname;
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    console.log("Conturi de test: omise — se creează doar pe o bază locală, în afara mediului de producție.");
    return;
  }

  const db = createDb(url);
  const prepared: ((typeof accounts)[number] & { passwordHash: string })[] = [];
  for (const a of accounts) {
    prepared.push({ ...a, passwordHash: await hashPassword(a.password) });
  }
  const results = await db.transaction(async (tx) => {
    const outcomes: string[] = [];
    for (const a of prepared) {
      // test.owner pornește fără local: își alege și revendică localul din /owner, ca un proprietar real
      const [created] = await tx.insert(users).values({ username: a.username, displayName: a.displayName, email: `${a.username}@example.invalid`, passwordHash: a.passwordHash, roles: a.roles }).onConflictDoNothing().returning({ id: users.id });
      outcomes.push(created ? `${a.username}: creat.` : `${a.username}: omis — username-ul sau emailul există deja; contul nu a fost modificat.`);
    }

    return outcomes;
  });
  for (const result of results) console.log(result);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  createTestAccounts().then(() => process.exit(0)).catch((error: unknown) => { console.error(error); process.exit(1); });
}
