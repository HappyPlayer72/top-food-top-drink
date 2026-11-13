# Backend și date — cum îl folosești

Tot backend-ul e TypeScript, în `packages/*`, și se importă direct din `apps/web` (fără server API separat).
Pentru pagini, folosește **doar `@tftd/api`**: o funcție per pagină + acțiunile userilor.

## Pornire locală

```bash
npm install
cp .env.example .env          # completează SESSION_SECRET
npm run db:up                 # Postgres + PostGIS + pgvector în Docker
npm run db:migrate            # creează tabelele
npm run seed                  # 30 de locale inventate + review-uri + scoruri + topul lunii trecute
npm test                      # testele
```

`npm run seed -- --reset` șterge tot și reîncarcă. Worker-ul cu joburi: `npm run start -w @tftd/worker`;
un job o dată: `npm run job -w @tftd/worker -- leaderboard-lunar`.

## Ce cheamă Frontend-ul (`@tftd/api`)

```ts
import { createDb, cityPage, venuePage, leaderboardPage, weekendEvents, userProfile, writeReview, submitVibe, accounts, owner } from "@tftd/api";
const db = createDb(); // o singură instanță per proces

await cityPage(db, { citySlug: "timisoara", vertical: "food", noTraps: true });
// → { city, reviewCount, top[] (rank, scoruri, trapLevel), sponsored[] (SEPARAT de top), traps[] (cu motive) }

await venuePage(db, { citySlug: "timisoara", vertical: "food", slug: "ciorba-lui-sandu", reviews: "local" });
// → { venue, scores (honest, locals, tourists, touristTrapIndex, explanation, byTime la drink), isPartner,
//     reviewCounts, reviews[] (+ replies), blog[], team[], videos[], externalRatings[], vibe (drink) }

await leaderboardPage(db, { citySlug: "timisoara", vertical: "food" });          // luna cea mai recentă
await leaderboardPage(db, { citySlug: "timisoara", vertical: "food", month: "2026-10", category: "pizza" });
await weekendEvents(db, "timisoara");
await userProfile(db, "andreea0");
```

| Rută | Funcție |
| --- | --- |
| `topfood/{oras}`, `topdrink/{oras}` | `cityPage` |
| `…/categorie/{cat}` | `cityPage` cu `category` |
| `…/{slug}` | `venuePage` (filtrul `reviews`: `local` / `tourist` / `influencer` / `all`) |
| `…/top-luna`, `…/top-luna/{luna}` | `leaderboardPage` |
| `topdrink/{oras}/weekend` | `weekendEvents` |
| `/u/{username}` | `userProfile` |

### Acțiuni

| Ce face userul | Funcție |
| --- | --- |
| Cont nou / login | `accounts.register`, `accounts.login`, apoi `accounts.createSessionToken(user.id)` în cookie; `accounts.verifySessionToken(cookie)` → userId |
| Check-in (devine localnic după 5 zile din 30) | `accounts.checkinFromLocation(db, userId, { lat, lng })` — coordonatele NU se salvează |
| Localnic prin email universitar | `accounts.startUniversityEmail` → trimiți codul pe email → `accounts.confirmUniversityEmail` |
| Garantează pentru alt localnic | `accounts.vouch` |
| Conectează TikTok/Instagram (influencer) | `accounts.linkSocialAccount` (`verified: true` doar după OAuth) |
| Revendică localul | `accounts.startClaim(..., "phone_code")` → `accounts.confirmClaim` (la demo codul e `DEMO_CLAIM_CODE`) |
| Scrie review | `writeReview(db, userId, { venueId, rating: 1–10, text, weekendNight?, servedByEmployeeId?, employeeRating? })` |
| „Cât e de plin acum” | `submitVibe(db, userId, venueId, 1–5)` |
| Lipește link TikTok/Instagram | `submitSocialLink(db, { venueId, url, userId })` (îl procesează worker-ul) |
| Owner: răspuns, raportare, blog, angajați, statistici | `owner.replyToReview`, `owner.reportReview`, `owner.createPost`, `owner.inviteEmployee`, `owner.venueStats`, `owner.employeeRatingsForOwner` |
| Owner: parteneriat | `monetization.buyPartnership` (Highlight refuzat la capcane și review-uri suspecte) |
| Admin | `moderation.queue`, `moderation.resolveReport`, `moderation.decideMatch`, `moderation.decideClaim` |


