# Missing features — what can be added

Compared `docs/ARHITECTURA.md` (the spec) with the code on `oli` (14 Nov 2026). The 7 MVP items are all done; this is what the spec describes that isn't built yet. Ordered by value for the demo/pitch, then post-hackathon.

## A. Quick wins (spec'd, backend mostly ready, missing in the web app)

| # | Feature | What exists | What's missing |
| --- | --- | --- | --- |
| 1 | **SEO URLs for leaderboard, categories, weekend, profiles** | `leaderboardPage`, `cityPage({category})`, `weekendEvents`, `userProfile` in `@tftd/api`; the shell shows these as in-app views | `/topfood/timisoara/top-luna` (+ `/2026-10`), `/…/categorie/pizza`, `/topdrink/timisoara/weekend`, `/u/{username}` all return **404**. Add `page.tsx` routes + sitemap entries |
| 2 | **Paste a TikTok/Instagram link as a user** (MVP item 7 for users) | `submitSocialLink` in the API; owners can add videos (`actions-videos.ts`) | No user-facing "Lipește link" form on the venue page |
| 3 | **Employee accepts the invite** (GDPR rule 7) | `owner.respondToInvite`, `owner.pendingInvites` | No screen where the invited employee accepts/declines or leaves the team |
| 4 | **Ad banners** (`SlotReclamă`) | `ad_slots` table + `monetization` serves them | Never rendered on the city page; no admin form to create one |
| 5 | **Saved venues ("vreau să merg")** | Saved in `localStorage` only | Not stored per account in the DB, lost on another device |
| 6 | **Edit / delete own review** | — | Spec lists "scrie și editează review"; there's no `editReview` |
| 7 | **Leaderboard share image** | Monthly top is computed and frozen | No Instagram/TikTok image (Next `ImageResponse` / `opengraph-image.tsx`); no Open Graph images on venue pages either |
| 8 | **Monthly titles in UI** | `Revelația lunii`, `Localnicul lunii` computed in `packages/leaderboard` | Check they're shown; "Influencerul lunii" isn't computed |

## B. Medium (new logic, still hackathon-sized)

| # | Feature | Notes |
| --- | --- | --- |
| 9 | ~~**Visit verified by receipt photo** (×1.3 weight)~~ | **Done (14 Nov):** "Sunt aici acum" GPS check-in at the venue + receipt photo → `/admin` queue, badge on reviews, count in "Cum se calculează?" |
| 10 | **pgvector for fake-review similarity** | `reviews.embedding vector(384)` column exists but is never filled or queried; similarity is a plain text comparison in `review-analysis/rules.ts` |
| 11 | **Owner stats: views + score history** | Spec wants views and the score's evolution over time; no page-view tracking or score snapshots table |
| 12 | **Admin: suspicious accounts** | Spec lists it in the admin queue; only reports, claims, matches and trap appeals exist |
| 13 | **Rate limiting on login / vibe** | ~~Reviews~~ done (14 Nov, anti-bot system, see `docs/ANTI-BOT.md`); login, register and vibe still unlimited |
| 14 | **Influencer verification** | `verified` link flag exists but no OAuth with TikTok/Instagram; follower count is manual |

## C. Post-hackathon (spec says out of scope now)

| # | Feature | Needs |
| --- | --- | --- |
| 15 | Email service for university-email codes | Resend/Postmark key; now codes show on screen (`DEMO_EMAIL_CODES=on`) |
| 16 | Login with Google + SMS codes | OAuth client, SMS provider |
| 17 | Owner connections: Google Business Profile, Facebook, Instagram, TikTok | OAuth apps + review import |
| 18 | Stripe for partnerships (Basic/Highlight) + invoices | Stripe keys; now `buyPartnership` is free |
| 19 | Scheduled jobs in production | Worker on Railway/Render or Vercel Cron (see `docs/DEPLOY.md`) |
| 20 | Real Timișoara venues | `GOOGLE_PLACES_API_KEY`, then `npm run import:real` |
| 21 | ML fraud model, more cities, reservations, "Top Pass" | — |

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

Done already: `npm install`, `.env` (with a generated `SESSION_SECRET`), `npm run db:migrate`, `npm run seed` (30 venues, 821 reviews, 82 users), `seed/test-accounts.ts`. `npm test` → 93/93 pass, `npm run typecheck` → clean.

Test logins (local DB only): `test.user` / `test.owner` / `test.admin` (see `docs/DEMO.md`). The seed has no generated users or reviews.
