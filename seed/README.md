# `seed` — Date reale și verificare DB

Populează baza cu orașul **Timișoara** (zone turistice, 14 cartiere și prețuri de referință din [`config/cities/timisoara.json`](../config/cities/timisoara.json)) și **30 de locale reale** (20 `food` + 10 `drink`, din [`venues.ts`](venues.ts)). Nu creează useri, review-uri sau scoruri inventate: review-urile și ratingurile vin din Google Places (`npm run import:real`) și de pe site.

## Fișiere

| Fișier | Rol |
|---|---|
| [`load.ts`](load.ts) | Orașul + cele 30 de locale reale, apoi conturile de test. `-- --reset` șterge tot (doar pe baza locală) |
| [`test-accounts.ts`](test-accounts.ts) | Conturile cu care testăm: `test.user` / `TestUser2026!`, `test.owner` / `TestOwner2026!` (proprietar pe un local), `test.admin` / `TestAdmin2026!`. Doar pe baza locală |
| [`smoke.ts`](smoke.ts) | Test de fum cap-coadă pe `@tftd/api`, logat pe conturile de test, într-o tranzacție anulată la final (baza rămâne neschimbată) |
| [`generate.ts`](generate.ts) | Generator de review-uri sintetice **doar pentru testele unitare** ale algoritmilor (`scenarios.test.ts`); nu ajunge în bază |

## Comenzi

```bash
npm run seed -- --reset                                  # locale reale + conturi de test
npm run import:real                                      # ratinguri și review-uri reale (cu GOOGLE_PLACES_API_KEY în .env)
npm exec -- tsx --env-file-if-exists=.env seed/smoke.ts  # verificare cap-coadă
```
