# TOP FOOD / TOP DRINK — Design Language & Graphical Elements

This document captures the current visual identity and graphical primitives implemented in [globals.css](file:///c:/Users/Serban/Documents/Antigravity/Unihack%2026/apps/web/src/app/globals.css), [BrandPrimitives.tsx](file:///c:/Users/Serban/Documents/Antigravity/Unihack%2026/apps/web/src/components/BrandPrimitives.tsx), and [design/README.md](file:///c:/Users/Serban/Documents/Antigravity/Unihack%2026/design/README.md).

---

## 1. Core Visual Metaphors

- **TOP FOOD**: Red gingham tablecloth (*fața de masă în carouri roșii*) from a neighborhood eatery.
- **TOP DRINK**: Beer coaster & mug (*suportul de bere*) resting on bottle green (*verdele unei sticle*).
- **Localnic**: Blue street-name plaque (*plăcuța albastră de stradă*) bearing the neighborhood name (e.g., *„Localnic din Iosefin”*).
- **Capcană turistică**: Street warning triangle (`!` = confirmed trap, `?` = possible trap).

---

## 2. Color Palette & Tokens

### Core 8 Identity Tokens

| Token | Name | Hex | Usage | Contrast |
| --- | --- | --- | --- | --- |
| `--color-carou` | **Carou** | `#B3261E` | Food mark, primary buttons, trap badges, light-mode focus ring | 6.5:1 with white |
| `--color-cafea` | **Cafea** | `#3A2418` | Primary text on paper, active states, `InfluencerBadge` | 14:1 on white |
| `--color-mustar` | **Muștar** | `#E0A526` | Background only (with Cafea text), *„Posibilă capcană”* | 6.7:1 with Cafea |
| `--color-placuta` | **Plăcuță** | `#1F4E8C` | **Strictly** `LocalnicBadge` & `LocalVsTouristBars` (`#7DB4FF` in dark mode) | 8:1 with white |
| `--color-sticla` | **Sticlă** | `#17382C` | TOP DRINK dark background; TOP DRINK ink on `#F6F3EB` in light mode | — |
| `--color-chihlimbar` | **Chihlimbar** | `#F2A33A` | Drink accent, buttons, `CrowdMeter`, focus ring on Sticlă & dark mode | 6:1 on Sticlă |
| `--color-spuma` | **Spumă** | `#F4EEE2` | Primary text on Sticlă, `CoasterScore` / `CoasterMark` fill | 11:1 on Sticlă |
| `--color-carton` | **Carton** | `#B98A5E` | Beer coaster & mug outline (`CoasterMark`, `CoasterScore`) | Decorative |

### Quiet Structural Surfaces

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-paper` | `#FFFFFF` | Light-mode page surface |
| `--color-sponsored-food` | `#F2EFE9` | Modest sponsored card surface (Food) |
| `--color-sponsored-drink` | `#1E4335` | Modest sponsored card surface (Drink) |
| `--color-hairline` | `#E6DFD5` | Subtle dividers and borders |
| `--color-muted-cafea` | `#6E5649` | Secondary meta text & explanations |

---

## 3. Typography

A single variable font family: **Archivo** (Google Fonts, variable width axis `wdth` `62–125`).

| Role | Setting | Class |
| --- | --- | --- |
| Logo, headings, scores, ranks | `font-stretch: 62%`, weight `800–850` | `font-display` |
| Logo city suffix (`/timișoara`) | `font-stretch: 62%`, weight `300` | `font-display-light` |
| Body & UI copy | Normal width (`100`), weight `400` / `600`, `14–17px` | `font-sans` |
| Aligned numerals (scores, prices, weights) | `tabular-nums` | — |

> [!NOTE]
> Scores use the Romanian decimal comma (e.g., `9,1`), and the score is always the largest number on screen.

---

## 4. Graphical Elements (`BrandPrimitives.tsx`)

### Marks & Dividers

1. **`CarouMark`** — 32×32 rounded-square gingham icon (`#B3261E` border, `#D96B63` / `#C44037` / `#B3261E` 2×2 weave) used for the `topfood` wordmark.
2. **`CarouStrip`** — Horizontal tablecloth bar (default `10px` height) with a 2-row gingham weave on the left (`#FAF5F0`, `#E08A84`, `#C94A42`, `#B3261E`) extending into solid Carou. Appears **at most once per screen** (hero divider or under score).
   ```css
   background-color: #FFFFFF;
   background-image:
     linear-gradient(90deg, rgba(179,38,30,.55) 50%, transparent 50%),
     linear-gradient(rgba(179,38,30,.55) 50%, transparent 50%);
   background-size: 12px 12px;
   ```
3. **`CoasterMark`** — 32×32 beer mug SVG (`#F2A33A` Chihlimbar body, `#B98A5E` Carton handle & outline, `#F4EEE2` Spumă foam head, `#17382C` subtle flutes) used for the `topdrink` wordmark.
4. **`CoasterScore`** — Circular beer coaster (`#F4EEE2` Spumă fill, `#B98A5E` Carton border, `#17382C` Sticlă numerals) displaying the venue score (`md` or `lg`).
5. **`BrandWordmark`** — Combines `CarouMark` or `CoasterMark` with `topfood` / `topdrink` (`font-display`) and `/timișoara` (`font-display-light`).

### Badges & Trust Signals

6. **`LocalnicBadge`** — Blue street-plaque pill (`#1F4E8C` Plăcuță background, white text) reserved **exclusively** for verified local residents (e.g., *„Localnic din Iosefin”*).
7. **`InfluencerBadge`** — Cafea (`#3A2418`) badge indicating influencer/creator reviews.
8. **`PartnerBadge`** — Modest partner indicator.
9. **`TrapBadge`** — Street warning triangle combining **shape + text + color**:
   - Confirmed trap: solid `#B3261E` Carou triangle with `!`.
   - Possible trap: `#E0A526` Muștar triangle with `?` and Cafea text.

### Data & Editorial Cards

10. **`EmployeeEcusonCard`** — Staff/employee verification badge card (*ecuson*).
11. **`LocalVsTouristBars`** — Horizontal comparison bars contrasting local (`#1F4E8C` Plăcuță) vs. tourist sentiment.
12. **`AvertizareaCard`** — Detailed tourist-trap breakdown card (`TrapBreakdown`).
13. **`CrowdMeter`** — Chihlimbar (`#F2A33A`) live/typical crowd level indicator for venues.

---

## 5. Design & Accessibility Rules

1. **Single-occurrence rule**: `CarouStrip` and coaster motifs appear at most once per screen, never as a full-page background.
2. **Color-meaning lock**: Plăcuță blue (`#1F4E8C`) means **only** *„localnic”*.
3. **Modest sponsorship**: Paid placements use muted gray/green surfaces (`#F2EFE9` / `#1E4335`) with *„Sponsorizat. Nu schimbă scorul.”*
4. **Shape + Color**: Tourist traps are always identifiable by triangle shape (`!` / `?`), not color alone.
5. **Restraint**: No all-caps labels, no monospace fonts, no identical drop-shadowed cards.
6. **WCAG AA & Focus**: Contrast ≥ 4.5:1 in both light and dark (`#22262E` / `#17382C`) modes; `2px` `:focus-visible` rings in `#B3261E` (light), `#17382C` (`topdrink` light), and `#F2A33A` (`html.dark` and on `#17382C`).
