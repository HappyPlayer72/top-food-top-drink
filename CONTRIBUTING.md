# Cum lucrăm

## Branch-uri

- `main` — mereu funcțional; se modifică doar prin Pull Request.
- `oli`, `serban`, `adi`, `alex` — branch-ul personal al fiecăruia.

## Fluxul zilnic

```bash
git checkout <numele-tau>        # ex. git checkout oli
git pull origin main             # adu ultimele schimbări din main
# ... lucrezi, apoi:
git add .
git commit -m "scoring: formula Scor Onest"
git push origin <numele-tau>
```

Când o bucată e gata, deschide un Pull Request din branch-ul tău spre `main` pe GitHub. Cel puțin un coleg aruncă o privire înainte de merge.

## Reguli

- Lucrează mai ales în folderele modulelor tale (vezi tabelul din `README.md`), ca să evităm conflictele.
- Schimbările la `packages/db` (schema) le anunțați echipei: toți depind de ea.
- `packages/scoring` și `packages/leaderboard` nu citesc niciodată date din `packages/monetization`.
- Fără chei API sau parole în cod: folosește `.env` (e în `.gitignore`).
- Mesaje de commit scurte, cu modulul în față: `web: pagina orașului`, `db: tabela review`.
