# Prezentare — fir narativ, use case-uri, perspective

Material de lucru pentru pitch. Legendă: ✅ există în aplicație și se poate arăta în demo · 🔜 lipsește, trebuie adăugat (sau prezentat ca „următorul pas”).

## Mesajul într-o frază

> Pe Google vezi câte stele are un local. La noi vezi **cine** le-a dat, **de ce** contează sau nu, și dacă e locul potrivit **pentru tine**.

Toate cele patru personaje de mai jos au aceeași problemă: un 4.6★ pe Google nu le spune nimic despre ce le pasă lor.

---

## 1. Use case-urile

Fiecare personaj are aceeași structură pe slide: **cine e → ce nu merge azi → ce face în aplicație → de ce ne poate crede**.

### A. Radu — se deplasează în scaun cu rotile

- **Azi:** bifa „accesibil scaunului cu rotile” de pe Google o pune proprietarul. Nu afli dacă are o treaptă la intrare, dacă toaleta e la etaj sau dacă mesele sunt prea înghesuite.
- **În aplicație:**
  1. Filtrează după „acces fără trepte” și „toaletă accesibilă”. 🔜
  2. Pe pagina localului vede aspectul **Accesibilitate**, extras din ce au scris oamenii în review-uri, cu exemple concrete. 🔜 (motorul de aspecte cu Claude Haiku există ✅, trebuie doar adăugat aspectul nou)
  3. Când scrie el un review, răspunde la 3 întrebări da/nu (intrare, toaletă, spațiu între mese), ca să-l ajute pe următorul. 🔜
- **De ce ne crede:** informația vine de la oameni care au fost acolo, nu de la owner. Răspunsurile cu vizită verificată (check-in GPS sau poză cu bonul) cântăresc ×1.3 ✅, iar owner-ul nu le poate șterge ✅.

### B. Ioana — 22 de ani, iese seara cu prietenele

- **Azi:** ratingul nu spune nimic despre public, despre cum reacționează personalul la un client insistent sau dacă e un loc unde te simți bine ca grup de fete.
- **În aplicație (topdrink):**
  1. Alege din recomandator vibe-ul „grup” ✅ și vede scorul separat pentru **vineri–sâmbătă noaptea** ✅, nu media pe toată săptămâna.
  2. Vede aspectele **atmosferă, aglomerație, servire** ✅ și aspecte noi **„public”** și **„Mă simt în siguranță aici”** 🔜.
  3. Vibe check live: „cât e de plin acum”, care expiră în 2 ore ✅.
  4. Citește doar ce zic **localnicii** ✅, nu turiștii aflați o singură seară în oraș.
- **De ce ne crede:** părerile vin de la oameni verificați, iar review-urile plătite ale influencerilor cântăresc ×0.2 ✅.
- **De spus explicit:** nu cerem și nu stocăm genul nimănui. Întrebarea de siguranță e aceeași pentru toți (GDPR, regula 7).

### C. Vlad — freelancer, vrea doar un loc unde să lucreze

- **Azi:** cafenelele „laptop-friendly” le găsești din grupuri de Facebook sau încercând. Nu știi dacă e Wi-Fi, prize, liniște, și dacă ești dat afară după o cafea.
- **În aplicație:**
  1. Filtru „bun pentru lucru”: Wi-Fi, prize, liniște. 🔜
  2. Aspectul **Lucru** din review-uri, plus scor separat pentru „în timpul săptămânii, ziua” (mecanismul zi/oră există la drink ✅, trebuie extins).
  3. „Deschis acum” și programul ✅.
  4. Owner-ul poate posta pe mini-blog „luni–vineri 9–17: cafea + birou” ✅ (mini-blogul există, oferta e doar un exemplu de postare).
- **De ce ne crede:** se vede cine a scris review-ul și de câte ori a revenit; un loc unde oamenii revin des primește semnal bun ✅ (procentul de clienți care nu revin intră în Tourist Trap Index).

### D. Doamna Elena — localnică din Iosefin, scrie review-uri

Ea este **sursa** pentru celelalte trei personaje. Fără ea, aplicația n-are ce afișa.

- **Azi:** review-ul ei de 3★, scris cu grijă, stă la fel de greu ca un „Super! Recomand!” de la un cont creat ieri.
- **În aplicație:**
  1. Devine **localnic verificat** prin check-in GPS în 5 zile diferite din 30 ✅ (sau email universitar, sau garantată de 2 localnici).
  2. Primește insigna-plăcuță de stradă „Localnic · Iosefin” ✅, iar review-ul ei apare la „Ce zic localnicii” și cântărește **×2** ✅.
  3. Poate deveni „Localnicul lunii” în leaderboard ✅.
  4. Owner-ul îi poate răspunde, dar **nu-i poate șterge review-ul** ✅. Dacă îl raportează, decide un admin.
- **GDPR:** din GPS păstrăm doar „ziua X, în oraș”, nu traseul ✅.

> Bonus, dacă e timp: **turistul din Piața Unirii** (scenariul 1 din arhitectură) — Terasa Grand Unirii are notă mare de la turiști, dar Scorul Localnicilor e mult mai mic și apare „⚠ Posibilă capcană turistică” cu motive ✅.

---

## 2. Controlul asupra datelor: cum separăm oamenii de boți

Slide-ul de credibilitate. Ideea: **știm de unde vine fiecare review și putem explica greutatea fiecăruia.**

### Pasul 1 — Știm proveniența fiecărui review

Doar surse oficiale: Google Places API, Tripadvisor API, conturile conectate de owner, linkuri trimise de useri. Fără scraping. Fiecare review are sursa, autorul și data salvate ✅. Datele brute rămân, deci putem recalcula oricând cu reguli noi.

