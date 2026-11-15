# Brag Plan: TopFood & TopDrink — Timișoara

## What is this app?
TopFood & TopDrink is Timișoara's anti-tourist-trap food and nightlife guide where verified locals weigh twice as much as tourists, fake reviews are neutralized by 6 signals, and every venue carries an honest score alongside its Tourist Trap Index and reasons.

## The angle
Instead of deleting bad or suspicious reviews like other platforms pretend to, TopFood & TopDrink *weighs* them in public — showing why a 4.5★ Google terrace in Piața Unirii drops to 5.8/10 while a neighborhood spot in Iosefin wins #1, then flipping the whole color world from gingham tablecloth (`#FBF6EA`) to bottle-green nightlife (`#17382C`).

## Hook (first 2-3 seconds)
Open directly on the contrast every local recognizes: **"Pe Google: 4,5★. În realitate: capcană turistică."** paired with **Terasa Miorița (Piața Unirii)** showing `Localnici 5,1` vs `Turiști 8,4` and `82/100 Capcană`.

## Key moments (the middle)
- **Review Weighting Duel:** `"Nu ștergem review-uri. Le cântărim."` — a 1-day-old bot account (`73% șansă de fals`, weight **0,08**) vs Doamna Elena (`Localnic din Iosefin`, GPS confirmed, weight **2,6**), landing on `"1 localnic verificat = ~30 de boți."`
- **TopFood Organic #1:** **Restaurant Nora** (`Dâmbovița / Iosefin`) holding `Scor Onest 9,1` and `Localnici 9,4` while `Sponsorizat` sits physically separated with *"Nu schimbă scorul."*
- **The TopFood → TopDrink Flip:** A live toggle transforms the entire canvas to bottle-green `#17382C` for **The 80's Pub**, displaying the `CoasterScore 8,4`, live 5/5 **Vibe Check**, rotating 60s **Fidelitate QR**, and **Scârnavii** table games.

## Outro / punchline
Both brand marks (`CarouMark` + `CoasterMark`) lock side by side over the `CarouStrip` tablecloth edge: **"Timișoara pe gustate, nu pe ghicite."** — *"Fără capcane turistice. Fără review-uri cumpărate."*

## User flow worth showing
1. Spot the tourist trap (`Terasa Miorița`: 4,5★ Google → 82/100 Trap Index, Localnici 5,1 vs Turiști 8,4)
2. Watch the weighting engine score a bot (`0,08`) vs a GPS-verified local (`2,6`)
3. Browse the honest #1 (`Restaurant Nora` 9,1) and toggle **Food → Drink** (`The 80's Pub` 8,4 + live Vibe Check + Fidelitate QR / Scârnavii)

## Tone
- Preset: `default` (with restrained `yc-parody` factual punch)
- Creative direction: Sharp local insider manifesto — witty, proud of its math, grounded in Timișoara
- Interpretation: Crisp Romanian copy, generous reading holds, snappy data reveals, and zero generic SaaS fluff.

## Format: landscape — 1920x1080
## Duration: 20s

## Visual identity (from the project)
- Background: `#FBF6EA` (TopFood paper) / `#17382C` (TopDrink Verde sticlă)
- Accent: `#B3261E` (Roșu carou), `#E0A526` (Muștar), `#2D5130` (Verde-brad Localnic), `#F2A33A` (Chihlimbar)
- Text: `#3A2418` (Maro cafea) / `#F4EEE2` (Spumă)
- Display font: `Archivo` (`wdth` 62, `wght` 800)
- Body font: `Archivo` (`wdth` 100, `wght` 400–600)
- Strongest visual element: `CarouStrip` gingham edge, `LocalnicBadge` green plaque, `LocalVsTouristBars`, `AvertizareaCard`, and `CoasterScore` + `CrowdMeter` on `#17382C`

## Share copy (draft)
Pe Google, o terasă din Piața Unirii are 4,5★. Pe TopFood & TopDrink Timișoara, un localnic verificat cântărește cât ~30 de boți — și fiecare scor vine cu indicele de capcană și motivele la vedere.

## Audio direction
- Role: Warm upbeat editorial bed with crisp UI & card accents
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` (114.84 BPM)
- Music treatment: Starts at 0.0s (`data-volume="0.32"`), 0.35s fade-in, smooth 1.4s fade-out at end under final logo ring
- Music cue guidance: Precomputed preset `happy-beats-business-moves-vol-9-by-ende-dot-app.music-cues.json` (114.84 BPM). Strong cues locked at `3.70s` (Scene 2), `6.34s` (30-bots payoff), `8.44s` (Scene 3 TopFood #1), and `12.65s` (Scene 4 TopDrink flip). Beat-grid snaps for sequential cards/bars (`4.23s`, `5.28s`, `8.96s`, `9.50s`, `10.01s`).
- Audio-reactive treatment: Subtle; music RMS/bass gently modulates card elevation glow and CoasterScore warm rim presence. No waveforms, bars, or strobing.
- SFX posture: Moderate, motion-matched, low/medium HF risk only (`impactSoft_medium_*`, `interface/click_003`, `interface/switch_007`, `casino/card-slide-1`, `impactBell_heavy_000`)
- Audio-coupled moments: Scene cuts, card duel entrances, Food→Drink toggle switch, Vibe Check segment ticks, final brand bell
- Restraint rule: Keep SFX clean and spaced; never stack loud bright clicks over readable sentences.

## Storyboard

### Scene 1 — Hook: Capcana de 4,5★ — 3.70s (0.00s → 3.70s)
Top `CarouStrip` gingham band frames a crisp `#FBF6EA` editorial canvas. Frame 0 immediately presents `"Pe Google: 4,5★."` alongside the **Terasa Miorița (Piața Unirii)** preview card. At 0.8s, the verdict lands: `"În realitate: capcană turistică."` as `LocalVsTouristBars` animate (`Localnici 5,1` vs `Turiști 8,4`) and the `82/100 Capcană turistică` badge + `"Prețuri cu 59% peste medie"` chip lock in.
Sequential/interaction: yes — bars fill to 51% vs 84%, then `82/100` trap badge lands.
Audio intent: Confident groove enters; soft impact accentuates the trap verdict.
Audio-coupled idea: Beat-aligned reveal of trap verdict and bar fill.
Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
Transition mood: hard cut on `3.70s` strong_beat → Scene 2

