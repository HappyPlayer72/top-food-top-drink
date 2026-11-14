# Ghid de contribuție

## Structura monorepo-ului

- `apps/web` (`@topfood/web`) — aplicația Next.js 15 (App Router, Tailwind CSS 4, MapLibre GL)
- `apps/worker` (`@tftd/worker`) — procesul de background cu 6 joburi `croner` (`Europe/Bucharest`)
- `packages/*` (`@tftd/*`) — 12 pachete TypeScript independente (`db`, `api`, `accounts`, `ingestion`, `matching`, `review-analysis`, `scoring`, `leaderboard`, `owner`, `loyalty`, `monetization`, `moderation`)
- `seed/` — scripturi de populare și smoke testing (`load.ts`, `test-accounts.ts`, `smoke.ts`)
- `config/cities/` — configurații per oraș (`timisoara.json`: zone turistice, cartiere, prețuri medii locale)
- `design/` — sistem de design, paletă și componente brand (`BrandPrimitives.tsx`)

## Reguli de dezvoltare

1. **Un singur strat între UI și domeniu**: `apps/web` și `apps/worker` importă exclusiv din `@tftd/api` (nu direct din tabelele interne sau din pachetele de business logic fără export în `@tftd/api`, cu excepția tipurilor/schemei unde e explicit necesar).
2. **Tipare și importuri ESM**: Toate pachetele folosesc `"type": "module"` și importuri cu extensia `.ts` (`"./honest.ts"`). Rulează `npm run typecheck` înainte de commit.
3. **Logica pură vs. DB**: Păstrează formulele și regulile în module pure fără I/O (ex: `honest.ts`, `trap.ts`, `rules.ts`, `match.ts`, `compute.ts`) cu funcții de persistență separate (`persist.ts`), ușor de testat unitar.
4. **Limba interfeței**: Toate textele vizibile utilizatorului, etichetele, categoriile și mesajele `ServiceError` sunt în **română** cu diacritice corecte (`ă`, `â`, `î`, `ș`, `ț`).
5. **Respectă cele 6 reguli de produs** din [`docs/ARHITECTURA.md`](docs/ARHITECTURA.md) (fără influențare plătită a scorului, fără ascundere de review-uri de către patroni).
6. **Nu introduce dependențe sau fișiere nefolosite** și folosește `design/README.md` / `apps/web/src/app/globals.css` pentru tokenii vizuali.

## Flux de lucru & verificare

```bash
# Verificare completă locală
npm test          # Toate testele unitare (Vitest)
npm run typecheck # Verificare TypeScript
npm run build:web # Build Next.js de producție

# Cu baza de date pornită
npm run db:up && npm run db:migrate && npm run seed -- --reset
npm exec -- tsx --env-file-if-exists=.env seed/smoke.ts
```

## Lucrul cu echipe / module

- Fiecare pachet din `packages/` și fiecare aplicație din `apps/` are propriul `README.md` cu exporturile și regulile sale. Actualizează `README.md`-ul modulului și [`docs/BACKEND.md`](docs/BACKEND.md) dacă schimbi semnătura unei funcții din `@tftd/api`.
- Pentru schimbări în schemă (`packages/db/src/schema.ts`), generează migrare cu `npm run db:generate` și menține compatibil `packages/db/src/ensure.ts` dacă adaugi tabele sau coloane runtime.
