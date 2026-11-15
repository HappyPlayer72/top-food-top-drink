# Missing features — what can be added

Compared `docs/ARHITECTURA.md` (the spec) with the code on `oli` (14 Nov 2026). The 7 MVP items are all done; this is what the spec describes that isn't built yet. Ordered by value for the demo/pitch, then post-hackathon.

## A. Quick wins (spec'd, backend mostly ready, missing in the web app)

| # | Feature | What exists | What's missing |
| --- | --- | --- | --- |
| 1 | ✅ **SEO URLs for leaderboard, categories, weekend, profiles** | `leaderboardPage`, `cityPage({category})`, `weekendEvents`, `userProfile` in `@tftd/api`; the shell shows these as in-app views | **Done:** routes under `apps/web/src/app/{topfood,topdrink}/timisoara/` (`top-luna`, `top-luna/[month]`, `categorie/[category]`, `weekend`), `u/[username]`, `sitemap.ts` |
| 2 | ✅ **Paste a TikTok/Instagram link as a user** (MVP item 7 for users) | `submitSocialLink` in the API; owners can add videos (`actions-videos.ts`) | **Done:** `apps/web/src/components/SocialLinks.tsx` |
| 3 | ✅ **Employee accepts the invite** (GDPR rule 7) | `owner.respondToInvite`, `owner.pendingInvites` | **Done:** `ProfileAccountExtras.tsx` + `respondToInvite` |
| 4 | ✅ **Ad banners** (`SlotReclamă`) | `ad_slots` table + `monetization` serves them | **Done:** `adsFor` in `packages/api/src/pages.ts`; create/delete in `/admin` |
| 5 | ✅ **Saved venues ("vreau să merg")** | Saved in `localStorage` only | **Done:** `saved_venues` table, `AccountClient.tsx` |
| 6 | ✅ **Edit / delete own review** | — | **Done:** `editReview` / `deleteReview` in `packages/api/src/actions.ts` |
| 7 | ✅ **Leaderboard share image** | Monthly top is computed and frozen | **Done:** `opengraph-image.tsx` (Instagram/TikTok image and Open Graph images) |
| 8 | ✅ **Monthly titles in UI** | `Revelația lunii`, `Localnicul lunii` computed in `packages/leaderboard` | **Done** |

## B. Medium (new logic, still hackathon-sized)

| # | Feature | Notes |
| --- | --- | --- |
| 9 | ~~**Visit verified by receipt photo** (×1.3 weight)~~ | **Done (14 Nov):** "Sunt aici acum" GPS check-in at the venue + receipt photo → `/admin` queue, badge on reviews, count in "Cum se calculează?" |
| 10 | ✅ **pgvector for fake-review similarity** | **Done:** pgvector similarity in `packages/review-analysis` (previously the `embedding` column was unused and similarity was a plain text comparison) |
| 11 | ✅ **Owner stats: views + score history** | **Done:** `packages/owner/src/owner.ts` |
| 12 | ✅ **Admin: suspicious accounts** | **Done:** in `/admin` |
| 13 | **Rate limiting on login / vibe** | Reviews done (14 Nov, anti-bot system, see `docs/ANTI-BOT.md`). Login done (`packages/accounts/src/auth.ts`); register and vibe still unlimited |
| 14 | **Influencer verification** | `verified` link flag exists but no OAuth with TikTok/Instagram; follower count is manual |

## C. Post-hackathon (spec says out of scope now)

| # | Feature | Needs |
| --- | --- | --- |
| 15 | Email service for university-email codes | Resend/Postmark key; now codes show on screen (`DEMO_EMAIL_CODES=on`) |
| 16 | Login with Google + SMS codes | OAuth client, SMS provider |
| 17 | Owner connections: Google Business Profile, Facebook, Instagram, TikTok | OAuth apps + review import |
| 18 | Stripe for partnerships (Basic/Highlight) + invoices | Stripe keys; now `buyPartnership` is free |
| 19 | Scheduled jobs in production | Worker on Railway/Render or Vercel Cron (see `docs/DEPLOY.md`) |
| 20 | ✅ Real Timișoara venues | **Done:** `seed/data/google-snapshot.json`, loaded by `npm run seed`; no Google key needed |
| 21 | ML fraud model, more cities, reservations, "Top Pass" | — |

## Also implemented

- Social-media discovery (YouTube/Brave/Google CSE, `npm run import:social`, needs IMPORT_CONFIRM=da) — implemented on branch adi, PR pending.

## Bug fixed while setting up

`packages/db/src/client.ts`: `.env.example` has `DATABASE_POOL_MAX=` empty, and `Number("") ?? 10` gave a pool of **0 connections**, so every query hung and `npm run seed` exited silently doing nothing. Changed to `Number(…) || 10`. Not committed yet.

## Running it locally (this laptop)

Docker isn't installed and `sudo` needs a password, so PostgreSQL 16 + PostGIS 3.4 + pgvector 0.6 were installed without root in `~/.local/pgsql` (from the Ubuntu 24.04 packages), with a helper script:

```bash
topfood-db start      # also: stop, status, psql
```

After a reboot, start the DB first, then the site:

```bash
export PATH=$HOME/.local/node/bin:$HOME/.local/bin:$PATH
topfood-db start
npm run dev -w @topfood/web       # http://localhost:3000
```

Done already: `npm install`, `.env` (with a generated `SESSION_SECRET`), `npm run db:migrate`, `npm run seed` (184 real venues and 919 Google reviews from `seed/data/google-snapshot.json`), optional `npm run seed:dev` (184 DevAccount test reviews), `seed/test-accounts.ts`. `npm test` → ~208 tests passing, `npm run typecheck` → clean.

Test logins (local DB only): `test.user` / `test.owner` / `test.admin` (see `docs/DEMO.md`). Generated reviews come only from the optional `npm run seed:dev`.
