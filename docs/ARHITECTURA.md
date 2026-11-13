# TOP FOOD / TOP DRINK — Arhitectură

`topfood/timisoara` arată unde mănânci bine după localnici, nu după turiști sau review-uri cumpărate; `topdrink/timisoara` face același lucru pentru baruri și cluburi. Adunăm review-uri de pe Google Maps, Tripadvisor, TikTok, Instagram și Facebook, le cântărim după credibilitate, separăm localnicii de turiști și semnalăm capcanele turistice. Restaurantele pot plăti ca parteneri pentru vizibilitate marcată „Sponsorizat”, dar banii nu cumpără niciodată scor sau loc în clasament.

## Reguli de bază

Aceste 7 reguli sunt identitatea produsului; orice decizie tehnică le respectă.

1. Plata nu schimbă scorul și nici poziția în clasament. Ce e plătit apare doar în sloturi separate, etichetate „Sponsorizat”.
2. Owner-ul nu poate șterge sau ascunde review-uri. Poate doar să răspundă sau să raporteze (decide un admin).
3. Orice scor are explicație vizibilă („de ce 7.2”, „de ce e capcană turistică”).
4. Localnicii și turiștii se afișează separat.
5. Influencerii declară colaborările plătite; review-urile plătite contează foarte puțin în scor.
6. Datele externe vin doar prin API-uri oficiale sau prin linkuri trimise de useri/owneri — fără scraping masiv (risc legal și de blocare).
7. GDPR: GPS-ul se folosește doar pentru verificare, nu se păstrează traseul; angajații apar doar cu acordul lor.

## URL-uri și orașe

Două branduri pe același backend: domeniul decide verticala (food sau drink), primul segment decide orașul. Contul de user e comun pe ambele.

| URL | Ce afișează |
| --- | --- |
| `topfood/timisoara` | pagina orașului: topul onest, categorii, „Sponsorizat”, avertizări de capcane |
| `topfood/timisoara/{slug-local}` | pagina restaurantului: scoruri, review-uri, mini-blog |
| `topfood/timisoara/categorie/{pizza, burger...}` | topul pe categorie |
| `topfood/timisoara/top-luna` (+ `/2026-10` arhivă) | leaderboard lunar |
| `topdrink/timisoara`, `topdrink/timisoara/{slug-bar}`, `topdrink/timisoara/top-luna` | la fel, pentru baruri și cluburi |
| `topdrink/timisoara/weekend` | evenimentele din weekend, postate de owneri |
| `/u/{username}` | profil user / localnic / influencer |
| `/owner` | dashboard proprietar (privat) |
| `/admin` | moderare (privat) |

Oraș nou = doar configurare, fără cod nou: nume, poligonul granițelor, zonele turistice (Timișoara: Piața Unirii, Piața Victoriei, Piața Libertății, Bastion), cartierele, prețul mediu local pe categorii. Apoi se rulează ingestia pentru orașul respectiv. Vezi [`config/cities/`](../config/cities/).

## Modulele sistemului

Sistemul are 10 module (A–J). Datele curg: surse → ingestie → potrivire → analiză → scor → pagini. Monetizarea intră doar în pagini, niciodată în scor.

| Modul | Ce face | Primește de la | Dă mai departe la | Responsabil |
| --- | --- | --- | --- | --- |
| A. Ingestie | aduce locale și review-uri din surse externe | Google, Tripadvisor, owneri, useri | B | Date/AI |
| B. Potrivire locale | leagă același local de pe platforme diferite | A | C | Date/AI |
| C. Analiză review | limbă, local/turist, sentiment, probabilitate de fals, e plătit? | B, E (review-uri native) | D | Date/AI |
| D. Scoring | Scor Onest, Scor Localnici/Turiști, Tourist Trap Index | C | F, I | Date/AI |
| E. Conturi și verificare | login, roluri, badge localnic, revendicare owner | useri | C, G, F | Backend |
| F. Pagini publice | oraș, local, categorie, top, profil | D, G, H, I | utilizatori | Frontend |
| G. Owner | mini-blog, angajați, răspunsuri, statistici | E | F | Backend + Frontend |
| H. Monetizare | parteneriate, sloturi Sponsorizat, reclame | owneri, advertiseri | F (doar sloturi separate) | Backend |
| I. Leaderboard | clasament lunar înghețat | D | F | Date/AI |
| J. Moderare/Admin | review-uri raportate, revendicări, potriviri nesigure, contestații | C, E, G | toate | Backend |

