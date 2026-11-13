# TOP FOOD / TOP DRINK

`topfood/timisoara` arată unde mănânci bine după localnici, nu după turiști sau review-uri cumpărate. `topdrink/timisoara` face același lucru pentru baruri și cluburi.

Arhitectura completă (reguli, module, formule de scor, model de date, MVP): [`docs/ARHITECTURA.md`](docs/ARHITECTURA.md).

## Echipa și branch-uri

Fiecare membru lucrează pe branch-ul lui și deschide Pull Request spre `main`.

| Membru | Branch | Rol (din arhitectură) |
| --- | --- | --- |
| Oli | `oli` | Project manager |
| Serban | `serban` | Impersoneaza alti serbani |
| Adi | `adi` | Backend + Date / AI (vezi [`docs/BACKEND.md`](docs/BACKEND.md)) |
| Alex | `alex` | tasteaza pe pisici |

Rolurile propuse: **Frontend** (F + UI pentru E, G) · **Backend** (E, G, H, J + modelul de date) · **Date / AI** (A, B, C, D, I) · **Design / Produs / Pitch** (identitate, seed, demo). Completați coloana de mai sus după ce vă împărțiți.

## Structura repo-ului

```
apps/
  web/                Next.js — pagini publice, /owner, /admin           (F, UI pentru E, G)  Frontend
  worker/             coadă + cron: cele 5 joburi programate                                Date/AI
packages/
  db/                 schema PostgreSQL + PostGIS + pgvector — PRIMUL livrabil             Backend
  ingestion/          A. Ingestie (Google Places, Tripadvisor, linkuri trimise)            Date/AI
  matching/           B. Potrivire locale între platforme                                   Date/AI
  review-analysis/    C. Analiză review (limbă, local/turist, sentiment, fals, plătit)     Date/AI
  scoring/            D. Scor Onest, Localnici/Turiști, Tourist Trap Index                  Date/AI
  leaderboard/        I. Leaderboard lunar înghețat                                         Date/AI
  accounts/           E. Conturi, roluri, localnic verificat, revendicare owner             Backend
  owner/              G. Mini-blog, angajați, răspunsuri, statistici                        Backend
  monetization/       H. Parteneriate, sloturi Sponsorizat, reclame                         Backend
  moderation/         J. Moderare / Admin                                                   Backend
config/cities/        un fișier per oraș (oraș nou = doar config)
seed/                 30 de locale seed din Timișoara (20 food, 10 drink)                   Design/Produs
design/               identitate vizuală, tokens, machete                                   Design/Produs
docs/                 arhitectura
```

**Regula tehnică nr. 1:** `packages/scoring` și `packages/leaderboard` nu importă niciodată din `packages/monetization`. Plata nu schimbă scorul și nici poziția în clasament.

## Ordinea de start

1. Backend livrează schema în `packages/db`.
2. Restul în paralel: Date/AI pe scoring + seed, Frontend pe pagini, Design pe machete (gata până la jumătatea hackathon-ului).

Vezi lista MVP în [`docs/ARHITECTURA.md`](docs/ARHITECTURA.md#împărțirea-pe-echipă-și-mvp-ul-de-hackathon) și fluxul de lucru în [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Configurare locală

Copiază `.env.example` în `.env` și completează cheile. Nu face commit la `.env`.
