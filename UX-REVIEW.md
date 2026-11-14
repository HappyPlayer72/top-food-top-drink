# UX/UI review: apps/web

> [!NOTE]
> **Historical Snapshot (13 Nov 2026 — pre-backend integration)**
>
> This document is the archived v2 review of commit `5571e36` before backend (`@tftd/api`), SEO routes, and owner/admin portals were wired into `apps/web`. Since then, several major findings below have been resolved in the current codebase:
> - **Real SSR routes added**: `/topfood/timisoara/[slug]`, `/topdrink/timisoara/[slug]`, `/categorie/[category]`, `/top-luna`, `/top-luna/[month]`, `/weekend`, `/u/[username]`, `/fidelitate`, `/scarnavii`, `/owner`, `/owner/[venueId]/[section]`, `/admin`, `/api/share/top-luna`, plus `opengraph-image.tsx`, `sitemap.ts`, and `robots.ts`.
> - **Live DB backend (`@tftd/api`)**: Bayesian honest score (`PRIOR_WEIGHT = 10`) prevents a single review from swinging venue scores; auth uses `scrypt` + HMAC `tf_session` cookies; local status requires server-side verification (university email code, 5-day GPS check-in, or 2 local vouches) rather than a client checkbox (static `src/data/restaurants.ts` remains only as an offline fallback when PostgreSQL is unavailable).
> - **TopDrink default surface**: [`TopFoodShell.tsx`](apps/web/src/components/TopFoodShell.tsx) renders TopDrink on `#17382C` (`--color-sticla`) with `#F4EEE2` ink.

| | |
| --- | --- |
| **Version** | 2, 13 November 2026 (Archived — see note above) |
| **Code reviewed** | `main` at `5571e36` ("Merge pull request #3 from HappyPlayer72/serban"), which matches the `oli` branch apart from this file |
| **App** | `apps/web` (Next.js 15, React 19, Tailwind 4). The old `topfood-ui/` prototype was removed on `main` |
| **Compared with** | `design/README.md` and `TOP FOOD TOP DRINK — Identitate vizuală.pdf` |
| **Previous version** | v1 reviewed `topfood-ui/` (commit `8ca0bea`). Section 3 tracks what happened to each v1 issue |

**Verdict: UI 8/10, UX 6.5/10** (v1: 8 and 6).
The move to Next.js fixed several big problems: real URLs with a working Back button, a usable map on phones, per-vertical page titles, a search box on topdrink, and better accessibility in pop-ups.
But the two v1 demo blockers are still there: the venue page's "Scrie un review" bar isn't pinned, and one review swings the score.
The new login also creates a trust problem: anyone can make themselves a 2,0× "verified local" by ticking one checkbox.

---

## 1. How it was run

| Step | Result |
| --- | --- |
| Node.js | v26.13.1 LTS in `~/.local/node` (installed during v1) |
| `npm install` (in `apps/web`) | OK. It rewrites about 2,000 lines of the root `package-lock.json`, so the committed lockfile is out of sync (restored afterwards) |
| `tsc --noEmit` | **Pass**, 0 errors |
| `next build` | **Pass**: 3 routes (`/`, `/topfood/timisoara`, `/topdrink/timisoara`), all static, 146 kB first-load JS |
| `next dev` | Runs on `http://localhost:3000`; no console errors |
| Server-rendered HTML | Lists are in the HTML (good for SEO). Venue pages (`?venue=…`) have the same title and no venue content in the HTML. `/topfood/timisoara/ciorba-lui-sandu` returns **404** |

To run it:

```bash
export PATH=$HOME/.local/node/bin:$PATH
cd apps/web && npm install && npm run dev
```

Tested in the Claude desktop app's browser pane at 1280×860 (desktop) and 375×812 (phone).

---

## 2. Flows tested (v2)

