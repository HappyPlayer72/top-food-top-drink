# TopFood & TopDrink — Ghid de identitate vizuală

Identitatea vizuală a aplicației este definită central în [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css) și implementată în [`apps/web/src/components/BrandPrimitives.tsx`](../apps/web/src/components/BrandPrimitives.tsx). Pentru specificația completă în engleză, vezi [design-language.md](design-language.md).

---

## 1. Paletă de culori (8 tokeni core + suprafețe structurale)

### Cei 8 tokeni de identitate (`globals.css`)
- **Roșu carou** (`--color-carou`): `#B3261E` — fața de masă TopFood, accent primar food
- **Maro cafea** (`--color-cafea`): `#3A2418` — text principal TopFood (mod luminos)
- **Muștar** (`--color-mustar`): `#E0A526` — accent cald food, badge `Posibilă capcană`
- **Albastru plăcuță** (`--color-placuta`): `#1F4E8C` (mod întunecat `#7DB4FF`) — insignă `Localnic`, plăcuță stradală
- **Verde sticlă** (`--color-sticla`): `#17382C` — fundal public TopDrink și identitate băuturi
- **Chihlimbar** (`--color-chihlimbar`): `#F2A33A` — accent TopDrink, stele/notă, badge `Local nou`
- **Spumă** (`--color-spuma`): `#F4EEE2` — text pe Verde sticlă și text în modul întunecat
- **Carton / Suber** (`--color-carton`): `#B98A5E` — suport suber / coaster și accente neutre calde

### Suprafețe structurale (implementate în app)
- **TopFood (Mod luminos)**:
  - Fundal principal (`--color-paper`): `#FBF6EA` (Vanilla Ice Cream — clasa Tailwind `.bg-white` este remapată la `#FBF6EA` în modul luminos)
  - Suprafețe secundare: `#F5EFE2`, sponsorizat (`--color-sponsored-food`): `#F2EFE9`, linii (`--color-hairline`): `#E6DFD5`
  - Text secundar (`--color-muted-cafea`): `#6E5649`
- **TopFood (Mod întunecat — `html.dark`)**:
  - Fundal Evening Slate: `#22262E`, carduri `#2B303A` / `#313743`, text `#F4EEE2`, text secundar `#B6BAC4`
- **TopDrink (paginile publice `/topdrink/timisoara/*`)**:
  - Întotdeauna pe verde sticlă `#17382C` cu text `#F4EEE2`, card sponsorizat (`--color-sponsored-drink`) `#1E4335` și accente `#F2A33A`
- **Dashboard `/owner` (`.owner-shell` + `--o-*`)**:
  - Food luminos: `--o-bg: #FBF6EA`, `--o-fg: #3A2418`, `--o-card: #F5EFE2`, `--o-accent: #B3261E`
  - Food întunecat (`html.dark`): `--o-bg: #22262E`, `--o-fg: #F4EEE2`, `--o-card: #2B303A`
  - Drink luminos (`[data-vertical="drink"]`): `--o-bg: #F6F3EB`, `--o-fg: #17382C`, `--o-accent: #17382C`
  - Drink întunecat (`html.dark [data-vertical="drink"]`): `--o-bg: #17382C`, `--o-fg: #F4EEE2`, `--o-accent: #F2A33A`

---

## 2. Tipografie (`Archivo`)

Font unic încărcat din Google Fonts în [`apps/web/src/app/layout.tsx`](../apps/web/src/app/layout.tsx): **`Archivo`** variabil (`wdth` 62–125, `wght` 100–900).

| Clasă CSS | Setări | Utilizare |
|---|---|---|
| `.font-display` | `font-variation-settings: "wdth" 62; font-weight: 800;` | Titluri principale, scoruri, logo |
| `.font-display-light` | `font-variation-settings: "wdth" 62; font-weight: 300;` | Subtitluri mari editoriale |
| `.font-display-regular` | `font-variation-settings: "wdth" 62; font-weight: 400;` | Etichete condensat regulate |
| Body implicit | `"wdth" 100; line-height: 1.5;` | Text curent, descrieri, formulare |

---

## 3. Componente și motive vizuale (`BrandPrimitives.tsx`)

- **`CarouStrip`**: bandă de 6 celule flex în degrade carou (`#FAF5F0`, `#E08A84`, `#C94A42`, `#B3261E`) urmată de extensie solidă `#B3261E`, fără gradient CSS brut — semnătura TopFood.
- **`CarouMark` / `CoasterMark` / `BrandWordmark`**: marcaje vectoriale și wordmark oficial pentru TopFood (carou) și TopDrink (coaster crenelat).
- **`CoasterScore`**: insignă circulară crenelată (de obicei **56–64px**) pentru afișarea notei oneste (`0.0–10.0`).
- **`LocalnicBadge` / `InfluencerBadge` / `PartnerBadge` / `TrapBadge`**: badge-uri dedicate pentru localnic verificat (`2.0×`), parteneriat plătit (`0.2×`, transparent), partener oficial și nivel capcană turistică (`possible` / `trap`).
- **`LocalVsTouristBars`**: grafic comparativ orizontal **Localnici vs. Turiști** pentru explicarea vizuală a decalajului de scor.
- **`AvertizareaCard`**: card explicativ cu motivele concrete ale indicelui de capcană.
- **`EmployeeEcusonCard` & `CrowdMeter`**: card tip ecuson pentru angajați/premiul lunii și indicator în 5 trepte pentru `Vibe Check`.
- **`.doodle-wallpaper`**: fundal subtil mască SVG (`/owner-doodles.svg`) cu fade spre centru, folosit în zona de administrare/owner și detalii de brand.

---

## 4. Principiu de separare vizuală (Regula 3)

Cardurile sponsorizate folosesc o suprafață dedicată (`#F2EFE9` pe food luminos, `#1E4335` pe drink) cu etichetă vizibilă `"Sponsorizat"`, separate fizic de lista organică ordonată după `honestScore`.
