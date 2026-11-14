# TopFood & TopDrink — Arhitectură și Reguli de Produs

> **Un singur produs, două fețe**: **TopFood** (unde mănânci) și **TopDrink** (unde bei și ieși seara), ordonate după părerea verificată a localnicilor și protejate împotriva capcanelor turistice și a review-urilor fabricate.

Acest document descrie arhitectura implementată în monorepo, cele 6 reguli nenegociabile, modelul complet de date (32 de tabele PostgreSQL) și fluxurile de sistem.

---

## 1. Cele 6 reguli nenegociabile

1. **Scorul onest și indicele de capcană nu pot fi cumpărate.** Parteneriatele și sloturile plătite nu modifică niciodată `honest_score` sau `trap_index`.
2. **Patronii nu pot șterge, ascunde sau filtra review-urile.** Un manager/proprietar poate posta răspunsuri publice (`review_replies`) și poate raporta un review abuziv către moderare (`reports`), dar review-ul rămâne vizibil public până la o decizie explicită de moderare. Autorul își poate edita sau șterge propriul review.
3. **Sloturile sponsorizate sunt vizibil separate și interzise capcanelor.** Maxim `SPONSORED_SLOTS = 3` localuri promovate apar într-o bandă separată etichetată `"Sponsorizat"`, prin rotație orară, și sunt blocate automat dacă `trap_index >= 80`.
4. **Parteneriatele cu influenceri sunt transparente.** Orice review scris de un cont cu `is_influencer = true` primește automat `author_type = 'paid'` (`weight = 0.2`) și etichetă vizibilă `"Parteneriat plătit"`.
5. **Indicele de capcană arată întotdeauna motivele în română.** Scorul `trap_index` (0–100) este însoțit de lista `trap_reasons` (preț vs. media orașului, zonă turistică, decalaj localnici vs. turiști, limbă non-locală, vizitatori ocazionali).
6. **Linkurile sociale și propunerile externe nu se auto-publică fără analiză.** Linkurile TikTok / Instagram / Facebook / YouTube intră în `social_submissions` (`pending`) și trec prin ingestie + potrivire/moderare înainte de a fi atribuite unui local.

---

## 2. Arhitectura monorepo-ului

```text
  ┌─────────────────────────┐       ┌─────────────────────────────────┐
  │ apps/web (@topfood/web) │       │ apps/worker (@tftd/worker)      │
  │ Next.js 15 · React 19   │       │ croner (6 joburi programate)    │
  └────────────┬────────────┘       └───────────────┬─────────────────┘
               │  import exclusiv                   │
               ▼                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ packages/api (@tftd/api) — Contract unic (pagini, acțiuni, erori) │
  └─┬──────┬──────────┬──────────┬──────────┬──────────┬──────────┬──┘
    │      │          │          │          │          │          │
    ▼      ▼          ▼          ▼          ▼          ▼          ▼
accounts ingestion matching review-   scoring  leaderboard  owner /
                            analysis                        loyalty /
                                                            monetization /
                                                            moderation
    │      │          │          │          │          │          │
    └──────┴──────────┴──────────┴────┬─────┴──────────┴──────────┘
                                      ▼
                    ┌───────────────────────────────────┐
                    │ packages/db (@tftd/db)            │
                    │ Drizzle ORM · PostgreSQL + vector │
                    └───────────────────────────────────┘
```

### Pachete și aplicații