| # | Flow | Result |
| --- | --- | --- |
| 1 | `/topfood/timisoara` loads | ✅ No console errors; close to the mockup |
| 2 | Open a venue | ✅ URL becomes `?venue=ciorba-lui-sandu`. ⚠️ Page title stays the vertical's title |
| 3 | Browser Back from a venue | ✅ Closes the venue and returns to the list |
| 4 | Deep link `/topdrink/timisoara?venue=pivnita-cu-bolta` | ✅ Opens the venue directly |
| 5 | "Scrie un review" bar | ❌ Still not pinned: y≈1,694 px on an 860 px screen |
| 6 | Guest taps "Intră în cont ca să scrii un review" | ⚠️ Login screen opens, but the venue is closed and `?venue` is dropped. After logging in you land on the home page |
| 7 | Demo login (Andreea M.) | ✅ One click, with an "Autentificat ca Andreea M." toast |
| 8 | Refresh while logged in | ⚠️ Logged out (session kept in memory only) |
| 9 | Register as "Localnic" with `test.user@example.com` + ticked checkbox | ❌ Becomes "Cont verificat Iosefin", weight 2,0× |
| 10 | topdrink background | ❌ Still cream `#F6F3EB`, not bottle green |
| 11 | topdrink search "pivnita" | ❌ "Niciun bar nu corespunde…" (only "Pivnița" works) |
| 12 | topdrink "Vineri noaptea" + "În timpul săptămânii" | ❌ 1 bar left, still titled "Topul de vineri" |
| 13 | Map on a phone | ✅ List starts closed, new legend, venue card sits above the bottom nav |
| 14 | Monthly top | ✅ Real venue name now ("Pizzeria din Fabric"). ⚠️ #3 still mustard; breadcrumb says `/top` while the URL is `?section=monthly` |
| 15 | Phone header (logged out) | ⚠️ The red "Intră în cont" button wraps onto 2 lines |
| 16 | Phone, topdrink #1 card | ❌ "Ce să iei: …" chip runs into "Vezi fișa" (the same overlap as v1's food card) |

Not re-run in the browser because the code is unchanged from v1: the review form position and the score change after one review. Both have the same cause in the same code.

---

## 3. Status of v1 issues

| v1 # | Issue | Status in `apps/web` | Where |
| --- | --- | --- | --- |
| 1 | `forwards` animation breaks fixed elements on the venue page (review bar, review form) | ❌ **Open** | `app/globals.css:335` |
| 2 | One review swings the score (baseline of 8 instead of the review count) | ❌ **Open** | `data/restaurants.ts:1510` |
| 3 | topdrink cream by default | ❌ **Open** | `app/globals.css:418` |
| 4 | Map unusable on phones | ✅ **Fixed**: touch panning, list closes below 768 px, card clears the nav | `MapView.tsx:217`, `:838` |
| 5 | No URLs; Back leaves the site | 🟡 **Mostly fixed**: query-param URLs, Back works, deep links work. Path-style routes from the README still 404; no per-venue title or meta | `TopFoodShell.tsx:54`, `:309` |
| 6 | Contradicting topdrink filters; "Topul de vineri" heading fixed | ❌ **Open** | `EditorialListView.tsx:154`, `:401` |
| 7 | "#1" badge on filtered and search results | ❌ **Open** | `EditorialListView.tsx:476`, `:917` |
| 8 | Search needs diacritics | ❌ **Open** (now in both food and drink search) | `EditorialListView.tsx:111`, `:149` |
| 9 | Hard-coded text | 🟡 **Partly**: "Clasamentul lunii noiembrie" is gone; "4.180" and "Trei terase" remain | `EditorialListView.tsx:840`, `:1029` |
| 10 | Monthly top: rename, fake October, mustard #3 | 🟡 **Partly**: rename fixed; mustard #3 remains | `MonthlyTopView.tsx:383` |
| 11 | Accessibility in pop-ups | 🟡 **Partly**: crowd sheet now has `role="dialog"` and Escape; review form has `aria-invalid` and `role="alert"`; podium `focus:outline-none` removed. Small text links (18–21 px tall) remain | — |
| 12 | Developer wording in the review form | ❌ **Open** | `RestaurantDetailModal.tsx:1015`, `:1089` |
| 13 | Chip overlaps "Vezi fișa" | ❌ **Open**; now on topdrink too | `EditorialListView.tsx:505` |
| 14 | Trap thresholds differ between map and list | ❌ **Open** | `MapView.tsx` |
| 15 | Raw lat/long readout on the map | ❌ **Open** | `MapView.tsx:1300` |
| 16 | Locals' blue badge used for scores | ❌ **Open** | — |
| 17 | External fonts and photos, no placeholders | ❌ **Open** | `app/layout.tsx` |

