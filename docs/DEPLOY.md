# Deploy în producție

Proiectul rulează în 3 componente: **PostgreSQL 16 + pgvector**, aplicația web **Next.js (`@topfood/web`)** și procesul **Worker (`@tftd/worker`)**.

---

## 1. Bază de date PostgreSQL + `pgvector`

Imaginea Docker din [`packages/db/docker/Dockerfile`](../packages/db/docker/Dockerfile) pornește `postgres:16` cu extensia `vector` preinstalată. În producție (ex. Supabase, Neon, RDS, server propriu):
1. Activează extensia: `CREATE EXTENSION IF NOT EXISTS vector;`
2. Setează `DATABASE_URL` în mediul aplicației web și al worker-ului.
3. Aplică schema:
   ```bash
   npm run db:migrate
   ```
   *(Opțional, pentru date inițiale în Timișoara: `npm run seed`.)*
4. Dacă folosești un pooler extern (PgBouncer / Supabase Transaction Pooler), lasă `DATABASE_PREPARE=false` și ajustează `DATABASE_POOL_MAX` (implicit `10`).

---

## 2. Variabile de mediu obligatorii și opționale

Copiază [`.env.example`](../.env.example) și completează pentru producție:

| Variabilă | Obligatorie | Rol |
|---|---|---|
| `DATABASE_URL` | **Da** | Conexiunea PostgreSQL + pgvector |
| `SESSION_SECRET` | **Da** | Secret lung aleatoriu pentru semnarea cookie-ului `tf_session` și a QR-urilor de fidelitate |
| `SITE_URL` | **Da** | URL-ul public (folosit în `sitemap.xml`, `robots.txt` și OG tags), ex. `https://topfood.ro` |
| `GOOGLE_PLACES_API_KEY` | Recomandat | Descoperire și actualizare localuri prin Google Places API (New) |
| `TRIPADVISOR_API_KEY` | Opțional | Rating și surse TripAdvisor |
| `META_OEMBED_TOKEN` | Opțional | Extragere preview Instagram / Facebook oEmbed (`app_id\|client_token`) |
| `ANTHROPIC_API_KEY` | Opțional | Analiză aspecte cu Claude (`claude-haiku-5-5`); fără cheie, folosește fallback pe cuvinte-cheie |
| `STRIPE_SECRET_KEY` | Opțional | Rezervat pentru integrare billing externă |
| `DEMO_PASSWORD` / `DEMO_CLAIM_CODE` / `DEMO_SCAN` / `DEMO_EMAIL_CODES` | **Nu în prod** | Lăsate necompletate în producție! Nu păstra shortcut-uri de demo active |

---

## 3. Build & Pornire servicii

### Aplicația Web (`@topfood/web`)
```bash
npm ci
npm run build:web
npm run start -w @topfood/web
```
Rulează în spatele unui reverse proxy HTTPS (Caddy, Nginx, Cloudflare, Vercel/Railway).

### Worker programat (`@tftd/worker`)
```bash
npm exec -w @tftd/worker -- tsx --env-file-if-exists=.env src/main.ts
```
Rulează ca serviciu permanent (`systemd`, container separat sau process manager) cu `TZ=Europe/Bucharest`.
Pentru declanșarea manuală a unui job din cron extern:
```bash
npx tsx --env-file-if-exists=.env apps/worker/src/main.ts --once recalculeaza-scoruri
```

---

## 4. Checklist înainte de lansare

- [ ] `NODE_ENV=production` și `SESSION_SECRET` generat criptografic (`openssl rand -hex 32`)
- [ ] `DEMO_EMAIL_CODES`, `DEMO_SCAN`, `DEMO_CLAIM_CODE`, `DEMO_PASSWORD` eliminate/golite din mediul de producție
- [ ] `npm test` și `npm run typecheck` trec fără erori
- [ ] `npm run build:web` reușește cu `DATABASE_URL` accesibil
- [ ] Worker-ul `@tftd/worker` are conexiune la același `DATABASE_URL` și rulează continuu
- [ ] Backup automat configurat pentru PostgreSQL
