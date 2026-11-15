# Hyperframes Composition Brief: TopFood & TopDrink — Timișoara

## Objective
Create a 20-second 1920x1080 launch-style brag video for **TopFood & TopDrink (Timișoara)** showcasing its honest local-weighted scoring engine, tourist trap index, bot-vs-local review weighting, and dual Food/Drink visual identity.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `c:\Users\Serban\Documents\Antigravity\Unihack 26`
- Primary files read: `README.md`, `design/README.md`, `landing/index.html`, `apps/web/src/app/globals.css`, `apps/web/src/components/BrandPrimitives.tsx`, `apps/web/src/components/VenueCards.tsx`, `apps/web/src/components/ScarnaviiView.tsx`, `apps/web/src/data/heroHeaders.ts`, `apps/web/src/data/restaurants.ts`, `docs/DEMO.md`
- Product name: **topfood/timișoara** & **topdrink/timișoara**
- Tagline / strongest claim: `"Timișoara pe gustate, nu pe ghicite"` / `"Nu ștergem review-uri. Le cântărim."` / `"Un localnic verificat cântărește cât ~30 de boți."`
- Key UI or visual moment to recreate:
  1. `CarouStrip` gingham bar + `AvertizareaCard` / `LocalVsTouristBars` on **Terasa Miorița (Piața Unirii)** (`4,5★` Google vs `5,8` Scor Onest, `Localnici 5,1` vs `Turiști 8,4`, `82/100 Capcană turistică`, `"Prețuri cu 59% peste medie"`).
  2. Bot vs Verified Local review weighting duel (`cont creat ieri` `0,08` vs `Doamna Elena · Localnic din Iosefin` `2,6`).
  3. TopFood organic `#1` **Restaurant Nora** (`Scor Onest 9,1`, `Localnici 9,4`, `Plescaviță sârbească · 44 lei`, separated from `Sponsorizat: Vinto Gastro Wine Bar`).
  4. Toggle flip from TopFood (`#FBF6EA`) to TopDrink (`#17382C` bottle-green) featuring **The 80's Pub** (`CoasterScore 8,4`, 5/5 `CrowdMeter` `"Plin / petrecere, acum 5 min"`, `Fidelitate QR`, `Scârnavii`).
- Copy that must appear verbatim:
  - `Timișoara pe gustate, nu pe ghicite`
  - `Nu ștergem review-uri. Le cântărim.`
  - `Un localnic verificat cântărește cât ~30 de boți.`
  - `Sponsorizat. Nu schimbă scorul.`
  - `Scor Onest`
  - `Localnic din Iosefin`
  - `Capcană turistică`

## Creative Direction
- Tone preset: `default` (with restrained `yc-parody` factual precision)
- Creative direction: Sharp local insider manifesto — witty, proud of its math, grounded in Timișoara
- Interpretation: Every claim is concrete, grounded in the real codebase data, and held long enough to read effortlessly while keeping cuts crisp on musical cues.
- Angle: Show the product *doing* its math in public: exposing a 4.5★ tourist trap, weighing bots (`0,08`) against locals (`2,6`), proving organic #1 can't be bought, and flipping into TopDrink's bottle-green nightlife mode.
- Hook: `"Pe Google: 4,5★. În realitate: capcană turistică."` (0.00s → 3.70s)
- Outro / punchline: `topfood/timișoara` + `topdrink/timișoara` — `"Timișoara pe gustate, nu pe ghicite. Fără capcane turistice. Fără review-uri cumpărate."`
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: `#FBF6EA` (TopFood paper) and `#17382C` (TopDrink Verde sticlă)
- Text: `#3A2418` (Maro cafea), `#6E5649` (Muted cafea), `#F4EEE2` (Spumă on dark)
- Accent: `#B3261E` (Roșu carou), `#E0A526` (Muștar), `#2D5130` (Verde-brad Localnic badge), `#F2A33A` (Chihlimbar), `#B98A5E` (Carton)
- Display font: `Archivo` (`wdth` 62, `wght` 800)
- Body font: `Archivo` (`wdth` 100, `wght` 400–600)
- Visual references from the project: `CarouMark`, `CarouStrip`, `CoasterMark`, `CoasterScore`, `LocalnicBadge`, `LocalVsTouristBars`, `AvertizareaCard`, `CrowdMeter`

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook: Capcana de 4,5★ — `0.00s → 3.70s` (3.70s) — Terasa Miorița 4,5★ Google vs 82/100 Capcană turistică (`Localnici 5,1` vs `Turiști 8,4`).
2. Motorul de cântărire — `3.70s → 8.44s` (4.74s) — `"Nu ștergem review-uri. Le cântărim."` Bot (`0,08`) vs Doamna Elena (`2,6`) → `"~30 de boți"`.
3. TopFood #1: Scor Onest — `8.44s → 12.65s` (4.21s) — `Sponsorizat` strip separated above `#1 Restaurant Nora` (`Scor Onest 9,1`, `Localnici 9,4`).
4. TopDrink & Scârnavii — `12.65s → 16.86s` (4.21s) — Toggle click floods `#17382C` bottle-green: `The 80's Pub`, `CoasterScore 8,4`, 5/5 `CrowdMeter`, `Fidelitate QR`, `Scârnavii`.
5. Outro: Brand Lockup — `16.86s → 20.00s` (3.14s) — Both marks + `"Timișoara pe gustate, nu pe ghicite."` held cleanly.

