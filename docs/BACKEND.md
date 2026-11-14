# Backend — Ghid de integrare (`@tftd/api`)

**Un singur strat de intrare**: `apps/web` și `apps/worker` importă exclusiv din `@tftd/api` (plus utilitare/tipuri din `@tftd/db` unde este necesar).

## Convenții globale

- **Conexiune DB**: `const db = createDb()` — citește `DATABASE_URL` și configurează `DATABASE_POOL_MAX` / `DATABASE_PREPARE` (implicit dezactivat pentru compatibilitate cu poolere de conexiuni).
- **Erori**: Funcțiile aruncă `ServiceError(code, message)` în limba română. Coduri uzuale:
  `not_found`, `unauthorized`, `forbidden`, `bad_input`, `conflict`, `rate_limited`, `duplicate`.
- **Auth**: Sesiunile web folosesc cookie-ul HMAC `tf_session` generat prin `accounts.signSessionToken` și citit pe server prin `accounts.verifySessionToken`.

---

## 1. Pagini publice (`@tftd/api`)

| Funcție | Ce întoarce |
|---|---|
| `cityPage(db, { citySlug, vertical, category?, neighborhood?, maxPrice?, openNow?, noTraps?, search?, sort?, userId? })` | `city`, `top` (localuri cu scor, tag capcană, `openNow`/`openLabel`, program formatat, preț, locație), `sponsored` (max 3/oră, fără capcane ≥ 80), `traps` (localurile cu motive și decalaj), `categories`, `neighborhoods` |
| `venuePage(db, { citySlug, vertical, slug, reviews?: "local" \| "tourist" \| "influencer" \| "all", aspect?, sort?, viewerUserId? })` | Detalii complete local, scoruri defalcate (`aspects` sau `byTime`), `vibe` (ultimele 2h), `menu`, `team` (angajați + mențiuni lunare), `blog` (anunțuri publicate, fără cele programate în viitor), `videos` (aprobate), `reviews` filtrate + `reviewCounts` |
| `leaderboardPage(db, { citySlug, vertical, month? })` | Clasament lunar înghețat (`Top 10 localnici`, `Top 10 localuri`, `angajatul lunii`, `localul nou al lunii`) sau previzualizare pentru luna curentă |
| `searchPlaces(db, { citySlug, q, vertical? })` | Căutare rapidă pe nume și categorie (folosită în navbar) |
| `weekendEvents(db, citySlug)` | Evenimentele și ofertele viitoare pentru pagina `/topdrink/timisoara/weekend` |
| `topReviewers(db, citySlug, limit?)` | Recenzorii de top din oraș (localnici activi cu scor mare de utilitate) |
| `userProfilePage(db, username, viewerUserId?)` | Profil public `/u/[username]`, insignă localnic/influencer, conturi sociale verificate, review-urile scrise și localurile salvate (vizibile proprietarului) |
| `openStatus(openingHours, now?)` / `formatHours(openingHours)` | Calculează `openNow` + etichetă în `Europe/Bucharest` (suportă intervale peste miezul nopții) |

---

## 2. Acțiuni comunitate (`@tftd/api`)

- `writeReview(db, userId, { venueId, rating, text, visitedAt?, isPaid?, receiptPhotoUrl? })`
  - Reguli: un review la `30` zile per local (`REVIEW_COOLDOWN_DAYS = 30`), max `10` review-uri/oră (`MAX_REVIEWS_PER_HOUR = 10`), text min `10` caractere, notă `1..10`. Bonul de casă (`receiptPhotoUrl`) acceptă imaginile JPG/PNG/WebP data-URI sub `400.000` caractere (`receipt_status = 'pending'`).
  - Rulează analiza sincron și recalculează scorul localului imediat.
- `editReview(db, userId, reviewId, { rating, text, receiptPhotoUrl? })` — doar autorul review-ului poate edita; re-rulează analiza și scorul.
- `deleteReview(db, userId, reviewId)` — doar autorul își poate șterge propriul review (`admin` moderează separat).
- `toggleHelpful(db, userId, reviewId, vote?: 1 \| -1)` — comută votul util/inutil pe un review și actualizează `helpful_count`.
- `submitVibe(db, userId | null, venueId, level)` — nivel `1..5` (expiră în `2h`, cooldown `30m`, max `15`/oră; permite raportare și fără cont dacă `userId` este `null`).
- `rateEmployee(db, userId, employeeId, score, comment?)` — evaluare punctuală pentru un membru al echipei localului.
- `checkIn(db, userId, { venueId, lat, lng })` — verifică distanța `<= 60m` față de local (`venueRadiusM`); dacă utilizatorul este deja în oraș și are 5 zile distincte în 30 de zile, poate ajuta la verificarea de localnic.
- `submitSocialLink(db, userId, { url, venueId? })` & `submitSocialLinkNow(db, userId, { url, venueId? })` — suportă `tiktok`, `instagram`, `facebook`, `youtube`; `Now` încearcă oEmbed + potrivire imediată, altfel rămâne în coada `proceseaza-linkuri`.
- `addManually(db, userId, { citySlug, vertical, name, address, neighborhood?, category?, priceLevel?, lat, lng })` — propune un local nou sau leagă de unul existent dacă match-ul e ridicat.

---

## 3. Submodule re-exportate de `@tftd/api`