**Summary:** 1 fixed, 4 partly fixed, 12 open.

---

## 4. New in v2

### What got better
- **Real routes** `/topfood/timisoara` and `/topdrink/timisoara`, server-rendered lists, and page titles per vertical.
- **URL state** for venue and section, so Back, deep links and sharing work.
- **Login screen** on brand, with one-click demo accounts, a clear 2,0× vs 1,0× explanation, and "Explorează fără cont" (explore without an account). Guests can browse everything.
- **A toast** for login, logout and saving a venue (`role="status"`).
- **"Cum calculăm Scorul Onest?"** (how we calculate the honest score) on the home list, explaining the 2,0× / 1,0× / 0,2× weights and the pull towards the city average. This covers product rule 3 (every score is explained).
- **topdrink search box**, the "/" shortcut to focus search, and a map legend.

### New problems

**P0: trust in the scores**

- **N1. Anyone can become a "verified local".**
  - In registration, "Localnic" (2,0×) is pre-selected (`LoginScreen.tsx:53`).
  - Without a university email, one ticked checkbox ("Confirm că locuiesc în Timișoara…") is enough.
  - Login also accepts any email plus any 6-character password and creates an account. An address ending in `@e-uvt.ro` or `@upt.ro` becomes a local automatically (`LoginScreen.tsx:20`). That ties "local" to "student", which the product doesn't mean.

  Together with v1 #2 (one review swings the score), the demo shows the score is easy to game. **Fix:** default to "Turist"; make local status come from the simulated GPS check-in the spec describes (`CLAUDE.md` MVP step 4), or label self-declared locals as unverified at 1,0×.

**P1**

- **N2. Logging in from a venue loses your place.** `handleOpenLogin` (`TopFoodShell.tsx:247`) clears the venue. Return to the same venue, with the review form open, after logging in.
- **N3. The login doesn't survive a refresh.** `currentUserId` is plain React state (`TopFoodShell.tsx:101`). Keep it in `sessionStorage` for the demo.
- **N4. Logged-in users can switch into the demo accounts.** The "Cont activ" (active account) switcher in the profile menu (`Navbar.tsx:261`) lets anyone act as Andreea. Show it only in a demo mode.
- **N5. The login screen has no URL**, so Back from it leaves the page you came from.

**P2**

- **N6. Unlabelled controls on the login screen.** 5 buttons have no accessible name, and the GDPR checkbox is read as "on".
- **N7. The red "Intră în cont" button wraps onto 2 lines on a 375 px phone.** Use an icon, or "Cont", below `sm`.
- **N8. The monthly breadcrumb shows `topfood/timisoara/top`** (`MonthlyTopView.tsx:122`), but the URL is `?section=monthly` and the README says `top-luna`.

### Repository health

- `apps/web/tsconfig.tsbuildinfo` and `topfood-ui/.vite/deps/*` are committed; they're build output. Add them to `.gitignore` and remove them from git.
- The root `package-lock.json` doesn't match `apps/web/package.json`. Run `npm install` once and commit the lockfile, so teammates don't get a large lockfile diff on every install.
- `apps/web/README.md` lists routes (`/{slug}`, `/top-luna`, `/weekend`, `/u/{username}`, `/owner`, `/admin`) that don't exist yet.

---

## 5. Suggested order

1. Blocker 1: remove `forwards` (section 5).
2. Blocker 2: real review counts as score baselines (section 5).
3. Blocker 3: topdrink green by default (section 5).
4. Login: default to "Turist", make local status hard to self-assign (N1), and return to the venue after login (N2).
5. Either/or Friday/weekday choice; real ranks in filtered lists; search without diacritics.
6. Path routes `/topfood/timisoara/[slug]` with `generateMetadata` per venue (SEO, as planned in the spec).
7. P2 items and repository cleanup.

## 6. Not covered

- Real touch gestures (the emulator sends mouse clicks).
- Screen readers, and the dark theme in every view.
- Lighthouse or performance on a real phone.
- Backend packages, `apps/worker`, and the `/owner` and `/admin` pages (they don't exist yet).