| Workspace | Nume pachet | Responsabilitate |
|---|---|---|
| [`apps/web`](../apps/web/README.md) | `@topfood/web` | Interfață Next.js App Router: `/topfood/timisoara`, `/topdrink/timisoara`, `/fidelitate`, `/scarnavii`, `/u/[username]`, `/owner`, `/admin`, OG & share API. Fallback pe [`apps/web/src/data/restaurants.ts`](../apps/web/src/data/restaurants.ts) fără Postgres |
| [`apps/worker`](../apps/worker/README.md) | `@tftd/worker` | Scheduler `croner` (TZ `Europe/Bucharest`) cu 6 sarcini recurente |
| [`packages/api`](../packages/api/README.md) | `@tftd/api` | Queries SSR (`cityPage`, `venuePage`, `leaderboardPage`), mutații comunitate, program funcționare (`openStatus`), re-export submodule domeniu |
| [`packages/db`](../packages/db/README.md) | `@tftd/db` | Schemă Drizzle (32 tabele), `createDb()`, `ensureExtendedSchema()`, `ServiceError`, container Docker `pgvector` |
| [`packages/accounts`](../packages/accounts/README.md) | `@tftd/accounts` | Auth (`scrypt` + cookie HMAC `tf_session`), 3 metode verificare localnic, claim owner, verificare bio influencer |
| [`packages/ingestion`](../packages/ingestion/README.md) | `@tftd/ingestion` | Google Places (New), TripAdvisor, oEmbed & coadă social (TikTok, Instagram, Facebook, YouTube), propuneri manuale |
| [`packages/matching`](../packages/matching/README.md) | `@tftd/matching` | Deduplicare surse externe după nume (Levenshtein), distanță (Haversine) și telefon + coadă candidați |
| [`packages/review-analysis`](../packages/review-analysis/README.md) | `@tftd/review-analysis` | Limbă (`franc-min` + diacritice RO), 6 semnale de falsitate, `pgvector(384)` / 3-shingle Jaccard, aspecte (`claude-haiku-5-5` sau cuvinte-cheie) |
| [`packages/scoring`](../packages/scoring/README.md) | `@tftd/scoring` | Scor onest Bayesian (`halfLife = 180 zile`), indice capcană (5 semnale), defalcare aspecte food și intervale orare drink |
| [`packages/leaderboard`](../packages/leaderboard/README.md) | `@tftd/leaderboard` | Înghețare lunară: Top 10 localnici, Top 10 food/drink, angajatul lunii, local nou |
| [`packages/owner`](../packages/owner/README.md) | `@tftd/owner` | Dashboard patron/angajat: statistici, răspunsuri review, blog/oferte, echipă, videouri, checklist profil |
| [`packages/loyalty`](../packages/loyalty/README.md) | `@tftd/loyalty` | Carduri de fidelitate cu ștampile și QR rotativ la 60s semnat HMAC |
| [`packages/monetization`](../packages/monetization/README.md) | `@tftd/monetization` | Parteneriate, locuri sponsorizate separate (max 3/oră, blocate la `trap >= 80`), sloturi `ad_slots` |
| [`packages/moderation`](../packages/moderation/README.md) | `@tftd/moderation` | Rapoarte review-uri, verificare bonuri de casă (`×1.3`), conturi suspecte, candidați potrivire |

---

## 3. Modelul de date (32 tabele PostgreSQL)

Definit în [`packages/db/src/schema.ts`](../packages/db/src/schema.ts) (28 tabele în migrații + 4 tabele extinse create idempotent și prin `ensureExtendedSchema` în [`packages/db/src/ensure.ts`](../packages/db/src/ensure.ts)):

- **Orașe și localuri (5)**: `cities` (configurare jsonb, ex: [`config/cities/timisoara.json`](../config/cities/timisoara.json)), `tourist_zones`, `venues` (`vertical`: `food|drink`, `honest_score`, `trap_index`, `trap_reasons`, `aspect_scores` jsonb, `opening_hours` jsonb), `venue_sources`, `match_candidates`.
- **Conturi, verificare localnic și patroni (7)**: `users` (`role`: `user|owner|admin`, `is_verified_local`, `is_influencer`), `user_social_links` (verificare cod bio `TFTD-XXXXXX`), `checkins`, `local_verifications`, `vouches`, `owner_claims`, `venue_managers`.
- **Conținut și evaluări (9)**: `reviews` (`author_type`: `local|tourist|paid`, `weight`, `fake_probability`, `embedding` `vector(384)`, `receipt_photo_url`, `receipt_status`), `review_replies`, `review_votes`, `posts` (`news|offer|event`), `employees`, `employee_ratings`, `social_submissions` (`tiktok|instagram|facebook|youtube`), `vibe_checks` (`1..5`, expiră la 2h), `menu_items`.
- **Fidelitate (3)**: `loyalty_programs`, `loyalty_cards`, `loyalty_stamps`.
- **Monetizare, clasament și audit (8)**: `partnerships`, `ad_slots`, `leaderboard_snapshots`, `reports`, `saved_venues`, `venue_views_daily`, `venue_score_snapshots`, `moderation_decisions`.

