# CLAUDE.md

Guidance for Claude Code in this repository. The full spec is `docs/ARHITECTURA.md` (in Romanian); read the relevant section before building a module.

## What the program is

TOP FOOD / TOP DRINK ranks restaurants (`topfood/{oras}`) and bars/clubs (`topdrink/{oras}`) by what **locals** think, not tourists or bought reviews. The first city is Timișoara. A hackathon team of 4 is building it.

- Reviews come from Google Places API, Tripadvisor Content API, owner-connected accounts (Google Business, Facebook, Instagram, TikTok) and links users submit. No scraping.
- Each review is analysed: language, local vs tourist, sentiment per aspect, paid or not, probability of being fake.
- Scores: **Scor Onest** (0–10, weighted average pulled toward the city mean), **Scor Localnici / Scor Turiști** shown separately, **Tourist Trap Index** (0–100) with visible reasons.
- Owners can claim a venue, post a mini-blog, add employees ("rate the employee"), answer reviews. They pay for labelled "Sponsorizat" slots, never for score or rank.
- A monthly leaderboard is computed on the 1st and frozen.
- TOP DRINK uses the same engine; it adds day/time of visit (Fri–Sat night vs weekday), a live "vibe check" and weekend events.

## Non-negotiable product rules

These override any convenience in the code:

1. Payment never changes score or rank. `packages/scoring` and `packages/leaderboard` must never import from or query `packages/monetization` data.
2. Owners cannot delete or hide reviews, only reply or report (an admin decides).
3. Every score has a visible explanation.
4. Locals and tourists are shown separately.
5. Paid influencer reviews are weighted ×0.2.
6. External data only via official APIs or user/owner-submitted links. Never write scrapers.
7. GDPR: store only "day X, in city / at venue" from GPS, never the route. Employees appear only with consent.

## Repo layout

| Path | Module | Owner role |
| --- | --- | --- |
| `apps/web` | F. Public pages, `/owner`, `/admin` (Next.js, SSR for SEO) | Frontend |
| `apps/worker` | Queue + cron for the 5 scheduled jobs | Date/AI |
| `packages/db` | Schema: PostgreSQL + PostGIS + pgvector (delivered first) | Backend |
| `packages/ingestion` | A. Ingestion | Date/AI |
| `packages/matching` | B. Match the same venue across platforms | Date/AI |
| `packages/review-analysis` | C. Review analysis | Date/AI |
| `packages/scoring` | D. Scoring formulas | Date/AI |
| `packages/leaderboard` | I. Monthly leaderboard | Date/AI |
| `packages/accounts` | E. Accounts, roles, local verification, owner claim | Backend |
| `packages/owner` | G. Blog, employees, replies, stats | Backend + Frontend |
| `packages/monetization` | H. Partnerships, Sponsorizat slots, ads | Backend |
| `packages/moderation` | J. Moderation / admin | Backend |
| `config/cities/` | One JSON per city. A new city is config only, no new code | — |
| `seed/` | 30 Timișoara venues (20 food, 10 drink) | Design/Produs |
| `design/` | Fonts and colours | Design/Produs |

Stack: Next.js, PostgreSQL + PostGIS + pgvector, a separate worker, Claude Haiku for bulk classification, Stripe (after the hackathon), Vercel. No code exists yet, so set up tooling inside the module you're working on.

## Hackathon MVP order

1. DB schema + 30 seed venues.
2. Scoring on the seed data.
3. `topfood/timisoara`, `topdrink/timisoara` and the venue page.
4. Accounts: user, local badge (simulated GPS check-in), simplified owner claim (fixed code).
5. Separate "Sponsorizat" carousel, showing the ranking doesn't change.
6. Monthly leaderboard from seed + mini-blog and rate the employee on 1–2 demo venues.
7. Paste a TikTok/Instagram link → embed + "reclamă?" label.

Out of scope for the hackathon: real payments, automatic Facebook/Instagram ingestion, ML fraud detection (rules only), more cities.

## Git workflow

- Team branches: `oli`, `serban`, `adi`, `alex`. Each person works only on their own branch.
- Never commit directly to `main`. Changes reach `main` through a Pull Request from a personal branch.
- Before starting work, check you're on the right branch (`git branch --show-current`) and run `git pull origin main` to pick up teammates' merged work.
- Commit messages: `<module>: <what>`, e.g. `scoring: Scor Onest formula`.
- Announce changes to `packages/db` to the team; everyone depends on the schema.
- Secrets go in `.env` (gitignored). `.env.example` lists the keys.
- If a personal `CLAUDE.local.md` exists, it says whose branch this checkout uses.

## Language

User-facing UI text is Romanian. Code identifiers may be English or Romanian, but stay consistent within a module.
