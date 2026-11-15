# Android Native Porting Guide (`TopFood & TopDrink`)

This document describes the mobile-ready backend contract, design tokens, authentication model, and native Android capability mapping prepared in this repository.

---

## 1. Base URLs & Environments

| Environment | Base URL | Notes |
|---|---|---|
| Android Emulator -> Local Dev | `http://10.0.2.2:3000` | Next.js dev server (`npm run dev -w @topfood/web`) |
| Physical Device (LAN) | `http://<LAN_IP>:3000` | Configure `usesCleartextTraffic` only in `debug` build type (`network_security_config.xml`) |
| Production | `https://<SITE_URL>` | Set `SITE_URL` in `.env` so relative image URLs resolve to HTTPS |

All JSON endpoints live under `/api/v1/*` and return a uniform envelope:

```json
// Success
{ "ok": true, "data": { ... } }

// Error
{ "ok": false, "error": { "code": "unauthorized", "message": "Intră în cont ca să continui." } }
```

Machine-readable specifications:
- OpenAPI 3.1: `GET /api/v1/openapi.json` ([`docs/openapi-v1.json`](openapi-v1.json))
- Design Tokens: `GET /api/v1/design-tokens` ([`design/tokens.json`](../design/tokens.json))
- Platform Config & Feature Catalog: `GET /api/v1/config`
- App Links Verification: `GET /.well-known/assetlinks.json` (set `ANDROID_PACKAGE_NAME` & `ANDROID_SHA256_CERT_FINGERPRINTS` in `.env`)

---

## 2. Authentication & Anonymous Identity

