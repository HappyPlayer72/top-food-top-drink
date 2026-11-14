# `packages/matching` (`@tftd/matching`)

Deduplică înregistrările din surse externe (Google Places, TripAdvisor, propuneri manuale) față de localurile existente în baza de date.

## Module ([`src/index.ts`](src/index.ts))

- [`src/match.ts`](src/match.ts) — Scor combinat de potrivire bazat pe similaritate de nume (Levenshtein normalizat), distanță geografică (Haversine) și potrivire număr de telefon.
- [`src/persist.ts`](src/persist.ts) — Leagă automat potrivirile sigure în `venue_sources` sau inserează cazurile incerte în `match_candidates` pentru revizuire în `/admin`.
