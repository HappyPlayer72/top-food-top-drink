# `packages/owner` (`@tftd/owner`)

Logica portalului de patroni și angajați (`/owner`). Respectă **Regula 2**: patronii pot răspunde public la review-uri și le pot raporta la moderare, dar nu le pot șterge sau ascunde.

## Exporturi principale ([`src/owner.ts`](src/owner.ts))

- **Acces și stare**: `userIdByUsername`, `managedVenues`, `myEmployments`, `pendingClaim`, `pendingInvites`, `standing`, `profileChecklists`
- **Statistici și audiență**: `venueSummary`, `venueInsights`, `unansweredReviews`, `recordVenueView` (agregat zilnic în `venue_views_daily` + istoric `venue_score_snapshots`)
- **Interacțiune cu clienții**: `replyToReview` (răspuns public în `review_replies`), `reportReview` (un singur raport deschis per review către moderare)
- **Conținut & profil local**: `postsForOwner`, `createPost`, `deletePost` (știrile, ofertele și evenimentele viitoare cu `publishAt` în viitor rămân private în `/owner` până la data publicării), `updateVenueDetails`, `setVenueIcon`, `updateSocialLink`
- **Echipă**: `employeesForOwner`, `inviteEmployee`, `respondToInvite`, `removeEmployee`
