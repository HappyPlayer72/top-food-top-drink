# Ghid Demo (3–5 minute)

Baza are doar **date reale**: cele 30 de locale din Timișoara (`seed/venues.ts`) și ce vine din Google Places + Tripadvisor (`npm run import:real`). Nu mai există useri, review-uri sau scoruri inventate. Totul se testează logat pe un **cont de test**.

> Fără cheile Google/Tripadvisor, localurile apar fără scor („Încă nu are review-uri”) până scrie cineva primul review.

---

## Pregătire

```bash
npm run db:up
npm run db:migrate
npm run seed -- --reset   # 30 de locale reale + conturile de test (doar pe baza locală)
npm run import:real       # cu GOOGLE_PLACES_API_KEY și/sau TRIPADVISOR_API_KEY în .env: ratinguri și review-uri reale
npm run dev -w @topfood/web
```

Deschide **[http://localhost:3000/topfood/timisoara](http://localhost:3000/topfood/timisoara)**.

### Conturile de test

Pe ecranul de login, la „Acces rapid cu un cont de test” (ascuns în producție, dacă nu pui `DEMO_LOGIN=on`):

| Cont | Parolă | Pentru ce |
|---|---|---|
| `test.user` | `TestUser2026!` | review, „util”, check-in, fidelitate, adaugă local |
| `test.owner` | `TestOwner2026!` | `/owner` pentru localul primit la seed (primul fără proprietar, alfabetic) |
| `test.admin` | `TestAdmin2026!` | `/admin`: rapoarte, bonuri, locale noi de aprobat |

> Conturile se creează doar pe o bază locală. Pe baza online nu există.

---

## Scenariul

### 1. Lista reală — `/topfood/timisoara` (45 s)
- Localurile cu review-uri sunt primele, ordonate după **Scorul Onest**; cele fără review-uri sunt la final, cu „—” și „Încă nu are review-uri”.
- Review-urile importate au atribuirea „de pe Google” / „de pe Tripadvisor”.
- *„Nu inventăm nicio notă: scorul există doar când există review-uri, și fiecare scor are explicația lui.”*

### 2. Primul review — logat ca `test.user` (60 s)
- Deschide un local fără review-uri → „Scrie un review” → notă + text concret → Publică.
- Mesajul arată ponderea review-ului (cont nou = pondere mică) și localul primește scor.
- Apasă „Util” la alt review: numărul vine din baza de date.

### 3. Owner-ul — `test.owner`, `/owner` (45 s)
- Răspunde la review-ul de mai sus. **Nu există buton de ștergere**: poate doar să răspundă sau să raporteze, decide un admin.
- Secțiunea **Fidelitate**: creează programul; codul QR se schimbă la fiecare minut.

### 4. Fidelitate — `test.user`, `/fidelitate` (45 s)
- „Scanează la casă” (sau introdu codul de pe ecranul owner-ului) → **+1 ștampilă**; a doua în aceeași zi e refuzată.

### 5. Local nou + moderare — `test.user`, apoi `test.admin` (45 s)
- Caută un local care nu e la noi → „Adaugă localul” → în așteptare.
- `/admin` logat ca `test.admin`: aprobă → apare în listă.

### 6. TOP DRINK — `/topdrink/timisoara` (30 s)
- Aceeași logică pentru baruri; „Cât e de plin acum” vine doar din raportările oamenilor de acolo (expiră în 2 ore).

---

## Verificare automată

```bash
npx tsx --env-file-if-exists=.env seed/smoke.ts
```

Trece prin toate fluxurile de mai sus pe conturile de test, într-o tranzacție anulată la final: baza rămâne neschimbată.

## Dacă te întreabă

- **De unde vin review-urile?** Google Places API și Tripadvisor Content API (oficiale) + review-urile scrise pe site. Fără scraping.
- **Cum știți că e localnic?** Check-in în oraș în 5 zile diferite din 30 sau email universitar. Din GPS păstrăm doar ziua, nu traseul.
- **Cum faceți bani?** Parteneriate (blog, statistici, fidelitate, „Sponsorizat”) + reclame. Nimic din ele nu intră în scor.
