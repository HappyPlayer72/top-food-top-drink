import type { Vertical } from '../../../types';

export type DareTier = 'chill' | 'spicy' | 'chaos';

export interface TableDare {
  id: string;
  tier: DareTier;
  vertical: 'both' | Vertical;
  title: string;
  rule: string;
}

export const TABLE_DARES: TableDare[] = [
  { id: 'd-1', tier: 'chill', vertical: 'both', title: 'Turnul telefoanelor', rule: 'Toată lumea pune telefonul cu ecranul în jos pe mijlocul mesei 15 minute. Cine atinge primul telefonul plătește o rundă de apă sau cafea.' },
  { id: 'd-2', tier: 'chill', vertical: 'food', title: 'Compliment pentru bucătărie', rule: 'Când vine ospătarul, transmite-i un compliment sincer și specific despre cel mai bun preparat de pe masă.' },
  { id: 'd-3', tier: 'chill', vertical: 'drink', title: 'Compliment la bar', rule: 'Întreabă barmanul care este băutura lui preferată de făcut în tura de azi și notează recomandarea pentru următoarea rundă.' },
  { id: 'd-4', tier: 'spicy', vertical: 'food', title: 'Comandă pe nevăzute', rule: 'Persoana din dreapta ta îți alege următorul fel de mâncare sau desert din meniu (în același buget).' },
  { id: 'd-5', tier: 'spicy', vertical: 'drink', title: 'Alegerea barmanului', rule: 'La următoarea comandă nu te uiți în meniu — îi spui doar „ceva acrișor” sau „ceva amărui” și bei ce aduce.' },
  { id: 'd-6', tier: 'spicy', vertical: 'food', title: 'Schimb de farfurii', rule: 'Faci schimb de farfurie pentru două guri cu persoana de vizavi și dai o notă de la 1 la 10 în fața mesei.' },
  { id: 'd-7', tier: 'spicy', vertical: 'drink', title: 'Schimb de pahare (degustare)', rule: 'Descrii gustul băuturii vecinului din stânga ca un somelier profesionist, folosind minimum trei arome imaginare.' },
  { id: 'd-8', tier: 'chill', vertical: 'both', title: 'Oracolul notei de plată', rule: 'Fiecare estimează în gând totalul notei. Cel mai îndepărtat de suma reală la final strânge paharele spre marginea mesei.' },
  { id: 'd-9', tier: 'spicy', vertical: 'both', title: 'Interdicția cuvântului «bun»', rule: 'Timp de 10 minute nu ai voie să spui cuvântul „bun” sau „fain”. Dacă scapi, adaugi +5 lei la bacșiș.' },
  { id: 'd-10', tier: 'chaos', vertical: 'food', title: 'Mână stângă / mână opusă', rule: 'Mănânci următoarele 5 minute exclusiv cu mâna nedominantă. Fără trișat!' },
  { id: 'd-11', tier: 'chaos', vertical: 'drink', title: 'Toastul improvizat', rule: 'Ridici paharul și ții un toast de 15 secunde pentru un motiv complet absurd ales de persoana din fața ta.' },
  { id: 'd-12', tier: 'chaos', vertical: 'both', title: 'Regizorul mesei', rule: 'Faci o poză de grup cu toată masa folosind doar unghiul de jos (stil selfie cu hamsterul) înainte să vină comanda.' },
  { id: 'd-13', tier: 'chill', vertical: 'food', title: 'Detectivul de ingrediente', rule: 'Cu ochii închiși, guști o îmbucătură aleasă de cineva de la masă și încerci să ghicești 3 ingrediente.' },
  { id: 'd-14', tier: 'spicy', vertical: 'both', title: 'Recenzie live în 2 fraze', rule: 'Rostești cu voce tare o mini-recenzie de localnic pentru locul în care sunteți — ca și cum ar fi pentru radio.' },
  { id: 'd-15', tier: 'chaos', vertical: 'food', title: 'Veto pe sosuri', rule: 'Restul mesei decide dacă ai voie să folosești sosuri la porția curentă sau trebuie să o mănânci simplă timp de 5 minute.' },
  { id: 'd-16', tier: 'chaos', vertical: 'drink', title: 'Runda de apă obligatorie', rule: 'Toată masa bea un pahar întreg de apă înainte de următoarea comandă — hidratare de localnic responsabil!' },
  { id: 'd-17', tier: 'chill', vertical: 'both', title: 'Schimb de locuri', rule: 'Schimbi locul la masă cu persoana care a vorbit cel mai puțin în ultimele 10 minute.' },
  { id: 'd-18', tier: 'spicy', vertical: 'both', title: 'Secretul cartonașului', rule: 'Spui care a fost cea mai mare capcană turistică în care ai mâncat sau băut vreodată și cât a costat.' },
  { id: 'd-19', tier: 'chaos', vertical: 'both', title: 'Dublu sau nimic la bacșiș', rule: 'La următoarea rundă de „Cine plătește”, alegi o persoană care pornește cu șansă dublă — sau preiei tu provocarea următoare.' },
  { id: 'd-20', tier: 'chill', vertical: 'drink', title: 'Povestea primului local', rule: 'Povestești în 30 de secunde prima seară memorabilă pe care ai avut-o într-un bar din Timișoara.' },
];

/** Pedepse blânde la „Dau pas”: fără alcool, fără bani. */
export const PASS_PENALTIES = [
  'Strângi farfuriile spre marginea mesei',
  'Faci tu poza de grup a mesei',
  'Spui un compliment fiecăruia',
  'Taci 2 minute',
  'Alegi tu muzica la următorul local',
];
