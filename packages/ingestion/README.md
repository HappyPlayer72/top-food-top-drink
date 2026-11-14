# `packages/ingestion` (`@tftd/ingestion`)

Importă și actualizează localuri din surse externe, procesează linkuri sociale și înregistrează propunerile trimise de utilizatori.

## Module ([`src/index.ts`](src/index.ts))

- [`src/google.ts`](src/google.ts) (`google`) — Google Places API (New), necesită `GOOGLE_PLACES_API_KEY`; utilizabil și prin `npm run import:google` din rădăcina monorepo-ului.
- [`src/tripadvisor.ts`](src/tripadvisor.ts) (`tripadvisor`) — TripAdvisor Content API (`TRIPADVISOR_API_KEY`).
- [`src/social.ts`](src/social.ts) — Validare platformă (`tiktok`, `instagram`, `facebook`, `youtube`), extracție metadate oEmbed (inclusiv `META_OEMBED_TOKEN` pentru Instagram/Facebook) și trimitere spre coada `social_submissions`.
- [`src/user-places.ts`](src/user-places.ts) — Propunere manuală de localuri noi (`addManually`), rulată prin `@tftd/matching` înainte de creare.
- [`src/jobs.ts`](src/jobs.ts) — Joburile apelate de `@tftd/worker`: `discoverVenues`, `refreshExternalRatings`, `processSocialQueue`.
