# Demo — 5 minute

Scenariul de prezentare, pe datele din seed (30 de locale inventate). Fiecare pas: ce arăți și ce spui.

## Înainte de demo (2 minute)

```bash
npm run db:up                 # Postgres în Docker
npm run db:migrate
npm run seed -- --reset       # date curate (șterge și ce am adăugat la teste)
npm run dev -w @topfood/web   # http://localhost:3000
```

Conturi (parola pentru toate: `demo1234`, sau ce e în `DEMO_PASSWORD`):

| Cine | Unde intri | Cont |
| --- | --- | --- |
| Andreea, localnic verificat din Iosefin | butonul „Acces rapid” de pe ecranul de login | andreea@e-uvt.ro |
| Luca, turist | butonul „Acces rapid” | luca@visit.ro |
| Sandu, proprietarul de la Ciorba lui Sandu | `/owner` | sandu.proprietar |
| Admin | `/admin` | admin |

Deschide din timp două taburi: `/topfood/timisoara` și `/owner` (logat ca Sandu, în alt browser sau în fereastră privată, pentru că sesiunea e una per browser).

## 1. Problema (30 s) — `/topfood/timisoara`

- Arată **Terasa Grand Unirii**: turiștii îi dau **8,3**, localnicii doar **6,3**, deci **capcană turistică 84/100**.
- Deschide „De ce?”: prețuri mult peste medie, la câțiva metri de Piața Unirii, majoritatea review-urilor în limbi străine.
- *„Google amestecă turiștii cu localnicii. Noi îi separăm și îți spunem de ce un loc e capcană.”*

## 2. Topul onest (30 s)

- Locul 1: **Ciorba lui Sandu**, 8,9 (localnici 8,9), în Iosefin, departe de centru, fără semne de capcană.
- **Bistro Bega** apare în caruselul „Sponsorizat”, dar în top rămâne la mijloc (scor 7,8), exact unde îl pune scorul.
- *„Restaurantele pot plăti pentru vizibilitate. Niciodată pentru scor sau loc în top — și avem un test automat care verifică asta.”*

## 3. Review-urile false nu mută scorul (30 s)

- **Grill Nou Freidorf**: a primit 20 de review-uri de 10 în ultimele 24 de ore, de la conturi noi, cu texte ca „Super! Recomand!”.
- Scorul lui e tot **7,4**: detectorul le-a dat probabilitate mare de fals, deci aproape zero pondere.

## 4. Localnicul contează dublu (60 s) — momentul „wow”

- „Intră în cont” → „Acces rapid” → **Andreea M. (Localnic din Iosefin)**.
- Deschide Ciorba lui Sandu → „Scrie un review” → nota 9 + câteva cuvinte concrete → Publică.
- Apare: *„Review publicat. Pondere ×2,0. Ești localnic verificat, nota ta contează dublu. Scorul localului s-a recalculat.”*
- Review-ul ei e primul în listă, cu insigna „Localnic din Iosefin”. Apasă „Util” pe alt review: numărul vine din baza de date.

## 5. Owner-ul (45 s) — tabul `/owner`

- Sandu vede statisticile, review-urile și răspunde la unul. **Nu are buton de ștergere** — poate doar să răspundă sau să raporteze; decide un admin.
- Secțiunea **Fidelitate**: codul QR al localului, care **se schimbă la fiecare minut**.

## 6. Fidelitate (45 s) — `/fidelitate` (Andreea)

- Cardul „O ciorbă din partea casei, 6 ștampile”. „Scanează la casă” → **+1 ștampilă**.
- Mai apasă o dată: *„Ai primit deja ștampila de azi la acest local. Revino mâine.”*
- *„O poză făcută codului nu ajută: codul expiră într-un minut și ai maxim o ștampilă pe zi.”*

## 7. Local nou (30 s)

- Caută „Bufetul lui Nea Gică” → nu există → „Adaugă localul” → stradă + cartier → trimis.
- `/admin` (cont admin): apare în coadă → aprobat → apare în listă. Cu cheie Google, butonul „Caută și pe internet” îl găsește direct.

## 8. TOP DRINK (30 s) — `/topdrink/timisoara`

- **Depoul de Tramvaie**: vineri noaptea **8,5**, în timpul săptămânii **7,1** — același club, altă seară.
- „Cât e de plin acum”: raportări de la oamenii aflați acolo, expiră în 2 ore.

## Dacă te întreabă

- **De unde vin review-urile?** API-uri oficiale (Google Places, Tripadvisor) + linkuri TikTok/Instagram trimise de useri. Fără scraping.
- **Cum știți că e localnic?** Check-in în oraș în 5 zile diferite din 30, email universitar (UVT, UPT) sau garanția a 2 localnici. Din GPS păstrăm doar ziua, nu traseul.
- **Cum faceți bani?** Parteneriate pentru restaurante (blog, statistici, fidelitate, Sponsorizat) + reclame. Nimic din ele nu intră în scor.
- **Datele din demo?** Localurile și review-urile sunt inventate; cu cheia Google se aduc localurile reale din Timișoara.
