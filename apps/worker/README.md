# `apps/worker` (`@tftd/worker`)

Proces separat de background bazat pe `croner` (fus orar **`Europe/Bucharest`**) care apelează joburile din `@tftd/api`.

## Joburi programate ([`src/main.ts`](src/main.ts) & [`src/jobs.ts`](src/jobs.ts))

| Job | Program cron | Ce face |
|---|---|---|
| `review-uri-noi` | `*/5 * * * *` (la fiecare 5 min) | Analizează review-urile neprocesate și recalculează scorurile (`onlyNew: true`) |
| `proceseaza-linkuri` | `* * * * *` (în fiecare minut) | Prelucrează coada de linkuri TikTok / Instagram / Facebook / YouTube (`pending`) |
| `recalculeaza-scoruri` | `0 2 * * *` (zilnic 02:00) | Recalculare completă a scorurilor oneste și indicilor de capcană |
| `actualizeaza-ratinguri` | `0 4 * * *` (zilnic 04:00) | Actualizează ratingurile și recenziile din Google Places / TripAdvisor |
| `descopera-locale` | `0 3 * * 1` (luni 03:00) | Descoperă localuri noi pe orașele configurate |
| `leaderboard-lunar` | `5 0 1 * *` (ziua 1 a lunii, 00:05) | Îngheață clasamentul și premiile pentru luna anterioară |

## Comenzi

```bash
# Pornire scheduler continuu
npm run dev -w @tftd/worker

# Rulare punctuală a unui job
npx tsx --env-file-if-exists=.env apps/worker/src/main.ts --once recalculeaza-scoruri
```
