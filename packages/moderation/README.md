# `packages/moderation` (`@tftd/moderation`)

Panoul și fluxurile de moderare folosite în `/admin` pentru audit, rapoarte, bonuri de casă, potriviri și conturi suspecte.

## Exporturi principale ([`src/moderation.ts`](src/moderation.ts))

- **Rapoarte review-uri**: `listOpenReports`, `resolveReport` (aprobă eliminarea abuzului sau respinge raportul)
- **Potriviri surse externe**: `listPendingMatches`, `resolveMatch` (confirmă sau respinge legătura din `match_candidates`)
- **Bonuri de casă**: în `@tftd/api` → `visits` (`receiptQueue`, `decideReceipt`); aprobarea setează vizita verificată (×1,3).
- **Conturi suspecte**: `listSuspiciousAccounts`, `decideSuspiciousAccount`
- **Audit**: `listAuditLog` (istoricul deciziilor din `moderation_decisions`)
