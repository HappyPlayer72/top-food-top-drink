# Ghid Demo (3–5 minute)

Scenariul parcurge punctele esențiale ale aplicației folosind datele deterministe din `timisoara` (`npm run seed -- --reset`).

> Localurile din seed sunt reale, dar notele, review-urile, răspunsurile despre facilități și voturile din seed sunt date demo ilustrative. Spune asta la prezentare.

---

## Pregătire înainte de prezentare

```bash
npm run db:up
npm run db:migrate
npm run seed -- --reset
npm exec -- tsx --env-file-if-exists=.env seed/test-accounts.ts   # creează test.user, test.owner, test.admin
npm run dev -w @topfood/web
```

Deschide în browser: **[http://localhost:3000/topfood/timisoara](http://localhost:3000/topfood/timisoara)**.

### Conturi disponibile după seed

| Rol | Username | Parolă | Utilizare demo |
|---|---|---|---|
| Patron verificat | `sandu.proprietar` | valoarea `DEMO_PASSWORD` din `.env` | Dashboard `/owner` pentru *Restaurant Nora* |
| Utilizator test | `test.user` | `TestUser2026!` | Scriere review, check-in, carduri fidelitate |
| Patron test | `test.owner` | `TestOwner2026!` | Flux revendicare local (`DEMO_CLAIM_CODE`, implicit `123456`) |
| Admin / Moderator | `test.admin` | `TestAdmin2026!` | Panoul `/admin` (rapoarte, bonuri, potriviri, parteneriate, reclame) |

> **Notă**: Dacă rulezi aplicația fără Postgres pornit, UI-ul comută automat pe setul static din [`apps/web/src/data/restaurants.ts`](../apps/web/src/data/restaurants.ts). Pentru demo-ul complet cu persistență (review nou, claim, bon, QR fidelitate), folosește baza de date.

---

## Scenariul de 4 minute

### 1. Descoperire & Capcane turistice — `/topfood/timisoara` (60s)
- Arată lista **TopFood Timișoara**: pe primul loc este **Restaurant Nora** (Iosefin, favorit al localnicilor, scor onest ~9.4).
- Arată banda **Sponsorizat** deasupra/separat: **Vinto Gastro Wine Bar** este etichetat clar `"Sponsorizat"`, fără să modifice clasamentul organic.
- Comută filtrul **„Fără capcane”** și arată cum localurile marcate ca **Capcană turistică** (ex. **Miorița**, unde localnicii dau ~4.9 și turiștii ~8.6, în Piața Unirii cu prețuri ridicate) sunt identificate cu motive explicite în română.
- Deschide harta interactivă (`Harta`) și compară zona Cetate vs. cartierele rezidențiale.

### 2. Pagina de local, transparență și review-uri — `/topfood/timisoara/restaurant-nora` (60s)
- Arată defalcarea pe aspecte (`Mâncare`, `Servire`, `Preț/Calitate`, `Atmosferă`), programul deschis/închis în timp real (`Europe/Bucharest`) și echipa localului.
- Arată filtrul de review-uri: **Localnici**, **Turiști**, **Influenceri** — la **Vinto Gastro Wine Bar** (`/topfood/timisoara/vinto-gastro-wine-bar`), review-ul de influencer are badge vizibil `"Parteneriat plătit"` și pondere redusă (`0.2×`).
- Arată **Harold's** (`/topfood/timisoara/harolds-restaurant`) pentru detecția rafalei de review-uri false (`fake_probability` ridicat).

### 3. TopDrink, vibe în timp real & Scârnavii — `/topdrink/timisoara` (60s)
- Comută pe **TopDrink** (`/topdrink/timisoara`) — întreaga temă trece pe verde sticlă (`#17382C`) cu accente chihlimbar (`#F2A33A`).
- Deschide **The 80's Pub** (`/topdrink/timisoara/the-80s-pub`): scorul este defalcat între **Weekend noaptea** (~9.1) și **În cursul săptămânii** (~6.0), cu **Vibe Check** live (expiră la 2 ore).
- Vizitează **`/topdrink/timisoara/weekend`** pentru evenimentele viitoare și **`/scarnavii`** pentru cele 6 jocuri de masă/recomandare în grup.

### 4. Fidelitate QR, Patron & Moderare — `/fidelitate`, `/owner`, `/admin` (60s)
- **`/fidelitate`**: arată cardurile de ștampile și codul QR rotativ la 60 de secunde (semnat HMAC).
- **`/owner`** (logat cu `sandu.proprietar`): arată statisticile zilnice, invitațiile de echipă, postările/ofertele și regula nr. 2 — proprietarul poate **răspunde** public la review-uri sau le poate **raporta**, dar **nu le poate șterge sau ascunde**.
- **`/admin`** (logat cu `test.admin`): arată coada de rapoarte, aprobarea bonurilor de casă (care oferă multiplicator `×1.3`), candidații de potrivire și gestionarea parteneriatelor/reclamelor (unde o capcană turistică cu `trap >= 80` este respinsă automat).
- Bonus vizual: **`/topfood/timisoara/top-luna`** și exportul vertical 9:16 de share (`/api/share/top-luna?vertical=food`).
