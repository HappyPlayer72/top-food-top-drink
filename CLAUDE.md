# CLAUDE.md

Guidance for coding agents and contributors working in the **TopFood & TopDrink** (`Unihack 26`) repository.

## Project Summary

**TopFood & TopDrink** is a city guide for locals in Timișoara (architecture supports multiple cities via `config/cities/<city>.json`, while `apps/web` routes currently expose `/topfood/timisoara` and `/topdrink/timisoara`) with two verticals:
- **TopFood** (where to eat)
- **TopDrink** (where to drink & go out)

Places are ranked by **honest score** (`honestScore`, heavily weighting verified locals over tourists and down-weighting suspected fake or paid reviews) paired with a **tourist trap index** (`trapIndex`, 0–100) and plain-Romanian reasons.

## Architecture & Workspace Packages

Monorepo managed with **npm workspaces** (`Node >= 20`, **TypeScript 5.8**, **Vitest 3**, **Drizzle ORM** over **PostgreSQL 16 + pgvector**):

| Workspace | Package Name | Responsibility |
|---|---|---|
| `apps/web` | `@topfood/web` | Next.js 15 + React 19 + Tailwind CSS 4 + MapLibre GL frontend; calls `@tftd/api` on the server with static fallback in `src/data/restaurants.ts` when Postgres is unavailable |
| `apps/worker` | `@tftd/worker` | Standalone `croner` scheduler running 6 recurring jobs in `Europe/Bucharest` timezone |
| `packages/db` | `@tftd/db` | Drizzle schema (`schema.ts` + idempotent `ensureExtendedSchema` in `ensure.ts` = 32 tables), client, `ServiceError`, Docker Postgres+pgvector |
| `packages/api` | `@tftd/api` | Single contract boundary imported by `apps/web`, `apps/worker`, and `seed/smoke.ts`; re-exports domain modules plus high-level page/action queries |
| `packages/accounts` | `@tftd/accounts` | Password auth (`scrypt` + HMAC-SHA256 `tf_session` cookie), 3 local verification methods, owner claims (phone/CUI/Google), influencer social bio-code verification |
| `packages/ingestion` | `@tftd/ingestion` | Google Places API (New), TripAdvisor Content API, TikTok/Instagram/Facebook/YouTube link submission & oEmbed, manual venue submissions |
| `packages/matching` | `@tftd/matching` | Fuzzy source-to-venue matching (Levenshtein, Haversine distance, phone match) and admin confirmation queue |
| `packages/review-analysis` | `@tftd/review-analysis` | Language detection (`franc-min` + RO diacritics), 6 fake signals (`pgvector(384)` cosine + 3-shingle Jaccard), aspect extraction (`claude-haiku-5-5` or keyword fallback) |
| `packages/scoring` | `@tftd/scoring` | Bayesian honest score (180-day decay), 5-signal tourist trap index, food aspects vs drink time-bucket scores |
| `packages/leaderboard` | `@tftd/leaderboard` | Monthly freeze of top 10 locals, top 10 food/drink venues, employee of the month, and best new venue |
| `packages/owner` | `@tftd/owner` | Owner & employee dashboard queries/mutations, daily views, score history, posts/offers, team invites, profile completeness checklist |
| `packages/loyalty` | `@tftd/loyalty` | Loyalty stamp programs, 60-second rotating HMAC QR codes, personal cards & scan redemption |
| `packages/monetization` | `@tftd/monetization` | Partnerships, hourly-rotated sponsored cards (`<= 3` slots, blocked if `trapIndex >= 80`), `ad_slots` management |
| `packages/moderation` | `@tftd/moderation` | Review reports, receipt photo verification (`×1.3` weight), suspicious account adjudication, venue match queue |

City configuration lives in `config/cities/timisoara.json` (4 tourist zones of 300m radius, 14 neighborhoods, local average food/drink prices).

## Six Non-Negotiable Product Rules

1. **Honest score and trap index cannot be bought.** Paid partners never receive a score boost or trap exemption.
2. **Owners cannot delete, hide, or suppress reviews.** They can only post public replies or flag a review to moderation (`reports`), which leaves the review visible while under review.
3. **Sponsored slots are visibly separated and excluded from traps.** Paid highlights (`SPONSORED_SLOTS = 3`) are clearly labeled `"Sponsorizat"`, never sit inside the organic Top 10, and are blocked when `trapIndex >= 80`.
4. **Influencer partnerships are transparent.** Reviews from accounts with `is_influencer = true` are tagged `paid` (`weight = 0.2`) and flagged visibly as `"Parteneriat plătit"`.
5. **Tourist trap index always shows human-readable reasons.** Stored in `trap_reasons` in Romanian (price vs local baseline, tourist-zone distance, local-vs-tourist rating gap, non-local language share, one-time visitors).
6. **External links never auto-publish without analysis.** Social/external submissions enter `social_submissions` (`pending`) and require ingestion + analysis before attribution.

## Development Workflow & Commands

```bash
npm install
npm run db:up          # Docker PostgreSQL 16 + pgvector on :5432
npm run db:migrate     # Drizzle migrations
npm run seed           # Load deterministic Timisoara dataset (-- --reset to wipe first)
npm run test           # Vitest across all workspace packages
npm run typecheck      # tsc --noEmit across tsconfig
npm run dev -w @topfood/web
npm run dev -w @tftd/worker
npm run build:web
```

- All runtime commands execute `.ts` files via `tsx` or Next.js; package exports point directly to `./src/*.ts` with `"type": "module"`.
- **UI language is Romanian** across all user-facing copy, labels, errors (`ServiceError` messages), and categories. Code comments and technical docs follow module conventions (Romanian in backend/product docs, English in `CLAUDE.md` and `design/design-language.md`).
- **Testing**: Co-located `*.test.ts` files run with Vitest (`vitest.config.ts`). Keep domain logic pure where possible so unit tests run without a live database.

## Key Documentation References

- Architecture & Data Model: [`docs/ARHITECTURA.md`](docs/ARHITECTURA.md)
- `@tftd/api` & Backend Guide: [`docs/BACKEND.md`](docs/BACKEND.md)
- Design System: [`design/design-language.md`](design/design-language.md) & [`design/README.md`](design/README.md)
- Demo Runbook: [`docs/DEMO.md`](docs/DEMO.md)
- Production Deploy: [`docs/DEPLOY.md`](docs/DEPLOY.md)
