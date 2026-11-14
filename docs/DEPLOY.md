# Pus online: Neon (baza de date) + Vercel (site)

Pașii pentru când avem conturile. Durează ~20 de minute. Nimic din cod nu trebuie schimbat.

## 1. Baza de date pe Neon

1. Cont pe [neon.tech](https://neon.tech) → proiect nou, regiunea **Frankfurt (eu-central-1)**, Postgres 16.
2. Din „Connection details” copiază două adrese:
   - **directă** (fără `-pooler`): pentru migrații și seed, de pe laptop;
   - **pooled** (cu `-pooler` în nume): pentru site, pe Vercel.
3. Pe laptop, cu adresa **directă**:

   ```bash
   DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npm run db:migrate
   DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npm run seed -- --reset
   ```

   Migrația inițială creează singură extensiile `postgis` și `vector`; Neon le are pe amândouă.

> Supabase merge la fel: adresa directă e pe portul 5432, cea prin pool pe 6543. Extensiile se activează din Database → Extensions dacă migrația nu are drepturi.

## 2. Site-ul pe Vercel

1. Cont pe [vercel.com](https://vercel.com) cu GitHub → **Add New Project** → repo-ul `top-food-top-drink`.
2. **Root Directory:** `apps/web`. Lasă bifat „Include files outside of the Root Directory” (pachetele `@tftd/*` sunt în rădăcină).
3. **Environment Variables:**

| Variabilă | Valoare |
| --- | --- |
| `DATABASE_URL` | adresa **pooled** de la Neon (cu `-pooler`) |
| `DATABASE_POOL_MAX` | `3` |
| `SESSION_SECRET` | 48+ caractere aleatorii (`openssl rand -base64 48`). Fără ea, login-ul nu merge |
| `SITE_URL` | adresa site-ului, ex. `https://topfood-timisoara.vercel.app` |
| `DEMO_PASSWORD` | `demo1234` (sau alta, aceeași ca la seed) |
| `DEMO_SCAN` | `on` pentru demo; `off` după hackathon |
| `DEMO_EMAIL_CODES` | `on` pentru demo; `off` când avem serviciu de email |
| `GOOGLE_PLACES_API_KEY` | opțional: „caută pe internet” + localuri reale |
| `ANTHROPIC_API_KEY` | opțional: aspectele review-urilor cu Claude (altfel dicționarul) |

4. **Deploy.** Build-ul local trece (`npm run build:web`), deci ar trebui să treacă și acolo.
5. Verifică: `/topfood/timisoara`, un local (`/topfood/timisoara/ciorba-lui-sandu`), login cu un cont demo, `/owner`, `/sitemap.xml`.

## 3. Localuri reale din Timișoara (când avem cheia Google)

```bash
# în .env: DATABASE_URL (directă) + GOOGLE_PLACES_API_KEY
npm run import:google
```

Rulează două joburi: `descopera-locale` (caută restaurante și baruri pe o rază de 6 km și le potrivește cu ce avem) și `actualizeaza-ratinguri` (ratinguri + review-uri Google/Tripadvisor, apoi analiza și scorurile). Costă câteva cereri Google Places; cheia trebuie restricționată la Places API (New).

## 4. Joburile programate (după hackathon)

Worker-ul (`apps/worker`) rulează cele 5 joburi cu cron. Pe Vercel nu stă pornit permanent, deci:
- pentru demo: nu e nevoie (seed-ul are deja tot, inclusiv topul lunii trecute);
- după: worker-ul pe Railway/Render/Fly (`npm run start -w @tftd/worker`, aceleași variabile), sau Vercel Cron care cheamă rute API.

## Probleme cunoscute

- **„prepared statement … does not exist”**: `DATABASE_URL` e prin pool dar nu conține `-pooler`/`:6543`; pune `DATABASE_PREPARE=false`.
- **Login-ul nu ține minte sesiunea**: lipsește `SESSION_SECRET` sau are sub 32 de caractere.
- **Pagini goale/date statice**: site-ul nu ajunge la bază (vezi Logs în Vercel); fără bază folosește datele statice, deci nu crapă, dar nu arată datele reale.
