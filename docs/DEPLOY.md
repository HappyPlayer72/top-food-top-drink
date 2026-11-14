# Deploy în producție

Trei componente: **PostgreSQL 16 cu PostGIS + pgvector**, site-ul **Next.js (`@topfood/web`)** și, după hackathon, **worker-ul (`@tftd/worker`)**. Pentru demo e nevoie doar de primele două: datele reale sunt deja în `seed/data/google-snapshot.json`.

Recomandat: **Neon** (baza) + **Vercel** (site). Durează ~15 minute. Conturile le face cineva din echipă; nimic din cod nu trebuie schimbat.

---

## 1. Baza de date (Neon)

1. Proiect nou pe [neon.tech](https://neon.tech), regiunea **Frankfurt (eu-central-1)**, Postgres 16.
2. Din „Connection details” ia două adrese: **directă** (fără `-pooler`, pentru migrații și seed de pe laptop) și **pooled** (cu `-pooler`, pentru Vercel).
3. De pe laptop, cu adresa **directă**:

   ```bash
   DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npm run db:migrate
   DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npm run seed
   ```

   - Migrația inițială creează extensiile `postgis` și `vector` (Neon le are pe amândouă).
   - `npm run seed` încarcă cele 184 de locale și 919 review-uri din snapshot, **fără niciun apel Google**. Pe o bază online seed-ul nu șterge nimic (`--reset` e refuzat) și nu creează conturile de test.

> Supabase merge la fel: adresa directă e pe portul 5432, cea prin pool pe 6543 (codul detectează singur și oprește prepared statements).

---

## 2. Site-ul (Vercel)

1. **Add New Project** → repo-ul `top-food-top-drink`, **Root Directory** `apps/web`, cu „Include files outside of the Root Directory” bifat (pachetele `@tftd/*` sunt în rădăcină).
2. **Environment Variables:**

| Variabilă | Ce pui | De ce |
|---|---|---|
| `DATABASE_URL` | adresa **pooled** de la Neon | conexiunea la bază |
| `DATABASE_POOL_MAX` | `3` | funcțiile serverless deschid multe conexiuni |
| `SESSION_SECRET` | 48+ caractere aleatorii (`openssl rand -base64 48`) | fără ea login-ul nu merge |
| `SITE_URL` | ex. `https://topfood-timisoara.vercel.app` | sitemap, linkuri canonice, imagini de share |
| `GEOAPIFY_API_KEY` | cheia Geoapify | coordonatele unui local adăugat de mână |
| `GOOGLE_PLACES_API_KEY` | **doar dacă** vrei „Caută și pe internet” live | max 3 căutări per cont la 2 zile și 100/zi pe tot site-ul (vezi mai jos) |
| `DEMO_LOGIN`, `DEMO_SCAN`, `DEMO_EMAIL_CODES`, `DEMO_VISIT_GPS` | `off` după demo | scurtăturile de demo (pentru prezentare pot rămâne `on`) |
| `GOOGLE_ROUTES_API_KEY` | nu pune | nu mai e folosită: „Turul de gust” calculează traseul și prețul local (estimare demo), fără Google |
| `TRIPADVISOR_API_KEY` | nu pune | nu îl folosim (nu are variantă gratuită) |

3. **Deploy.** Build-ul trece local (`npm run build:web`), inclusiv pe Windows.
4. Verifică: `/topfood/timisoara`, un local (`/topfood/timisoara/restaurant-nora`), `/topdrink/timisoara`, `/owner`, `/sitemap.xml`.

---

## 3. Google Places: cine poate cheltui și cât

Cheia Google e una singură și costă bani peste pragul gratuit (~1.000 de cereri cu review-uri pe lună). De aceea:

- **Colegii nu au nevoie de cheie.** Datele sunt în `seed/data/google-snapshot.json`; `npm run seed` le încarcă local.
- **Importul nu pornește din greșeală.** `npm run import:real` fără `IMPORT_CONFIRM=da` doar spune câte cereri ar face și se oprește. Pe o bază care nu e locală refuză, dacă nu pui și `IMPORT_TARGET=online`. Se oprește singur la `IMPORT_MAX_REQUESTS` (implicit 300). Implicit e mic și incremental (`IMPORT_MAX_PAGES=1`, `IMPORT_SKIP_FRESH_HOURS=24`).

  ```bash
  npm run import:real                         # simulare: nicio cerere
  IMPORT_CONFIRM=da npm run import:real       # rulează, max 300 de cereri
  npx tsx --env-file-if-exists=.env seed/export-google.ts   # salvează rezultatul în snapshot, apoi commit
  ```

- **Pe site**, „Caută și pe internet” cheamă Google doar pentru un cont logat: max **3 căutări la 48 de ore** per cont și **100 de cereri pe zi** pe tot site-ul (`packages/ingestion/src/google-limits.ts`). „Adaugă de pe Google” merge doar pentru un loc găsit de același cont.
- **În Google Cloud** (o dată, de proprietarul cheii):
  1. APIs & Services → Credentials → cheia → **API restrictions**: doar *Places API (New)*.
  2. APIs & Services → Places API (New) → **Quotas**: plafon pe zi (ex. 500 de cereri).
  3. Billing → **Budgets & alerts**: alertă la 5 USD.

---

## 4. Worker-ul (după hackathon)

Pe Vercel nu stă pornit permanent. Pentru demo nu e nevoie. După: `npm run start -w @tftd/worker` pe Railway/Render/Fly, cu aceleași variabile și `TZ=Europe/Bucharest`. Joburile Google din el se opresc singure fără `IMPORT_CONFIRM=da`, deci un worker pornit nu cheltuie nimic fără să vrei.

---

## 5. Înainte de lansare

- [ ] `npm test`, `npm run typecheck`, `npm run build:web` trec
- [ ] `SESSION_SECRET` generat aleatoriu; `DEMO_*` pe `off` după prezentare
- [ ] Restricțiile și plafonul pe cheia Google sunt puse (pasul 3)
- [ ] Backup automat la bază (Neon îl are inclus)
- [ ] După hackathon: șterge `seed/data/google-snapshot.json` (termenii Google limitează păstrarea review-urilor, iar review-urile conțin numele autorilor)

## Probleme cunoscute

- **„prepared statement … does not exist”**: adresa e prin pool dar nu conține `-pooler` / `:6543`; pune `DATABASE_PREPARE=false`.
- **Login-ul nu ține minte sesiunea**: lipsește `SESSION_SECRET` sau e prea scurt.
- **Localuri fără scor/review-uri**: site-ul nu ajunge la bază (vezi Logs în Vercel). Fără bază arată doar informațiile reale din datele statice, fără note.
