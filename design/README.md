# Design

Responsabil: **Design / Produs**. Machetele și sistemul complet sunt în Claude Design: [TOP FOOD / TOP DRINK — Identitate vizuală](https://claude.ai/artifact/S46PhX5PXags3MXLNhp8KU).

## Idee

- **TOP FOOD**: fața de masă în carouri roșii de la cârciuma din cartier.
- **TOP DRINK**: suportul de bere de pe masă, pe verdele unei sticle.
- **Localnic**: plăcuța albastră de stradă, cu numele cartierului („Localnic din Iosefin”).
- **Capcană turistică**: triunghiul de avertizare de pe stradă (`!` = capcană, `?` = posibilă capcană).

## Culori

| Nume | Hex | Folosire | Contrast |
| --- | --- | --- | --- |
| Carou | `#B3261E` | semnul food, butoane, capcane | alb pe el / el pe alb 6,5:1 |
| Cafea | `#3A2418` | tot textul pe alb | 14:1 pe alb |
| Text secundar | `#6B5A4E` | meta, explicații | 6,5:1 pe alb |
| Muștar | `#E0A526` | doar fundal, cu text Cafea; „Posibilă capcană” | Cafea pe el 6,7:1 |
| Plăcuță | `#1F4E8C` | **doar** insigna de localnic | alb pe el 8:1 |
| Sticlă | `#17382C` | fundalul TOP DRINK | — |
| Chihlimbar | `#F2A33A` | accent drink, butoane | pe Sticlă 6:1 |
| Spumă | `#F4EEE2` | text pe Sticlă | 11:1 |
| Spumă secundar | `#C9C1AE` | meta pe Sticlă | 7:1 |
| Carton | `#B98A5E` | doar marginea suportului de bere | decorativ |

Carourile în CSS (fundal alb + roșu la 55%):

```css
background-color: #FFFFFF;
background-image:
  linear-gradient(90deg, rgba(179,38,30,.55) 50%, transparent 50%),
  linear-gradient(rgba(179,38,30,.55) 50%, transparent 50%);
background-size: 12px 12px;
```

## Tipografie

Un singur font: **Archivo** (Google Fonts, variabil, axa `wdth` 62–125).

| Rol | Setare |
| --- | --- |
| Logo, titluri, scoruri, ranguri | `font-stretch: 62%`, greutate 800–850 |
| Logo, partea „/timișoara” | `font-stretch: 62%`, greutate 300 |
| Text și interfață | lățime normală, 400 și 600, 14–17 px |

Scorurile folosesc virgulă zecimală (`9,1`), ca în română.

## Reguli

1. Caroul și suportul apar o singură dată pe ecran (în antet sau sub scor), niciodată ca fundal de pagină.
2. Albastrul de plăcuță înseamnă doar „localnic”.
3. Ce e plătit arată mai modest decât restul: fundal gri, text „Sponsorizat. Nu schimbă scorul.”
4. Capcana se recunoaște după formă (triunghi), nu doar după culoare.
5. Scorul e cel mai mare număr de pe ecran.
6. Fără etichete scrise numai cu majuscule, fără fonturi monospace, fără carduri identice cu umbre.
