# TopFood & TopDrink — Ghidul localnicilor

Descoperă unde mănâncă și unde ies localnicii din Timișoara, fără capcane turistice și fără review-uri cumpărate.

Un singur produs cu două fețe: **TopFood** (unde mănânci) și **TopDrink** (unde bei), ordonate după **scorul onest** — ratingul recenzorilor din oraș ponderează mult mai mult decât cel al turiștilor, iar fiecare scor este însoțit de **indicele de capcană turistică** și **motivele** lui.

---

## Pornire rapidă (Windows PowerShell / bash)

Cerințe: **Node.js ≥ 20**, **Docker Desktop** (pentru PostgreSQL + pgvector).

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run seed
npm exec -- tsx --env-file-if-exists=.env seed/test-accounts.ts   # opțional: test.user / test.owner / test.admin
npm run dev -w @topfood/web
```

Deschide [http://localhost:3000](http://localhost:3000) (`TopFood`), [http://localhost:3000/topdrink/timisoara](http://localhost:3000/topdrink/timisoara) (`TopDrink`), [http://localhost:3000/owner](http://localhost:3000/owner) (`Owner`) sau [http://localhost:3000/admin](http://localhost:3000/admin) (`Admin`).

> **Mod offline / fără PostgreSQL**: Dacă `DATABASE_URL` lipsește sau PostgreSQL nu răspunde, aplicația web (`apps/web`) face automat fallback pe setul static din [`apps/web/src/data/restaurants.ts`](apps/web/src/data/restaurants.ts), iar autentificarea demo client-side folosește parola configurată în UI. Pentru fluxuri complete cu bază de date (review-uri persistente, fidelitate QR, claim owner, moderare), pornește Postgres.

---

## Comenzi principale

| Comandă | Ce face |
|---|---|
| `npm run db:up` | Pornește PostgreSQL 16 + `pgvector` în Docker (`topfood` pe portul `5432`) |
| `npm run db:down` | Oprește containerul Docker |
| `npm run db:generate` | Generează migrări Drizzle din [`packages/db/src/schema.ts`](packages/db/src/schema.ts) |
| `npm run db:migrate` | Aplică migrările în baza de date |
| `npm run seed` | Încarcă Timișoara: 30 de localuri (20 food + 10 drink), utilizatori, review-uri, scoruri, clasament lunar, premii (`-- --reset` șterge și reîncarcă) |
| `npm exec -- tsx --env-file-if-exists=.env seed/smoke.ts` | Rulează smoke testul cap-coadă pe `@tftd/api` cu DB-ul cu seed |
| `npm run dev -w @topfood/web` | Pornește aplicația web Next.js (`@topfood/web`) |
| `npm run build:web` | Compilează aplicația Next.js pentru producție |
| `npm run dev -w @tftd/worker` | Pornește worker-ul cu cele 6 task-uri programate (cron) |
| `npm test` | Rulează suita completă de teste Vitest |
| `npm run typecheck` | Verifică tipurile TypeScript în workspace |

---

## Structura proiectului

| Zonă | Pachet / Path | Rol |
|---|---|---|
| Frontend Next.js 15 | [`apps/web`](apps/web/README.md) (`@topfood/web`) | Pagini publice TopFood/TopDrink, Fidelitate QR, Scârnavii, profil `/u/[username]`, `/owner`, `/admin`, API OG/share |
| Worker programat | [`apps/worker`](apps/worker/README.md) (`@tftd/worker`) | 6 joburi `croner` (TZ `Europe/Bucharest`): ingestie, procesare linkuri, recalcul scoruri, clasament lunar |
| Contract API | [`packages/api`](packages/api/README.md) (`@tftd/api`) | Strat unic între `@topfood/web` / `@tftd/worker` și pachetele de domeniu |
| Bază de date | [`packages/db`](packages/db/README.md) (`@tftd/db`) | Drizzle ORM, 32 tabele (`schema.ts` + `ensure.ts`), Docker PostgreSQL + `pgvector` |
| Conturi & localnici | [`packages/accounts`](packages/accounts/README.md) (`@tftd/accounts`) | Auth cookie HMAC, verificare localnic (email univ / GPS / vouch), claim owner, verificare bio influencer |
| Ingestie externă | [`packages/ingestion`](packages/ingestion/README.md) (`@tftd/ingestion`) | Google Places, TripAdvisor, linkuri TikTok/Instagram/Facebook/YouTube, propuneri manuale |
| Deduplicare | [`packages/matching`](packages/matching/README.md) (`@tftd/matching`) | Potrivire surse externe pe localuri existente (Levenshtein + distanță + telefon) |
| Analiză review-uri | [`packages/review-analysis`](packages/review-analysis/README.md) (`@tftd/review-analysis`) | Limbă, 6 semnale de falsitate, cosine `pgvector(384)` / Jaccard, aspecte (Claude Haiku 5.5 sau cuvinte-cheie) |
| Scoruri & capcane | [`packages/scoring`](packages/scoring/README.md) (`@tftd/scoring`) | Scor onest Bayesian cu înjumătățire la 180 zile, indice capcană turistică, defalcare food/drink |
| Clasament lunar | [`packages/leaderboard`](packages/leaderboard/README.md) (`@tftd/leaderboard`) | Top 10 localnicii lunii, Top 10 food/drink, angajatul și localul nou al lunii |
| Dashboard patron | [`packages/owner`](packages/owner/README.md) (`@tftd/owner`) | Statistici zilnice, răspunsuri la review-uri, blog/oferte, echipă, videouri, checklist profil |
| Fidelitate QR | [`packages/loyalty`](packages/loyalty/README.md) (`@tftd/loyalty`) | Programe de ștampile, QR rotativ la 60s semnat HMAC, carduri personale |
| Monetizare & reclame | [`packages/monetization`](packages/monetization/README.md) (`@tftd/monetization`) | Parteneriate, locuri sponsorizate separate de top (max 3/oră, interzise capcanelor ≥ 80), sloturi `ad_slots` |
| Moderare & audit | [`packages/moderation`](packages/moderation/README.md) (`@tftd/moderation`) | Coadă rapoarte, bonuri de casă (`×1.3`), conturi suspecte, candidați potrivire |
| Date demo | [`seed`](seed/README.md) | Generare deterministă (`timisoara`, 30 localuri, conturi demo și conturi de test) |
| Identitate vizuală | [`design`](design/README.md) | Paletă, tipografie `Archivo`, tokeni `globals.css`, componente `BrandPrimitives` |

---

## Documentație

- [Arhitectură și reguli de produs](docs/ARHITECTURA.md) — viziunea, cele 6 reguli nenegociabile, modelul de date (32 tabele) și fluxurile de sistem
- [Backend — ghid de integrare](docs/BACKEND.md) — funcțiile `@tftd/api` folosite de frontend și worker, format răspunsuri și erori
- [Ghid demo (3–5 minute)](docs/DEMO.md) — scenariu pas cu pas cu conturi și URL-uri reale
- [Deploy în producție](docs/DEPLOY.md) — PostgreSQL + `pgvector`, Next.js, worker `croner`, checklist producție
- [Limbaj vizual & UI](design/README.md) — ghid în română (+ [Design Language Spec](design/design-language.md) în engleză și [design/tokens.json](design/tokens.json))
- [Android Native Porting Guide](docs/ANDROID-PORT.md) — contractul REST `/api/v1/*` ([OpenAPI 3.1](docs/openapi-v1.json)), autentificare `Bearer`, App Links și mapare ecrane Kotlin/Compose
- [Ghid de contribuție](CONTRIBUTING.md) și [CLAUDE.md](CLAUDE.md) — convenții de cod, testare și structură
