# `packages/leaderboard` (`@tftd/leaderboard`)

Calculează și îngheață clasamentele și premiile lunare în `leaderboard_snapshots`.

## Module ([`src/index.ts`](src/index.ts))

- [`src/compute.ts`](src/compute.ts) — Funcții pure de agregare pentru:
  - **Top 10 localnicii lunii**
  - **Top 10 localuri** (`food` și `drink`) pe criterii curate (`MIN_LOCAL_REVIEWS = 10`; localurile cu alerte active de fraudă `FRAUD_ALERT = { probability: 0.7, count: 3 }` sunt excluse din podium)
  - **Angajatul lunii** și **Localul nou al lunii** (`TOP_SIZE = 10`)
- [`src/persist.ts`](src/persist.ts) — `freezeMonth(db, cityId, month)` și `lastMonth()` (rulată automat pe 1 ale lunii la 00:05 prin `@tftd/worker`).
