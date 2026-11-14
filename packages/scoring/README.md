# `packages/scoring` (`@tftd/scoring`)

Calculul **scorului onest** (`honestScore`) și al **indicelui de capcană turistică** (`trapIndex`, 0–100 + motive în română).

## Module ([`src/index.ts`](src/index.ts))

- [`src/weights.ts`](src/weights.ts) — ponderi de autor și timp:
  - Localnic verificat: `2.0`, utilizator cu `>= 10` review-uri: `1.5`, obișnuit: `1.0`, cont nou (`<= 1` review): `0.3`, plătit / influencer: `0.2`.
  - Vizită verificată (check-in sau bon aprobat): `×1.3`; probabilitate de falsitate: `×(1 - fakeProbability)`.
  - Înjumătățire temporală la `halfLifeDays = 180` zile.
- [`src/honest.ts`](src/honest.ts) — `PRIOR_WEIGHT = 10`, `MIN_TOTAL_WEIGHT = 5` (media Bayesiană ferește topul de oscilații la 1–2 review-uri).
- [`src/trap.ts`](src/trap.ts) — cele 5 semnale ale indicelui de capcană (`0..100`), praguri `POSSIBLE_TRAP = 60` și `TRAP = 80`:
  - Decalaj turiști − localnici (`0.5..3.0` → până la `30` pct)
  - Proximitate zonă turistică (`300..800 m` → până la `20` pct)
  - Preț peste media locală (`1.05..1.60` → până la `20` pct)
  - Review-uri în altă limbă (`0.15..0.70` → până la `15` pct)
  - Vizitatori cu un singur review (`0.30..0.80` → până la `15` pct)
- [`src/venue.ts`](src/venue.ts) — `aggregateAspects` (mapare `-1..1` → `0..10` cu `minMentions = 3` pentru `food`: mâncare, servire, preț/calitate, atmosferă) și scoruri pe intervale pentru `drink` (`overall`, `weekendNight`, `weekday`, `băuturi`, `ambianță`).
- [`src/persist.ts`](src/persist.ts) — `recalculateCity(db, citySlug, { onlyNew? })` actualizează `venues` și scrie în `venue_score_snapshots`.
