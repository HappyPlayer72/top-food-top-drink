# `packages/api` (`@tftd/api`)

**Strat unic de contract** între [`apps/web`](../../apps/web/README.md) / [`apps/worker`](../../apps/worker/README.md) și pachetele de domeniu. Documentația detaliată a apelurilor este în [`docs/BACKEND.md`](../../docs/BACKEND.md).

## Exporturi principale ([`src/index.ts`](src/index.ts))

- **Pagini și căutare** ([`src/pages.ts`](src/pages.ts)):
  - `cityPage`, `venuePage`, `leaderboardPage`, `searchPlaces`, `weekendEvents`, `topReviewers`, `userProfilePage`
- **Acțiuni comunitate** ([`src/actions.ts`](src/actions.ts)):
  - `writeReview`, `editReview`, `deleteReview`, `toggleHelpful`, `submitVibe`, `rateEmployee`, `checkIn`, `submitSocialLink`, `submitSocialLinkNow`, `addManually`
  - Reguli: `REVIEW_COOLDOWN_DAYS = 30`, `MAX_REVIEWS_PER_HOUR = 10`, `VIBE_COOLDOWN_MINUTES = 30`, `MAX_VIBES_PER_HOUR = 15`, vibe expiră în 2 ore (suportă și utilizatori anonimi), bon de casă JPG/PNG/WebP sub `MAX_RECEIPT_CHARS = 400_000`
- **Program de funcționare** ([`src/hours.ts`](src/hours.ts)):
  - `openStatus`, `formatHours` (calcul în `Europe/Bucharest`, inclusiv intervale peste miezul nopții)
- **Submodule re-exportate**: `accounts`, `owner`, `loyalty`, `moderation`, `monetization`, `ingestion`, `matching`, `reviewAnalysis`, `scoring`, `leaderboard`, `jobs`, plus `createDb`, `ServiceError` din `@tftd/db`.
