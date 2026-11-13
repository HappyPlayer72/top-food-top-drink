# UX/UI review: topfood-ui

Date: 13 November 2026
Scope: `topfood-ui/` (React 19 + Vite + Tailwind 4), compared against `design/README.md` and `TOP FOOD TOP DRINK — Identitate vizuală.pdf`.

**Verdict: UI 8/10, UX 6/10.** It looks like the brand and the main idea (locals vs tourists, explained scores, quiet sponsored slots) comes across. But two layout bugs hide the venue page's main button and the review form, the map doesn't work on phones, and the demo's scoring can be swung by one review.

---

## 1. How it was run

| Step | Result |
| --- | --- |
| Install Node.js | v26.13.1 LTS (official nodejs.org build, checksum verified) in `~/.local/node`. No sudo needed. |
| `npm install` | OK. npm blocked esbuild's postinstall script; the build still works. |
| `tsc --noEmit` | **Pass**, 0 errors |
| `vite build` | **Pass**: JS 379 kB (107 kB gzip), CSS 44 kB (8.7 kB gzip) |
| `vite` dev server | Runs on `http://localhost:5173` |
| Console errors | One `ERR_BLOCKED_BY_CLIENT` (a blocked external request, not app code) |

To run it again:

```bash
export PATH=$HOME/.local/node/bin:$PATH
cd topfood-ui && npm run dev
```

Tested in the Claude desktop app's browser pane at 1280×860 (desktop) and 375×812 (phone).

---

## 2. Flows tested

| # | Flow | Result |
| --- | --- | --- |
| 1 | topfood home loads, top list, trap sidebar | ✅ Works, close to the mockup |
| 2 | Filter "Fără capcane" | ✅ Works (it also hides the "Atenție în Piața Unirii" warning box) |
| 3 | Search "Plăcintă" (with diacritics) | ✅ Finds Plăcintăria Elisabetin |
| 4 | Search "placinta" (no diacritics) | ❌ "Niciun local nu corespunde căutării" |
| 5 | Search result labelling | ❌ A single result shows "#1 În topul localnicilor" even when it ranks #3 |
| 6 | Switch to topdrink | ⚠️ Works, but the background is cream (`#F6F3EB`), not bottle green; the browser tab title still says "topfood" |
| 7 | topdrink: "Vineri noaptea" + "În timpul săptămânii" | ❌ Leaves 1 bar, still titled "Topul de vineri" and badged "#1" |
| 8 | Crowd report ("Spune cât e de plin unde ești") | ✅ Submits and updates the bar right away. ⚠️ Escape doesn't close the sheet; the confirmation appears at the top of the page, away from the button |
| 9 | Map (desktop) | ✅ Works. ⚠️ Trap pins and zone labels overlap in the centre; a raw "45.7526°N, 21.2300°E" readout is shown to users |
| 10 | Map (phone) | ❌ List covers 320 of 375 px; map can't be dragged by touch; "Deschide fișa localului" button is 37 px under the bottom nav |
| 11 | Venue page | ✅ Matches the mockup layout. ❌ URL never changes (`/` the whole time, history length 1) |
| 12 | "Scrie un review" bar | ❌ Not pinned: sits at the very bottom of the page (y≈1,667 px on desktop, ≈1,776 px on phone) |
| 13 | Review form position | ❌ After scrolling, the form's top (title, author, score) was 340 px above the screen |
| 14 | Review validation (empty text) | ✅ Shows "Scrie cel puțin câteva cuvinte concrete despre experiență." |
| 15 | Submit review (local account, score 6) | ✅ Posts, count 112 → 113. ❌ Honest score 9,1 → 8,7 and locals 9,4 → 8,7 from **one** review |
| 16 | Monthly top | ✅ Renders. ⚠️ Different venues from the home top; #2 renamed; #3 uses mustard (the trap colour) |
| 17 | Refresh after posting a review | ⚠️ Review is gone (state is in memory only; fine for a demo) |

---

## 3. What works well

- **Brand followed closely:** colours, Archivo condensed for titles and scores, decimal commas (`9,1`), the checked strip once per screen, the blue street-sign badge for locals, and the warning triangle on traps.
- **Scores explain themselves:** separate locals/tourists bars, "De ce?" on every venue, and "Cum calculăm asta" with the 5 weighted signals.
- **Sponsored slots look quieter:** no photo, no rank, a muted score, and "Sponsorizat. Nu schimbă scorul și nici locul în top."
- **The demo is convincing:** switching between a local (2,0×) and a tourist (1,0×) account, posting a review, and watching the numbers move.
- **Careful details:** empty states, Escape closes the venue page, background scroll lock, visible focus outlines, `prefers-reduced-motion` support, and no horizontal scroll at 375 px.
- **Mobile home page** is very close to PDF page 3.

---

## 4. Bugs and problems, by priority

### P0: fix before the demo

