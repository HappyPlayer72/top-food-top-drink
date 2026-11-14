# Landing page: „în curând” + lista de așteptare

O singură pagină statică (`index.html`) care explică proiectul, arată planul și strânge emailurile oamenilor care vor să afle când pornește site-ul. Nu depinde de `apps/web`, de bază de date sau de build: e HTML, CSS și puțin JavaScript.

| Fișier | Ce face |
| --- | --- |
| `index.html` | pagina (text în română, culorile și fontul din `design/`) |
| `colecteaza-emailuri.gs` | Google Apps Script care scrie emailurile într-un Google Sheet |

## Cum o vezi local

```bash
python3 -m http.server 4000 --directory landing
```

Apoi deschide http://localhost:4000. Cât timp `SIGNUP_ENDPOINT` e gol, formularul merge în **mod test**: nu trimite nimic, doar afișează mesajul și scrie emailul în consolă.

## Unde ajung emailurile (≈ 5 minute)

1. Creează un Google Sheet nou, de exemplu „TOP FOOD — lista de așteptare”.
2. În Sheet: **Extensii → Apps Script**. Șterge tot din `Code.gs` și lipește `colecteaza-emailuri.gs`. Salvează.
3. **Implementare → Implementare nouă** → tip **Aplicație web**:
   - *Execută ca:* **Eu**
   - *Cine are acces:* **Oricine**
4. Acceptă permisiunile (scriptul scrie doar în Sheet-ul ăsta). Copiază URL-ul care se termină în `/exec`.
5. Deschide URL-ul în browser: trebuie să vezi `{"ok":true,...}`.
6. În `index.html`, pune URL-ul în constanta de sus din `<script>`:

   ```js
   const SIGNUP_ENDPOINT = "https://script.google.com/macros/s/…/exec";
   ```

Emailurile apar în foaia „Lista de asteptare” cu data, emailul, interesul (`food`, `drink`), sursa și limba browserului. Același email nu se salvează de două ori.

> Dacă modifici scriptul, fă **Implementare → Gestionează implementările → Editează → Versiune nouă**, altfel URL-ul rulează tot versiunea veche.

## Cum o pui online

E un singur fișier, merge oriunde:

- **Vercel:** proiect nou din același repo, *Root Directory* `landing`, fără build command.
- **Netlify Drop / GitHub Pages / Cloudflare Pages:** încarci folderul `landing`.

Când site-ul adevărat e live, exporti coloana `email` din Sheet și trimiți anunțul (de exemplu din Gmail cu BCC sau dintr-un serviciu de newsletter).

## GDPR, pe scurt

- Strângem doar emailul și ce te interesează. Pagina spune clar că scriem o singură dată, la lansare.
- Nu dăm lista nimănui. Cine răspunde la email cu „dezabonare” e șters din Sheet.
- Sheet-ul e privat: doar cine are acces în Google Drive îl vede.
