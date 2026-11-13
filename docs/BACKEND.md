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

## Legătura site → backend (pentru Alex)

Ce e gata:
- `apps/web/src/lib/backend/load.ts` citește pe server toate datele pentru shell (localuri food + drink, evenimente, top recenzenți). Fără `DATABASE_URL` sau dacă baza nu răspunde, întoarce `null` și site-ul folosește datele statice din `src/data`.
- `apps/web/src/lib/backend/toRestaurant.ts` transformă datele din backend în tipul `Restaurant` din `src/types.ts`. Ce nu e încă în DB (poze, texte editoriale) se ia din datele statice, după slug.
- Toate paginile (`page.tsx`) cheamă `loadShellData()` și dau datele la `TopFoodShell` ca props. Componentele n-au fost rescrise; `TopFoodShell` și `MonthlyTopView` primesc doar props opționale noi.
- `next.config.ts` citește `.env` din rădăcină și transpilează pachetele `@tftd/*`.

Ce rămâne (acțiunile userilor, acum încă locale în browser):
1. **Login / cont**: `LoginScreen` folosește conturi demo. De legat la `accounts.register` / `accounts.login` printr-un Server Action, cu `accounts.createSessionToken` într-un cookie httpOnly.
2. **Scrie review**: `recalculateRestaurantWithReview` calculează în browser. De înlocuit cu un Server Action care cheamă `writeReview`, apoi `router.refresh()`.
3. **Fidelitate**: `FidelityView` ține cardurile în `localStorage`. De legat la `loyalty.myCards`, `loyalty.scanCode`, `loyalty.createPersonalCard`, `loyalty.addPersonalStamp`; ecranul owner-ului arată `loyalty.currentStampCode` ca QR (se reîmprospătează la `expiresInSeconds`).
4. **Căutare + adaugă local**: câmpul de căutare filtrează local; pentru „caută și pe internet” și „adaugă local” → `searchPlaces`, `addFromGoogle`, `addManually`.
5. **Vot „util”, vibe check**: `toggleHelpful`, `submitVibe`.

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
