# `apps/web` (`@topfood/web`)

Aplicația web **TopFood & TopDrink** construită cu **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS 4**, **MapLibre GL**, `qrcode` și `lucide-react`.

## Rute implementate

### Publice (oraș activ: `timisoara`)
- `/` — Pagina principală (`TopFood` Timișoara)
- `/topfood/timisoara` și `/topdrink/timisoara` — Listare localuri cu filtre (categorie, cartier, preț, deschis acum, fără capcane), căutare fără diacritice, hartă interactivă MapLibre și bandă separată `"Sponsorizat"`
- `/topfood/timisoara/[slug]` și `/topdrink/timisoara/[slug]` (+ `opengraph-image.tsx`) — Pagină detaliată local: scor onest, defalcare aspecte / intervale orare, motive capcană turistică, vibe check live, meniu, echipă, blog/oferte, videouri și review-uri filtrabile (`local`, `tourist`, `influencer`, `all`)
- `/topfood/timisoara/categorie/[category]` și `/topdrink/timisoara/categorie/[category]` — Pagini dedicate pe categorie
- `/topfood/timisoara/top-luna`, `/topfood/timisoara/top-luna/[month]`, `/topdrink/timisoara/top-luna`, `/topdrink/timisoara/top-luna/[month]` (+ `opengraph-image.tsx`) — Clasamentul lunar (Top 10 localuri, localnici, angajatul lunii, local nou)
- `/topdrink/timisoara/weekend` — Evenimente și oferte de weekend
- `/fidelitate` — Carduri de fidelitate cu ștampile, scanner cameră QR și introducere manuală cod
- `/scarnavii` — 6 minigame-uri și instrumente de recomandare pentru ieșiri în grup (`who-pays`, `taste-duel`, `trap-blitz`, `table-dares`, `preferences`, `mystery`)
- `/u/[username]` — Profil public utilizator (status localnic / influencer, conturi sociale verificate, review-uri și localuri salvate)

### Patron, Admin și API
- `/owner`, `/owner/[venueId]`, `/owner/[venueId]/[section]` (`statistici`, `review-uri`, `blog`, `echipa`, `videouri`, `fidelitate`) — Portal pentru proprietari/angajați și revendicări local
- `/admin` — Panou de moderare și operațiuni (rapoarte, bonuri de casă, conturi suspecte, candidați potrivire, parteneriate, sloturi `ad_slots`)
- `/api/share/top-luna` — Endpoint `GET` (`?vertical=food|drink&month=...`) ce generează imaginea verticală 1080×1920 pentru share
- `/sitemap.xml` și `/robots.txt` — SEO (`robots.txt` blochează `/owner` și `/admin`)

## Integrare backend & Mod offline

- Toate datele și mutațiile trec prin [`apps/web/src/lib/backend/load.ts`](src/lib/backend/load.ts) și `apps/web/src/app/actions/*`, care apelează **`@tftd/api`** folosind sesiunea din cookie-ul HMAC `tf_session`.
- Dacă PostgreSQL nu este pornit sau `DATABASE_URL` lipsește, aplicația face fallback automat la setul static din [`apps/web/src/data/restaurants.ts`](src/data/restaurants.ts) (`INITIAL_RESTAURANTS`, `DRINK_VENUES`, `WEEKEND_EVENTS`, `TOP_LOCAL_REVIEWERS`).

## Comenzi

```bash
npm run dev -w @topfood/web
npm run build:web
npm run start -w @topfood/web
```
