/**
 * TOP FOOD / TOP DRINK: formular de feedback (Google Forms)
 *
 * Cum îl rulezi:
 *   1. Deschide https://script.google.com și apasă „Proiect nou”.
 *   2. Șterge tot din Code.gs și lipește acest fișier.
 *   3. Alege funcția creeazaFormular în bara de sus și apasă „Run”.
 *   4. Acceptă permisiunile (scriptul creează doar un formular în Drive-ul tău).
 *   5. Deschide „Execution log”: acolo sunt linkul de completat și linkul de editare.
 *
 * Răspunsurile apar în tab-ul „Răspunsuri” al formularului. De acolo poți
 * apăsa „Link to Sheets” ca să le ai într-un spreadsheet.
 */

function creeazaFormular() {
  var form = FormApp.create('TOP FOOD / TOP DRINK: spune-ne ce crezi');

  form.setDescription(
    'Construim TOP FOOD (restaurante) și TOP DRINK (baruri și cluburi) pentru Timișoara: ' +
    'un clasament făcut după ce cred localnicii, nu turiștii sau review-urile cumpărate.\n\n' +
    'Durează cam 4 minute și e anonim.\n\n' +
    'Cum ne ajuți cel mai mult:\n' +
    '• Fii sincer. O critică ne ajută mai mult decât un „e fain”.\n' +
    '• Dă exemple concrete: localuri, situații, aplicații pe care le folosești deja.\n' +
    '• Dacă ceva nu e clar, scrie asta. Înseamnă că trebuie să explicăm mai bine.'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAcceptingResponses(true);
  form.setConfirmationMessage(
    'Mulțumim! Feedback-ul tău ajunge direct la echipa TOP FOOD / TOP DRINK.'
  );

  // ---------- 1. Despre tine ----------
  form.addSectionHeaderItem()
    .setTitle('Despre tine')
    .setHelpText('Câteva întrebări scurte ca să știm cine ne răspunde.');

  form.addMultipleChoiceItem()
    .setTitle('Locuiești în Timișoara?')
    .setChoiceValues([
      'Da, de peste un an',
      'Da, de mai puțin de un an',
      'Sunt student aici',
      'Sunt doar în vizită',
      'Nu'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Câți ani ai?')
    .setChoiceValues(['Sub 18', '18–24', '25–34', '35–44', '45+']);

  form.addMultipleChoiceItem()
    .setTitle('Cât de des ieși în oraș să mănânci sau să bei ceva?')
    .setChoiceValues([
      'De mai multe ori pe săptămână',
      'O dată pe săptămână',
      'De câteva ori pe lună',
      'Rar'
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Cum alegi acum unde mergi?')
    .setHelpText('Bifează tot ce folosești.')
    .setChoiceValues([
      'Google Maps',
      'Tripadvisor',
      'TikTok / Instagram',
      'Recomandări de la prieteni',
      'Aplicații de livrare (Glovo, Tazz, Bolt Food)',
      'Merg unde știu deja'
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ---------- 2. Ideea ----------
  form.addPageBreakItem()
    .setTitle('Ce vrem să facem')
    .setHelpText(
      '• Două clasamente pentru Timișoara: TOP FOOD (restaurante) și TOP DRINK (baruri, cluburi).\n' +
      '• Scor Onest de la 0 la 10. Review-urile localnicilor verificați contează dublu, ' +
      'cele plătite de influenceri contează foarte puțin, iar cele care par false sunt filtrate.\n' +
      '• Scorul Localnicilor și Scorul Turiștilor apar separat, ca să vezi diferența.\n' +
      '• Tourist Trap Index, cu motivele la vedere. Exemplu: „preț +60% față de medie, ' +
      '70% review-uri în limbi străine, localnicii îl notează mai jos”.\n' +
      '• Localurile pot plăti doar pentru un loc marcat „Sponsorizat”. Plata nu schimbă niciodată scorul sau poziția în top.\n' +
      '• Un top lunar, calculat pe 1 ale lunii și apoi înghețat.\n' +
      '• La TOP DRINK: scor diferit vineri noaptea față de restul săptămânii și un „vibe check” live: cât de plin e acum.'
    );

  form.addScaleItem()
    .setTitle('Cât de util ți se pare?')
    .setBounds(1, 5)
    .setLabels('Deloc util', 'Foarte util')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Ai folosi TOP FOOD / TOP DRINK?')
    .setChoiceValues(['Da, sigur', 'Probabil', 'Nu știu', 'Probabil nu', 'Nu'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Care te interesează mai mult?')
    .setChoiceValues(['TOP FOOD (restaurante)', 'TOP DRINK (baruri, cluburi)', 'Amândouă la fel', 'Niciunul'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Ce ți-ar plăcea cel mai mult?')
    .setHelpText('Alege maxim 3.')
    .setChoiceValues([
      'Scorul Onest',
      'Localnici și turiști afișați separat',
      'Tourist Trap Index',
      'Topul lunar',
      'Vibe check: cât de plin e un bar acum',
      'Evenimentele din weekend (DJ, concerte)',
      'Să pot nota angajații (ospătar, barman)',
      'Videouri TikTok / Instagram cu eticheta „reclamă?”'
    ])
    .setValidation(
      FormApp.createCheckboxValidation()
        .setHelpText('Alege maxim 3 variante.')
        .requireSelectAtMost(3)
        .build()
    );

  form.addParagraphTextItem()
    .setTitle('Ce te enervează acum când cauți unde să mănânci sau să ieși?')
    .setHelpText(
      'Câteva exemple ca să începi: review-uri care par false sau cumpărate, localuri pline de turiști, ' +
      'note mari pe Google care nu se confirmă, nu știi dacă un bar e plin, nu găsești prețurile.'
    );

  // ---------- 3. Scoruri și încredere ----------
  form.addPageBreakItem()
    .setTitle('Scoruri și încredere')
    .setHelpText('Totul se bazează pe încredere, așa că vrem să știm ce te-ar convinge.');

  form.addScaleItem()
    .setTitle('Ai avea mai multă încredere în Scorul Onest decât în nota de pe Google?')
    .setBounds(1, 5)
    .setLabels('Deloc', 'Mult mai multă')
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Ce te-ar face să ai încredere în scor?')
    .setChoiceValues([
      'Să văd de ce are localul scorul acela',
      'Să văd separat ce zic localnicii',
      'Să știu sigur că plata nu schimbă topul',
      'Insigna „Localnic Timișoara” la autorii review-urilor',
      'Să văd nota de pe Google lângă scorul vostru',
      'Să văd câte review-uri false au fost filtrate'
    ])
    .showOtherOption(true);

  form.addMultipleChoiceItem()
    .setTitle('E corect ca review-ul unui localnic verificat să conteze dublu față de al unui turist?')
    .setChoiceValues([
      'Da',
      'Da, dar ar trebui să conteze mai puțin de dublu',
      'Nu, toată lumea ar trebui să conteze la fel',
      'Nu știu'
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Ce ai fi dispus să faci ca să primești insigna „Localnic Timișoara”?')
    .setHelpText('Cu insigna, review-urile tale contează dublu.')
    .setChoiceValues([
      'Check-in cu GPS-ul în oraș în 5 zile diferite (salvăm doar ziua, nu traseul)',
      'Să mă verific cu emailul de la facultate (@e-uvt.ro, @student.upt.ro)',
      'Să mă garanteze 2 localnici deja verificați',
      'Nimic, nu mă interesează insigna'
    ]);

  form.addMultipleChoiceItem()
    .setTitle('Un local are eticheta „⚠ Posibilă capcană turistică”. Mai mergi acolo?')
    .setChoiceValues([
      'Nu',
      'Depinde de motive',
      'Da, nu contează pentru mine',
      'Nu știu'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Un local plătește ca să apară în caruselul „Sponsorizat”, dar poziția lui în top rămâne aceeași. Ți se pare corect?')
    .setChoiceValues([
      'Da',
      'Da, dacă e marcat clar ca reclamă',
      'Nu, nu vreau reclame deloc',
      'Nu știu'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Vrei să vezi și nota de pe Google lângă scorul nostru?')
    .setChoiceValues(['Da, vreau să compar', 'Nu, mă încurcă', 'Nu contează'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Ce te-ar face să NU ai încredere în TOP FOOD / TOP DRINK?')
    .setHelpText('De exemplu: un local pe care îl știi slab e sus în top, nu înțelegi de unde vine scorul, prea multe reclame.');

  // ---------- 4. Ultimele gânduri ----------
  form.addPageBreakItem()
    .setTitle('Ultimele gânduri')
    .setHelpText('Aproape gata!');

  form.addParagraphTextItem()
    .setTitle('Ce ai schimba, adăuga sau scoate?')
    .setHelpText(
      'Idei ca să începi: Ce lipsește? Ce nu e clar? Ce te-ar face să deschizi aplicația în fiecare săptămână? ' +
      'Ce te-ar face să renunți la ea?'
    );

  form.addTextItem()
    .setTitle('Un local din Timișoara care merită să fie sus în top')
    .setHelpText('Restaurant, bar sau club. Ne ajută să verificăm dacă scorul nostru e corect.');

  form.addTextItem()
    .setTitle('Și unul supraevaluat sau o capcană turistică')
    .setHelpText('Rămâne între noi.');

  form.addTextItem()
    .setTitle('Vrei să testezi primul demo? Lasă-ne emailul')
    .setHelpText('Opțional. Îl folosim doar ca să-ți trimitem demo-ul, fără spam.')
    .setValidation(
      FormApp.createTextValidation()
        .setHelpText('Scrie o adresă de email validă.')
        .requireTextIsEmail()
        .build()
    );

  // Formularele noi pot fi create nepublicate; îl publicăm dacă funcția există.
  if (typeof form.setPublished === 'function') {
    form.setPublished(true);
  }

  Logger.log('Link de completat (trimite-l oamenilor): ' + form.getPublishedUrl());
  Logger.log('Link de editare (doar pentru echipă): ' + form.getEditUrl());
}
