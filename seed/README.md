# `seed` — Date reale și verificare DB

Populează baza cu orașul **Timișoara** (zone turistice, 14 cartiere și prețuri de referință din [`config/cities/timisoara.json`](../config/cities/timisoara.json)) și **30 de locale reale** (20 `food` + 10 `drink`, din [`venues.ts`](venues.ts)). Nu creează useri, review-uri sau scoruri inventate. Datele aduse din Google Places (184 de locale, 919 review-uri) sunt salvate în [`data/google-snapshot.json`](data/google-snapshot.json) și se încarcă **fără niciun apel Google**, deci nu ai nevoie de cheie.

## Fișiere

| Fișier | Rol |
|---|---|
| [`load.ts`](load.ts) | Orașul + cele 30 de locale reale, apoi conturile de test. `-- --reset` șterge tot (doar pe baza locală) |
| [`test-accounts.ts`](test-accounts.ts) | Conturile cu care testăm: `test.user` / `TestUser2026!`, `test.owner` / `TestOwner2026!` (pornește fără local, își revendică unul din `/owner`), `test.admin` / `TestAdmin2026!`. Doar pe baza locală |
| [`export-google.ts`](export-google.ts) | Salvează în snapshot ce e acum în bază după un import Google (rulat doar de cine face importul) |
| [`smoke.ts`](smoke.ts) | Test de fum cap-coadă pe `@tftd/api`, logat pe conturile de test, într-o tranzacție anulată la final (baza rămâne neschimbată) |
| [`generate.ts`](generate.ts) | Generator de review-uri sintetice **doar pentru testele unitare** ale algoritmilor (`scenarios.test.ts`); nu ajunge în bază |

## Comenzi

```bash
npm run seed -- --reset                                  # locale reale + conturi de test
npm run import:real                                      # doar simulează; cu IMPORT_CONFIRM=da cheamă Google (vezi docs/DEPLOY.md)
npm exec -- tsx --env-file-if-exists=.env seed/smoke.ts  # verificare cap-coadă
```

> Snapshot-ul conține review-uri Google cu numele autorilor: e pentru demo, în repo privat, și se șterge după hackathon.