### Nou: fidelitate, căutare pe internet, localuri adăugate de useri, „util”, meniu

| Ce face userul | Funcție |
| --- | --- |
| Caută un local (la noi + pe Google) | `searchPlaces(db, { citySlug, vertical, query, center })` → `{ onPlatform, fromInternet }` (internetul doar cu `GOOGLE_PLACES_API_KEY`) |
| Adaugă un local găsit pe Google | `addFromGoogle(db, userId, { citySlug, vertical, placeId })` → intră direct |
| Adaugă un local de mână | `addManually(db, userId, { ..., name, address, lat, lng })` → „în așteptare” până aprobă adminul (`moderation.resolveReport(..., "accept")`); duplicatele sunt recunoscute |
| Revendică localul (owner) | `accounts.startClaim` / `accounts.confirmClaim`, ca înainte |
| Vot „util” pe review | `toggleHelpful(db, userId, reviewId)` |
| Top recenzenți | `topReviewers(db, "timisoara")` |
| Fidelitate: owner creează cardul | `loyalty.createVenueProgram(db, ownerId, venueId, { rewardTitle, stampsRequired, icon })` |
| Fidelitate: ecranul owner-ului cu QR | `loyalty.currentStampCode(db, ownerId, programId)` → `{ code, expiresInSeconds }` (codul se schimbă la fiecare minut; afișează-l ca QR) |
| Fidelitate: clientul scanează | `loyalty.scanCode(db, userId, code)` → +1 ștampilă sau premiul (max o ștampilă pe zi) |
| Fidelitate: card personal (local care nu e la noi) | `loyalty.createPersonalCard`, `loyalty.addPersonalStamp` |
| Portofelul userului | `loyalty.myCards(db, userId)` |
| Owner: meniu, poze, text, program | `owner.setMenu`, `owner.updatePresentation` |

`venuePage` întoarce acum și `menu`, `aspectScores` (0–10 pe mâncare, servire, preț…), `loyalty`, `venue.photos`, `venue.headline`, `venue.writeup`, `venue.openNow`, `venue.openLabel` („Deschis până la 23:00”), `venue.hoursText`, iar fiecare review are `helpfulCount`. `cityPage` dă pe fiecare card `openNow`, `openLabel`, `photo`, `aspectScores`.

Erorile pentru user sunt `ServiceError` cu `code` (`not_found`, `forbidden`, `invalid`, `conflict`, `unauthorized`) și mesaj în română, gata de afișat.

## Pe module

| Pachet | Ce face |
| --- | --- |
| `db` | schema (Drizzle), migrațiile, `ServiceError` |
| `ingestion` | Google Places, Tripadvisor, linkuri sociale prin oEmbed |
| `matching` | același local pe mai multe platforme; cazurile nesigure → admin |
| `review-analysis` | limbă, local/turist, reclamă, semnale de fals, aspecte (Claude Haiku sau dicționar) |
| `scoring` | ponderi, Scor Onest, Localnici/Turiști, Tourist Trap Index + motive |
| `leaderboard` | topul lunar înghețat + premii |
| `accounts`, `owner`, `monetization`, `moderation` | serviciile de backend |
| `api` | contractul cu `apps/web` |
| `apps/worker` | cele 5 joburi programate |

Regula 1 e verificată de un test (`packages/scoring/src/rule1.test.ts`): `scoring` și `leaderboard` nu citesc nimic din monetizare.
