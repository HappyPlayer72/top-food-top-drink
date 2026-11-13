# Design

Responsabil: **Design / Produs** · identitatea vizuală implementată în `apps/web/src/app/globals.css` și `apps/web/src/components/BrandPrimitives.tsx`.

## Tipografie (`Archivo` Variable)

| Rol | Font & axe variable | Utilizare |
| --- | --- | --- |
| Titluri, scoruri, ranguri (`font-display`) | `Archivo` condensed (`wdth` 62%, `wght` 800) | Nume localuri, scoruri mari, clasamente |
| Sufix `/timișoara` (`font-display-light`) | `Archivo` condensed (`wdth` 62%, `wght` 300) | Wordmark `topfood/timișoara`, `topdrink/timișoara` |
| Text curent & UI (`font-sans`) | `Archivo` regular (`wdth` 100%, `wght` 400–700) | Review-uri, filtre, etichete, formulare |
| Cifre aliniate | `Archivo` cu `tabular-nums` | Scoruri din 10, prețuri, ponderi (`2,0×`, `1,0×`, `0,2×`) |

## Paleta în 8 tokenuri

| Token | Hex | Rol |
| --- | --- | --- |
| **Carou** | `#B3261E` | Accent principal `topfood`, bandă gingham `CarouStrip`, insignă `Capcană turistică`, focus ring în mod luminos |
| **Cafea** | `#3A2418` | Cerneală principală `topfood`, stări active, `InfluencerBadge` |
| **Muștar** | `#E0A526` | Insignă `Posibilă capcană turistică` |
| **Plăcuță** | `#1F4E8C` | Rezervat strict pentru localnici (`LocalnicBadge` și bară `Localnici`; `#7DB4FF` în mod întunecat pentru contrast AA) |
| **Sticlă** | `#17382C` | Fundal principal `topdrink` (mod întunecat) și cerneală `topdrink` (mod luminos pe `#F6F3EB`) |
| **Chihlimbar** | `#F2A33A` | Accent principal `topdrink`, focus ring în mod întunecat și pe `Sticlă`, `CrowdMeter` |
| **Spumă** | `#F4EEE2` | Cerneală pe fond `Sticlă`, umplere `CoasterScore` / `CoasterMark`, text inversat în mod întunecat |
| **Carton** | `#B98A5E` | Contur suport de bere (`CoasterMark`, `CoasterScore`) |

## Accesibilitate

- Contrast WCAG AA (≥ 4.5:1) în ambele moduri (luminos și întunecat `#22262E` / `#17382C`), inclusiv pentru `.text-[#1F4E8C]`, `.text-[#B3261E]` și etichete secundare.
- Inele `:focus-visible` de 2px cu contrast ridicat (`#B3261E` pe fond luminos, `#17382C` pe `topdrink` luminos, `#F2A33A` în `html.dark` și pe `#17382C`).
- Insigna de capcană turistică combină formă (triunghi plin / contur) + text + culoare.