1. **The venue page's fixed elements are broken.** In `topfood-ui/src/index.css:304`, `.modal-panel-enter` uses `animation: … forwards`, so the panel keeps a `transform` after animating. Any `transform` makes `position: fixed` children position against that element instead of the screen. As a result:
   - the "Scrie un review" bar (`RestaurantDetailModal.tsx:826`) only appears at the end of the page;
   - the review form (`RestaurantDetailModal.tsx:867`) opens partly off-screen.

   **Fix:** remove `forwards` from `.modal-panel-enter` (the end state is the default anyway), or end the keyframe at `transform: none`.

2. **One review moves the score far too much.** `data/restaurants.ts:1563` weights the existing locals' score as if it came from 8 reviews (and the tourists' score from 6, at `:1571`), while the page says 112 and 26. During a demo, two "1" reviews would knock the #1 venue off the top, which undercuts the "honest score" pitch. **Fix:** use `reviewCounts.locals` and `reviewCounts.tourists` as the baseline weights.

3. **topdrink isn't green by default.** `index.css:383` (light theme) turns Sticlă `#17382C` into cream. Bottle green only appears in dark mode. The identity's whole topdrink idea is missing on first load. **Fix:** keep topdrink green in both themes, or remove the light override for drink.

### P1: important

4. **The map doesn't work on phones** (`MapView.tsx`):
   - the list is open by default (`:196`) at a fixed `w-80` (`:500`);
   - panning only uses mouse events (`:725`); add pointer or touch events;
   - the bottom venue card sits under the bottom nav.

   **Fix:** close the list by default below `md`, show it as a bottom sheet, and add bottom padding for the nav.
5. **No URLs.** `/` never changes, so you can't share a venue, and Back leaves the site. Add routes for `/topfood/timisoara`, `/topdrink/timisoara`, `/…/{slug}` and `/…/top` (the spec's Next.js app needs these for SEO anyway). Also set `document.title` per vertical and venue.
6. **topdrink filters contradict each other** (`EditorialListView.tsx:137`). "Vineri noaptea" and "În timpul săptămânii" should be one either/or choice, and the heading (`:231`, "Topul de vineri") should follow it. The "plin acum, din raportări" subtitle suggests sorting by how busy places are, but the list is sorted by score.
7. **"#1" badges are wrong on filtered lists** (`EditorialListView.tsx:263`, `:674`). The first item of a search or filter result is always labelled #1 in the top. Show the real rank, or drop the badge while a filter or search is active.
8. **Search needs diacritics.** Normalize both sides with `s.normalize('NFD').replace(/\p{M}/gu, '')`. Most people type without diacritics on their phones.

### P2: polish

9. **Hard-coded text:** "după 4.180 de review-uri" (`EditorialListView.tsx:641`), "Clasamentul lunii noiembrie" (`:890`), and "Trei terase din centru…" (`:908`).
10. **The monthly top doesn't match the home top.** It's a separate list (La Doi Pași, Langoș & Co, Mămăliga Urbană… never appear on the home page). Pizzeria din Fabric is renamed "Cuptorul din Fabric" (`MonthlyTopView.tsx:261`), and the October archive is this month minus 0,1 (`:44`). The #3 podium uses mustard `#E0A526` (`:377`), which the design reserves for "Posibilă capcană".
11. **Accessibility:**
    - the crowd-report sheet has no `role="dialog"`, no Escape handling, and doesn't move or trap focus;
    - the podium buttons use `focus:outline-none`;
    - "Vezi tot topul", "Clasamentul lunii…" and "Cum calculăm asta" are 19–21 px tall (aim for at least 44 px);
    - the bottom nav shows the active tab only with bold text.
12. **Text written for developers** in the review form: "Stabilit din contul tău activ (fără opțiune manuală)." and "Numere întregi (1–10), slider sau tastare". There are also two inputs (number field and slider) for one value; a row of 1–10 buttons is simpler on a phone.
13. **The "Recomandat" chip overlaps "Vezi fișa"** on the #1 card at 375 px.
14. **Trap thresholds disagree between screens.**
    - The map groups venues as 0–25 / 26–60 / 61–100 and labels them with "%".
    - The list uses "possible" from 60 and "trap" from 80, and shows the value as "din 100".
15. **The map shows raw lat/long** (`MapView.tsx:1140`). Remove it or keep it in debug builds only.
16. **The blue locals' badge is used for scores** ("Localnici 9,4"). The design reserves it for people who are locals.
17. **Photos and fonts come from Unsplash and Google Fonts** with no placeholders. On a slow connection, cards show empty grey boxes and system fonts for a few seconds. Bundle the fonts and use local photos for the demo.

---

## 5. Suggested order

1. Remove `forwards` in `index.css:304` (one line; fixes items 1a and 1b).
2. Fix the score baseline in `recalculateRestaurantWithReview`.
3. Make topdrink green by default.
4. Phone map: list closed by default, touch panning, card above the nav.
5. Either/or Friday/weekday choice; real ranks in filtered lists; search without diacritics.
6. Routing and page titles.
7. Polish items 9–17.

## 6. Not covered

- Real touch gestures (the emulator sends mouse clicks).
- Screen readers, and the dark theme in every view.
- Performance on a real phone and slow networks.
- `apps/web` (only a README exists) and the backend packages.