| Namespace / Export | Responsabilități cheie |
|---|---|
| `accounts` | `register` (parolă min 8 caractere), `login`, `getUser`, `signSessionToken`, `verifySessionToken`, `verifyByEmail`, `confirmEmailCode`, `vouchLocal`, `startClaim`, `confirmClaim`, `approveClaim`, `startSocialVerification`, `confirmSocialVerification`, `unlinkSocialAccount`, `getSavedVenueSlugs`, `toggleSavedVenueSlug` |
| `owner` | `userIdByUsername`, `managedVenues`, `myEmployments`, `pendingClaim`, `pendingInvites`, `standing`, `profileChecklists`, `venueSummary`, `venueInsights`, `unansweredReviews`, `postsForOwner`, `employeesForOwner`, `replyToReview`, `reportReview`, `createPost`, `deletePost`, `inviteEmployee`, `respondToInvite`, `removeEmployee`, `updateVenueDetails`, `setVenueIcon`, `updateSocialLink`, `recordVenueView` |
| `loyalty` | `getVenueProgram`, `upsertProgram`, `getOrIssueCard`, `issueQrToken` (valabil 60s, semnat HMAC), `redeemQrToken`, `myCards` |
| `moderation` | `listOpenReports`, `resolveReport`, `listPendingMatches`, `resolveMatch`, `listPendingReceipts`, `decideReceipt`, `listSuspiciousAccounts`, `decideSuspiciousAccount`, `listAuditLog` |
| `monetization` | `listPartnerships`, `createPartnership`, `updatePartnershipStatus`, `listSponsored` (blochează `trap >= 80`), `listAdSlots`, `createAdSlot`, `deleteAdSlot`, `recordAdEvent` |
| `ingestion` / `jobs` | `discoverVenues`, `refreshExternalRatings`, `processSocialQueue` — folosite de `@tftd/worker` și CLI |
| `reviewAnalysis` / `scoring` / `leaderboard` | `analyzeVenueReviews`, `recalculateCity`, `freezeMonth`, `lastMonth` |

---

## 4. Executarea worker-ului și a comenzilor CLI

```bash
# Pornește procesul cron cu cele 6 joburi (TZ Europe/Bucharest)
npm run dev -w @tftd/worker

# Rulează un singur job manual (ex: proceseaza-linkuri, recalculeaza-scoruri)
npx tsx --env-file-if-exists=.env apps/worker/src/main.ts --once recalculeaza-scoruri

# Smoke test complet pe DB-ul cu seed
npm exec -- tsx --env-file-if-exists=.env seed/smoke.ts
```

Joburile active din [`apps/worker/src/main.ts`](../apps/worker/src/main.ts):
1. `review-uri-noi` (`*/5 * * * *`) — analizează review-urile noi și recalculează scorurile (`onlyNew: true`)
2. `proceseaza-linkuri` (`* * * * *`) — prelucrează linkurile sociale în așteptare
3. `recalculeaza-scoruri` (`0 2 * * *`) — recalculare completă zilnică la 02:00
4. `actualizeaza-ratinguri` (`0 4 * * *`) — reîmprospătare Google/TripAdvisor la 04:00
5. `descopera-locale` (`0 3 * * 1`) — descoperire localuri noi luni la 03:00
6. `leaderboard-lunar` (`5 0 1 * *`) — înghețarea clasamentului pe luna anterioară pe 1 ale lunii la 00:05

## Vizită verificată (review ×1,3)

| Ce face userul | Funcție |
| --- | --- |
| „Sunt aici acum” la local (max. 100 m; se salvează doar ziua) | `visits.checkInAtVenue(db, userId, venueId, { lat, lng })` (demo: `{ simulate: true }`, în site prin `DEMO_VISIT_GPS`). Review-ul din aceeași zi devine verificat și dacă check-in-ul vine după |
| Atașează poza bonului la review-ul lui | `visits.submitReceipt(db, userId, reviewId, bytes)` (JPEG/PNG/WebP, max 2 MB; același bon nu merge de două ori) |
| Admin: coada de bonuri, poza, decizia | `visits.receiptQueue`, `visits.receiptImage`, `visits.decideReceipt(db, adminId, proofId, approve, note)` → aprobat: `verifiedVisit` + recalcul; poza se șterge oricum |

Tabelul nou `visit_proofs` și coloana `reviews.verified_via` (`gps` / `receipt`) vin din migrarea `0009_saved_views_visits_antibot`. Pozele fără decizie după 30 de zile se șterg în jobul de noapte `recalculeaza-scoruri`. `venuePage` dă `verifiedVia` pe fiecare review, iar `scoreExplanation.verifiedVisitCount` câte review-uri au vizita verificată.

## Anti-bot la review-uri

Algoritmul complet: [`docs/ANTI-BOT.md`](ANTI-BOT.md). Pe scurt: `writeReview(db, userId, input, now, client)` cu `client = { formToken, honeypot, clientHash }` trece prin poarta din `antibot.ts` (token de formular din `antibot.issueReviewFormToken`, câmp capcană, limite per cont/dispozitiv). Analiza adaugă semnalele de bot la `fakeSignals`; un review aproape sigur bot primește `status: "flagged"` și un raport automat în `/admin` („Păstrează” îl publică și îl marchează `bot_cleared`). Migrarea `0009_saved_views_visits_antibot`: tabelul `review_submissions` + `reviews.bot_cleared`. După o decizie pe un review, `refreshAfterModeration(db, reviewId)` recalculează scorul.