**Separare obligatorie:** modulul D (Scoring) nu are acces la datele din H (Monetizare). Așa garantăm tehnic regula 1.

## Ingestia: cum găsim automat review-urile

Nicio platformă nu oferă liber toate review-urile, așa că lucrăm pe 3 niveluri: automat prin API-uri oficiale, prin owner și prin comunitate.

| Nivel | Sursă | Ce primim | Când |
| --- | --- | --- | --- |
| 1. Automat | Google Places API | localele din oraș, rating mediu, nr. total review-uri, max 5 review-uri, preț, program, coordonate | descoperire săptămânal, rating zilnic |
| 1. Automat | Tripadvisor Content API | rating, nr. review-uri, câteva review-uri (limba lor = semnal de turist) | zilnic |
| 2. Prin owner | Google Business Profile | toate review-urile Google ale localului | după ce owner-ul se conectează |
| 2. Prin owner | Pagina de Facebook | recenziile paginii | după conectare |
| 2. Prin owner | Instagram / TikTok de business | postările localului | după conectare |
| 3. Comunitate | linkuri TikTok / Instagram / Facebook trimise de useri și influenceri | video afișat prin embed oficial + analiză AI | la fiecare link trimis |

Analiza unui link trimis (nivel 3): din descriere, hashtag-uri și transcript extragem sentimentul, preparatele menționate, prețul și dacă e reclamă (#ad, #colaborare, „în colaborare cu”).

Joburi programate (rulează singure, în [`apps/worker`](../apps/worker/)):

1. `descopera-locale` — săptămânal, per oraș: caută restaurante și baruri noi.
2. `actualizeaza-ratinguri` — zilnic.
3. `proceseaza-linkuri` — la fiecare link trimis, printr-o coadă.
4. `recalculeaza-scoruri` — la fiecare review nou + complet în fiecare noapte.
5. `leaderboard-lunar` — pe 1 ale lunii, la 00:05.

## Potrivirea localelor și analiza fiecărui review

**Potrivire (modulul B).** Același restaurant apare pe Google, Tripadvisor și Facebook cu nume ușor diferite. Două fișe sunt același local dacă:

- numele normalizate (fără diacritice, fără „Restaurant”, „Pizzeria”, „SRL”) sunt asemănătoare **și**
- distanța dintre coordonate e sub 50 m, sau au același telefon ori site.

Cazurile nesigure ajung în coada de admin („Sunt același loc? Da/Nu”). Fiecare local păstrează toate ID-urile externe.

**Analiza (modulul C).** Pentru fiecare review, extern sau nativ, salvăm:

| Câmp | Cum se calculează |
| --- | --- |
| limba | detectare automată |
| local sau turist | autor localnic verificat → local; limbă străină, review-uri în multe orașe/țări, o singură vizită → turist; altfel „neclasificat” |
| sentiment pe aspecte | AI (model ieftin): mâncare, servire, preț, curățenie, atmosferă; la drink: muzică, aglomerație |
| e plătit | colaborare declarată de influencer sau hashtag-uri de reclamă |
| probabilitate de fals (0–1) | din semnalele de mai jos |

Semnale de review fals (la MVP: reguli care adună puncte; mai târziu, model ML):

- rafală: peste 5 review-uri de 5★ la același local în 48 de ore, peste media lui;
- text foarte asemănător cu alte review-uri (similaritate de text);
- cont nou, cu un singur review, fără poze sau istoric;
- autorul dă doar 5★ sau doar 1★ peste tot;
- autorul e owner sau angajat al localului (ori al unui concurent apropiat, pentru 1★);
- text generic fără detalii („Super! Recomand!”).

## Scoring: formulele

Fiecare review primește o pondere; Scorul Onest e media ponderată, trasă spre media orașului când sunt puține date.

### 1. Ponderea unui review

```
pondere = autor × verificare × (1 − p_fals) × vechime × plătit
```

| Factor | Valori |
| --- | --- |
| autor | localnic verificat 2.0 · user cu ≥ 10 review-uri 1.5 · user obișnuit 1.0 · cont nou (1 review) 0.3 |
| verificare vizită | check-in GPS la local sau poză cu bonul ×1.3, altfel ×1.0 |
| vechime | se înjumătățește la fiecare 180 de zile |
| plătit | colaborare declarată ×0.2 |

### 2. Scorul Onest (0–10)

Notele se convertesc pe scara 0–10; constanta 10 face ca un local cu 3 review-uri de 5★ să nu bată unul cu 400 de review-uri de 4.7★.

```
ScorOnest = (10 · media_orasului + Σ pondere_i · nota_i) / (10 + Σ pondere_i)
```

- Se calculează și separat: Scor Localnici (doar review-urile de la localnici) și Scor Turiști.
- Sub 5 puncte de pondere totală → afișăm „Încă nu avem destule date”.

### 3. Tourist Trap Index (0–100)

| Semnal | Pondere |
| --- | --- |
| Scor Turiști minus Scor Localnici (turiștii îl laudă, localnicii nu) | 30% |
| apropierea de zone turistice (sub 300 m = maxim) | 20% |
| prețul față de media locală pe aceeași categorie | 20% |
| % review-uri în limbi străine | 15% |
| % clienți care nu revin (o singură vizită) | 15% |

- ≥ 60 → „⚠ Posibilă capcană turistică” + motivele concrete afișate.
- ≥ 80 → „Capcană turistică” și localul nu poate cumpăra slot Sponsorizat.
- Owner-ul poate contesta eticheta; contestația merge la admin.

## Conturi și verificare

Un singur cont poate avea mai multe roluri; fiecare rol se obține printr-o dovadă clară.

| Rol | Cum îl obține | Ce poate face |
| --- | --- | --- |
| User | email sau telefon + parolă, ori login Google | review-uri, poze, liste „vreau să merg”, linkuri social media pe profil (opțional) |
| Localnic verificat | oricare: (1) check-in GPS în oraș în ≥ 5 zile diferite din 30; (2) email universitar local (@e-uvt.ro, @student.upt.ro); (3) garantat de 2 localnici verificați | insigna „Localnic Timișoara”, pondere ×2, apare la „Ce zic localnicii”; insigna expiră după 12 luni fără activitate |
| Influencer | conectează contul TikTok/Instagram (login oficial) + minim 1.000 urmăritori | profil cu linkuri verificate și nr. de urmăritori, atașează videouri la review-uri; câmp obligatoriu „colaborare plătită: da/nu” |
| Owner | revendică localul (pașii de mai jos) | dashboard `/owner` |
| Angajat | invitat de owner, acceptă | apare la „Echipa”, primește ratinguri |
| Admin | intern | moderare |

Revendicarea unui local de către owner:

1. Owner-ul caută localul și apasă „Sunt proprietarul”.
2. Dă o dovadă: login cu Google Business Profile care administrează localul (automat), cod prin SMS sau apel la numărul public al localului, sau CUI-ul firmei verificat la ANAF + un document.
3. Starea cererii: în așteptare → verificat sau respins (admin-ul decide cazurile manuale).
4. Un local are un owner principal și poate avea mai mulți manageri.

Review cu vizită verificată (opțional): check-in GPS la local sau poză cu bonul. Din GPS păstrăm doar „ziua X, în oraș/la local”, nu traseul.

## Pagini publice și dashboard owner

**Pagina orașului** (`topfood/timisoara`), de sus în jos:

1. Căutare + filtre: categorie, cartier, preț, „deschis acum”, „fără capcane”.
2. Carusel „Sponsorizat” — maxim 3 locale, etichetat clar.
3. Topul onest — ordonat strict după Scorul Onest.
4. „Atenție, capcane turistice în centru” — listă cu motive.
5. Previzualizare leaderboard lunar + hartă.

**Pagina localului** (`topfood/timisoara/{slug}`) — funcționează ca un mic blog:

1. Antet: nume, poze, Scor Onest mare, Scor Localnici vs Scor Turiști, Tourist Trap Index cu buton „De ce?”.
2. Ce zice lumea pe aspecte: mâncare / servire / preț / atmosferă.
3. Review-uri cu filtre: Localnici · Turiști · Influenceri · Toate, cu insignele autorilor.
4. Videouri TikTok/Instagram (embed).
5. Postările owner-ului: meniul zilei, preparate noi, evenimente, oferte.
6. Echipa (dacă owner-ul a activat-o): poze, roluri, mențiuni pozitive, „Angajatul lunii”.
7. Info: program, adresă, hartă, preț, contact, linkurile sociale ale localului.
8. Răspunsurile owner-ului sub review-uri.

**Dashboard-ul owner-ului** (`/owner`):

- Statistici: vizualizări, evoluția scorului, aspectele criticate, localnici vs turiști.
- Răspunde la review-uri; raportează review-uri suspecte (ajung la admin, nu dispar automat).
- Mini-blog: postare cu text, poze și tip (meniu / eveniment / ofertă / noutate), cu publicare programată.
- Rate the employee (opțional).
- Conectări: Google Business Profile, Facebook, Instagram, TikTok.
- Parteneriat: planul activ, facturi, performanța slotului Sponsorizat.

## Monetizare

Banii cumpără vizibilitate etichetată și unelte pentru owner, niciodată scor sau loc în clasament.

| Sursă de venit | Ce primește clientul | Limite |
| --- | --- | --- |
| Parteneriat Basic (lunar) | mini-blog, răspunsuri, statistici, conectare social media, rate the employee | — |
| Parteneriat Highlight (lunar, mai scump) | tot din Basic + apariție în caruselul „Sponsorizat” pe pagina orașului/categoriei + insigna „Partener” | maxim 3 sloturi pe pagină, prin rotație; interzis la Tourist Trap ≥ 80 sau suspiciune de fraudă |
| Reclame | bannere de brand (băuturi, livrări, evenimente, bilete) | doar în zonele de reclamă, niciodată în listă sau clasament |
| Mai târziu | rezervări cu comision, „Top Pass” cu reduceri la parteneri, rapoarte de piață pentru branduri | — |

Orice element plătit are eticheta „Sponsorizat” vizibilă. Ordinea din topul onest și din leaderboard nu citește deloc datele de parteneriat (vezi separarea dintre modulele D și H).

## Rate the employee și leaderboard lunar

Rate the employee e opțional și îl activează owner-ul.

1. Owner-ul adaugă angajații (prenume, rol, poză opțională); angajatul primește o invitație și trebuie să accepte.
2. Clientul, când scrie review-ul, poate alege „Cine te-a servit?” + notă 1–5 pentru amabilitate și rapiditate + un comentariu scurt.
3. Public: doar mențiunile pozitive și titlul „Angajatul lunii”.
4. Privat (doar owner-ul): toate notele și comentariile, inclusiv cele negative.
5. Anti-abuz: un user dă un singur rating per angajat pe lună; ratingurile de la conturi noi nu contează pentru „Angajatul lunii”.
6. Angajatul poate ieși oricând, iar datele lui publice dispar.

Leaderboard lunar:

- Pe oraș × verticală × categorie, plus un top general.
- Se calculează pe 1 ale lunii pentru luna trecută și se îngheață (nu se mai schimbă).
- Condiții de intrare: minimum 10 review-uri de la localnici în lună și nicio alertă de fraudă activă.
- Ordinea: Scorul Onest calculat doar pe review-urile din luna respectivă.
- Titluri: Top 10, Revelația lunii (cea mai mare creștere), Angajatul lunii, Localnicul lunii (cele mai utile review-uri), Influencerul lunii.
- Arhivă pe luni + imagine gata de share pe Instagram/TikTok.

## TOP DRINK: ce e diferit

TOP DRINK folosește același motor (ingestie, scoring, conturi, monetizare); se schimbă doar taxonomia și dimensiunea de timp.

| Ce | TOP FOOD | TOP DRINK |
| --- | --- | --- |
| Tipuri de local | restaurant, bistro, fast-food, cofetărie | bar, pub, club, cocktail bar, terasă, cafenea de seară |
| Criterii în review | mâncare, servire, preț, curățenie, atmosferă | atmosferă, muzică (gen, live/DJ), preț (bere/cocktail), aglomerație, public, dress code, servire |
| Când ai fost | contează puțin | contează mult: câmpul „ce zi/oră ai fost”; scor separat pe „vineri–sâmbătă noaptea” și „în timpul săptămânii” |
| Extra | — | „Vibe check” live: „cât e de plin acum” (expiră în 2 ore); evenimente (DJ, concerte) postate de owner → pagina weekend |
| Preț de referință | prețul mediu al unei mese | prețul unei beri de 0,5 l + al unui cocktail |

## Modelul de date

Backend-ul face primul această schemă (în [`packages/db`](../packages/db/)); Frontend și Date/AI lucrează pe ea.

| Entitate | Câmpuri cheie |
| --- | --- |
| Oraș | nume, slug, granițe (poligon), zone turistice (punct + rază), cartiere, prețuri medii pe categorie, media orașului |
| Local | oraș, verticală (food/drink), nume, slug, categorii, coordonate, adresă, preț, program, ID-uri externe (Google, Tripadvisor, Facebook...), scor onest, scor localnici, scor turiști, tourist trap index + motive, stare (activ/închis) |
| Review | local, sursă (nativ/google/tripadvisor/facebook/tiktok/instagram), autor intern sau extern, notă, text, limbă, data vizitei, zi/oră (drink), aspecte, local/turist, probabilitate fals, plătit, pondere, stare (publicat/semnalat/ascuns) |
| User | nume, email/telefon, roluri, insigne, orașul de localnic + expirare, linkuri sociale (+ verificat), nr. urmăritori |
| VerificareLocalnic | user, oraș, metodă (GPS/email/garanți), dovezi (doar zile, nu traseu), stare, dată |
| RevendicareOwner | user, local, metodă, stare, admin-ul care a decis |
| LinkSocial | local, cine l-a trimis, platformă, URL, rezultatul analizei (sentiment, e reclamă) |
| Postare (blog) | local, autor, tip, text, poze, data publicării |
| Angajat | local, user (opțional), prenume, rol, a acceptat, activ |
| RatingAngajat | angajat, review, user, note, comentariu, lună |
| Parteneriat | local, plan (Basic/Highlight), început, sfârșit, stare plată |
| SlotReclamă | pagină/zonă, advertiser, creativ, perioadă, afișări, click-uri |
| Leaderboard | oraș, verticală, categorie, lună, lista ordonată înghețată |
| Raport (moderare) | ce s-a raportat, cine, motiv, decizie |

## Funcțiile serverului și tehnologii

Ce trebuie să poată face serverul (pe grupuri de utilizatori):

- **Public:** lista localelor dintr-un oraș (cu filtre), detaliile unui local, review-urile unui local (cu filtre), leaderboard-ul unei luni, căutare, evenimentele din weekend.
- **User:** înregistrare/login, scrie și editează review, check-in GPS, trimite link social, cere verificare de localnic, editează profilul și linkurile sociale.
- **Owner:** revendică local, răspunde la review, raportează review, creează/editează/șterge postări și angajați, vede statistici, conectează conturi externe, cumpără sau anulează parteneriat.
- **Admin:** coada de moderare, potrivirile nesigure de locale, revendicările manuale, contestațiile la Tourist Trap, conturile suspecte.
- **Intern:** cele 5 joburi programate din secțiunea Ingestie.

Tehnologii recomandate:

| Strat | Alegere | De ce |
| --- | --- | --- |
| Frontend + pagini | Next.js | paginile de oraș/local se randează pe server și apar bine în Google; SEO e canalul principal de trafic |
| Bază de date | PostgreSQL + PostGIS + pgvector | distanțe și zone turistice; similaritate de text pentru review-uri false |
| Joburi | coadă + cron, într-un worker separat | ingestia și recalcularea nu blochează site-ul |
| AI | Claude Haiku pentru clasificarea în masă; un model mai mare doar pentru textul „de ce e capcană” | cost mic |
| Autentificare | login Google + email/SMS; OAuth TikTok, Instagram, Facebook, Google Business pentru conectări | dovezi de proprietate |
| Plăți | Stripe (abonamentele partenerilor) | standard |
| Hosting | Vercel (frontend) + Postgres găzduit | se pune online rapid |

## Împărțirea pe echipă și MVP-ul de hackathon

Ordinea de start: schema bazei de date → restul în paralel.

| Rol | Module | Livrează |
| --- | --- | --- |
| 1. Frontend | F + interfața pentru E și G | paginile oraș / local / leaderboard, profil, dashboard owner, gândite pentru mobil |
| 2. Backend | E, G, H, J + funcțiile serverului + modelul de date | conturi, roluri, revendicare, blog, angajați, parteneriat, admin |
| 3. Date / AI | A, B, C, D, I | ingestie Google/Tripadvisor, potrivire, analiza review-urilor, formulele de scor, leaderboard |
| 4. Design / Produs / Pitch | identitate vizuală, date seed, prezentare | logo, culori, machete, 30 de locale seed din Timișoara, demo și pitch |

Dependențe: Backend-ul livrează primul schema bazei de date. Date/AI spune ce câmpuri de scor există, iar Frontend-ul le afișează. Design-ul trebuie gata până la jumătatea hackathon-ului.

MVP — în ordinea de lucru:

1. Schema bazei + 30 de locale seed (20 food, 10 drink) din Timișoara: review-uri reale din Google API + review-uri seed marcate local/turist.
2. Scoring rulat pe seed: Scor Onest, Localnici vs Turiști, Tourist Trap Index cu motive.
3. Paginile `topfood/timisoara`, `topdrink/timisoara` și pagina localului.
4. Conturi: user, insigna de localnic (check-in GPS simulat), revendicare owner simplificată (cod fix).
5. Caruselul „Sponsorizat” separat, cu demonstrația că topul nu se schimbă.
6. Leaderboard lunar din seed + mini-blog și rate the employee pe 1–2 locale demo.
7. „Lipește link TikTok/Instagram” → embed + eticheta „reclamă?”.

Nu facem la hackathon: plăți reale, ingestie automată Facebook/Instagram, ML pentru fraudă (doar reguli), mai multe orașe.

## Scenarii de demo și decizii deschise

Scenarii de demo, cap-coadă (le folosim și ca test):

1. Turist lângă Piața Unirii caută cină. Localul X are 4.6★ pe Google, dar la noi Scorul Localnicilor e 5.1/10, cu „⚠ Capcană turistică: preț +60% față de medie, 70% review-uri în limbi străine, localnicii îl notează cu 2.5 puncte mai jos”.
2. Owner-ul plătește Highlight. Apare în caruselul Sponsorizat, dar poziția lui în top rămâne identică (arătăm înainte/după).
3. Atac cu 20 de review-uri false de 5★ în 24 de ore. Detectorul le dă probabilitate mare de fals, iar scorul crește cu sub 0.2.
4. Un user devine localnic prin check-in-uri. Review-ul lui trece la „Ce zic localnicii” și cântărește dublu.
5. topdrink: barul Y are scor diferit vineri noaptea față de marți; vibe check arată „plin acum”.

Decizii încă deschise (de discutat în echipă):

- [ ] Un domeniu cu două branduri sau două domenii separate (topfood.ro + topdrink.ro)?
- [ ] Pragul de urmăritori pentru influencer (1.000?).
- [ ] Prețul parteneriatelor — de validat cu 2–3 restaurante din Timișoara.
- [ ] Afișăm ratingul brut Google lângă al nostru? (comparația e puternică la demo)

## Identitate vizuală

Identitatea vizuală e în Claude Design: [TOP FOOD / TOP DRINK — Identitate vizuală](https://claude.ai/artifact/S46PhX5PXags3MXLNhp8KU). Culorile și regulile exacte sunt în [`design/README.md`](../design/README.md).

- TOP FOOD: semnul e fața de masă în carouri roșii de cârciumă; text maro-cafea pe alb.
- TOP DRINK: fundal verde de sticlă, accent chihlimbar; scorul stă pe un suport de bere rotund.
- Font unic: Archivo (îngust și gros pentru titluri și scoruri, normal pentru text).
- Logo: `topfood/timișoara`, `topdrink/timișoara`; URL-ul e numele.
- Insigne: Localnic = plăcuța albastră de stradă cu cartierul; Capcană = triunghi de avertizare; Sponsorizat = mai modest decât restul; Angajatul lunii = ecuson.
- Accesibilitate: contrast WCAG AA; capcana se recunoaște după formă, nu doar după culoare.
