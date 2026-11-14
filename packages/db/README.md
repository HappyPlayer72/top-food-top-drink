# `packages/db` (`@tftd/db`)

Schema bazei de date, clientul Drizzle ORM și containerul Docker PostgreSQL 16 + `pgvector`.

## Structură și exporturi ([`src/index.ts`](src/index.ts))

- [`src/schema.ts`](src/schema.ts) — **32 tabele PostgreSQL** (inclusiv extensia `vector(384)` pe `reviews.embedding`):
  - Orașe & localuri: `cities`, `tourist_zones`, `venues`, `venue_sources`, `match_candidates`
  - Conturi & roluri: `users`, `user_social_links`, `checkins`, `local_verifications`, `vouches`, `owner_claims`, `venue_managers`
  - Conținut & evaluări: `reviews`, `review_replies`, `review_votes`, `posts`, `employees`, `employee_ratings`, `social_submissions`, `vibe_checks`, `menu_items`
  - Fidelitate: `loyalty_programs`, `loyalty_cards`, `loyalty_stamps`
  - Monetizare, clasament & audit: `partnerships`, `ad_slots`, `leaderboard_snapshots`, `reports`, `saved_venues`, `venue_views_daily`, `venue_score_snapshots`, `moderation_decisions`
- [`src/ensure.ts`](src/ensure.ts) — `ensureExtendedSchema(db)` creează idempotent tabelele/coloanele extinse (`saved_venues`, `venue_views_daily`, `venue_score_snapshots`, `moderation_decisions` și coloanele `receipt_photo_url` / `receipt_status` pe `reviews`).
- [`src/client.ts`](src/client.ts) — `createDb()` (`DATABASE_URL`, `DATABASE_POOL_MAX` implicit `10`, `DATABASE_PREPARE` implicit `false`).
- [`src/errors.ts`](src/errors.ts) — `ServiceError` cu mesaje în limba română.
- [`docker/Dockerfile`](docker/Dockerfile) — `postgres:16` cu `pgvector`.

## Comenzi (din rădăcina monorepo-ului)

```bash
npm run db:up        # pornește Postgres + pgvector
npm run db:generate  # generează migrări Drizzle
npm run db:migrate   # aplică migrările
npm run db:down      # oprește containerul
```