## Audio
- Audio role: Warm upbeat editorial bed with crisp UI & card accents
- Audio arc: Steady 114.84 BPM bed from 0.00s to 20.00s (`data-volume="0.32"`, `data-fade-in="0.35"`, `data-fade-out="1.4"`), punctuated by clean motion-matched SFX and ending on a warm bell ring.
- Music: `assets/music/happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: Volume `0.32`, 0.35s fade-in, 1.4s fade-out under final lockup.
- Music cue guidance: Precomputed preset `C:\Users\Serban\.gemini\config\skills\brag\assets\music\cues\happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json` (114.84 BPM). Strong cues locked at `3.70s`, `6.34s`, `8.44s`, `12.65s`; sequential beat-grid snaps at `4.23s`, `5.28s`, `8.96s`, `9.50s`, `10.01s`, `13.18s`, `13.70s`.
- Audio-reactive treatment: Subtle; precomputed per-frame RMS/energy envelope (derived directly from the music track via ffmpeg/WebAudio or precomputed JSON) gently modulates subtle card shadow/glow warmth and CoasterScore rim emphasis. Zero waveform bars or strobing.
- Audio-coupled moments:
  - `1.00s` — Trap verdict impact (`impactSoft_medium_001`)
  - `3.70s` — Scene 2 cut (`impactSoft_medium_004`)
  - `4.23s` & `5.28s` — Bot & Local review cards slide in (`casino/card-slide-1`, `interface/drop_001`)
  - `6.34s` — `"~30 de boți"` payoff (`interface/bong_001`)
  - `8.44s` — Scene 3 TopFood #1 cut (`impactSoft_medium_002`)
  - `12.65s` — Food→Drink toggle switch (`interface/switch_007`)
  - `16.86s` — Outro clean drop (`interface/drop_002`)
  - `17.20s` — Final brand bell (`impactBell_heavy_000`)
- SFX analysis guidance: `C:\Users\Serban\.gemini\config\skills\brag\assets\sfx\sfx-analysis.md` (low/medium HF risk only)
- Exact SFX choice: Hyperframes chooses exact timestamps and volumes to align 0.0–0.1s with visual starts.
- Audio files: copy chosen music and SFX into `brag-output/composition/assets/`.

## Hyperframes Instructions
Requirements:
- Use seek-safe GSAP timelines (`{ paused: true }`, registered on `window.__timelines["root"]` AFTER async font readiness / setup) with absolute seconds (`tl.to(..., t)`), `fromTo` states, and zero `requestAnimationFrame` loops.
- Ensure frame 0 paints the full Hook title and Terasa Miorița card immediately (never empty on frame 0).
- Guarantee WCAG AA contrast on all visible text (`#3A2418` / `#6E5649` on `#FBF6EA`; `#F4EEE2` / `#F2A33A` on `#17382C`; `#FFFFFF` on `#2D5130` & `#B3261E`).
- Keep all copy readable (`line_unread` / `text_below_floor` safe: font sizes >= 28px at 1080p for held text, generous holds >= 1.5s–2.2s).
- Run `npx hyperframes check` with zero errors before rendering.
