# `packages/review-analysis` (`@tftd/review-analysis`)

Detectează limba, semnalele de falsitate și aspectele menționate în fiecare review, fără a depinde obligatoriu de un API extern.

## Module ([`src/index.ts`](src/index.ts))

- [`src/rules.ts`](src/rules.ts) — Limbă, similaritate și probabilitate de falsitate:
  - `detectLanguage`: peste `20` de caractere folosește detecție rapidă pe diacritice românești + `franc-min`.
  - Embedding determinist de 384 dimensiuni (FNV-1a pe `vector(384)`) comparat prin `pgvector` (`<=>`, prag `>= 0.85`) sau Jaccard 3-shingle (`>= 0.60`).
  - 6 semnale combinate prin `1 - Π(1 - w_i)` (plafonat la `0.99`): `burst` (`0.35`), `similarText` (`0.40`), `newAccount` (`0.20`), `extremeOnly` (`0.20`), `ownerOrStaff` (`0.90`), `generic` (`0.15`).
- [`src/aspects.ts`](src/aspects.ts) — Extragere aspecte (`mâncare`, `servire`, `preț/calitate`, `atmosferă`, `băuturi`, `ambianță`) cu scor `-1..1`:
  - Folosește modelul `claude-haiku-5-5` dacă există cheie Anthropic (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_PROFILE` sau `~/.config/anthropic`); altfel folosește fallback determinist `keywordAspects`.
- [`src/persist.ts`](src/persist.ts) — `analyzeVenueReviews(db, venueId)` procesează și salvează rezultatele în `reviews`.
