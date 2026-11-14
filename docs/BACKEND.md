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

### Vizită verificată (review ×1,3)

| Ce face userul | Funcție |
| --- | --- |
| „Sunt aici acum” la local (max. 100 m; se salvează doar ziua) | `visits.checkInAtVenue(db, userId, venueId, { lat, lng })` (demo: `{ simulate: true }`, în site prin `DEMO_VISIT_GPS`). Review-ul din aceeași zi devine verificat și dacă check-in-ul vine după |
| Atașează poza bonului la review-ul lui | `visits.submitReceipt(db, userId, reviewId, bytes)` (JPEG/PNG/WebP, max 2 MB; același bon nu merge de două ori) |
| Admin: coada de bonuri, poza, decizia | `visits.receiptQueue`, `visits.receiptImage`, `visits.decideReceipt(db, adminId, proofId, approve, note)` → aprobat: `verifiedVisit` + recalcul; poza se șterge oricum |

Tabelul nou `visit_proofs` și coloana `reviews.verified_via` (`gps` / `receipt`) vin din migrarea `0004_visit_proofs`. Pozele fără decizie după 30 de zile se șterg în jobul de noapte `recalculeaza-scoruri`. `venuePage` dă `verifiedVia` pe fiecare review, iar `scoreExplanation.verifiedVisitCount` câte review-uri au vizita verificată.

### Anti-bot la review-uri

Algoritmul complet: [`docs/ANTI-BOT.md`](ANTI-BOT.md). Pe scurt: `writeReview(db, userId, input, now, client)` cu `client = { formToken, honeypot, clientHash }` trece prin poarta din `antibot.ts` (token de formular din `antibot.issueReviewFormToken`, câmp capcană, limite per cont/dispozitiv). Analiza adaugă semnalele de bot la `fakeSignals`; un review aproape sigur bot primește `status: "flagged"` și un raport automat în `/admin` („Păstrează” îl publică și îl marchează `bot_cleared`). Migrarea `0005_anti_bot`: tabelul `review_submissions` + `reviews.bot_cleared`. După o decizie pe un review, `refreshAfterModeration(db, reviewId)` recalculează scorul.

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

## Legătura site → backend (pentru Alex)

Ce e gata:
- `apps/web/src/lib/backend/load.ts` citește pe server toate datele pentru shell (localuri food + drink, evenimente, top recenzenți). Fără `DATABASE_URL` sau dacă baza nu răspunde, întoarce `null` și site-ul folosește datele statice din `src/data`.
- `apps/web/src/lib/backend/toRestaurant.ts` transformă datele din backend în tipul `Restaurant` din `src/types.ts`. Ce nu e încă în DB (poze, texte editoriale) se ia din datele statice, după slug.
- Toate paginile (`page.tsx`) cheamă `loadShellData()` și dau datele la `TopFoodShell` ca props. Componentele n-au fost rescrise; `TopFoodShell` și `MonthlyTopView` primesc doar props opționale noi.
- `next.config.ts` citește `.env` din rădăcină și transpilează pachetele `@tftd/*`.

Acțiunile userilor de pe site-ul public (gata, 13 nov seara):

| Ce face userul | Server Action | Unde e legat |
| --- | --- | --- |
| Login / cont nou / conturi demo | `loginUser`, `registerUser`, `loginDemo`, `logoutUser` (`app/actions/user.ts`) | `LoginScreen` (prop `authenticate`), `TopFoodShell` |
| Scrie review | `submitReview` → `writeReview` + recalcul scor | `RestaurantDetailModal` → `TopFoodShell.handleAddReview` |
| „Util” | `voteHelpful` | `RestaurantDetailModal` (prop `onVoteHelpful`) |
| „Cât e de plin acum” | `reportCrowd` | `TopFoodShell.handleUpdateCrowdReport` |
| Fidelitate (portofel, ștampile, card personal) | `fidelityWallet`, `stampFidelity`, `createFidelityCard` (`app/actions/loyalty.ts`) | `FidelityView` (prop `useBackend`) |
| QR-ul de la casă (owner) | `loyalty.currentStampCode` + `qrcode` | `/owner/[venueId]/fidelitate` (`LoyaltyPanel`) |
| Caută pe internet / adaugă local | `searchVenues`, `addVenueFromInternet`, `addVenueManually` (`app/actions/venues.ts`) | `AddVenuePanel`, sub „niciun rezultat” în `EditorialListView` |

- Sesiunea e același cookie ca la `/owner` (`lib/server/session.ts`). Cu backend pornit, cookie-ul decide cine e logat, nu `sessionStorage`.
- Fără `DATABASE_URL`, toate acțiunile întorc `offline` și componentele merg ca înainte, local.
- În demo, „Scanează la casă” generează singur codul localului (`DEMO_SCAN`); cu `DEMO_SCAN=off` trebuie scanat QR-ul de la `/owner/.../fidelitate`.
- Conturi demo (seed, parola `DEMO_PASSWORD` sau `demo1234`): andreea@e-uvt.ro (localnic), luca@visit.ro (turist), `sandu.proprietar` (owner), `admin`. Scenariul de prezentare: `docs/DEMO.md`.

Adăugat în noaptea de 14 nov:
- **URL propriu pentru fiecare local:** `/topfood/timisoara/{slug}` și `/topdrink/timisoara/{slug}`, cu titlu și descriere pentru Google (`lib/backend/venueRoute.ts`), `sitemap.xml`, `robots.txt`. Deschiderea unui local în aplicație schimbă URL-ul în forma asta.
- **Devino localnic verificat** din panoul de profil (`LocalVerificationPanel`, `app/actions/local.ts`): check-in GPS (se salvează doar ziua) sau email universitar cu cod (în demo codul apare pe ecran, `DEMO_EMAIL_CODES`).
- **Scanare QR cu camera** pe `/fidelitate` (`QrScanPanel`, BarcodeDetector pe Chrome/Android) + codul scris de mână; codul apare și sub QR-ul owner-ului.
- **Pus online:** `docs/DEPLOY.md` (Neon + Vercel), `npm run import:google`.

Ce rămâne:
1. Serviciu de email pentru codurile de verificare (acum doar modul demo).
2. Joburile programate în producție (worker pe Railway/Render sau Vercel Cron), vezi `docs/DEPLOY.md`.

Model de Server Action (`apps/web/src/app/actions.ts`):

```ts
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { accounts, createDb, writeReview } from "@tftd/api";

const db = createDb();
async function userId() {
  const id = accounts.verifySessionToken((await cookies()).get("session")?.value);
  if (!id) throw new Error("Intră în cont ca să scrii un review.");
  return id;
}
export async function submitReview(input: { venueId: string; rating: number; text: string }) {
  await writeReview(db, await userId(), input);
  revalidatePath("/topfood/timisoara");
}
```

Atenție: în componente, `Restaurant.id` = slug-ul localului. Pentru funcțiile din backend care cer `venueId` (UUID), `venuePage` îl întoarce în `venue.id`; cel mai simplu e să adaugi un câmp `venueId` în `Restaurant` și să-l completezi în `toRestaurant`.