### Pasul 2 — Fiecare review trece prin 6 semnale de fals ✅

| Semnal | Ce înseamnă | Puncte |
| --- | --- | --- |
| Rafală | ≥ 5 review-uri de 5★ în 48h, peste ritmul obișnuit al localului | 0.35 |
| Text copiat | text foarte asemănător cu alt review de la același local | 0.40 |
| Cont nou | un singur review, fără poze sau istoric | 0.20 |
| Doar extreme | autorul dă peste tot doar 5★ sau doar 1★ | 0.20 |
| Owner / angajat | autorul lucrează la local | 0.90 |
| Generic | sub 6 cuvinte, fără detalii („Super! Recomand!”) | 0.15 |

Semnalele se combină: `p_fals = 1 − Π(1 − puncte)`. (Cod: `packages/review-analysis/src/rules.ts`.)

### Pasul 3 — Nu ștergem nimic, doar cântărim

```
pondere = autor × vizită verificată × (1 − p_fals) × vechime × plătit
```

**Exemplul de pus pe slide:**

| | Bot tipic | Doamna Elena |
| --- | --- | --- |
| Text | „Super! Recomand!” | „Ciorbă de burtă bună, porție mare, dar servirea a durat 40 de minute.” |
| Semnale | rafală + text copiat + cont nou + generic | niciunul |
| p_fals | 0.73 | 0 |
| Autor | cont nou ×0.3 | localnic verificat ×2.0 |
| Vizită | — | check-in GPS ×1.3 |
| **Pondere** | **0.08** | **2.6** |

**Un review de la un localnic verificat cântărește cât ~30 de review-uri de bot.**

### Pasul 4 — Dovada: atacul cu 20 de review-uri false ✅

Scenariul 3 din demo (testat în `seed/scenarios.test.ts`): 20 de review-uri false de 5★ în 24 de ore la Grill Nou Freidorf → scorul crește cu **sub 0.2 puncte**. Pe Google, același atac ar urca ratingul vizibil.

### Pasul 5 — Omul decide cazurile la limită ✅

Review-urile suspecte și cele raportate de owneri ajung în coada `/admin`, cu semnalele afișate. Nu dispar automat. Orice scor are buton „De ce?” ✅.

**Ce spunem onest:** la hackathon sunt reguli, nu ML. Regulile sunt explicabile și testabile; un model ML vine după, antrenat pe deciziile admin-ilor.

---

## 3. Aceeași aplicație, din toate perspectivele

Un slide-tabel sau câte o propoziție pe rând.

| Cine | Ce câștigă | Ce **nu** poate face | Ce arătăm în demo |
| --- | --- | --- | --- |
| **Utilizator** (Radu, Ioana, Vlad) | găsește locul potrivit lui, nu doar „cel mai bine cotat” | — | pagina orașului, filtrele, recomandatorul |
| **Localnic** (Elena) | vocea lui contează dublu, insignă, Localnicul lunii | să-și fabrice statutul (GPS / email / garanți) | check-in-uri → insignă → review la „Ce zic localnicii” |
| **Owner** | mini-blog, răspunsuri, statistici, echipa, slot Sponsorizat | să cumpere scor sau loc în top, să șteargă review-uri | dashboard `/owner`; Highlight apare în carusel, topul rămâne identic (înainte/după) |
| **Angajat** | „Angajatul lunii”, mențiuni pozitive publice | să apară fără acordul lui | secțiunea „Echipa” |
| **Admin / moderator** | coadă cu semnale, decide cazurile la limită | — | `/admin` cu un review suspect |
| **Business / investitor** | venit din parteneriate și reclame, fără conflict de interese | — | regula tehnică: `scoring` nu importă din `monetization` |
| **Juriu tehnic** | arhitectură pe module, oraș nou = doar config | — | `config/cities/timisoara.json`, testele de scenarii |
| **Societate / GDPR** | fără scraping, fără traseu GPS, fără date de gen | — | „din GPS păstrăm doar ziua” |

---

## 4. Ordinea propusă (≈ 5 minute)

1. **Problema** (30 s) — un 4.6★ de pe Google, cu review-uri cumpărate și turiști.
2. **Patru oameni, patru nevoi** (1 min) — Radu, Ioana, Vlad, câte o frază fiecare.
3. **Elena e sursa** (45 s) — cum devine localnic și de ce contează dublu.
4. **Cum separăm oamenii de boți** (1 min) — tabelul bot vs Elena + atacul cu 20 de review-uri.
5. **Demo live** (1 min 15 s) — pagina orașului → un local → „De ce?” → Sponsorizat fără schimbare de top.
6. **Toate perspectivele** (30 s) — tabelul de mai sus, accent pe „banii nu cumpără scor”.

---

## 5. Ce lipsește în aplicație pentru aceste use case-uri

| Ce | Pentru | Efort estimat |
| --- | --- | --- |
| Aspecte noi în analiză: `accesibilitate`, `siguranta`, `lucru` (în `packages/review-analysis/src/aspects.ts`) | Radu, Ioana, Vlad | mic — listă + prompt |
| Câteva review-uri seed care menționează aceste aspecte | toți trei | mic |
| Filtre pe pagina orașului: acces fără trepte, bun pentru lucru | Radu, Vlad | mediu |
| Întrebări da/nu la scrierea review-ului (intrare, toaletă, Wi-Fi, prize) | Radu, Vlad | mediu — câmpuri noi în schemă |
| Scor separat „zi lucrătoare, ziua” pentru food/cafenele | Vlad | mediu |

Dacă nu intră în demo, se prezintă ca „următorul pas”, și spunem că motorul (aspecte cu AI, ponderare, filtre) există deja.
