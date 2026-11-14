# Changes in Commit `9e7a331` (`serban` → PR #13)

**Summary:** 40 files changed, +2,427 insertions, -2,074 deletions.

## 1. Core App UI, Types & Data (Highest Impact)

- `apps/web/src/data/restaurants.ts` (1,385 lines changed) — Major update to the restaurant/venue dataset.
- `apps/web/src/data/venueExtras.ts` (1,020 lines changed) — Major update to venue extra metadata and content.
- `apps/web/src/components/RestaurantDetailModal.tsx` (+102 lines) — Added new UI/functionality in the venue detail modal.
- `apps/web/src/components/EditorialListView.tsx` (77 lines changed) — Updated editorial list rendering/behavior.
- `apps/web/src/components/FidelityView.tsx` (24 lines changed) — Updated fidelity view.
- `apps/web/src/types.ts` (20 lines changed) — Updated TypeScript types to match UI/data changes.
- `apps/web/src/app/owner/[venueId]/Dashboard.tsx` (4 lines changed) — Minor dashboard update.
- `apps/web/src/components/TopFoodShell.tsx` (2 lines changed) — Minor shell update.
- `apps/web/src/lib/backend/toRestaurant.ts` (1 line changed) — Minor mapper update.

## 2. Seed Data & Tests

- `seed/venues.ts` (95 lines changed) — Updated seeded venues.
- `seed/load.ts` (52 lines changed) — Updated seed loader.
- `seed/smoke.ts` (26 lines changed) — Updated smoke checks.
- `seed/scenarios.test.ts` (20 lines changed) — Updated scenario tests.
- `seed/generate.ts` (8 lines changed) — Updated seed generator.
- `seed/generate.test.ts` (2 lines changed) — Updated generator tests.

## 3. Architecture, Design & Project Documentation

- `docs/ARHITECTURA.md` (447 lines changed)
- `docs/BACKEND.md` (212 lines changed)
- `CLAUDE.md` (139 lines changed)
- `design/design-language.md` (139 lines changed)
- `README.md` (103 lines changed)
- `docs/DEMO.md` (103 lines changed)
- `design/README.md` (97 lines changed)
- `docs/DEPLOY.md` (92 lines changed)
- `CONTRIBUTING.md` (48 lines changed)
- `UX-REVIEW.md` (10 lines changed)

### App, Worker, Seed & Package READMEs

- `apps/web/README.md` (40 lines changed)
- `seed/README.md` (32 lines changed)
- `apps/worker/README.md` (31 lines changed)
- `packages/db/README.md` (27 lines changed)
- `packages/scoring/README.md` (20 lines changed)
- `packages/accounts/README.md` (18 lines changed)
- `packages/api/README.md` (14 lines, new)
- `packages/review-analysis/README.md` (14 lines changed)
- `packages/ingestion/README.md` (12 lines changed)
- `packages/leaderboard/README.md` (12 lines changed)
- `packages/moderation/README.md` (12 lines changed)
- `packages/owner/README.md` (12 lines changed)
- `packages/loyalty/README.md` (10 lines, new)
- `packages/monetization/README.md` (10 lines changed)
- `packages/matching/README.md` (9 lines changed)
