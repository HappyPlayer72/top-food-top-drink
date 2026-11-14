/**
 * TOP FOOD / TOP DRINK: lista de așteptare de pe landing page (Google Sheets)
 *
 * Primește emailurile trimise din landing/index.html și le scrie într-un Google Sheet.
 * Pașii de instalare sunt în landing/README.md. Pe scurt:
 *   1. Google Sheet nou → Extensii → Apps Script → lipește acest fișier.
 *   2. Implementare → Implementare nouă → Aplicație web
 *      (Execută ca: Eu · Cine are acces: Oricine).
 *   3. Copiază URL-ul care se termină în /exec în SIGNUP_ENDPOINT din index.html.
 *
 * Coloane: data, email, interes (food,drink), sursa, limba.
 * Același email trimis de două ori nu se salvează de două ori; i se actualizează doar interesul.
 */

var SHEET_NAME = 'Lista de asteptare';
var HEADERS = ['data', 'email', 'interes', 'sursa', 'limba'];
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var INTERESE = ['food', 'drink'];

function doPost(e) {
  var p = (e && e.parameter) || {};

  // Honeypot: câmpul ascuns din formular e completat doar de boți.
  if (p.website) return raspuns({ ok: true });

  var email = String(p.email || '').trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) return raspuns({ ok: false, eroare: 'email_invalid' });

  var interes = String(p.interes || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return INTERESE.indexOf(s) !== -1; })
    .join(',') || INTERESE.join(',');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = foaie();
    var last = sheet.getLastRow();
    if (last > 1) {
      var emails = sheet.getRange(2, 2, last - 1, 1).getValues();
      for (var i = 0; i < emails.length; i++) {
        if (emails[i][0] === email) {
          sheet.getRange(i + 2, 3).setValue(interes);
          return raspuns({ ok: true, deja: true });
        }
      }
    }
    sheet.appendRow([
      new Date(),
      email,
      interes,
      String(p.sursa || '').slice(0, 100),
      String(p.limba || '').slice(0, 20)
    ]);
  } finally {
    lock.releaseLock();
  }
  return raspuns({ ok: true });
}

// Deschizi URL-ul /exec în browser ca să verifici că merge.
function doGet() {
  return raspuns({ ok: true, mesaj: 'Lista de așteptare TOP FOOD / TOP DRINK funcționează.' });
}

function foaie() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function raspuns(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
