# `packages/monetization` (`@tftd/monetization`)

Parteneriate comerciale, locuri sponsorizate și sloturi promoționale (`ad_slots`), cu aplicarea **Regulilor 1 și 3**: scorul onest nu poate fi influențat, iar capcanele turistice nu pot fi promovate.

## Reguli implementate ([`src/monetization.ts`](src/monetization.ts))

- Maxim **`SPONSORED_SLOTS = 3`** locuri sponsorizate active afișate simultan pe verticală/oraș, cu **rotație orară** deterministă.
- Blocare automată pentru capcane: localurile cu `trap_index >= 80` (`HIGHLIGHT_MAX_TRAP = 79`) sau sub suspiciune de fraudă (`FRAUD_SUSPICION = { probability: 0.7, count: 3, days: 30 }`) nu pot fi promovate.
- **Exporturi**: `listPartnerships`, `createPartnership`, `updatePartnershipStatus`, `listSponsored`, `listAdSlots`, `createAdSlot`, `deleteAdSlot`, `recordAdEvent`.
