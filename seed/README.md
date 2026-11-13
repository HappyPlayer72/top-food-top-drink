# Seed

Responsabil: **Design / Produs** · 30 de locale din Timișoara (20 food, 10 drink): review-uri reale din Google API + review-uri seed marcate local/turist.

## Conturi de test locale

După migrare și încărcarea localurilor demo (`npm run seed` pe o bază goală), rulează din rădăcina proiectului:

```bash
npm exec -- tsx --env-file-if-exists=.env seed/test-accounts.ts
```

| Rol | Utilizator | Parolă |
| --- | --- | --- |
| User | `test.user` | `TestUser2026!` |
| Owner | `test.owner` | `TestOwner2026!` |
| Admin | `test.admin` | `TestAdmin2026!` |

Scriptul permite doar baze de date locale și nu rulează în producție. Creează conturile numai dacă username-ul și emailul lor nu există deja; nu modifică parole sau roluri existente. Owner-ul nou este asociat unui local activ din Timișoara care nu are deja proprietar. Dacă nu există un asemenea local, contul owner este omis și scriptul afișează motivul. Codul de revendicare demo este stabilit prin `DEMO_CLAIM_CODE` în `.env` (de obicei `123456`); nu se trimite SMS real.
