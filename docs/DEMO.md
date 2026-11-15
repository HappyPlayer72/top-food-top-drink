# Ghid Demo (5 minute)

Baza locală are **184 de locale reale din Timișoara**: 112 restaurante (`topfood`) și 72 de baruri și cluburi (`topdrink`). Datele vin din `seed/data/google-snapshot.json`: ratingul Google și review-urile Google reale. Tripadvisor nu îl folosim: nu are variantă gratuită.

Mai există și **review-uri de test**: 184, câte unul per local, scrise de agenți (Claude Haiku) după stilul review-urilor Google și marcate cu „(DevAccount)”. Ele există doar pe baza locală, ca să arate cum arată site-ul cu date. În demo spunem clar că sunt de test. Nu sunt review-uri de la localnici reali.

Totul se testează logat pe un **cont de test**.

---

## Pregătire

```bash
npm run db:up
npm run db:migrate
npm run seed -- --reset   # 184 de locale reale + review-urile Google + conturile de test (doar pe baza locală)
npm run seed:dev          # opțional: adaugă cele 184 de review-uri de test de la conturile „(DevAccount)” (doar pe baza locală)
npm run dev -w @topfood/web
```

Deschide **[http://localhost:3000/topfood/timisoara](http://localhost:3000/topfood/timisoara)**.

Baza locală de demo are deja cele 184 de review-uri DevAccount. Nu trebuie să rulezi `seed:dev` decât dacă pornești de la zero.

### Conturile de test

Pe ecranul de login, la „Acces rapid cu un cont de test” (ascuns în producție, dacă nu pui `DEMO_LOGIN=on`):

| Cont | Parolă | Pentru ce |
|---|---|---|
| `test.user` | `TestUser2026!` | review, „Util”, check-in, fidelitate, adaugă local |
| `test.owner` | `TestOwner2026!` | `/owner`: își alege localul din listă și îl revendică (codul demo din `DEMO_CLAIM_CODE`) |
| `test.admin` | `TestAdmin2026!` | `/admin`: „Sponsorizat (demo, fără plată)”, locale noi de aprobat |

Conturile cu review-uri de test (username `dev.*`, cu „(DevAccount)” în nume) au parola `DevAccount2026!`.

> Conturile de test se creează doar pe o bază locală. Pe baza online nu există.

---

## Scenariul

### 1. Lista reală și scorul — `/topfood/timisoara` (60 s)
- Top mâncare: **Mas Bistro**, **Indian Bistro**, **Hotline Pizza**, **Troppo Buono Pizza&Pasta**, **Restaurant Bun Timișoara**. Toate au **9.7**, deci ordinea dintre ele nu contează.
- Deschide **Mas Bistro** (`/topfood/timisoara/mas-bistro`) → „Cum se calculează?”: scorul pornește de la nota Google (4.9 din 5, din 418 review-uri), trasă spre media orașului (7.93). Are 6 review-uri, dar explicația spune că nu sunt încă suficiente date.
- Exemplu de „Tourist Trap Index”: **Miorița** (`/topfood/timisoara/restaurant-miorita-unirii`), index **40** din 100. Motivele afișate: la 101 m de o zonă turistică și prețuri cu 72% peste media locală pe aceeași categorie. Cel mai mare index din baza actuală este 40, deci nu arătăm un local cu index peste 60.
- *„Nu inventăm nicio notă: fiecare scor are explicația lui, iar motivele sunt vizibile.”*

### 2. Review nou — logat ca `test.user` (60 s)
- Toate cele 184 de locale au deja review-uri, deci nu există un local gol. Folosim **7spices** (`/topfood/timisoara/7spices`, scor 8.5).
- „Scrie un review” → notă + text concret → Publică. Mesajul arată ponderea review-ului (cont nou = pondere mică).
- Apasă „Util” la un review DevAccount de pe același local: numărul vine din baza de date.

### 3. Owner-ul — `test.owner`, `/owner` (60 s)
- Revendică **7spices** cu codul demo, apoi răspunde la review-ul de la pasul 2. **Nu există buton de ștergere**: owner-ul poate doar să răspundă sau să raporteze, iar decide un admin.
- Secțiunea **Fidelitate**: creează programul; codul QR se schimbă la fiecare minut.

### 4. Fidelitate — `test.user`, `/fidelitate` (45 s)
- „Scanează la casă” (sau introdu codul de pe ecranul owner-ului) → **+1 ștampilă**. A doua în aceeași zi e refuzată.

### 5. Sponsorizat și local nou — `test.admin`, apoi `test.user` (60 s)
- Din `/admin`, logat ca `test.admin`, secțiunea **„Sponsorizat (demo, fără plată)”**: pune **Indian Bistro** la sponsorizat.
- Deschide `/topfood/timisoara` și arată banda separată „Sponsorizat”. Locul și scorul lui Indian Bistro rămân aceleași ca înainte. Notează-le înainte de pas.
- *„Plata poate cumpăra vizibilitate, nu scor sau loc în top.”*
- Local nou: `test.user` caută un local care nu e în listă → „Adaugă localul” → în așteptare. Apoi `/admin` aprobă localul și apare în listă.

### 6. TOP DRINK — `/topdrink/timisoara` (45 s)
- Top bar: **Ayahuasca Coffee & Piscobar** (9.5), apoi **Atelier d'experience** (9.4), **House Of Pool** și **Private Lifestyle Club SP** (9.3). Deschide `/topdrink/timisoara/ayahuasca-coffee-piscobar`.
- Aceeași logică pentru baruri, cu zi și oră de vizită. „Cât e de plin acum” vine doar din raportările oamenilor de acolo (expiră în 2 ore). Poate fi gol până raportează cineva.
- Secțiunea **„Pe social media”**: link-urile găsite automat apar doar după `npm run import:social`. Acest pas cere chei API în `.env` și `IMPORT_CONFIRM=da`. În baza locală nu există încă niciun link, deci secțiunea nu are ce arăta acum.

---

## Verificare automată

```bash
npx tsx --env-file-if-exists=.env seed/smoke.ts
```

Trece prin toate fluxurile de mai sus pe conturile de test, într-o tranzacție anulată la final: baza rămâne neschimbată.

## Dacă te întreabă

- **De unde vin review-urile?** Google Places (oficial) pentru cele 919 de review-uri Google din snapshot. Review-urile DevAccount sunt de test, generate de agenți și marcate ca atare. Fără scraping.
- **Cum se calculează scorul?** Pornește de la nota Google a localului, trasă spre media orașului. Pe măsură ce vin review-uri de la localnici, cântărirea se schimbă. Explicația apare lângă scor.
- **Cum știți că e localnic?** Check-in în oraș în 5 zile diferite din 30 sau email universitar. Din GPS păstrăm doar ziua, nu traseul.
- **Scorurile separate pentru localnici și turiști?** Modelul le are, dar acum niciun local nu are scoruri separate calculate: nu sunt încă destui localnici. Nu arătăm cifre inventate.
- **Cum faceți bani?** Parteneriate (blog, statistici, fidelitate, „Sponsorizat”) + reclame. Nimic din ele nu intră în scor sau în ordinea din top.