- **User Session (`Authorization: Bearer <token>`)**:
  - `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, and `POST /api/v1/auth/demo` return `{ token, expiresAt, tokenType: "Bearer", user }`.
  - Pass `setCookie: false` from native Android clients and persist `token` in **EncryptedSharedPreferences** / **Jetpack DataStore**.
  - Attach `Authorization: Bearer <token>` on authenticated requests.
  - Tokens are HMAC-SHA256 signed (`userId.expMs.sig`), valid for 30 days.
- **Anonymous Outing Poll Identity (`X-Voter-Token`)**:
  - `POST /api/v1/polls/{token}/vote` accepts `X-Voter-Token` (48 lowercase hex chars) and returns `{ voterToken }` in JSON + the `X-Voter-Token` response header.
  - Persist `voterToken` locally so users can change their vote in `Unde ieșim?` polls without creating an account.

---

## 3. Native Android Tech Stack Mapping

| Feature Area | Web Implementation | Recommended Android Native Equivalent |
|---|---|---|
| Networking & JSON | Server Actions / `fetch` | **Retrofit + OkHttp + kotlinx.serialization** against `/api/v1/*` |
| UI & Dual-Face Theme | Tailwind + CSS custom vars (`globals.css`) | **Jetpack Compose + Material 3** driven by [`design/tokens.json`](../design/tokens.json) (`TopFoodLight`, `TopFoodDark`, `TopDrink`) |
| Typography | Variable `Archivo` (`wdth: 62..125`, `wght: 100..900`) | Bundle `Archivo-Variable.ttf` in `res/font/` with `FontVariation.Settings(FontVariation.width(62f), FontVariation.weight(800))` for `.font-display` |
| Map & Neighborhoods | `MapLibre GL` + `TIMISOARA_NEIGHBORHOOD_ZONES` | **MapLibre Native Android (`org.maplibre.gl:android-sdk`)** using polygon/center geometry from `GET /api/v1/config` |
| Loyalty QR Scanner | `BarcodeDetector` / manual input (`QrScanPanel`) | **CameraX + Google ML Kit Barcode Scanning** (`FORMAT_QR_CODE`), parsing `{programId}.{window}.{sig}` and posting to `POST /api/v1/loyalty/scan` |
| GPS Check-in (Local / Visit ×1.3) | `navigator.geolocation` | **FusedLocationProviderClient** (`Priority.PRIORITY_HIGH_ACCURACY` for 100 m venue check-in, `PRIORITY_BALANCED_POWER_ACCURACY` for city check-in) |
| Receipt Photo Upload | Canvas resize + `FormData` (`VisitProofField`) | **Photo Picker / CameraX** + Bitmap downscale (`maxSide = 1600px`, JPEG <= 2 MB) -> `POST /api/v1/reviews/{reviewId}/receipt` (`multipart/form-data` part `receipt`) |
| Anti-Bot Review Gate | `reviewFormToken` + timing (`>= 3000ms`) | Fetch `GET /api/v1/reviews/form-token?venueId={id}` when the Review Compose screen opens; send `formToken` on `POST /api/v1/venues/{slug}/reviews` (`website` field left empty/omitted) |
| Deep Links | Next.js routes (`/topfood/...`, `/unde-iesim/{token}`, `/u/{username}`) | Android App Links (`intent-filter` with `android:autoVerify="true"`) backed by `/.well-known/assetlinks.json` |

---

## 4. Screen-to-API Endpoint Map

1. **App Bootstrap (`Splash / AppState`)**:
   - `GET /api/v1/config` (city polygons, tourist zones, structured review questions, interests, taste categories, feature flags)
   - `GET /api/v1/auth/me` (if stored Bearer token exists)
2. **Top Food / Top Drink (`EditorialListView`)**:
   - `GET /api/v1/venues?vertical=food|drink&category=...&neighborhood=...&maxPriceLei=...&noTraps=...&openNow=...&search=...&sort=...`
   - `GET /api/v1/weekend`
   - `GET /api/v1/reviewers`
   - `POST /api/v1/ads/{adId}/events`
3. **Interactive Map (`MapView`)**:
   - Uses venues from `GET /api/v1/venues` + polygons/tourist zones from `GET /api/v1/config`
4. **Venue Detail (`RestaurantDetailModal`)**:
   - `GET /api/v1/venues/{slug}?vertical=food|drink&reviews=all|local|tourist|influencer&trackView=1`
   - `PUT / DELETE /api/v1/me/saved/{slug}`
   - `POST /api/v1/venues/{slug}/vibe`
   - `POST /api/v1/venues/{slug}/quick-vote`
   - `POST /api/v1/venues/{slug}/videos`
   - `POST /api/v1/reviews/{reviewId}/helpful`
5. **Write / Edit Review & Visit Proof**:
   - `GET /api/v1/reviews/form-token?venueId={venueId}`
   - `POST /api/v1/venues/{slug}/checkin`
   - `POST /api/v1/venues/{slug}/reviews`
   - `PATCH / DELETE /api/v1/reviews/{reviewId}`
   - `POST /api/v1/reviews/{reviewId}/receipt`
6. **Monthly Top (`MonthlyTopView`)**:
   - `GET /api/v1/leaderboard?vertical=food|drink&month=YYYY-MM`
   - `POST /api/v1/monthly-votes`
7. **Scârnavii (`TasteTour`, `OutingPoll`, Minigames)**:
   - `POST /api/v1/taste-tour`
   - `POST /api/v1/polls`, `GET /api/v1/polls/{token}`, `POST /api/v1/polls/{token}/vote`
   - Minigames (`WhoPays`, `TableDares`, `TasteDuel`, `TrapBlitz`, `MysteryDirections`, `PreferenceRecommender`) operate purely on the venue list from `/api/v1/venues`.
8. **Fidelity (`FidelityView`)**:
   - `GET /api/v1/loyalty/programs`
   - `POST /api/v1/loyalty/scan`
   - `POST /api/v1/loyalty/cards`
9. **Account, Preferences, Local & Influencer Verification**:
   - `PUT /api/v1/me/preferences`
   - `GET /api/v1/me/local-verification`, `POST /api/v1/me/local-verification/checkin`, `POST /api/v1/me/local-verification/email/start`, `POST /api/v1/me/local-verification/email/confirm`
   - `POST /api/v1/me/social/start`, `POST /api/v1/me/social/confirm`, `DELETE /api/v1/me/social/{platform}`
   - `POST / DELETE /api/v1/me/team-invites/{employeeId}`
   - `GET /api/v1/users/{username}`

---

## 5. Offline / No-Postgres Development Mode

If `DATABASE_URL` is not configured, read endpoints (`GET /api/v1/config`, `GET /api/v1/venues`, `GET /api/v1/venues/{slug}`, `GET /api/v1/search`, `GET /api/v1/leaderboard`, `GET /api/v1/weekend`, `GET /api/v1/reviewers`, `POST /api/v1/taste-tour`) automatically fall back to the static Timișoara dataset with `backendOnline: false` in the response payload, while authenticated write endpoints return HTTP `503` with `{ error: { code: "offline" } }`.
