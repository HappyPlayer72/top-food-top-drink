import {
  MenuCategory,
  Restaurant,
  VenueFacilities,
  VenueWarnings,
  WeeklyHoursEntry,
} from '../types';

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
  'restaurant-nora': {
    lastUpdated: '12 nov 2026',
    weeklyHours: makeDailyHours(
      '11:00 – 23:00',
      '11:00 – 23:30',
      '11:00 – 23:30',
      '11:00 – 22:30'
    ),
    menuCategories: [
      {
        title: 'Ciorbe & Supe',
        items: [
          {
            name: 'Ciorbă de burtă dreasă cu smântână',
            priceRon: 29,
            portion: '400 ml',
            description: 'Servită fierbinte cu ardei iute, oțet și pâine proaspătă.',
            isMustOrder: true,
          },
          {
            name: 'Ciorbă sârbească de văcuță',
            priceRon: 26,
            portion: '400 ml',
            description: 'Gătită lent cu legume rădăcinoase și carne de vită.',
          },
          {
            name: 'Supă de găină cu tăiței de casă',
            priceRon: 22,
            portion: '400 ml',
          },
        ],
      },
      {
        title: 'Grătar sârbesc & Feluri principale',
        items: [
          {
            name: 'Plescaviță sârbească cu kajmak și cartofi prăjiți',
            priceRon: 44,
            portion: '420 g',
            description: 'Din amestec proaspăt de vită și porc pe jar, cu kajmak autentic.',
            isMustOrder: true,
          },
          {
            name: 'Plescaviță gourmet umplută cu cașcaval și șuncă',
            priceRon: 48,
            portion: '450 g',
          },
          {
            name: 'Mici la grătar (4 buc.) cu muștar și pâine',
            priceRon: 28,
            portion: '300 g',
          },
          {
            name: 'Meniul zilei (ciorbă + felul 2)',
            priceRon: 36,
            portion: 'Complet (Lu–Vi, 12:00–15:30)',
          },
        ],
      },
      {
        title: 'Deserturi',
        items: [
          {
            name: 'Clătite bănățene la cuptor cu brânză dulce și stafide',
            priceRon: 24,
            portion: '240 g',
          },
          {
            name: 'Papanași cu smântână și dulceață de vișine',
            priceRon: 26,
            portion: '260 g',
          },
        ],
      },
    ],
  },

  'la-focacceria': {
    lastUpdated: '12 nov 2026',
    weeklyHours: makeDailyHours(
      '10:00 – 22:00',
      '10:00 – 23:00',
      '10:00 – 23:00',
      '11:00 – 22:00'
    ),
    menuCategories: [
      {
        title: 'Focaccia artizanală',
        items: [
          {
            name: 'Focaccia cu mortadella, stracciatella și fistic',
            priceRon: 36,
            portion: '300 g',
            description: 'Focaccia coaptă zilnic cu fermentare lentă și cremă de fistic.',
            isMustOrder: true,
          },
          {
            name: 'Focaccia cu prosciutto crudo, rucola și parmezan',
            priceRon: 38,
            portion: '290 g',
          },
          {
            name: 'Focaccia simplă cu rozmarin și sare de mare',
            priceRon: 18,
            portion: '220 g',
          },
        ],
      },
      {
        title: 'Pizza al taglio & Desert',
        items: [
          {
            name: 'Pizza al taglio cu prosciutto cotto și ciuperci',
            priceRon: 28,
            portion: '260 g',
          },
          {
            name: 'Pizza Diavola cu salam picant calabrez',
            priceRon: 30,
            portion: '260 g',
          },
          {
            name: 'Cannoli siciliani cu cremă de ricotta și ciocolată',
            priceRon: 19,
            portion: '110 g',
          },
        ],
      },
    ],
  },

  'neata-omelette-bistro': {
    lastUpdated: '13 nov 2026',
    weeklyHours: makeDailyHours(
      '08:30 – 16:00',
      '08:30 – 16:00',
      '09:00 – 16:00',
      '09:00 – 16:00'
    ),
    menuCategories: [
      {
        title: 'Mic dejun & Brunch',
        items: [
          {
            name: 'Ouă Benedict cu somon afumat și sos Hollandaise',
            priceRon: 44,
            portion: '320 g',
            description: 'Pe brioșă prăjită cu unt, avocado și salată verde.',
            isMustOrder: true,
          },
          {
            name: 'Shakshuka cu brânză feta și pâine cu maia',
            priceRon: 39,
            portion: '360 g',
            description: 'Sos de roșii coapte, ardei, chimen și două ouă.',
          },
          {
            name: 'Omletă Neața cu bacon crocant, cheddar și ciuperci',
            priceRon: 36,
            portion: '310 g',
          },
          {
            name: 'Bagel cu cremă de brânză, curcan și roșii uscate',
            priceRon: 32,
            portion: '260 g',
          },
        ],
      },
      {
        title: 'Dulce & Cafea',
        items: [
          {
            name: 'Clătite americane cu mascarpone și fructe de pădure',
            priceRon: 34,
            portion: '280 g',
          },
          {
            name: 'Flat White de specialitate',
            priceRon: 16,
            portion: '200 ml',
          },
        ],
      },
    ],
  },

  'vinto-gastro-wine-bar': {
    lastUpdated: '11 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: 'Închis' },
      { day: 'Marți', hours: '12:00 – 23:00' },
      { day: 'Miercuri', hours: '12:00 – 23:00' },
      { day: 'Joi', hours: '12:00 – 23:00' },
      { day: 'Vineri', hours: '12:00 – 00:00' },
      { day: 'Sâmbătă', hours: '12:00 – 00:00' },
      { day: 'Duminică', hours: '12:00 – 22:00' },
    ],
    menuCategories: [
      {
        title: 'Antreuri & Sharing',
        items: [
          {
            name: 'Platou de brânzeturi artizanale și mezeluri fine',
            priceRon: 74,
            portion: '320 g',
          },
          {
            name: 'Tartar de vită maturat cu gălbenuș confiat',
            priceRon: 58,
            portion: '190 g',
          },
        ],
      },
      {
        title: 'Feluri principale',
        items: [
          {
            name: 'Piept de rață maturat cu piure de țelină și sos de vin',
            priceRon: 78,
            portion: '310 g',
            description: 'Gătit sous-vide, cu reducție de Fetească Neagră.',
            isMustOrder: true,
          },
          {
            name: 'Risotto cu hribi și trufe negre',
            priceRon: 64,
            portion: '300 g',
          },
          {
            name: 'File de lup de mare cu sparanghel la grătar',
            priceRon: 84,
            portion: '300 g',
          },
        ],
      },
      {
        title: 'Vinuri la pahar',
        items: [
          {
            name: 'Fetească Neagră de Banat (pahar 150 ml)',
            priceRon: 28,
            portion: '150 ml',
          },
          {
            name: 'Spumant Brut local (125 ml)',
            priceRon: 30,
            portion: '125 ml',
          },
        ],
      },
    ],
  },

  'casa-bunicii': {
    lastUpdated: '12 nov 2026',
    weeklyHours: makeDailyHours(
      '11:30 – 22:30',
      '11:30 – 23:00',
      '11:30 – 23:00',
      '11:30 – 22:00'
    ),
    menuCategories: [
      {
        title: 'Supe & Ciorbe bănățene',
        items: [
          {
            name: 'Supă de găină de țară cu tăiței de casă',
            priceRon: 24,
            portion: '400 ml',
          },
          {
            name: 'Ciorbă de fasole cu ciolan afumat și ceapă roșie',
            priceRon: 27,
            portion: '420 ml',
          },
        ],
      },
      {
        title: 'Preparate tradiționale',
        items: [
          {
            name: 'Șnițelul Bunicii din cotlet de porc cu salată de cartofi',
            priceRon: 46,
            portion: '380 g',
            description: 'Crocant, cu salată de cartofi bănățeană cu ceapă roșie.',
            isMustOrder: true,
          },
          {
            name: 'Papricaș de vițel cu găluște făcute în casă',
            priceRon: 49,
            portion: '360 g',
          },
          {
            name: 'Sarmale bănățene cu mămăligă și smântână',
            priceRon: 42,
            portion: '400 g',
          },
        ],
      },
      {
        title: 'Deserturile Bunicii',
        items: [
          {
            name: 'Gomboți bănățeni cu prune și pesmet rumenit în unt',
            priceRon: 28,
            portion: '2 buc. (280 g)',
            isMustOrder: true,
          },
          {
            name: 'Ștrudel cald cu mere și scorțișoară',
            priceRon: 24,
            portion: '200 g',
          },
        ],
      },
    ],
  },

  'little-hanoi': {
    lastUpdated: '13 nov 2026',
    weeklyHours: makeDailyHours(
      '11:30 – 22:00',
      '11:30 – 22:30',
      '12:00 – 22:30',
      '12:00 – 22:00'
    ),
    menuCategories: [
      {
        title: 'Supe Pho & Startere',
        items: [
          {
            name: 'Supă Pho Bo tradițională cu vită (bol mare)',
            priceRon: 42,
            portion: '650 ml',
            description: 'Supă de oase fiartă 12 ore cu anason, scorțișoară și tăiței de orez.',
            isMustOrder: true,
          },
          {
            name: 'Supă Pho Ga cu piept de pui și ghimbir',
            priceRon: 39,
            portion: '650 ml',
          },
          {
            name: 'Pachețele de primăvară Goi Cuon cu creveți',
            priceRon: 28,
            portion: '3 buc.',
            description: 'Rulate în hârtie de orez, cu mentă și sos de arahide.',
          },
        ],
      },
      {
        title: 'Banh Mi & Preparate principale',
        items: [
          {
            name: 'Sandviș Banh Mi cu porc caramelizat și murături asiatice',
            priceRon: 32,
            portion: '280 g',
          },
          {
            name: 'Bun Cha Hanoi (tăiței de orez cu porc la grătar și sos nuoc cham)',
            priceRon: 44,
            portion: '420 g',
          },
        ],
      },
    ],
  },

  'jacks-bistro': {
    lastUpdated: '11 nov 2026',
    weeklyHours: makeDailyHours(
      '10:00 – 23:00',
      '10:00 – 23:30',
      '10:00 – 23:30',
      '10:00 – 22:30'
    ),
    menuCategories: [
      {
        title: 'Burgeri & Coaste',
        items: [
          {
            name: "Jack's Burger cu vită Black Angus, cheddar și dulceață de bacon",
            priceRon: 48,
            portion: '380 g',
            description: 'Chiflă brioche, castraveți murați și cartofi prăjiți.',
            isMustOrder: true,
          },
          {
            name: 'Coaste de porc slow-cooked cu sos BBQ și coleslaw',
            priceRon: 58,
            portion: '500 g',
          },
          {
            name: 'Crispy Chicken Burger cu sos sriracha mayo',
            priceRon: 42,
            portion: '350 g',
          },
        ],
      },
      {
        title: 'Paste & Salate',
        items: [
          {
            name: 'Tagliatelle proaspete cu mușchi de vită și hribi',
            priceRon: 52,
            portion: '350 g',
          },
          {
            name: 'Salată Caesar cu piept de pui la grătar',
            priceRon: 41,
            portion: '320 g',
          },
        ],
      },
    ],
  },

  'biofresh-timisoara': {
    lastUpdated: '12 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '10:00 – 20:00' },
      { day: 'Marți', hours: '10:00 – 20:00' },
      { day: 'Miercuri', hours: '10:00 – 20:00' },
      { day: 'Joi', hours: '10:00 – 20:00' },
      { day: 'Vineri', hours: '10:00 – 20:00' },
      { day: 'Sâmbătă', hours: '11:00 – 18:00' },
      { day: 'Duminică', hours: 'Închis' },
    ],
    menuCategories: [
      {
        title: 'Preparate vegane & vegetariene',
        items: [
          {
            name: 'Burger vegan de năut și sfeclă cu cartofi copți',
            priceRon: 38,
            portion: '360 g',
            description: 'Chiflă integrală, sos de caju și murături de casă.',
            isMustOrder: true,
          },
          {
            name: 'Supă cremă de linte roșie cu lapte de cocos și turmeric',
            priceRon: 24,
            portion: '400 ml',
          },
          {
            name: 'Bol Buddha cu quinoa, avocado, tofu marinat și semințe',
            priceRon: 39,
            portion: '380 g',
          },
        ],
      },
      {
        title: 'Deserturi raw-vegane',
        items: [
          {
            name: 'Tort raw-vegan cu caju și fructe de pădure',
            priceRon: 26,
            portion: '140 g',
            description: 'Fără zahăr adăugat și fără gluten.',
          },
          {
            name: 'Cheesecake raw-vegan cu ciocolată și portocală',
            priceRon: 26,
            portion: '140 g',
          },
        ],
      },
    ],
  },

  'gradina-banateana': {
    lastUpdated: '10 nov 2026',
    weeklyHours: makeDailyHours(
      '11:00 – 23:00',
      '11:00 – 23:30',
      '11:00 – 23:30',
      '11:00 – 22:30'
    ),
    menuCategories: [
      {
        title: 'Grătar & Tradițional',
        items: [
          {
            name: 'Mici bănățeni la grătar (4 buc.) cu muștar și cartofi prăjiți',
            priceRon: 32,
            portion: '360 g',
            isMustOrder: true,
          },
          {
            name: 'Ciorbă de fasole cu ciolan afumat',
            priceRon: 26,
            portion: '400 ml',
          },
          {
            name: 'Ceafă de porc la jar cu murături asortate',
            priceRon: 44,
            portion: '350 g',
          },
        ],
      },
    ],
  },

  'sabres-restaurant': {
    lastUpdated: '09 nov 2026',
    weeklyHours: makeDailyHours(
      '12:00 – 23:00',
      '12:00 – 23:30',
      '12:00 – 23:30',
      '12:00 – 22:30'
    ),
    menuCategories: [
      {
        title: 'Pește & Fructe de mare',
        items: [
          {
            name: 'Doradă întreagă la grătar cu legume mediteraneene',
            priceRon: 68,
            portion: '420 g',
            isMustOrder: true,
          },
          {
            name: 'Midii în sos de vin alb, unt și usturoi',
            priceRon: 56,
            portion: '500 g',
          },
          {
            name: 'Tigaie de calamar și creveți cu ierburi aromatice',
            priceRon: 66,
            portion: '320 g',
          },
        ],
      },
      {
        title: 'Supe & Paste',
        items: [
          {
            name: 'Supă de pește mediteraneană cu crutoane și rouille',
            priceRon: 34,
            portion: '380 ml',
          },
          {
            name: 'Spaghetti nero di seppia cu fructe de mare',
            priceRon: 64,
            portion: '350 g',
          },
        ],
      },
    ],
  },

  'suppa-bar': {
    lastUpdated: '13 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '11:00 – 17:00' },
      { day: 'Marți', hours: '11:00 – 17:00' },
      { day: 'Miercuri', hours: '11:00 – 17:00' },
      { day: 'Joi', hours: '11:00 – 17:00' },
      { day: 'Vineri', hours: '11:00 – 17:00' },
      { day: 'Sâmbătă', hours: 'Închis' },
      { day: 'Duminică', hours: 'Închis' },
    ],
    menuCategories: [
      {
        title: 'Supe zilnice (meniu rotativ)',
        items: [
          {
            name: 'Supă cremă de roșii coapte cu busuioc și mozzarella',
            priceRon: 24,
            portion: '400 ml',
            isMustOrder: true,
          },
          {
            name: 'Supă thailandeză cu lapte de cocos, pui și ghimbir',
            priceRon: 27,
            portion: '400 ml',
          },
          {
            name: 'Supă cremă de linte galbenă cu chimen (vegană)',
            priceRon: 23,
            portion: '400 ml',
          },
          {
            name: 'Focaccia caldă de lângă supă',
            priceRon: 6,
            portion: '90 g',
          },
        ],
      },
    ],
  },

  'restaurant-miorita-unirii': {
    lastUpdated: '05 nov 2026',
    weeklyHours: makeDailyHours(
      '09:00 – 00:00',
      '09:00 – 01:00',
      '09:00 – 01:00',
      '09:00 – 00:00'
    ),
    menuCategories: [
      {
        title: 'Preparate observate pe terasă',
        items: [
          {
            name: 'Platou românesc de terasă (2 pers.)',
            priceRon: 148,
            portion: '750 g',
          },
          {
            name: 'Ciorbă de burtă',
            priceRon: 39,
            portion: '350 ml',
          },
          {
            name: 'Mici la grătar (4 buc.) cu cartofi prăjiți',
            priceRon: 49,
            portion: '320 g',
          },
          {
            name: 'Apă plată 750 ml',
            priceRon: 24,
          },
        ],
      },
    ],
  },

  'bruck-cafe-unirii': {
    lastUpdated: '06 nov 2026',
    weeklyHours: makeDailyHours(
      '09:00 – 00:00',
      '09:00 – 01:00',
      '09:00 – 01:00',
      '09:00 – 00:00'
    ),
    menuCategories: [
      {
        title: 'Cafenea & Brasserie',
        items: [
          {
            name: 'Cappuccino / Flat white pe terasă',
            priceRon: 22,
            portion: '180 ml',
          },
          {
            name: 'Paste cu somon și sos alb',
            priceRon: 69,
            portion: '300 g',
          },
          {
            name: 'Burger Brück cu cartofi prăjiți',
            priceRon: 64,
            portion: '360 g',
          },
        ],
      },
    ],
  },

  'restaurant-lloyd-victoriei': {
    lastUpdated: '04 nov 2026',
    weeklyHours: makeDailyHours(
      '09:00 – 00:00',
      '09:00 – 00:30',
      '09:00 – 00:30',
      '09:00 – 00:00'
    ),
    menuCategories: [
      {
        title: 'Meniu Piața Victoriei',
        items: [
          {
            name: 'Mușchi de vită la grătar cu sos de piper verde',
            priceRon: 118,
            portion: '260 g',
          },
          {
            name: 'Paste carbonara / tagliatelle cu somon',
            priceRon: 64,
            portion: '300 g',
          },
          {
            name: 'Pizza Margherita',
            priceRon: 54,
            portion: '32 cm',
          },
          {
            name: 'Aperol Spritz pe Corso',
            priceRon: 42,
            portion: '250 ml',
          },
        ],
      },
    ],
  },

  // Extras pentru localele suplimentare din seed/venues.ts
  'riyo-wok-sushi': {
    lastUpdated: '11 nov 2026',
    weeklyHours: makeDailyHours(
      '11:30 – 22:30',
      '11:30 – 23:00',
      '12:00 – 23:00',
      '12:00 – 22:30'
    ),
    menuCategories: [
      {
        title: 'Wok & Sushi',
        items: [
          { name: 'Pad Thai cu creveți și arahide', priceRon: 44, portion: '350 g', isMustOrder: true },
          { name: 'Ramen cu porc chashu și ou marinat', priceRon: 46, portion: '550 ml' },
          { name: 'Set Sushi Mix (16 buc.)', priceRon: 64, portion: '320 g' },
        ],
      },
    ],
  },

  'zai-apres-cafe': {
    lastUpdated: '10 nov 2026',
    weeklyHours: makeDailyHours(
      '09:00 – 23:30',
      '09:00 – 01:00',
      '09:00 – 01:00',
      '09:00 – 23:30'
    ),
    menuCategories: [
      {
        title: 'Bistro tirolez & Cafea',
        items: [
          { name: 'Kaiserschmarrn cu dulceață de merișoare', priceRon: 36, portion: '320 g', isMustOrder: true },
          { name: 'Burger Zai cu brânză alpină și cartofi', priceRon: 54, portion: '380 g' },
        ],
      },
    ],
  },

  // ============================================================================
  // TOPDRINK / TIMIȘOARA
  // ============================================================================
  'scart-loc-lejer': {
    lastUpdated: '12 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '12:00 – 23:00' },
      { day: 'Marți', hours: '12:00 – 23:00' },
      { day: 'Miercuri', hours: '12:00 – 23:00' },
      { day: 'Joi', hours: '12:00 – 23:00' },
      { day: 'Vineri', hours: '12:00 – 23:30' },
      { day: 'Sâmbătă', hours: '12:00 – 23:30' },
      { day: 'Duminică', hours: 'Închis (evenimente ocazionale)' },
    ],
    menuCategories: [
      {
        title: 'Beri & Răcoritoare',
        items: [
          {
            name: 'Bere Timișoreana nefiltrată la halbă 0,5 l',
            priceRon: 14,
            portion: '500 ml',
            isMustOrder: true,
          },
          {
            name: 'Bere artizanală locală la sticlă',
            priceRon: 19,
            portion: '330 ml',
          },
          {
            name: 'Socată artizanală sau limonadă cu mentă',
            priceRon: 16,
            portion: '400 ml',
          },
        ],
      },
      {
        title: 'Băuturi calde & Gustări',
        items: [
          {
            name: 'Vin fiert cu scorțișoară și portocală',
            priceRon: 18,
            portion: '250 ml',
          },
          {
            name: 'Zacuscă de casă pe pâine prăjită',
            priceRon: 22,
            portion: '220 g',
          },
        ],
      },
    ],
  },

  'aethernativ-cafe': {
    lastUpdated: '11 nov 2026',
    weeklyHours: makeDailyHours(
      '17:00 – 01:00',
      '17:00 – 02:30',
      '17:00 – 02:30',
      '17:00 – 00:00'
    ),
    menuCategories: [
      {
        title: 'Cocktailuri & Craft Beer',
        items: [
          {
            name: 'Negroni clasic cu portocală deshidratată',
            priceRon: 32,
            portion: '140 ml',
            isMustOrder: true,
          },
          {
            name: 'Bere artizanală timișoreană OneTwo (IPA / Pale Ale)',
            priceRon: 20,
            portion: '330 ml',
          },
          {
            name: 'Gin tonic botanic cu rozmarin și grapefruit',
            priceRon: 30,
            portion: '250 ml',
          },
        ],
      },
      {
        title: 'Fără alcool & Vinuri',
        items: [
          {
            name: 'Club-Mate rece',
            priceRon: 18,
            portion: '500 ml',
          },
          {
            name: 'Vin roșu / alb de Banat la pahar',
            priceRon: 22,
            portion: '150 ml',
          },
        ],
      },
    ],
  },

  'the-80s-pub': {
    lastUpdated: '13 nov 2026',
    weeklyHours: [
      { day: 'Luni', hours: '09:00 – 01:30' },
      { day: 'Marți', hours: '09:00 – 01:30' },
      { day: 'Miercuri', hours: '09:00 – 01:30' },
      { day: 'Joi', hours: '09:00 – 01:30' },
      { day: 'Vineri', hours: '10:00 – 04:30' },
      { day: 'Sâmbătă', hours: '10:00 – 04:30' },
      { day: 'Duminică', hours: '10:00 – 01:30' },
    ],
    menuCategories: [
      {
        title: 'Bar & Weekend Party',
        items: [
          {
            name: 'Bere la draft 0,5 l',
            priceRon: 15,
            portion: '500 ml',
            isMustOrder: true,
          },
          {
            name: 'Cuba Libre / Gin Tonic',
            priceRon: 28,
            portion: '250 ml',
          },
          {
            name: 'Shot Jägermeister / Tequila',
            priceRon: 16,
            portion: '40 ml',
          },
        ],
      },
    ],
  },

  'darc-pe-mal': {
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
            name: 'Bere rece la halbă pe ponton',
            priceRon: 19,
            portion: '500 ml',
          },
          {
            name: 'Aperol Spritz pe ponton',
            priceRon: 34,
            portion: '250 ml',
          },
          {
            name: 'Limonadă cu mentă și ghimbir',
            priceRon: 21,
            portion: '400 ml',
          },
        ],
      },
    ],
  },

  'beraria-700': {
    lastUpdated: '12 nov 2026',
    weeklyHours: makeDailyHours(
      '11:00 – 00:00',
      '11:00 – 01:00',
      '11:00 – 01:00',
      '11:00 – 00:00'
    ),
    menuCategories: [
      {
        title: 'Bere la halbă',
        items: [
          {
            name: 'Bere Timișoreana proaspătă la halbă 0,5 l',
            priceRon: 14,
            portion: '500 ml',
            isMustOrder: true,
          },
          {
            name: 'Bere nefiltrată la halbă 0,5 l',
            priceRon: 16,
            portion: '500 ml',
          },
        ],
      },
      {
        title: 'Mâncare de berărie (disponibilă și cu livrare)',
        items: [
          {
            name: 'Ciolan de porc rumenit cu hrean și varză călită',
            priceRon: 54,
            portion: '700 g',
            isMustOrder: true,
          },
          {
            name: 'Covrigi calzi de berărie cu sare grunjoasă (2 buc.)',
            priceRon: 14,
            portion: '220 g',
          },
          {
            name: 'Cârnați picanți cu muștar și cartofi la cuptor',
            priceRon: 42,
            portion: '380 g',
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
  const extra = VENUE_EXTRAS[restaurant.id];
  if (extra?.weeklyHours) {
    return extra.weeklyHours;
  }
  const fallback = restaurant.hours.replace(/^[^:]+:\s*/, '');
  return makeDailyHours(fallback, fallback, fallback, fallback);
}

export function getVenueMenu(restaurant: Restaurant): MenuCategory[] {
  if (restaurant.menuCategories && restaurant.menuCategories.length > 0) {
    return restaurant.menuCategories;
  }
  const extra = VENUE_EXTRAS[restaurant.id];
  if (extra?.menuCategories) {
    return extra.menuCategories;
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
  return days[new Date().getDay()] ?? 'Luni';
}

interface VenueProfileExtras {
  warnings?: VenueWarnings;
  facilities?: VenueFacilities;
}

const VENUE_WARNINGS_FACILITIES: Record<string, VenueProfileExtras> = {
  'restaurant-nora': {
    facilities: {
      disabilityFriendly: 'Intrare la nivel cu trotuarul, acces facil pe terasă',
      hasOutlets: false,
      otherFacilities: ['Plată cu cardul', 'Terasă mare de vară', 'Scaune pentru copii', 'La pachet'],
    },
  },
  'la-focacceria': {
    warnings: {
      brightLights: 'Iluminat puternic în zona tejghelei de servire.',
    },
    facilities: {
      disabilityFriendly: 'Acces pietonal din Piața Libertății',
      hasOutlets: false,
      otherFacilities: ['Servire rapidă la pachet', 'Plată cu cardul'],
    },
  },
  'neata-omelette-bistro': {
    facilities: {
      disabilityFriendly: true,
      hasOutlets: true,
      otherFacilities: ['Wi-Fi gratuit', 'Terasă pe pietonală', 'Pet-friendly pe terasă'],
    },
  },
  'vinto-gastro-wine-bar': {
    facilities: {
      disabilityFriendly: 'Intrare la nivel și toaletă adaptată',
      hasOutlets: true,
      otherFacilities: ['Wi-Fi rapid', 'Somelier / selecție vinuri', 'Terasă încălzită', 'Rezervări recomandate'],
    },
  },
  'casa-bunicii': {
    facilities: {
      disabilityFriendly: 'Grădină accesibilă la parter',
      hasOutlets: false,
      otherFacilities: ['Curte mare și loc de joacă', 'Scaune pentru copii', 'Parcare în zonă'],
    },
  },
  'little-hanoi': {
    facilities: {
      disabilityFriendly: true,
      hasOutlets: false,
      otherFacilities: ['Servire rapidă', 'Opțiuni fără gluten (tăiței de orez)', 'Plată cu cardul'],
    },
  },
  'jacks-bistro': {
    facilities: {
      disabilityFriendly: true,
      hasOutlets: true,
      otherFacilities: ['Wi-Fi gratuit', 'Terasă pe pietonala Vasile Alecsandri', 'Plată cu cardul'],
    },
  },
  'biofresh-timisoara': {
    facilities: {
      disabilityFriendly: true,
      hasOutlets: true,
      otherFacilities: ['100% vegetarian / vegan', 'Opțiuni fără zahăr și fără gluten', 'Wi-Fi gratuit'],
    },
  },
  'gradina-banateana': {
    facilities: {
      disabilityFriendly: 'Terasă la nivel pe malul Begăi',
      hasOutlets: false,
      otherFacilities: ['Terasă umbrită', 'Pet-friendly pe terasă', 'Plată cu cardul'],
    },
  },
  'sabres-restaurant': {
    facilities: {
      disabilityFriendly: true,
      hasOutlets: false,
      otherFacilities: ['Terasă în curte interioară', 'Rezervări pentru cină', 'Plată cu cardul'],
    },
  },
  'suppa-bar': {
    facilities: {
      disabilityFriendly: true,
      hasOutlets: true,
      otherFacilities: ['Wi-Fi gratuit', 'Recipiente biodegradabile', 'Opțiuni vegane zilnic'],
    },
  },
  'restaurant-miorita-unirii': {
    warnings: {
      veryNoisy: 'Zgomot intens de terasă în serile de weekend din Piața Unirii.',
    },
    facilities: {
      disabilityFriendly: true,
      hasOutlets: false,
      otherFacilities: ['Terasă mare în Piața Unirii', 'Plată cu cardul'],
    },
  },
  'bruck-cafe-unirii': {
    facilities: {
      disabilityFriendly: true,
      hasOutlets: true,
      otherFacilities: ['Wi-Fi rapid', 'Terasă în Piața Unirii'],
    },
  },
  'restaurant-lloyd-victoriei': {
    warnings: {
      veryNoisy: 'Zonă pietonală foarte circulată pe Corso.',
    },
    facilities: {
      disabilityFriendly: true,
      hasOutlets: false,
      otherFacilities: ['Terasă în Piața Victoriei', 'Plată cu cardul'],
    },
  },
  'scart-loc-lejer': {
    facilities: {
      disabilityFriendly: 'Grădină accesibilă la parter (subsolul muzeului are trepte)',
      hasOutlets: true,
      otherFacilities: ['Grădină cu hamace', 'Pet-friendly', 'Muzeul Consumatorului Comunist'],
    },
  },
  'aethernativ-cafe': {
    facilities: {
      disabilityFriendly: false,
      hasOutlets: true,
      otherFacilities: ['Curte interioară retrasă', 'DJ seturi', 'Plată cu cardul'],
    },
  },
  'the-80s-pub': {
    warnings: {
      veryNoisy: 'Volum ridicat în serile de vineri și sâmbătă.',
    },
    facilities: {
      disabilityFriendly: true,
      hasOutlets: false,
      otherFacilities: ['Deschis până la 04:30 în weekend', 'Plată cu cardul'],
    },
  },
  'darc-pe-mal': {
    facilities: {
      disabilityFriendly: 'Acces direct de pe faleza Begăi',
      hasOutlets: true,
      otherFacilities: ['Ponton pe Bega', 'Parcare biciclete', 'Pet-friendly'],
    },
  },
  'beraria-700': {
    warnings: {
      veryNoisy: 'Agitație și ecou în sala mare la orele de vârf.',
    },
    facilities: {
      disabilityFriendly: true,
      hasOutlets: true,
      otherFacilities: ['Terasă mare', 'Transmisiuni sportive', 'Plată cu cardul'],
    },
  },
};

export function getVenueWarnings(restaurant: Restaurant): VenueWarnings {
  const staticWarnings =
    restaurant.warnings ?? VENUE_WARNINGS_FACILITIES[restaurant.id]?.warnings ?? {};

  const safetyRatings = restaurant.reviews
    .map((r) => r.safetyScore)
    .filter((s): s is number => typeof s === 'number');
  const avgSafety =
    safetyRatings.length > 0
      ? safetyRatings.reduce((a, b) => a + b, 0) / safetyRatings.length
      : null;

  const noisyVotes = restaurant.reviews.filter(
    (r) => r.noiseLevel === 'zgomotos'
  ).length;

  return {
    unsafeFeeling:
      staticWarnings.unsafeFeeling ??
      (avgSafety !== null && avgSafety <= 2.5
        ? `Unii vizitatori nu s-au simțit în siguranță (medie ${avgSafety.toFixed(1).replace('.', ',')}/5).`
        : undefined),
    veryNoisy:
      staticWarnings.veryNoisy ??
      (noisyVotes > 0
        ? `Semnalat ca foarte zgomotos de ${noisyVotes} ${noisyVotes === 1 ? 'vizitator' : 'vizitatori'}.`
        : undefined),
    brightLights: staticWarnings.brightLights,
  };
}

/** Facilitățile statice (fără backend). Cu backend, pagina folosește restaurant.features (răspunsuri + declarații). */
export function getVenueFacilities(restaurant: Restaurant): VenueFacilities {
  return (
    restaurant.facilities ??
    VENUE_WARNINGS_FACILITIES[restaurant.id]?.facilities ?? {
      otherFacilities: ['Plată cu cardul'],
    }
  );
}
