import { MenuCategory, Restaurant, WeeklyHoursEntry } from '../types';

export interface VenueExtraData {
  lastUpdated: string;
  weeklyHours: WeeklyHoursEntry[];
  menuCategories: MenuCategory[];
}

function makeDailyHours(
  weekdays: string,
  friday: string,
  saturday: string,
  sunday: string
): WeeklyHoursEntry[] {
  return [
    { day: 'Luni', hours: weekdays },
    { day: 'Marți', hours: weekdays },
    { day: 'Miercuri', hours: weekdays },
    { day: 'Joi', hours: weekdays },
    { day: 'Vineri', hours: friday },
    { day: 'Sâmbătă', hours: saturday },
    { day: 'Duminică', hours: sunday },
  ];
}

export const VENUE_EXTRAS: Record<string, VenueExtraData> = {
  'ciorba-lui-sandu': {
    lastUpdated: '12 nov 2026',
    weeklyHours: makeDailyHours(
      '11:00 – 22:00',
      '11:00 – 22:30',
      '11:00 – 22:30',
      '11:00 – 21:00'
    ),
    menuCategories: [
      {
        title: 'Ciorbe & Supe',
        items: [
          {
            name: 'Ciorbă de burtă (marțea și vinerea)',
            priceRon: 28,
            portion: '400 ml',
            description: 'Fiartă 6 ore de la zero, cu smântână și ardei iute.',
            isMustOrder: true,
          },
          {
            name: 'Ciorbă de văcuță cu leuștean',
            priceRon: 25,
            portion: '400 ml',
            description: 'Legume proaspete și carne fragedă de vită.',
          },
          {
            name: 'Supă de pui cu tăiței de casă',
            priceRon: 21,
            portion: '400 ml',
          },
        ],
      },
      {
        title: 'Feluri principale',
        items: [
          {
            name: 'Papricaș de vițel cu găluște de casă',
            priceRon: 38,
            portion: '350 g',
            description: 'Sos cu boia dulce de Szeged și smântână.',
            isMustOrder: true,
          },
          {
            name: 'Tochitură bănățeană cu mămăligă și ou',
            priceRon: 39,
            portion: '380 g',
          },
          {
            name: 'Mici la grătar (4 buc.) cu muștar și pâine de casă',
            priceRon: 26,
            portion: '280 g',
          },
        ],
      },
      {
        title: 'Desert & Băuturi',
        items: [
          {
            name: 'Papanași fierți cu smântână și dulceață de vișine',
            priceRon: 24,
            portion: '250 g',
          },
          {
            name: 'Pâine de casă cu coajă crocantă',
            priceRon: 0,
            description: 'Din partea casei la orice ciorbă.',
          },
          {
            name: 'Socată artizanală',
            priceRon: 12,
            portion: '330 ml',
          },
        ],
      },
    ],
  },

  'pizzeria-din-fabric': {
    lastUpdated: '11 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: 'Închis' },
      { day: 'Marți', hours: '12:00 – 22:30' },
      { day: 'Miercuri', hours: '12:00 – 22:30' },
      { day: 'Joi', hours: '12:00 – 22:30' },
      { day: 'Vineri', hours: '12:00 – 23:30' },
      { day: 'Sâmbătă', hours: '12:00 – 23:30' },
      { day: 'Duminică', hours: '12:00 – 22:00' },
    ],
    menuCategories: [
      {
        title: 'Pizza cu maia (48h fermentare)',
        items: [
          {
            name: 'Pizza Fabric cu cârnați șvăbești și salvie',
            priceRon: 41,
            portion: '32 cm',
            description: 'Sos San Marzano, mozzarella fior di latte, cârnați locali.',
            isMustOrder: true,
          },
          {
            name: 'Marinara cu usturoi copt',
            priceRon: 32,
            portion: '32 cm',
            description: 'Fără brânză, ulei extravirgin și oregano de munte.',
          },
          {
            name: 'Diavola cu salam picant și miere cu chili',
            priceRon: 42,
            portion: '32 cm',
          },
          {
            name: 'Quattro Formaggi cu nucă',
            priceRon: 44,
            portion: '32 cm',
          },
        ],
      },
      {
        title: 'Desert & Băuturi',
        items: [
          {
            name: 'Tiramisu făcut în casă',
            priceRon: 22,
            portion: '160 g',
          },
          {
            name: 'Bere artizanală locală la sticlă',
            priceRon: 16,
            portion: '330 ml',
          },
        ],
      },
    ],
  },

  'placintaria-elisabetin': {
    lastUpdated: '13 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '07:00 – 19:00' },
      { day: 'Marți', hours: '07:00 – 19:00' },
      { day: 'Miercuri', hours: '07:00 – 19:00' },
      { day: 'Joi', hours: '07:00 – 19:00' },
      { day: 'Vineri', hours: '07:00 – 19:00' },
      { day: 'Sâmbătă', hours: '08:00 – 17:00' },
      { day: 'Duminică', hours: 'Închis' },
    ],
    menuCategories: [
      {
        title: 'Plăcinte sărate',
        items: [
          {
            name: 'Plăcintă cu brânză sărată și mărar',
            priceRon: 16,
            portion: '220 g',
            description: 'Foaie întinsă manual, coaptă pe vatră.',
            isMustOrder: true,
          },
          {
            name: 'Plăcintă cu cartofi și ceapă călită',
            priceRon: 15,
            portion: '220 g',
          },
          {
            name: 'Plăcintă cu varză călită și piper',
            priceRon: 15,
            portion: '220 g',
          },
        ],
      },
      {
        title: 'Plăcinte dulci & Băuturi',
        items: [
          {
            name: 'Plăcintă cu mere și nucă',
            priceRon: 16,
            portion: '220 g',
            isMustOrder: true,
          },
          {
            name: 'Plăcintă cu dovleac și scorțișoară',
            priceRon: 16,
            portion: '220 g',
          },
          {
            name: 'Sana rece de casă / Kefir',
            priceRon: 8,
            portion: '300 ml',
          },
        ],
      },
    ],
  },

  'bistro-bega': {
    lastUpdated: '10 nov 2026',
    weeklyHours: makeDailyHours(
      '11:00 – 23:00',
      '11:00 – 23:30',
      '11:00 – 23:30',
      '11:00 – 22:30'
    ),
    menuCategories: [
      {
        title: 'Aperitive & Supe',
        items: [
          {
            name: 'Supă de ceapă gratinată cu Gruyère',
            priceRon: 31,
            portion: '350 ml',
          },
          {
            name: 'Pate de rață cu dulceață de smochine și brioșă',
            priceRon: 36,
            portion: '180 g',
          },
        ],
      },
      {
        title: 'Feluri principale',
        items: [
          {
            name: 'Șnițel vienez cu salată de cartofi',
            priceRon: 64,
            portion: '340 g',
            description: 'Din pulpă de vițel, prăjit în unt clarifiat.',
            isMustOrder: true,
          },
          {
            name: 'Păstrăv la tigaie cu unt brun și capere',
            priceRon: 58,
            portion: '320 g',
          },
          {
            name: 'Burger de vită maturat cu cartofi prăjiți în casă',
            priceRon: 54,
            portion: '380 g',
          },
        ],
      },
      {
        title: 'Deserturi',
        items: [
          {
            name: 'Ștrudel cald cu mere și sos de vanilie',
            priceRon: 27,
            portion: '200 g',
          },
        ],
      },
    ],
  },

  'bucataria-mamei-veta': {
    lastUpdated: '12 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '11:00 – 20:00' },
      { day: 'Marți', hours: '11:00 – 20:00' },
      { day: 'Miercuri', hours: '11:00 – 20:00' },
      { day: 'Joi', hours: '11:00 – 20:00' },
      { day: 'Vineri', hours: '11:00 – 20:00' },
      { day: 'Sâmbătă', hours: '11:00 – 18:00' },
      { day: 'Duminică', hours: 'Închis' },
    ],
    menuCategories: [
      {
        title: 'Gătit zilnic',
        items: [
          {
            name: 'Sarmale bănățene cu mămăligă',
            priceRon: 36,
            portion: '400 g',
            description: 'Cu varză murată și afumătură, servite cu smântână.',
            isMustOrder: true,
          },
          {
            name: 'Meniul zilei (ciorbă + felul 2 + desert)',
            priceRon: 35,
            portion: 'Complet',
          },
          {
            name: 'Varză à la Cluj la cuptor',
            priceRon: 32,
            portion: '350 g',
          },
          {
            name: 'Clătite bănățene cu brânză dulce și stafide',
            priceRon: 19,
            portion: '220 g',
          },
        ],
      },
    ],
  },

  'shaorma-de-la-gara': {
    lastUpdated: '13 nov 2026',
    weeklyHours: makeDailyHours(
      '10:00 – 01:00',
      '10:00 – 03:00',
      '10:00 – 03:00',
      '10:00 – 01:00'
    ),
    menuCategories: [
      {
        title: 'Lipie & Farfurie',
        items: [
          {
            name: 'Shaorma mare la lipie cu vită și legume coapte',
            priceRon: 28,
            portion: '480 g',
            description: 'Lipie coaptă pe loc, sos de usturoi făcut în casă.',
            isMustOrder: true,
          },
          {
            name: 'Shaorma medie de pui',
            priceRon: 23,
            portion: '360 g',
          },
          {
            name: 'Falafel la lipie cu humus și rodie',
            priceRon: 24,
            portion: '380 g',
          },
          {
            name: 'Ayran rece',
            priceRon: 7,
            portion: '300 ml',
          },
        ],
      },
    ],
  },

  'la-doi-pasi': {
    lastUpdated: '09 nov 2026',
    weeklyHours: makeDailyHours(
      '11:00 – 22:00',
      '11:00 – 22:30',
      '11:00 – 22:30',
      '11:00 – 21:30'
    ),
    menuCategories: [
      {
        title: 'Preparate de cartier',
        items: [
          {
            name: 'Paste cu ragù de vită',
            priceRon: 39,
            portion: '350 g',
            isMustOrder: true,
          },
          {
            name: 'Ciorbă de fasole cu afumătură în pâine',
            priceRon: 29,
            portion: '420 g',
          },
          {
            name: 'Piept de pui la grătar cu piure și salată de varză',
            priceRon: 36,
            portion: '360 g',
          },
        ],
      },
    ],
  },

  'langos-and-co': {
    lastUpdated: '12 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '08:00 – 18:00' },
      { day: 'Marți', hours: '08:00 – 18:00' },
      { day: 'Miercuri', hours: '08:00 – 18:00' },
      { day: 'Joi', hours: '08:00 – 18:00' },
      { day: 'Vineri', hours: '08:00 – 18:00' },
      { day: 'Sâmbătă', hours: '08:30 – 16:00' },
      { day: 'Duminică', hours: 'Închis' },
    ],
    menuCategories: [
      {
        title: 'Langoși proaspeți',
        items: [
          {
            name: 'Langoș cu smântână și telemea de oaie',
            priceRon: 18,
            portion: '240 g',
            isMustOrder: true,
          },
          {
            name: 'Langoș simplu cu mujdei de usturoi',
            priceRon: 13,
            portion: '190 g',
          },
          {
            name: 'Langoș dulce cu gem de prune și nucă',
            priceRon: 16,
            portion: '220 g',
          },
        ],
      },
    ],
  },

  'mamaliga-urbana': {
    lastUpdated: '08 nov 2026',
    weeklyHours: makeDailyHours(
      '11:00 – 22:00',
      '11:00 – 22:30',
      '11:00 – 22:30',
      '11:00 – 22:00'
    ),
    menuCategories: [
      {
        title: 'Specialități pe bază de mălai',
        items: [
          {
            name: 'Bulz cu brânză de burduf și ou poșat',
            priceRon: 34,
            portion: '350 g',
            isMustOrder: true,
          },
          {
            name: 'Mămăligă cremoasă cu ciuperci de pădure și cimbru',
            priceRon: 36,
            portion: '320 g',
          },
          {
            name: 'Coaste de porc glazurate cu mămăligă coaptă',
            priceRon: 52,
            portion: '450 g',
          },
        ],
      },
    ],
  },

  'bucataria-elisabetin': {
    lastUpdated: '07 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '11:30 – 21:30' },
      { day: 'Marți', hours: '11:30 – 21:30' },
      { day: 'Miercuri', hours: '11:30 – 21:30' },
      { day: 'Joi', hours: '11:30 – 21:30' },
      { day: 'Vineri', hours: '11:30 – 22:00' },
      { day: 'Sâmbătă', hours: '12:00 – 22:00' },
      { day: 'Duminică', hours: 'Închis' },
    ],
    menuCategories: [
      {
        title: 'Meniul casei',
        items: [
          {
            name: 'Supă cremă de rădăcinoase și friptură la tavă',
            priceRon: 48,
            portion: 'Meniu 2 feluri',
          },
          {
            name: 'Ostropel de pui cu mămăligă caldă',
            priceRon: 39,
            portion: '360 g',
          },
          {
            name: 'Salată de sfeclă coaptă cu hrean',
            priceRon: 14,
            portion: '180 g',
          },
        ],
      },
    ],
  },

  'supa-de-la-colt': {
    lastUpdated: '13 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '11:00 – 18:00' },
      { day: 'Marți', hours: '11:00 – 18:00' },
      { day: 'Miercuri', hours: '11:00 – 18:00' },
      { day: 'Joi', hours: '11:00 – 18:00' },
      { day: 'Vineri', hours: '11:00 – 18:00' },
      { day: 'Sâmbătă', hours: 'Închis' },
      { day: 'Duminică', hours: 'Închis' },
    ],
    menuCategories: [
      {
        title: 'Supe de prânz',
        items: [
          {
            name: 'Supă cremă de linte cu crutoane cu chimen',
            priceRon: 24,
            portion: '400 ml',
            isMustOrder: true,
          },
          {
            name: 'Ciorbă de perișoare cu borș de casă',
            priceRon: 26,
            portion: '400 ml',
          },
          {
            name: 'Supă thai de cocos cu pui și ghimbir',
            priceRon: 29,
            portion: '400 ml',
          },
        ],
      },
    ],
  },

  'terasa-grand-unirii': {
    lastUpdated: '05 nov 2026',
    weeklyHours: makeDailyHours(
      '09:00 – 00:00',
      '09:00 – 01:00',
      '09:00 – 01:00',
      '09:00 – 00:00'
    ),
    menuCategories: [
      {
        title: 'Meniu turistic (prețuri observate)',
        items: [
          {
            name: 'Platou tradițional „Grand” (2 pers.)',
            priceRon: 185,
            portion: '750 g',
          },
          {
            name: 'Ciorbă de burtă',
            priceRon: 42,
            portion: '350 ml',
          },
          {
            name: 'Mici la grătar (4 buc.) + pâine (taxată separat 9 lei)',
            priceRon: 54,
            portion: '240 g',
          },
          {
            name: 'Apă plată 750 ml',
            priceRon: 26,
          },
        ],
      },
    ],
  },

  'cafe-domului': {
    lastUpdated: '06 nov 2026',
    weeklyHours: makeDailyHours(
      '08:30 – 23:00',
      '08:30 – 23:30',
      '09:00 – 23:30',
      '09:00 – 23:00'
    ),
    menuCategories: [
      {
        title: 'Cafenea & Bistro',
        items: [
          {
            name: 'Espresso / Cappuccino pe terasă',
            priceRon: 22,
            portion: '180 ml',
          },
          {
            name: 'Paste cu somon și sos alb',
            priceRon: 78,
            portion: '300 g',
          },
          {
            name: 'Club sandwich cu cartofi congelați',
            priceRon: 68,
            portion: '320 g',
          },
        ],
      },
    ],
  },

  'trattoria-corso-unirii': {
    lastUpdated: '04 nov 2026',
    weeklyHours: makeDailyHours(
      '09:30 – 00:00',
      '09:30 – 00:30',
      '09:30 – 00:30',
      '09:30 – 00:00'
    ),
    menuCategories: [
      {
        title: 'Paste & Pizza (prețuri observate)',
        items: [
          {
            name: 'Paste cu sos semipreparat (de evitat)',
            priceRon: 69,
            portion: '280 g',
          },
          {
            name: 'Pizza Margherita',
            priceRon: 58,
            portion: '30 cm',
          },
          {
            name: 'Aperol Spritz',
            priceRon: 44,
            portion: '250 ml',
          },
        ],
      },
    ],
  },

  // ============================================================================
  // TOPDRINK / TIMIȘOARA
  // ============================================================================
  'pivnita-cu-bolta': {
    lastUpdated: '12 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: 'Închis' },
      { day: 'Marți', hours: '17:00 – 01:00' },
      { day: 'Miercuri', hours: '17:00 – 01:00' },
      { day: 'Joi', hours: '17:00 – 02:00' },
      { day: 'Vineri', hours: '17:00 – 03:00' },
      { day: 'Sâmbătă', hours: '17:00 – 03:00' },
      { day: 'Duminică', hours: '17:00 – 00:00' },
    ],
    menuCategories: [
      {
        title: 'Beri la halbă & artizanale',
        items: [
          {
            name: 'Bere locală la halbă 0,5 l',
            priceRon: 14,
            portion: '500 ml',
            isMustOrder: true,
          },
          {
            name: 'IPA bănățeană nefiltrată',
            priceRon: 18,
            portion: '400 ml',
          },
          {
            name: 'Stout cu note de cafea',
            priceRon: 19,
            portion: '400 ml',
          },
        ],
      },
      {
        title: 'Gustări de pivniță',
        items: [
          {
            name: 'Covrigi calzi cu sare grunjoasă și muștar',
            priceRon: 12,
            portion: '2 buc.',
          },
          {
            name: 'Platou de brânzeturi locale și jumări',
            priceRon: 34,
            portion: '250 g',
          },
        ],
      },
    ],
  },

  'bar-elisabetin': {
    lastUpdated: '11 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: 'Închis' },
      { day: 'Marți', hours: '18:00 – 01:00' },
      { day: 'Miercuri', hours: '18:00 – 01:00' },
      { day: 'Joi', hours: '18:00 – 01:30' },
      { day: 'Vineri', hours: '18:00 – 02:00' },
      { day: 'Sâmbătă', hours: '18:00 – 02:00' },
      { day: 'Duminică', hours: '18:00 – 00:00' },
    ],
    menuCategories: [
      {
        title: 'Cocktailuri signature',
        items: [
          {
            name: 'Negroni cu infuzie de portocală arsă',
            priceRon: 34,
            portion: '140 ml',
            isMustOrder: true,
          },
          {
            name: 'Whiskey Sour cu albuș și bitter de nucă',
            priceRon: 36,
            portion: '150 ml',
          },
          {
            name: 'Spritz fără alcool cu rozmarin și grapefruit',
            priceRon: 22,
            portion: '250 ml',
          },
        ],
      },
      {
        title: 'Vinuri la pahar',
        items: [
          {
            name: 'Fetească Neagră de Recaș (150 ml)',
            priceRon: 24,
          },
          {
            name: 'Creasă de Banat rece (150 ml)',
            priceRon: 22,
          },
        ],
      },
    ],
  },

  'depoul-de-tramvaie': {
    lastUpdated: '13 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: 'Închis' },
      { day: 'Marți', hours: 'Închis' },
      { day: 'Miercuri', hours: 'Închis' },
      { day: 'Joi', hours: 'Închis' },
      { day: 'Vineri', hours: '22:30 – 05:00' },
      { day: 'Sâmbătă', hours: '22:30 – 05:00' },
      { day: 'Duminică', hours: 'Închis' },
    ],
    menuCategories: [
      {
        title: 'Bar de noapte',
        items: [
          {
            name: 'Gin Tonic cu castravete și piper roz',
            priceRon: 30,
            portion: '250 ml',
            isMustOrder: true,
          },
          {
            name: 'Bere la doză / sticlă 330 ml',
            priceRon: 16,
          },
          {
            name: 'Club-Mate rece',
            priceRon: 18,
            portion: '500 ml',
          },
        ],
      },
    ],
  },

  'terasa-de-pe-bega': {
    lastUpdated: '09 nov 2026',
    weeklyHours: makeDailyHours(
      '12:00 – 00:30',
      '12:00 – 01:30',
      '12:00 – 01:30',
      '12:00 – 00:00'
    ),
    menuCategories: [
      {
        title: 'Pe malul Begăi',
        items: [
          {
            name: 'Bere la halbă pe malul Begăi',
            priceRon: 19,
            portion: '500 ml',
          },
          {
            name: 'Limonadă cu mentă și ghimbir',
            priceRon: 21,
            portion: '400 ml',
          },
          {
            name: 'Hugo Spritz',
            priceRon: 31,
            portion: '250 ml',
          },
        ],
      },
    ],
  },

  'hamei-si-malt-iosefin': {
    lastUpdated: '12 nov 2026',
    weeklyHours: makeDailyHours(
      '16:00 – 00:00',
      '16:00 – 01:30',
      '14:00 – 01:30',
      '14:00 – 23:30'
    ),
    menuCategories: [
      {
        title: 'Taproom & Craft',
        items: [
          {
            name: 'IPA locală 0,5 l',
            priceRon: 14,
            portion: '500 ml',
            isMustOrder: true,
          },
          {
            name: 'Pilsner ceh proaspăt la halbă',
            priceRon: 14,
            portion: '500 ml',
          },
          {
            name: 'Degustare 4 beri artizanale (4 × 150 ml)',
            priceRon: 28,
            portion: '600 ml',
          },
          {
            name: 'Alune prăjite cu sare afumată',
            priceRon: 10,
            portion: '120 g',
          },
        ],
      },
    ],
  },
};

