/**
 * Worker-ul cu joburi programate, separat de site.
 *   npm run start -w @tftd/worker                  # pornește programarea
 *   npm run job -w @tftd/worker -- leaderboard-lunar # rulează un job o dată
 */
import { Cron } from "croner";
import { createDb } from "@tftd/db";
import { JOBS, type JobName } from "./jobs.ts";

const TZ = "Europe/Bucharest";

/** Când rulează fiecare job (ora României). */
export const SCHEDULE: Record<JobName, string> = {
  "descopera-locale": "0 3 * * 1", // luni, 03:00
  "actualizeaza-ratinguri": "0 4 * * *", // zilnic, 04:00
  "proceseaza-linkuri": "* * * * *", // la fiecare minut
  "recalculeaza-scoruri": "0 2 * * *", // complet noaptea; review-urile noi le prinde jobul de mai jos
  "leaderboard-lunar": "5 0 1 * *", // pe 1 ale lunii, 00:05
};

const db = createDb();
const [, , command, name] = process.argv;

if (command === "run") {
  if (!name || !(name in JOBS)) {
    console.error(`Joburi: ${Object.keys(JOBS).join(", ")}`);
    process.exit(1);
  }
  await JOBS[name as JobName](db);
  process.exit(0);
}

for (const [job, pattern] of Object.entries(SCHEDULE) as [JobName, string][]) {
  // protect: nu pornește o rulare nouă cât timp cea veche nu s-a terminat
  new Cron(pattern, { timezone: TZ, protect: true, name: job }, () =>
    JOBS[job](db).catch((e) => console.error(`[${job}]`, e)),
  );
}
// Review-urile noi: analiză + scor la fiecare 5 minute
new Cron("*/5 * * * *", { timezone: TZ, protect: true, name: "review-uri-noi" }, () =>
  JOBS["recalculeaza-scoruri"](db, { onlyNew: true }).catch((e) => console.error("[review-uri-noi]", e)),
);
console.log(`Worker pornit (${TZ}). Joburi: ${Object.keys(SCHEDULE).join(", ")}, review-uri-noi.`);
