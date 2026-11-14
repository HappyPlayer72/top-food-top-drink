# `packages/loyalty` (`@tftd/loyalty`)

Sistemul de **fidelitate cu ștampile și QR rotativ** (`/fidelitate` și secțiunea `fidelitate` din `/owner/[venueId]`).

## Exporturi principale ([`src/loyalty.ts`](src/loyalty.ts))

- `getVenueProgram` / `upsertProgram` — configurarea programului unui local (prag ștampile, recompensă, activare) în `loyalty_programs`.
- `getOrIssueCard` / `myCards` — emiterea și listarea cardurilor personale ale utilizatorului (`loyalty_cards`, `loyalty_stamps`).
- `issueQrToken` — generează un token QR valabil **60 de secunde**, semnat HMAC cu `SESSION_SECRET`, împotriva reutilizării capturilor de ecran.
- `redeemQrToken` — validează token-ul scanat (sau codul manual în modul `DEMO_SCAN=1`) și acordă ștampila sau recompensa pe card.