---

## 4. Formule și praguri implementate

### Scorul onest (`packages/scoring`)
- **Pondere autor**: localnic verificat `2.0`, utilizator cu experiență (`>= 10` review-uri) `1.5`, obișnuit `1.0`, cont nou (`<= 1` review) `0.3`, review plătit / influencer `0.2`.
- **Multiplicatori**: `verified_visit` (check-in la fața locului sau bon verificat) `×1.3`; `fake_probability` penalizează multiplicativ cu `1 - fake_probability`.
- **Decadere temporală**: înjumătățire exponențială la `180` zile (`exp(-ln(2) * ageDays / 180)`).
- **Medie Bayesiană**: `(Σ(w * rating) + 10 * priorMean) / (Σw + 10)` unde `PRIOR_WEIGHT = 10` și `MIN_TOTAL_WEIGHT = 5`. Sub pragul minim, scorul este marcat provizoriu și poate lipsi din topuri curate.
- **Defalcare verticală**:
  - `food`: aspecte `mâncare`, `servire`, `preț/calitate`, `atmosferă` (mapate `0..10` dacă există `>= 3` mențiuni).
  - `drink`: `overall`, `weekendNight` (vineri–duminică 21:00–05:00), `weekday` (luni–joi), `băuturi`, `ambianță`.

### Indicele de capcană turistică (`0..100`)
Praguri: `0–59` (`none`), `60–79` (`possible` — „Posibilă capcană"), `>= 80` (`trap` — „Capcană turistică"):
1. **Decalaj localnici vs. turiști** (până la **30 pct**): diferență `touristMean - localMean` în intervalul `0.5..3.0` (necesită ≥ 3 review-uri din fiecare categorie).
2. **Zonă turistică** (până la **20 pct**): distanță față de cea mai apropiată `tourist_zones` (`<= 300m` max, descrește liniar până la `800m`).
3. **Preț peste media locală** (până la **20 pct**): raport `preț / localAverage` între `1.05..1.60` (la drink compară berea 0.5L și cocktailul cu `config/cities/timisoara.json`).
4. **Proporție review-uri în altă limbă** (până la **15 pct**): ponderea review-urilor `language != 'ro'` între `0.15..0.70` (dacă sunt ≥ 5 review-uri).
5. **Vizitatori ocazionali** (până la **15 pct**): proporția autorilor cu un singur review în aplicație între `0.30..0.80`.

### Analiza review-urilor (`packages/review-analysis`)
6 semnale de falsitate combinate multiplicativ `1 - Π(1 - w_i)` (plafonat la `0.99`):
- `burst` (`0.35`): ≥ 5 review-uri în 24h cu deviație de la nota medie
- `similarText` (`0.40`): similaritate cosinus `pgvector(384)` `>= 0.85` sau Jaccard 3-shingle `>= 0.60`
- `newAccount` (`0.20`): cont creat de `<= 3` zile cu `<= 1` review anterior
- `extremeOnly` (`0.20`): review-uri exclusiv `1–2` sau `9–10`
- `ownerOrStaff` (`0.90`): autorul este manager sau angajat activ la același local
- `generic` (`0.15`): text foarte scurt (`< 25` caractere) sau formulă generică fără detalii

---

## 5. Rute și multi-oraș

- Datele și API-ul (`packages/db`, `@tftd/api`, `config/cities/*.json`) sunt multi-oraș din construcție (`citySlug`).
- În [`apps/web`](../apps/web/README.md), rutele publice implementate în prezent servesc orașul activ **Timișoara** (`/topfood/timisoara/...`, `/topdrink/timisoara/...`), alături de paginile globale `/fidelitate`, `/scarnavii`, `/u/[username]`, `/owner`, `/admin` și `/api/share/top-luna`.
