# `packages/accounts` (`@tftd/accounts`)

Autentificare, sesiuni HMAC, verificare statut de localnic, revendicarea localurilor de către patroni, verificare influenceri și localuri salvate.

## Module ([`src/index.ts`](src/index.ts))

- [`src/auth.ts`](src/auth.ts) — `register`, `login`, `getUser`, `signSessionToken`, `verifySessionToken`
  - Parole hash-uite cu `scrypt` + salt; lungime minimă backend: **8 caractere**.
  - Sesiunea folosește cookie-ul `tf_session` semnat HMAC-SHA256 cu `SESSION_SECRET`.
- [`src/local.ts`](src/local.ts) — 3 metode independente de verificare ca localnic (valabilitate `validMonths = 12`):
  1. **Email universitar** (`verifyByEmail`, `confirmEmailCode`): în Timișoara acceptă `e-uvt.ro`, `uvt.ro`, `student.upt.ro`, `upt.ro`, `umft.ro`, `student.umft.ro`, `usvt.ro` (`DEMO_EMAIL_CODES=1` permite testarea fără SMTP).
  2. **Check-in GPS**: `5` zile distincte (`gpsDays = 5`) într-o fereastră de `30` de zile (`windowDays = 30`), în raza de `15 km` a orașului (`cityRadiusKm = 15`) / `60 m` față de local (`venueRadiusM = 60`).
  3. **Vouch comunitar** (`vouchLocal`): `2` recomandări (`vouchesNeeded = 2`) de la localnici deja verificați.
- [`src/roles.ts`](src/roles.ts) — Revendicare local & influenceri & bookmark-uri:
  - `startClaim`, `confirmClaim`, `approveClaim`: metode `phone_code`, `cui`, `google_business`; max `5` încercări (`MAX_CLAIM_ATTEMPTS = 5`), max `3` cereri/zi (`MAX_CLAIMS_PER_DAY = 3`); suportă `DEMO_CLAIM_CODE`.
  - `startSocialVerification`, `confirmSocialVerification`, `unlinkSocialAccount`: verificare prin cod în bio (`TFTD-XXXXXX`); setează `is_influencer = true` peste `INFLUENCER_MIN_FOLLOWERS = 1000` (review-urile devin automat `"Parteneriat plătit"` cu pondere `0.2`).
  - `getSavedVenueSlugs`, `toggleSavedVenueSlug`: gestionează `saved_venues`.