### Scene 2 — Motorul de cântărire: Localnic vs Bot — 4.74s (3.70s → 8.44s)
Headline locks at top: `"Nu ștergem review-uri. Le cântărim."` Two side-by-side review cards enter cleanly (`4.23s` and `5.28s`): left is `cont creat ieri` (`"„Super! Recomand!”"`, `73% șansă de fals`, weight `0,08` in muted brown); right is `Doamna Elena` with `#2D5130` `Localnic din Iosefin` badge (`"„Ciorbă de burtă bună, servirea 40 min.”"`, GPS confirmat, weight `2,6` in forest green). At `6.34s` (`strong_beat`), the bottom callout lands and holds: `"1 localnic verificat cântărește cât ~30 de boți."`
Sequential/interaction: yes — bot card (`4.23s`), local card (`5.28s`), punchline banner (`6.34s`).
Audio intent: Clean comparison tension resolving into a crisp mathematical punchline.
Audio-coupled idea: Card slides on beat-grid + soft bell/drop on `6.34s` punchline.
Music: continues
Transition mood: clean slide on `8.44s` strong_beat → Scene 3

### Scene 3 — TopFood #1: Scor Onest în acțiune — 4.21s (8.44s → 12.65s)
Shows the live TopFood Timișoara list structure: a physically separated `#F2EFE9` strip (`Sponsorizat · Vinto Gastro Wine Bar · Nu schimbă scorul`) above the organic **#1 Restaurant Nora** (`Dâmbovița / Iosefin`, `PlateScore 9,1`, `Localnici 9,4`, `Turiști 8,2`, `Recomandat: Plescaviță sârbească · 44 lei`, `Indice capcană: 9/100`). Score counts up cleanly to `9,1` and bars settle.
Sequential/interaction: yes — sponsored disclaimer chip, #1 Nora card, score count-up & aspect pills (`8.96s`, `9.50s`, `10.01s`).
Audio intent: Satisfying proof of honest ranking.
Audio-coupled idea: Soft chip/card reveal ticks on beat-grid.
Music: continues
Transition mood: toggle switch colour flood on `12.65s` strong_beat → Scene 4

### Scene 4 — TopDrink & Scârnavii: Seara de vineri — 4.21s (12.65s → 16.86s)
A simulated cursor/pill toggle clicks from `TopFood` to `TopDrink`, flooding the canvas in `#17382C` bottle-green (`#F4EEE2` text, `#F2A33A` amber). Displays **The 80's Pub** (`Str. Arieș nr. 19`), circular **CoasterScore `8,4`** (`vineri–sâmbătă noaptea`), 5-segment **Vibe Check live** (`Plin / petrecere, acum 5 min`), plus two ecosystem pills: `Fidelitate QR rotativ la 60s` and `Scârnavii · 6 jocuri de masă`.
Sequential/interaction: yes — simulated toggle click switches world (`12.65s`), CoasterScore + 5 CrowdMeter segments light up sequentially, ecosystem pills land.
Audio intent: Nightlife energy shift — crisp switch + tactile glass/drop ticks.
Audio-coupled idea: Simulated switch toggle SFX at `12.65s` + sequential CrowdMeter segment ticks.
Music: continues
Transition mood: clean wipe on `16.86s` → Scene 5

### Scene 5 — Outro: Brand Lockup — 3.14s (16.86s → 20.00s)
Returns to warm `#FBF6EA` with top `CarouStrip`. Both official wordmarks appear side-by-side (`CarouMark` **topfood/timișoara** and `CoasterMark` **topdrink/timișoara**), centered above `"Timișoara pe gustate, nu pe ghicite."` and `"Fără capcane turistice. Fără review-uri cumpărate."` Holds completely still for 2.2s while music fades out cleanly.
Sequential/interaction: none (clean fast settle into 2.2s dead-still hold).
Audio intent: Warm, memorable brand finish with a resonant bell ring as music fades.
Audio-coupled idea: Final logo payoff bell (`impactBell_heavy_000`) while music fades out.
Music: fades out `18.6s → 20.0s`
Transition mood: end

**Music mood for this video:** upbeat (mid-energy, clever editorial groove)
**Audio summary:** A steady 115 BPM groove carries the reveal from the tourist-trap hook through the bot-vs-local duel and Food→Drink world flip, punctuated by restrained UI/card cues and a smooth fade under the final brand lockup.
