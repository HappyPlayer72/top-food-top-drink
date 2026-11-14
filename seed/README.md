# `seed` — Date demo și verificare DB

Populează baza de date PostgreSQL cu orașul **Timișoara** (zone turistice, 14 cartiere și prețuri de referință din [`config/cities/timisoara.json`](../config/cities/timisoara.json)), 30 de localuri (20 `food` + 10 `drink`), utilizatori, review-uri, verificări, echipă, postări, vibe check-uri, scoruri calculate și clasamentul lunar.

## Scripturi disponibile

| Fișier | Rol |
|---|---|
| [`load.ts`](load.ts) | Încarcă datasetul determinist Timișoara (`venues.ts` + `generate.ts`). Suportă `-- --reset` pentru ștergere curată înainte de reîncărcare |
| [`test-accounts.ts`](test-accounts.ts) | Creează / resetează 3 conturi fixe de test (`test.user` / `TestUser2026!`, `test.owner` / `TestOwner2026!`, `test.admin` / `TestAdmin2026!`) |
| [`smoke.ts`](smoke.ts) | Test de fum cap-coadă care apelează `@tftd/api` ca o pagină reală și verifică regulile de produs pe DB-ul cu seed |

> `SEED_USE_CLAUDE=1` cu `ANTHROPIC_API_KEY` activă folosește Claude în timpul seed-ului pentru analiza aspectelor; implicit analiza de aspecte folosește fallback-ul determinist rapid pe cuvinte-cheie.

## Comenzi

```bash
# Încărcare inițială (sau reset complet)
npm run seed
npm run seed -- --reset

# Conturi fixe de test (opțional)
npm exec -- tsx --env-file-if-exists=.env seed/test-accounts.ts

# Smoke test complet pe DB
npm exec -- tsx --env-file-if-exists=.env seed/smoke.ts
```
