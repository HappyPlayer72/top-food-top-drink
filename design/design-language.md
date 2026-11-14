# TopFood & TopDrink — Design Language Specification

> Canonical reference matching [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css), [`apps/web/src/app/layout.tsx`](../apps/web/src/app/layout.tsx), and [`apps/web/src/components/BrandPrimitives.tsx`](../apps/web/src/components/BrandPrimitives.tsx). See [`design/README.md`](README.md) for the Romanian summary.

---

## 1. Visual Concept & Two-Face System

TopFood & TopDrink is a single product with two distinct editorial atmospheres:
- **TopFood** (Daytime, neighborhood dining): Warm paper canvas (`#FBF6EA`), coffee-ink text (`#3A2418`), checkered gingham red (`#B3261E`), mustard warmth (`#E0A526`), and street-sign blue (`#1F4E8C`) for verified locals. Dark mode shifts to Evening Slate (`#22262E`).
- **TopDrink** (Nightlife, pubs & cocktail bars): Deep bottle-green public surface (`#17382C`), foam-cream ink (`#F4EEE2`), amber-gold accents (`#F2A33A`), and notched cardboard coaster marks (`#B98A5E`).

---

## 2. Color Tokens (`@theme` in `globals.css`)

### Core 8 Identity Tokens
| CSS Token | Hex | Semantic Role |
|---|---|---|
| `--color-carou` | `#B3261E` | TopFood primary accent, checkered strip, food danger/active marker |
| `--color-cafea` | `#3A2418` | TopFood primary ink (light mode) |
| `--color-mustar` | `#E0A526` | Warm highlight, `Posibilă capcană` (`trapLevel: "possible"`) badge |
| `--color-placuta` | `#1F4E8C` | `Localnic` verified badge, street-plaque accent (`#7DB4FF` in dark mode) |
| `--color-sticla` | `#17382C` | TopDrink public background, bottle-green brand surface |
| `--color-chihlimbar` | `#F2A33A` | TopDrink primary accent, rating stars, new-venue highlight |
| `--color-spuma` | `#F4EEE2` | Light ink on `#17382C` and dark-mode primary ink |
| `--color-carton` | `#B98A5E` | Coaster/cork accent and warm secondary border |

### Structural & Mode Surfaces
- **TopFood Light (`html:not(.dark)`)**:
  - `--color-paper`: `#FBF6EA` (note: `.bg-white` is intentionally remapped to `#FBF6EA` in light mode)
  - Elevated / soft surface: `#F5EFE2`
  - Muted ink (`--color-muted-cafea`): `#6E5649`
  - Hairline border (`--color-hairline`): `#E6DFD5`
  - Sponsored card (`--color-sponsored-food`): `#F2EFE9`
- **TopFood Dark (`html.dark`)**:
  - Base background: `#22262E`
  - Cards & elevated layers: `#2B303A` / `#313743`
  - Primary ink: `#F4EEE2` | Muted ink: `#B6BAC4`
- **TopDrink Public ([`TopFoodShell.tsx`](../apps/web/src/components/TopFoodShell.tsx))**:
  - Always renders on `#17382C` (`--color-sticla`) with `#F4EEE2` text and `--color-sponsored-drink` (`#1E4335`) for sponsored items.
- **Owner Portal (`.owner-shell` `--o-*` tokens in `globals.css`)**:
  - Light food: `--o-bg: #FBF6EA`, `--o-fg: #3A2418`, `--o-card: #F5EFE2`, `--o-accent: #B3261E`, `--o-quiet: #F2EFE9`
  - Dark food: `--o-bg: #22262E`, `--o-fg: #F4EEE2`, `--o-card: #2B303A`
  - Light drink (`[data-vertical="drink"]`): `--o-bg: #F6F3EB`, `--o-fg: #17382C`, `--o-card: #FBF9F3`, `--o-accent: #17382C`
  - Dark drink (`html.dark [data-vertical="drink"]`): `--o-bg: #17382C`, `--o-fg: #F4EEE2`, `--o-card: #143025`, `--o-accent: #F2A33A`

---

## 3. Typography & Motion

- **Single variable font**: `Archivo` loaded via Google Fonts (`wdth: 62..125`, `wght: 100..900`) in `apps/web/src/app/layout.tsx`.
  - `.font-display`: `font-variation-settings: "wdth" 62; font-weight: 800;`
  - `.font-display-light`: `font-variation-settings: "wdth" 62; font-weight: 300;`
  - `.font-display-regular`: `font-variation-settings: "wdth" 62; font-weight: 400;`
  - Body default: `"wdth" 100`, `line-height: 1.5`.
- **Easing curves (`:root` in `globals.css`)**:
  - `--ease-out`: `cubic-bezier(0.23, 1, 0.32, 1)`
  - `--ease-in-out`: `cubic-bezier(0.77, 0, 0.175, 1)`
  - `--ease-drawer`: `cubic-bezier(0.32, 0.72, 0, 1)`
  - Respect `@media (prefers-reduced-motion: reduce)`.

---

## 4. Brand Primitives (`apps/web/src/components/BrandPrimitives.tsx`)

- **`CarouStrip`**: 6 stepped flex-div cells (`#FAF5F0`, `#E08A84`, `#C94A42`, `#B3261E`) transitioning into a solid `#B3261E` band — signature checkered-tablecloth header strip.
- **`CarouMark` / `CoasterMark` / `BrandWordmark`**: SVG marks and lockups switching between TopFood and TopDrink identities.
- **`CoasterScore`**: Scalloped circular coaster badge displaying the honest rating (`0.0–10.0`).
- **`LocalnicBadge`**, **`InfluencerBadge`**, **`PartnerBadge`**, **`TrapBadge`**: Status pills enforcing visual transparency for local verification (`2.0×`), paid influencer disclosures (`0.2×`), partners, and tourist trap alerts.
- **`LocalVsTouristBars`**: Side-by-side horizontal bar comparison illustrating local vs. tourist score divergence.
- **`AvertizareaCard`**: Explanation callout listing the Romanian `trapReasons` behind a venue's trap index.
- **`EmployeeEcusonCard`** & **`CrowdMeter`**: Nameplate card for staff/employee-of-the-month honors and 5-level live crowd/vibe indicator.
- **`.doodle-wallpaper`**: Subtle SVG mask pattern (`/owner-doodles.svg`) fading toward center, tinted dynamically via `var(--o-fg, currentColor)`.