export function getVenueLastUpdated(restaurant: Restaurant): string {
  return (
    restaurant.lastUpdated ??
    VENUE_EXTRAS[restaurant.id]?.lastUpdated ??
    '10 nov 2026'
  );
}

export function getVenueWeeklyHours(restaurant: Restaurant): WeeklyHoursEntry[] {
  if (restaurant.weeklyHours && restaurant.weeklyHours.length > 0) {
    return restaurant.weeklyHours;
  }
  if (VENUE_EXTRAS[restaurant.id]?.weeklyHours) {
    return VENUE_EXTRAS[restaurant.id].weeklyHours;
  }
  const fallback = restaurant.hours.replace(/^[^:]+:\s*/, '');
  return makeDailyHours(fallback, fallback, fallback, fallback);
}

export function getVenueMenu(restaurant: Restaurant): MenuCategory[] {
  if (restaurant.menuCategories && restaurant.menuCategories.length > 0) {
    return restaurant.menuCategories;
  }
  if (VENUE_EXTRAS[restaurant.id]?.menuCategories) {
    return VENUE_EXTRAS[restaurant.id].menuCategories;
  }
  return [
    {
      title: restaurant.vertical === 'drink' ? 'Băuturi' : 'Preparate principale',
      items: restaurant.whatToOrder.map((dish) => ({
        name: dish.name,
        priceRon: dish.priceRon,
        description: dish.description,
        isMustOrder: dish.isMustOrder,
      })),
    },
  ];
}

export function getTodayDayName(): string {
  const days = [
    'Duminică',
    'Luni',
    'Marți',
    'Miercuri',
    'Joi',
    'Vineri',
    'Sâmbătă',
  ];
  return days[new Date().getDay()];
}
