import {
  Neighborhood,
  Restaurant,
  TopReviewer,
  TouristZone,
  WeekendEvent,
  getTrapTier,
} from '../types';

export const NEIGHBORHOODS: Neighborhood[] = [
  'Cetate / Piața Unirii',
  'Piața Victoriei',
  'Piața Libertății',
  'Bastion',
  'Iosefin',
  'Fabric',
  'Complexul Studențesc',
  'Elisabetin',
];

export const TOURIST_ZONES: TouristZone[] = [
  {
    id: 'piata-unirii',
    name: 'Piața Unirii (Domul & Palatul Baroc)',
    shortName: 'Piața Unirii',
    description:
      'Epicentrul turistic al Timișoarei. Chiriile comerciale mari și traficul pietonal de weekend generează cel mai mare decalaj între nota turiștilor și cea a localnicilor.',
    center: { lat: 45.758, lng: 21.229 },
    radiusM: 300,
  },
  {
    id: 'piata-victoriei',
    name: 'Piața Victoriei (Corso & Opera)',
    shortName: 'Piața Victoriei',
    description:
      'Promenada principală între Operă și Catedrala Mitropolitană. Terasele cu meniuri în 4 limbi practică adesea adaosuri de +50–70% față de media categoriei.',
    center: { lat: 45.7537, lng: 21.2251 },
    radiusM: 300,
  },
  {
    id: 'piata-libertatii',
    name: 'Piața Libertății (Primăria Veche)',
    shortName: 'Piața Libertății',
    description:
      'Nodul pietonal dintre Victoriei și Unirii. Zonă cu trafic intens de grupuri organizate și restaurante cu rulaj rapid (single-visit >75%).',
    center: { lat: 45.7557, lng: 21.2273 },
    radiusM: 300,
  },
  {
    id: 'bastion',
    name: 'Bastionul Maria Theresia',
    shortName: 'Bastion',
    description:
      'Fortificația istorică habsburgică. Găzduiește atât localuri de cartier autentice, cât și terase orientate spre vizitatori ocazionali.',
    center: { lat: 45.7569, lng: 21.2336 },
    radiusM: 300,
  },
];

export const INITIAL_RESTAURANTS: Restaurant[] = [
  // ============================================================================
  // TOPUL ONEST — FOOD VENUES (Real Timișoara restaurants)
  // ============================================================================
  {
    id: 'restaurant-nora',
    slug: 'restaurant-nora',
    name: 'Restaurant Nora',
    vertical: 'food',
    neighborhood: 'Iosefin',
    shortNeighborhood: 'Dâmbovița / Iosefin',
    cuisine: 'Românesc',
    shortCategory: 'Românesc & Sârbesc',
    categories: ['romanesc'],
    priceTier: '$',
    avgMealPriceRon: 48,
    categoryAvgPriceRon: 54,
    priceRangeLabel: '35–65 lei',
    openUntilLabel: 'Deschis până la 23:00.',
    photoUrl:
      'https://restaurantnora.ro/wp-content/uploads/2024/04/catering-nora-timisoara-16.webp',
    editorialHeadline:
      'Instituție din Dâmbovița–Iosefin pentru plescaviță sârbească, ciorbă de burtă și porții mari la preț onest.',
    editorialWriteup: [
      'Pe Bulevardul Dâmbovița nr. 40, departe de terasele scumpe din centru, Nora rămâne reperul timișorenilor pentru mâncare gătită românească și grătar sârbesc.',
      'Porțiile sunt generoase, meniul zilei ține ritmul cartierului, iar livrările funcționează atât prin flota proprie (Nora Delivery), cât și prin Wolt.',
    ],
    whatToOrder: [
      {
        name: 'Ciorbă de burtă dreasă cu smântână',
        priceRon: 29,
        isMustOrder: true,
      },
      {
        name: 'Plescaviță sârbească cu kajmak și cartofi',
        priceRon: 44,
        isMustOrder: true,
      },
    ],
    occasionTags: ['Localnici', 'Porții mari', 'Fără capcane'],
    foodQualityScore: 9.1,
    localsScore: 9.4,
    touristsScore: 8.2,
    googleRawRating: 4.7,
    touristTrapIndex: 9,
    trapTier: 'local-staple',
    trapReasons: [
      'Prețuri cu 11% sub media restaurantelor românești din Timișoara (35–65 lei).',
      'Localnicii îi dau 9,4; turiștii 8,2.',
      'La peste 2 km de Piața Unirii, clientelă recurentă din Iosefin și Dâmbovița.',
    ],
    trapBreakdown: {
      touristVsLocalGap: -1.2,
      touristZoneProximityM: 2150,
      priceVsCategoryPct: -11,
      foreignLangReviewsPct: 6,
      singleVisitPct: 11,
    },
    aspectScores: {
      food: 9.4,
      service: 9.0,
      value: 9.4,
      atmosphere: 8.4,
    },
    isSponsored: false,
    isPartner: true,
    coordinates: { lat: 45.7418, lng: 21.2046 },
    address: 'Bd. Dâmbovița nr. 40, Timișoara',
    hours: 'Lu–Du: 11:00 – 23:00',
    openNow: true,
    phone: '+40 256 499 101',
    delivery: {
      available: true,
      platforms: ['Wolt', 'Livrare proprie (Nora Delivery)'],
      ownDelivery: true,
      minimumOrderRon: 45,
      estimatedTime: '35–50 min',
      note: 'Livrare proprie în toată Timișoara prin nora-delivery.ro și prin Wolt.',
    },
    monthlyRank: 1,
    monthlyScore: 9.1,
    monthlyStatusLabel: '= ca luna trecută',
    monthlyRankChange: 0,
    reviewCounts: {
      locals: 112,
      tourists: 26,
      influencers: 4,
    },
    kitchenStory: {
      author: 'Bucătăria Nora',
      date: '10 noiembrie',
      title: 'De ce ținem aceleași rețete sârbești de peste 20 de ani',
      body: 'Tocătura pentru plescaviță și mici o pregătim zilnic în casă, din carne proaspătă de vită și porc, iar kajmakul îl aducem de la producători din Banatul sârbesc.',
      photoUrl:
        'https://restaurantnora.ro/wp-content/uploads/2024/03/Sarmalute.webp',
    },
    team: [
      {
        name: 'Ioana',
        role: 'ospătar',
        positiveMentions: 23,
        isEmployeeOfMonth: true,
        monthLabel: 'angajata lunii',
      },
      {
        name: 'Dragan',
        role: 'maestru grătar',
        positiveMentions: 19,
      },
      {
        name: 'Mihai',
        role: 'bucătar',
        positiveMentions: 12,
      },
    ],
    reviews: [
      {
        id: 'rev-nora-1',
        authorName: 'Andreea M.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Iosefin',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 9.0,
        trapEstimatePct: 5,
        date: 'Acum 3 zile',
        text: 'Venim aici în familie de zece ani. Plescavița umplută și ciorba de burtă sunt neschimbate, porțiile mari și nota întotdeauna corectă.',
        language: 'RO',
        praisedEmployee: 'Ioana',
        helpfulCount: 14,
      },
      {
        id: 'rev-nora-2',
        authorName: 'Radu B.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Fabric',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 8.5,
        trapEstimatePct: 8,
        date: 'Acum 6 zile',
        text: 'Am comandat și prin Nora Delivery, și am mâncat la terasă. La prânz e aglomerat pentru meniul zilei, dar servirea merge rapid.',
        language: 'RO',
        ownerReplyAuthor: 'Echipa Nora',
        ownerReply: 'Mulțumim! Livrările de prânz pleacă din oră în oră spre toate cartierele.',
      },
      {
        id: 'rev-nora-3',
        authorName: 'Markus K.',
        authorRole: 'tourist',
        weightMultiplier: 1.0,
        isVerifiedVisit: false,
        foodScore: 8.2,
        trapEstimatePct: 12,
        date: 'Acum o săptămână',
        text: 'Authentic Serbian grill and Romanian soups outside the tourist center. Huge portions for a very fair price.',
        language: 'EN',
      },
      {
        id: 'rev-nora-4',
        authorName: 'Tm Food Vlog',
        authorRole: 'influencer',
        followerCountText: '24k',
        weightMultiplier: 0.2,
        isVerifiedVisit: true,
        isPaidCollab: true,
        foodScore: 9.5,
        trapEstimatePct: 5,
        date: 'Acum 2 săptămâni',
        text: 'Colaborare plătită declarată: am filmat grătarul pe cărbuni de la Nora pe Bd. Dâmbovița. Scorul nu e influențat de parteneriat.',
        language: 'RO',
      },
    ],
  },

  {
    id: 'la-focacceria',
    slug: 'la-focacceria',
    name: 'La Focacceria',
    vertical: 'food',
    neighborhood: 'Piața Libertății',
    shortNeighborhood: 'Cetate',
    cuisine: 'Pizza',
    shortCategory: 'Focaccerie & Pizza',
    categories: ['pizza', 'street-food'],
    priceTier: '$',
    avgMealPriceRon: 38,
    categoryAvgPriceRon: 48,
    priceRangeLabel: '28–48 lei',
    openUntilLabel: 'Deschis până la 22:00.',
    photoUrl:
      'https://img.meniu.menu/storage/media/company_gallery/26747429/conversions/contribution_gallery.jpg',
    editorialHeadline:
      'Focaccia artizanală cu fermentare lentă și felii generoase de pizza romană chiar în Piața Libertății.',
    editorialWriteup: [
      'Deși este în inima Cetății, la Piața Libertății nr. 4, La Focacceria păstrează prețuri cinstite și aluat aerat după rețetă italiană, cu ingrediente aduse direct de la producători.',
    ],
    whatToOrder: [
      {
        name: 'Focaccia cu mortadella, stracciatella și fistic',
        priceRon: 36,
        isMustOrder: true,
      },
      {
        name: 'Pizza al taglio cu prosciutto cotto și ciuperci',
        priceRon: 28,
      },
    ],
    occasionTags: ['Aluat maia', 'Sub 50 lei', 'Livrare rapidă'],
    foodQualityScore: 8.8,
    localsScore: 9.0,
    touristsScore: 8.5,
    googleRawRating: 4.8,
    touristTrapIndex: 11,
    trapTier: 'local-staple',
    trapReasons: [
      'Prețuri cu 21% sub media pizzeriilor din centru.',
      'Localnicii îi dau 9,0; turiștii 8,5.',
      'Clientelă fidelă din centru și clădirile de birouri.',
    ],
    trapBreakdown: {
      touristVsLocalGap: -0.5,
      touristZoneProximityM: 85,
      priceVsCategoryPct: -21,
      foreignLangReviewsPct: 12,
      singleVisitPct: 14,
    },
    aspectScores: {
      food: 9.1,
      service: 8.7,
      value: 9.2,
      atmosphere: 8.5,
    },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7556, lng: 21.2271 },
    address: 'Piața Libertății nr. 4, Cetate, Timișoara',
    hours: 'Lu–Du: 10:00 – 22:00',
    openNow: true,
    phone: '+40 770 924 115',
    delivery: {
      available: true,
      platforms: ['Wolt', 'Glovo'],
      minimumOrderRon: 35,
      estimatedTime: '25–40 min',
      note: 'Se livrează caldă prin Wolt și Glovo sau la pachet din Piața Libertății.',
    },
    monthlyRank: 2,
    monthlyScore: 8.9,
    monthlyStatusLabel: '▲ 3 locuri',
    monthlyRankChange: 3,
    reviewCounts: { locals: 88, tourists: 18, influencers: 2 },
    team: [
      {
        name: 'Elena',
        role: 'brutar & pizzaiolo',
        positiveMentions: 17,
        isEmployeeOfMonth: true,
        monthLabel: 'angajata lunii',
      },
      {
        name: 'Bogdan',
        role: 'vânzător tejghea',
        positiveMentions: 11,
      },
    ],
    reviews: [
      {
        id: 'rev-focaccia-1',
        authorName: 'Andrei Ș.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Cetate',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 9.0,
        trapEstimatePct: 6,
        date: 'Acum 2 zile',
        text: 'Aluat crocant afară, pufos înăuntru. Focaccia cu mortadella și fistic merită fiecare leu.',
        language: 'RO',
        praisedEmployee: 'Elena',
        helpfulCount: 11,
      },
    ],
  },

  {
    id: 'neata-omelette-bistro',
    slug: 'neata-omelette-bistro',
    name: 'Neața Omelette Bistro',
    vertical: 'food',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Cetate',
    cuisine: 'Bistro',
    shortCategory: 'Brunch & Bistro',
    categories: ['bistro'],
    priceTier: '$',
    avgMealPriceRon: 42,
    categoryAvgPriceRon: 52,
    priceRangeLabel: '32–52 lei',
    openUntilLabel: 'Deschis până la 16:00.',
    photoUrl:
      'https://zilesinopti.ro/wp-content/uploads/2022/08/mic-dejun-Neata-Omlette-Bistro-Timisoara.jpg',
    editorialHeadline:
      'Cel mai apreciat loc de mic dejun și brunch din Timișoara, pe pietonala Vasile Alecsandri.',
    editorialWriteup: [
      'Omlete pufoase, ouă Benedict, shakshuka și bagels pregătite pe loc de dimineață până la 16:00, cu livrare rapidă prin Glovo și Wolt.',
    ],
    whatToOrder: [
      {
        name: 'Ouă Benedict cu somon afumat și sos Hollandaise',
        priceRon: 44,
        isMustOrder: true,
      },
      {
        name: 'Shakshuka cu brânză feta și pâine cu maia',
        priceRon: 39,
      },
    ],
    occasionTags: ['Brunch', 'Dimineața', 'Sub 50 lei'],
    foodQualityScore: 8.7,
    localsScore: 8.9,
    touristsScore: 8.3,
    googleRawRating: 4.8,
    touristTrapIndex: 10,
    trapTier: 'local-staple',
    trapReasons: [
      'Prețuri cu 19% sub media brunch-urilor din centru.',
      'Localnicii revin constant în weekend și în pauzele de dimineață.',
    ],
    trapBreakdown: {
      touristVsLocalGap: -0.6,
      touristZoneProximityM: 120,
      priceVsCategoryPct: -19,
      foreignLangReviewsPct: 14,
      singleVisitPct: 15,
    },
    aspectScores: {
      food: 9.0,
      service: 8.6,
      value: 8.9,
      atmosphere: 8.5,
    },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7568, lng: 21.2285 },
    address: 'Str. Vasile Alecsandri nr. 2, Cetate, Timișoara',
    hours: 'Lu–Du: 08:30 – 16:00',
    openNow: true,
    phone: '+40 723 689 120',
    delivery: {
      available: true,
      platforms: ['Glovo', 'Wolt'],
      minimumOrderRon: 35,
      estimatedTime: '25–35 min',
      note: 'Livrare de mic dejun și brunch până la ora 15:30.',
    },
    reviewCounts: { locals: 76, tourists: 14, influencers: 2 },
    reviews: [
      {
        id: 'rev-neata-1',
        authorName: 'Diana P.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Elisabetin',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 9.0,
        trapEstimatePct: 5,
        date: 'Acum 4 zile',
        text: 'Cel mai constant brunch din centru. În weekend se așteaptă 10 minute la masă, dar comandăm des și pe Wolt.',
        language: 'RO',
        helpfulCount: 9,
      },
    ],
  },

  // MODEST SPONSORED SLOT (Rule #3: Nu schimbă scorul și nici locul în top)
  {
    id: 'vinto-gastro-wine-bar',
    slug: 'vinto-gastro-wine-bar',
    name: 'Vinto Gastro Wine Bar',
    vertical: 'food',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Cetate',
    cuisine: 'Bistro',
    shortCategory: 'Gastro Wine Bar',
    categories: ['bistro'],
    priceTier: '$$$',
    avgMealPriceRon: 82,
    categoryAvgPriceRon: 64,
    priceRangeLabel: '60–110 lei',
    openUntilLabel: 'Deschis până la 23:00.',
    photoUrl:
      'https://zilesinopti.ro/wp-content/uploads/2017/04/248530404_1437094670004583_3605134225583201781_n-1024x640.jpg',
    editorialHeadline:
      'Gastro wine bar pe Str. Mercy nr. 4 cu bucătărie creativă și selecție amplă de vinuri.',
    editorialWriteup: [
      'Vinto Gastro Wine Bar este partener plătit pentru vizibilitate separată. Conform regulii de bază, sponsorizarea nu modifică scorul de 7,4 și nici locul în clasamentul onest.',
    ],
    whatToOrder: [
      {
        name: 'Piept de rață maturat cu piure de țelină și sos de vin',
        priceRon: 78,
        isMustOrder: true,
      },
      {
        name: 'Risotto cu hribi și trufe negre',
        priceRon: 64,
      },
    ],
    occasionTags: ['Vinuri', 'Centru', 'Sponsorizat'],
    foodQualityScore: 7.4,
    localsScore: 7.2,
    touristsScore: 7.8,
    googleRawRating: 4.6,
    touristTrapIndex: 32,
    trapTier: 'mixed-fair',
    trapReasons: [
      'Preț +28% față de media bistrourilor de zi cu zi (60–110 lei).',
      'Localnicii îi dau 7,2; turiștii 7,8.',
    ],
    trapBreakdown: {
      touristVsLocalGap: 0.6,
      touristZoneProximityM: 140,
      priceVsCategoryPct: 28,
      foreignLangReviewsPct: 32,
      singleVisitPct: 40,
    },
    aspectScores: {
      food: 7.8,
      service: 7.7,
      value: 6.4,
      atmosphere: 8.5,
    },
    isSponsored: true,
    sponsoredNote: 'Sponsorizat. Nu schimbă scorul și nici locul în top.',
    isPartner: true,
    coordinates: { lat: 45.7567, lng: 21.2288 },
    address: 'Str. Florimund Mercy nr. 4, Cetate, Timișoara',
    hours: 'Ma–Du: 12:00 – 23:00',
    openNow: true,
    phone: '+40 755 084 686',
    delivery: {
      available: true,
      platforms: ['Wolt'],
      minimumOrderRon: 60,
      estimatedTime: '35–50 min',
      note: 'Selecția Vinto și preparate principale disponibile prin Wolt (Vinto Shop) sau cu ridicare personală.',
    },
    reviewCounts: { locals: 41, tourists: 32, influencers: 3 },
    reviews: [
      {
        id: 'rev-vinto-1',
        authorName: 'Mihaela S.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Cetate',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 7.2,
        trapEstimatePct: 30,
        date: 'Acum 5 zile',
        text: 'Vinuri excelente și prezentare atentă, potrivit pentru o cină specială, chiar dacă prețurile sunt peste media de cartier.',
        language: 'RO',
      },
    ],
  },

  {
    id: 'casa-bunicii',
    slug: 'casa-bunicii',
    name: 'Casa Bunicii',
    vertical: 'food',
    neighborhood: 'Elisabetin',
    shortNeighborhood: 'Elisabetin',
    cuisine: 'Românesc',
    shortCategory: 'Tradițional Bănățean',
    categories: ['romanesc'],
    priceTier: '$$',
    avgMealPriceRon: 52,
    categoryAvgPriceRon: 54,
    priceRangeLabel: '38–68 lei',
    openUntilLabel: 'Deschis până la 22:30.',
    photoUrl:
      'https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI0NDIzLCJwdXIiOiJibG9iX2lkIn19--34e75a9e59fb8a2efd4f1cea65daa2f8c907d416/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/casa%20bunicii%20interior5.jpg',
    editorialHeadline:
      'Bucătărie tradițională bănățeană: supă cu tăiței de casă, șnițel crocant și gomboți cu prune.',
    editorialWriteup: [
      'Unul dintre cele mai cunoscute localuri bănățene din Timișoara (locația Garden de pe Str. Mareșal Alexandru Averescu nr. 1B), cu meniu zilnic și livrare atât prin Wolt, cât și direct prin site.',
    ],
    whatToOrder: [
      {
        name: 'Gomboți bănățeni cu prune și pesmet rumenit în unt',
        priceRon: 28,
        isMustOrder: true,
      },
      {
        name: 'Șnițelul Bunicii din cotlet de porc cu salată de cartofi',
        priceRon: 46,
        isMustOrder: true,
      },
    ],
    occasionTags: ['Cu familia', 'Specific bănățean', 'Livrare proprie'],
    foodQualityScore: 8.5,
    localsScore: 8.6,
    touristsScore: 8.1,
    googleRawRating: 4.6,
    touristTrapIndex: 11,
    trapTier: 'local-staple',
    trapReasons: [
      'Prețuri aliniate la media restaurantelor românești (38–68 lei).',
      'Localnicii îl preferă pentru prânzuri în familie și gomboți cu prune.',
    ],
    trapBreakdown: {
      touristVsLocalGap: -0.5,
      touristZoneProximityM: 1850,
      priceVsCategoryPct: -4,
      foreignLangReviewsPct: 8,
      singleVisitPct: 14,
    },
    aspectScores: {
      food: 8.7,
      service: 8.5,
      value: 8.6,
      atmosphere: 8.6,
    },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7367, lng: 21.2335 },
    address: 'Str. Mareșal Alexandru Averescu nr. 1B, Elisabetin, Timișoara',
    hours: 'Lu–Du: 11:30 – 22:30',
    openNow: true,
    phone: '+40 356 100 500',
    delivery: {
      available: true,
      platforms: ['Wolt', 'Livrare proprie'],
      ownDelivery: true,
      minimumOrderRon: 50,
      estimatedTime: '35–50 min',
      note: 'Comenzi directe pe casa-bunicii.ro și livrare prin Wolt.',
    },
    reviewCounts: { locals: 64, tourists: 12, influencers: 1 },
    reviews: [
      {
        id: 'rev-bunicii-1',
        authorName: 'Cristian V.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Elisabetin',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 8.6,
        trapEstimatePct: 6,
        date: 'Acum 3 zile',
        text: 'Supa de găină și gomboții cu prune sunt exact cum trebuie. Comandăm des și acasă când avem musafiri.',
        language: 'RO',
      },
    ],
  },

  {
    id: 'little-hanoi',
    slug: 'little-hanoi',
    name: 'Little Hanoi',
    vertical: 'food',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Mărășești',
    cuisine: 'Asiatic',
    shortCategory: 'Vietnamez',
    categories: ['asiatic'],
    priceTier: '$',
    avgMealPriceRon: 41,
    categoryAvgPriceRon: 50,
    priceRangeLabel: '30–50 lei',
    openUntilLabel: 'Deschis până la 22:00.',
    photoUrl:
      'https://cdn.prod.website-files.com/63f778c6a6ba81aed737cc77/63f830e9e09698f30e6e96af_Little%20Hanoi%20-%20059.webp',
    editorialHeadline:
      'Supă Pho fiartă cu condimente vietnameze, pachețele proaspete Goi Cuon și Banh Mi pe Str. Mărășești.',
    editorialWriteup: [
      'Bistro vietnamez autentic la doi pași de Piața Victoriei, preferat de timișoreni pentru bolurile mari de Pho Bo și pachețelele de primăvară rulate pe loc.',
    ],
    whatToOrder: [
      {
        name: 'Supă Pho Bo tradițională cu vită (bol mare)',
        priceRon: 42,
        isMustOrder: true,
      },
      {
        name: 'Pachețele de primăvară Goi Cuon cu creveți',
        priceRon: 28,
      },
    ],
    occasionTags: ['Sub 50 lei', 'Vietnamez', 'Livrare rapidă'],
    foodQualityScore: 8.4,
    localsScore: 8.6,
    touristsScore: 7.9,
    googleRawRating: 4.7,
    touristTrapIndex: 12,
    trapTier: 'local-staple',
    trapReasons: [
      'Prețuri cu 18% sub media restaurantelor asiatice din oraș.',
      'Foarte apreciat la prânz și pe aplicațiile de livrare.',
    ],
    trapBreakdown: {
      touristVsLocalGap: -0.7,
      touristZoneProximityM: 210,
      priceVsCategoryPct: -18,
      foreignLangReviewsPct: 14,
      singleVisitPct: 16,
    },
    aspectScores: {
      food: 8.8,
      service: 8.3,
      value: 9.0,
      atmosphere: 7.9,
    },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7548, lng: 21.2264 },
    address: 'Str. Mărășești nr. 9, Cetate, Timișoara',
    hours: 'Lu–Du: 11:30 – 22:00',
    openNow: true,
    phone: '+40 771 428 890',
    delivery: {
      available: true,
      platforms: ['Glovo', 'Wolt', 'Bolt Food'],
      minimumOrderRon: 35,
      estimatedTime: '25–40 min',
      note: 'Supa Pho se livrează cu zeama separată ca tăițeii de orez să rămână proaspeți.',
    },
    reviewCounts: { locals: 58, tourists: 11, influencers: 1 },
    reviews: [
      {
        id: 'rev-hanoi-1',
        authorName: 'Vlad I.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Cetate',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 8.6,
        trapEstimatePct: 7,
        date: 'Acum 2 zile',
        text: 'Cel mai bun Pho Bo din oraș și ajunge fierbinte și pe Glovo, ambalat separat.',
        language: 'RO',
      },
    ],
  },

  // ============================================================================
  // ADDITIONAL MONTHLY LEADERBOARD & CITY VENUES
  // ============================================================================
  {
    id: 'jacks-bistro',
    slug: 'jacks-bistro',
    name: "Jack's Bistro",
    vertical: 'food',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Cetate',
    cuisine: 'Burger',
    shortCategory: 'Burger & Bistro',
    categories: ['burger', 'bistro'],
    priceTier: '$$',
    avgMealPriceRon: 49,
    categoryAvgPriceRon: 54,
    priceRangeLabel: '40–65 lei',
    openUntilLabel: 'Deschis până la 23:00.',
    photoUrl:
      'https://zilesinopti.ro/wp-content/uploads/2022/01/341103464_246598061177174_3163952283878690225_n-1024x424.jpg',
    editorialHeadline:
      'Burgeri din vită Black Angus, coaste slow-cooked și mic dejun pe Str. Vasile Alecsandri.',
    editorialWriteup: ['Loc constant în preferințele timișorenilor, atât în centru cât și pe livrare.'],
    whatToOrder: [
      {
        name: "Jack's Burger cu vită Black Angus, cheddar și dulceață de bacon",
        priceRon: 48,
        isMustOrder: true,
      },
      {
        name: 'Coaste de porc slow-cooked cu sos BBQ',
        priceRon: 58,
      },
    ],
    occasionTags: ['Sub 50 lei', 'Burgeri', 'Livrare'],
    foodQualityScore: 8.3,
    localsScore: 8.4,
    touristsScore: 8.0,
    googleRawRating: 4.6,
    touristTrapIndex: 14,
    trapTier: 'local-staple',
    trapReasons: ['Prețuri cu 9% sub medie pentru burgeri gourmet în centru.'],
    trapBreakdown: {
      touristVsLocalGap: -0.4,
      touristZoneProximityM: 140,
      priceVsCategoryPct: -9,
      foreignLangReviewsPct: 16,
      singleVisitPct: 18,
    },
    aspectScores: { food: 8.5, service: 8.3, value: 8.5, atmosphere: 8.4 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7565, lng: 21.2283 },
    address: 'Str. Vasile Alecsandri nr. 3, Cetate, Timișoara',
    hours: 'Lu–Du: 10:00 – 23:00',
    openNow: true,
    phone: '+40 722 511 490',
    delivery: {
      available: true,
      platforms: ['Wolt', 'Glovo'],
      minimumOrderRon: 40,
      estimatedTime: '30–45 min',
    },
    monthlyRank: 3,
    monthlyScore: 8.8,
    monthlyStatusLabel: '▼ 1 loc',
    monthlyRankChange: -1,
    reviewCounts: { locals: 44, tourists: 8, influencers: 1 },
    reviews: [],
  },

  {
    id: 'biofresh-timisoara',
    slug: 'biofresh-timisoara',
    name: 'Biofresh',
    vertical: 'food',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Cetate',
    cuisine: 'Vegan',
    shortCategory: 'Vegan & Vegetarian',
    categories: ['vegan'],
    priceTier: '$',
    avgMealPriceRon: 39,
    categoryAvgPriceRon: 48,
    priceRangeLabel: '30–50 lei',
    openUntilLabel: 'Deschis până la 20:00.',
    photoUrl:
      'https://bookingham.ro/upload/business/1053/photo_large.webp',
    editorialHeadline:
      'Bistro vegetarian și raw-vegan cu supe zilnice, burgeri vegetali și prăjituri fără zahăr.',
    editorialWriteup: ['Salt de 5 locuri în clasamentul lunii noiembrie datorită prânzurilor constante și livrărilor rapide.'],
    whatToOrder: [
      {
        name: 'Burger vegan de năut și sfeclă cu cartofi copți',
        priceRon: 38,
        isMustOrder: true,
      },
      {
        name: 'Tort raw-vegan cu caju și fructe de pădure',
        priceRon: 26,
      },
    ],
    occasionTags: ['Sub 50 lei', 'Vegan', 'Livrare'],
    foodQualityScore: 8.2,
    localsScore: 8.4,
    touristsScore: 7.9,
    googleRawRating: 4.8,
    touristTrapIndex: 10,
    trapTier: 'local-staple',
    trapReasons: ['Prețuri cu 19% sub media preparatelor sănătoase din centru.'],
    trapBreakdown: {
      touristVsLocalGap: -0.5,
      touristZoneProximityM: 220,
      priceVsCategoryPct: -19,
      foreignLangReviewsPct: 11,
      singleVisitPct: 14,
    },
    aspectScores: { food: 8.6, service: 8.4, value: 8.9, atmosphere: 8.1 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7562, lng: 21.2314 },
    address: 'Str. Francesco Griselini nr. 2, Cetate, Timișoara',
    hours: 'Lu–Vi: 10:00 – 20:00, Sâ: 11:00 – 18:00',
    openNow: true,
    phone: '+40 748 112 630',
    delivery: {
      available: true,
      platforms: ['Wolt', 'Glovo'],
      minimumOrderRon: 35,
      estimatedTime: '25–40 min',
      note: 'Ambalaje biodegradabile pentru supe, salate și deserturi.',
    },
    monthlyRank: 4,
    monthlyScore: 8.6,
    monthlyStatusLabel: '▲ 5',
    monthlyRankChange: 5,
    reviewCounts: { locals: 39, tourists: 6, influencers: 0 },
    reviews: [],
  },

  {
    id: 'gradina-banateana',
    slug: 'gradina-banateana',
    name: 'Grădina Bănățeană',
    vertical: 'food',
    neighborhood: 'Elisabetin',
    shortNeighborhood: 'Malul Begăi',
    cuisine: 'Românesc',
    shortCategory: 'Grătar & Tradițional',
    categories: ['romanesc'],
    priceTier: '$',
    avgMealPriceRon: 42,
    categoryAvgPriceRon: 50,
    priceRangeLabel: '30–55 lei',
    openUntilLabel: 'Deschis până la 23:00.',
    photoUrl:
      'https://www.gradinabanateana.ro/wp-content/uploads/2023/11/About-1.webp',
    editorialHeadline:
      'Mici bănățeni, ciorbe calde și grătar pe malul Begăi, lângă Parcul Justiției.',
    editorialWriteup: ['Preferat de localnicii din Elisabetin și pentru comenzile de meniul zilei la birou.'],
    whatToOrder: [
      {
        name: 'Mici bănățeni la grătar (4 buc.) cu muștar și cartofi prăjiți',
        priceRon: 32,
        isMustOrder: true,
      },
      {
        name: 'Ciorbă de fasole cu ciolan afumat',
        priceRon: 26,
      },
    ],
    occasionTags: ['Sub 50 lei', 'Malul Begăi'],
    foodQualityScore: 8.0,
    localsScore: 8.2,
    touristsScore: 7.5,
    googleRawRating: 4.5,
    touristTrapIndex: 13,
    trapTier: 'local-staple',
    trapReasons: ['Prețuri corecte față de terasele din Piața Victoriei.'],
    trapBreakdown: {
      touristVsLocalGap: -0.7,
      touristZoneProximityM: 520,
      priceVsCategoryPct: -16,
      foreignLangReviewsPct: 9,
      singleVisitPct: 18,
    },
    aspectScores: { food: 8.2, service: 8.0, value: 8.7, atmosphere: 8.0 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7495, lng: 21.2248 },
    address: 'Splaiul Spiru Haret nr. 1, Timișoara',
    hours: 'Lu–Du: 11:00 – 23:00',
    openNow: true,
    phone: '+40 256 491 810',
    delivery: {
      available: true,
      platforms: ['Glovo', 'Bolt Food'],
      minimumOrderRon: 35,
      estimatedTime: '30–45 min',
    },
    monthlyRank: 5,
    monthlyScore: 8.4,
    monthlyStatusLabel: '▼ 2',
    monthlyRankChange: -2,
    reviewCounts: { locals: 33, tourists: 5, influencers: 0 },
    reviews: [],
  },

  {
    id: 'sabres-restaurant',
    slug: 'sabres-restaurant',
    name: 'Restaurant Sabres',
    vertical: 'food',
    neighborhood: 'Elisabetin',
    shortNeighborhood: 'Elisabetin',
    cuisine: 'Bistro',
    shortCategory: 'Pește & Mediteranean',
    categories: ['bistro'],
    priceTier: '$$',
    avgMealPriceRon: 72,
    categoryAvgPriceRon: 76,
    priceRangeLabel: '55–95 lei',
    openUntilLabel: 'Deschis până la 23:00.',
    photoUrl:
      'https://www.sabres.ro/wp-content/uploads/2026/06/AND09489-1.jpg',
    editorialHeadline:
      'Pește proaspăt, midii și preparate mediteraneene într-o casă liniștită din Elisabetin.',
    editorialWriteup: ['Reputație solidă în cartier pentru preparatele din pește și fructe de mare.'],
    whatToOrder: [
      { name: 'Doradă întreagă la grătar cu legume mediteraneene', priceRon: 68, isMustOrder: true },
      { name: 'Midii în sos de vin alb și usturoi', priceRon: 56 },
    ],
    occasionTags: ['Cină', 'Pește proaspăt'],
    foodQualityScore: 7.9,
    localsScore: 8.2,
    touristsScore: 7.7,
    googleRawRating: 4.6,
    touristTrapIndex: 14,
    trapTier: 'local-staple',
    trapReasons: ['Clientelă fidelă din Elisabetin și servicii constante.'],
    trapBreakdown: {
      touristVsLocalGap: -0.5,
      touristZoneProximityM: 1020,
      priceVsCategoryPct: -5,
      foreignLangReviewsPct: 10,
      singleVisitPct: 18,
    },
    aspectScores: { food: 8.3, service: 8.1, value: 7.9, atmosphere: 8.4 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7448, lng: 21.2279 },
    address: 'Str. Craiova nr. 1, Elisabetin, Timișoara',
    hours: 'Lu–Du: 12:00 – 23:00',
    openNow: true,
    phone: '+40 256 221 775',
    delivery: {
      available: true,
      platforms: ['Wolt'],
      minimumOrderRon: 60,
      estimatedTime: '40–55 min',
      note: 'Livrare prin Wolt sau ridicare directă de pe Str. Craiova nr. 1.',
    },
    monthlyRank: 6,
    monthlyScore: 8.3,
    monthlyStatusLabel: '▲ 1',
    monthlyRankChange: 1,
    reviewCounts: { locals: 29, tourists: 4, influencers: 0 },
    reviews: [],
  },

  {
    id: 'suppa-bar',
    slug: 'suppa-bar',
    name: 'Suppa Bar',
    vertical: 'food',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Cetate',
    cuisine: 'Bistro',
    shortCategory: 'Supărie',
    categories: ['bistro', 'vegan'],
    priceTier: '$',
    avgMealPriceRon: 28,
    categoryAvgPriceRon: 38,
    priceRangeLabel: '22–36 lei',
    openUntilLabel: 'Deschis până la 17:00.',
    photoUrl:
      'https://zilesinopti.ro/wp-content/uploads/2023/10/ciorba-buna-timisoara-suppa-bar-2.jpg',
    editorialHeadline:
      'Supe și supe-cremă schimbate zilnic pe Str. Emanoil Ungureanu, ideale pentru prânz rapid.',
    editorialWriteup: ['Intrat nou în clasamentul din noiembrie: 4–5 supe proaspete zilnic și opțiuni vegane.'],
    whatToOrder: [
      {
        name: 'Supă cremă de roșii coapte cu busuioc și mozzarella',
        priceRon: 24,
        isMustOrder: true,
      },
      {
        name: 'Supă thailandeză cu lapte de cocos, pui și ghimbir',
        priceRon: 27,
      },
    ],
    occasionTags: ['Sub 50 lei', 'Nou intrat', 'Prânz'],
    foodQualityScore: 7.8,
    localsScore: 8.2,
    touristsScore: 7.4,
    googleRawRating: 4.7,
    touristTrapIndex: 9,
    trapTier: 'local-staple',
    trapReasons: ['Prețuri cu 26% sub media prânzurilor din Cetate.'],
    trapBreakdown: {
      touristVsLocalGap: -0.8,
      touristZoneProximityM: 170,
      priceVsCategoryPct: -26,
      foreignLangReviewsPct: 8,
      singleVisitPct: 13,
    },
    aspectScores: { food: 8.3, service: 8.2, value: 9.1, atmosphere: 7.8 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7559, lng: 21.2266 },
    address: 'Str. Emanoil Ungureanu nr. 17, Cetate, Timișoara',
    hours: 'Lu–Vi: 11:00 – 17:00',
    openNow: true,
    phone: '+40 740 818 229',
    delivery: {
      available: true,
      platforms: ['Glovo', 'Wolt'],
      minimumOrderRon: 30,
      estimatedTime: '20–35 min',
      note: 'Meniul de supe se schimbă în fiecare dimineață la ora 11:00.',
    },
    monthlyRank: 7,
    monthlyScore: 8.2,
    monthlyStatusLabel: 'NOU',
    monthlyRankChange: 0,
    reviewCounts: { locals: 22, tourists: 3, influencers: 0 },
    reviews: [],
  },

  // ============================================================================
  // ATENȚIE ÎN CENTRU — HIGH TOURIST GAP / CENTRAL MARKUP MONITORING
  // ============================================================================
  {
    id: 'restaurant-miorita-unirii',
    slug: 'restaurant-miorita-unirii',
    name: 'Terasa Miorița (Piața Unirii)',
    vertical: 'food',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Piața Unirii',
    cuisine: 'Românesc',
    shortCategory: 'Terasă Centrală',
    categories: ['romanesc'],
    priceTier: '$$$',
    avgMealPriceRon: 118,
    categoryAvgPriceRon: 74,
    priceRangeLabel: '85–150 lei',
    openUntilLabel: 'Deschis până la 00:00.',
    photoUrl:
      'https://www.timisoreni.ro/upload/photo/2018-01/miorita_large.jpg',
    editorialHeadline:
      'Prețuri de Piața Unirii (+59% față de medie). Localnici 5,1, turiști 8,4.',
    editorialWriteup: [
      'Aflată chiar la colțul Pieței Unirii (Str. Mercy nr. 7), terasa atrage flux mare de turiști datorită poziției centrale, însă localnicii semnalează prețuri mult peste restaurantele românești din cartiere.',
    ],
    whatToOrder: [
      {
        name: 'Platou românesc de terasă (2 pers.)',
        priceRon: 148,
      },
    ],
    occasionTags: ['Atenție Piața Unirii'],
    foodQualityScore: 5.8,
    localsScore: 5.1,
    touristsScore: 8.4,
    googleRawRating: 4.5,
    touristTrapIndex: 82,
    trapTier: 'tourist-trap',
    trapReasons: [
      'Prețuri cu 59% peste media pentru mâncare românească.',
      '68% din review-uri vin de la vizitatori ocazionali.',
      'Localnicii îi dau 5,1; turiștii 8,4.',
      'La 40 m de Domul din Piața Unirii.',
    ],
    trapBreakdown: {
      touristVsLocalGap: 3.3,
      touristZoneProximityM: 40,
      priceVsCategoryPct: 59,
      foreignLangReviewsPct: 68,
      singleVisitPct: 82,
    },
    aspectScores: {
      food: 5.2,
      service: 5.4,
      value: 3.4,
      atmosphere: 7.9,
    },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7582, lng: 21.2294 },
    address: 'Str. Florimund Mercy nr. 7 / Piața Unirii, Cetate, Timișoara',
    hours: 'Lu–Du: 09:00 – 00:00',
    openNow: true,
    phone: '+40 256 433 110',
    delivery: {
      available: true,
      platforms: ['Wolt'],
      minimumOrderRon: 50,
      estimatedTime: '35–50 min',
      note: 'Disponibil și pentru comenzi cu livrare prin Wolt.',
    },
    reviewCounts: { locals: 34, tourists: 96, influencers: 5 },
    reviews: [
      {
        id: 'rev-miorita-1',
        authorName: 'Ștefan M.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Cetate',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 5.0,
        trapEstimatePct: 84,
        date: 'Acum 4 zile',
        text: 'Am ieșit cu prietenii veniți în vizită pentru priveliștea spre Unirii, dar mâncarea nu justifică prețul aproape dublu față de Iosefin.',
        language: 'RO',
        helpfulCount: 22,
      },
      {
        id: 'rev-miorita-2',
        authorName: 'Lukas M.',
        authorRole: 'tourist',
        weightMultiplier: 1.0,
        isVerifiedVisit: false,
        foodScore: 8.4,
        trapEstimatePct: 40,
        date: 'Acum 6 zile',
        text: 'Great terrace right next to Union Square, pleasant atmosphere for tourists.',
        language: 'EN',
      },
    ],
  },

  {
    id: 'bruck-cafe-unirii',
    slug: 'bruck-cafe-unirii',
    name: 'Bruck Café & Brasserie',
    vertical: 'food',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Piața Unirii',
    cuisine: 'Bistro',
    shortCategory: 'Cafenea & Brasserie',
    categories: ['bistro'],
    priceTier: '$$$',
    avgMealPriceRon: 88,
    categoryAvgPriceRon: 64,
    priceRangeLabel: '65–110 lei',
    openUntilLabel: 'Deschis până la 00:00.',
    photoUrl:
      'https://bookingham.ro/upload/business/1545/photo.webp',
    editorialHeadline: '62% din review-uri în limbi străine; terasă în Casa Brück din Piața Unirii.',
    editorialWriteup: [
      'Semnal de diferență între vizitatori și localnici: atmosfera din Casa Brück atrage turiștii, însă nota pe mâncare vs. preț rămâne modestă pentru rezidenți.',
    ],
    whatToOrder: [
      {
        name: 'Cafea sau desert pe terasă (bistroul are adaos de piață centrală)',
        priceRon: 24,
      },
    ],
    occasionTags: ['Posibilă capcană', 'Piața Unirii'],
    foodQualityScore: 6.4,
    localsScore: 5.9,
    touristsScore: 8.1,
    googleRawRating: 4.5,
    touristTrapIndex: 67,
    trapTier: 'tourist-trap',
    trapReasons: [
      '62% din review-uri în limbi străine.',
      'Prețuri cu 38% peste media categoriei.',
      'Localnicii îi dau 5,9; turiștii 8,1.',
      'Chiar în Piața Unirii (Str. Mercy nr. 9).',
    ],
    trapBreakdown: {
      touristVsLocalGap: 2.2,
      touristZoneProximityM: 30,
      priceVsCategoryPct: 38,
      foreignLangReviewsPct: 62,
      singleVisitPct: 71,
    },
    aspectScores: {
      food: 6.1,
      service: 6.4,
      value: 4.9,
      atmosphere: 8.2,
    },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7579, lng: 21.2297 },
    address: 'Str. Florimund Mercy nr. 9 (colț cu Piața Unirii), Timișoara',
    hours: 'Lu–Du: 09:00 – 00:00',
    openNow: true,
    phone: '+40 723 199 412',
    delivery: {
      available: true,
      platforms: ['Wolt'],
      minimumOrderRon: 45,
      estimatedTime: '30–45 min',
    },
    reviewCounts: { locals: 19, tourists: 54, influencers: 2 },
    reviews: [
      {
        id: 'rev-bruck-1',
        authorName: 'Radu C.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Elisabetin',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 5.9,
        trapEstimatePct: 67,
        date: 'Acum 5 zile',
        text: 'Clădire superbă în Unirii, dar pentru o masă completă plătești mult peste ce primești în farfurie.',
        language: 'RO',
      },
    ],
  },

  {
    id: 'restaurant-lloyd-victoriei',
    slug: 'restaurant-lloyd-victoriei',
    name: 'Restaurant Lloyd',
    vertical: 'food',
    neighborhood: 'Piața Victoriei',
    shortNeighborhood: 'Piața Victoriei',
    cuisine: 'Bistro',
    shortCategory: 'Brasserie Centrală',
    categories: ['bistro', 'pizza'],
    priceTier: '$$$',
    avgMealPriceRon: 122,
    categoryAvgPriceRon: 74,
    priceRangeLabel: '80–145 lei',
    openUntilLabel: 'Deschis până la 00:00.',
    photoUrl:
      'https://ghidulbanatului.ro/wp-content/uploads/2025/07/restaurant-lloyd-timisoara-redeschidere-2025-chef-valentin-pupaza-meniu-nou-banat-3.jpg',
    editorialHeadline: 'Terasa Palatului Lloyd din Piața Victoriei nr. 2. Localnici 5,0, turiști 8,2.',
    editorialWriteup: [
      'Locație istorică vizavi de Operă, fără livrare la domiciliu — orientată exclusiv spre servirea în local și fluxul turistic de pe Corso.',
    ],
    whatToOrder: [{ name: 'Mușchi de vită sau paste la terasă', priceRon: 89 }],
    occasionTags: ['Capcană turistică', 'Piața Victoriei'],
    foodQualityScore: 5.5,
    localsScore: 5.0,
    touristsScore: 8.2,
    googleRawRating: 4.4,
    touristTrapIndex: 85,
    trapTier: 'tourist-trap',
    trapReasons: [
      'Prețuri +65% față de medie.',
      'Localnicii îi dau 5,0; turiștii 8,2.',
      '71% review-uri în limbi străine.',
      'La 20 m de Piața Victoriei.',
    ],
    trapBreakdown: {
      touristVsLocalGap: 3.2,
      touristZoneProximityM: 20,
      priceVsCategoryPct: 65,
      foreignLangReviewsPct: 71,
      singleVisitPct: 84,
    },
    aspectScores: { food: 5.0, service: 5.3, value: 3.2, atmosphere: 7.7 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7539, lng: 21.2247 },
    address: 'Piața Victoriei nr. 2 (Palatul Lloyd, lângă Operă), Timișoara',
    hours: 'Lu–Du: 09:00 – 00:00',
    openNow: true,
    phone: '+40 256 494 555',
    delivery: {
      available: false,
      note: 'Doar servire în local și pe terasa din Piața Victoriei.',
    },
    reviewCounts: { locals: 24, tourists: 78, influencers: 4 },
    reviews: [],
  },
];

// ============================================================================
// TOPDRINK / TIMIȘOARA — REAL BARS, PUBS & CLUBS
// ============================================================================
export const DRINK_VENUES: Restaurant[] = [
  {
    id: 'scart-loc-lejer',
    slug: 'scart-loc-lejer',
    name: 'Scârț Loc Lejer',
    vertical: 'drink',
    neighborhood: 'Elisabetin',
    shortNeighborhood: 'Elisabetin',
    cuisine: 'Pub',
    shortCategory: 'Bar & Grădină',
    categories: ['pub', 'muzica-live'],
    priceTier: '$',
    avgMealPriceRon: 14,
    categoryAvgPriceRon: 18,
    priceRangeLabel: 'Grădină cu hamace & teatru. Bere 0,5 l: 14 lei.',
    openUntilLabel: 'Deschis până la 23:00.',
    photoUrl:
      'https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI2NTczLCJwdXIiOiJibG9iX2lkIn19--b7c1d725ef6c6c5f38f08d8f8e47fbfe11d6dc0a/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/482087203_1056715446496858_7353868285113030005_n.jpg',
    editorialHeadline: 'Pub & grădină, Elisabetin. Muzeul Consumatorului Comunist. Bere 0,5 l: 14 lei.',
    editorialWriteup: [
      'Unul dintre cele mai autentice locuri din Timișoara, pe Str. Arhitect László Székely nr. 1: curte cu hamace, subsolul Muzeului Consumatorului Comunist și bere la preț cinstit.',
    ],
    whatToOrder: [
      { name: 'Bere Timișoreana nefiltrată la halbă 0,5 l', priceRon: 14, isMustOrder: true },
      { name: 'Socată de casă / Vin fiert cu scorțișoară', priceRon: 16 },
    ],
    occasionTags: ['Curte cu hamace', 'Bere 14 lei'],
    foodQualityScore: 8.9,
    localsScore: 9.1,
    touristsScore: 8.5,
    googleRawRating: 4.8,
    touristTrapIndex: 10,
    trapTier: 'local-staple',
    trapReasons: [
      'Bere 0,5 l la 14 lei (-22% sub medie).',
      'Localnicii îi dau 9,1; turiștii 8,5.',
    ],
    trapBreakdown: {
      touristVsLocalGap: -0.6,
      touristZoneProximityM: 940,
      priceVsCategoryPct: -22,
      foreignLangReviewsPct: 14,
      singleVisitPct: 16,
    },
    aspectScores: { food: 8.8, service: 9.0, value: 9.4, atmosphere: 9.4 },
    isSponsored: false,
    isPartner: true,
    coordinates: { lat: 45.7449, lng: 21.2278 },
    address: 'Str. Arhitect László Székely nr. 1, Elisabetin, Timișoara',
    hours: 'Lu–Sâ: 12:00 – 23:00',
    openNow: true,
    phone: '+40 751 892 300',
    delivery: {
      available: false,
      note: 'Doar în local și în grădina de pe Str. László Székely nr. 1.',
    },
    crowdSegments: 4,
    crowdLabel: 'Aproape plin, acum 12 min',
    drinkTags: ['vineri-noaptea', 'muzica-live', 'bere-sub-15-lei'],
    reviewCounts: { locals: 68, tourists: 14, influencers: 1 },
    reviews: [
      {
        id: 'rev-scart-1',
        authorName: 'Sorin P.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Elisabetin',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 9.0,
        trapEstimatePct: 8,
        date: 'Vineri, 21:40',
        text: 'Cel mai relaxat loc din Timișoara. În curte stai în hamac, iar la subsol poți vizita muzeul. Berea e încă la preț normal.',
        language: 'RO',
        helpfulCount: 18,
      },
    ],
  },

  {
    id: 'aethernativ-cafe',
    slug: 'aethernativ-cafe',
    name: 'Aethernativ Café',
    vertical: 'drink',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Mărășești',
    cuisine: 'Cocktail bar',
    shortCategory: 'Bar & Curte Interioară',
    categories: ['cocktail-bar', 'cafenea-de-seara'],
    priceTier: '$$',
    avgMealPriceRon: 32,
    categoryAvgPriceRon: 36,
    priceRangeLabel: 'DJ seturi & curte interioară. Cocktail: 32 lei.',
    openUntilLabel: 'Deschis până la 01:00.',
    photoUrl:
      'https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI2MDM0LCJwdXIiOiJibG9iX2lkIn19--0ef0d169416bc77bce0491b81bc981a3085b1c57/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/36176495_1736196776429041_2013076460402638848_n.jpg',
    editorialHeadline: 'Cocktail bar, Mărășești. Curte ascunsă și muzică alternativă. Cocktail: 32 lei.',
    editorialWriteup: [
      'La etaj și în curtea interioară de pe Str. Mărășești nr. 14, Aethernativ e locul de întâlnire pentru bere artizanală locală, cocktailuri corecte și DJ seturi de seară.',
    ],
    whatToOrder: [
      { name: 'Negroni clasic cu portocală deshidratată', priceRon: 32, isMustOrder: true },
      { name: 'Bere artizanală locală OneTwo (330 ml)', priceRon: 20 },
    ],
    occasionTags: ['Curte ascunsă', 'Mărășești'],
    foodQualityScore: 8.6,
    localsScore: 8.8,
    touristsScore: 8.2,
    googleRawRating: 4.8,
    touristTrapIndex: 12,
    trapTier: 'local-staple',
    trapReasons: [
      'Prețuri oneste pentru centrul Timișoarei (cocktail 32 lei).',
      'Public fidel din comunitatea creativă locală.',
    ],
    trapBreakdown: {
      touristVsLocalGap: -0.6,
      touristZoneProximityM: 220,
      priceVsCategoryPct: -11,
      foreignLangReviewsPct: 12,
      singleVisitPct: 18,
    },
    aspectScores: { food: 8.8, service: 8.9, value: 8.5, atmosphere: 9.2 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7553, lng: 21.2262 },
    address: 'Str. Mărășești nr. 14, Cetate, Timișoara',
    hours: 'Lu–Du: 17:00 – 01:00',
    openNow: true,
    phone: '+40 728 409 811',
    delivery: {
      available: false,
      note: 'Doar în local (Str. Mărășești nr. 14, la etaj și în curte).',
    },
    crowdSegments: 2,
    crowdLabel: 'Locuri libere, acum 30 min',
    drinkTags: ['vineri-noaptea', 'in-timpul-saptamanii', 'muzica-live'],
    reviewCounts: { locals: 51, tourists: 9, influencers: 2 },
    reviews: [
      {
        id: 'rev-aether-1',
        authorName: 'Ioana T.',
        authorRole: 'verified-local',
        authorNeighborhood: 'Cetate',
        weightMultiplier: 2.0,
        isVerifiedVisit: true,
        foodScore: 8.7,
        trapEstimatePct: 10,
        date: 'Joi, 22:15',
        text: 'Curte interioară foarte faină și oameni relaxați, fără atmosferă pretențioasă de club.',
        language: 'RO',
        helpfulCount: 10,
      },
    ],
  },

  {
    id: 'the-80s-pub',
    slug: 'the-80s-pub',
    name: "The 80's Pub",
    vertical: 'drink',
    neighborhood: 'Elisabetin',
    shortNeighborhood: 'Arieș / Complex',
    cuisine: 'Club',
    shortCategory: 'Pub & Party',
    categories: ['club', 'pub'],
    priceTier: '$$',
    avgMealPriceRon: 28,
    categoryAvgPriceRon: 35,
    priceRangeLabel: 'Retro & rock până la 04:30. Bere 0,5 l: 15 lei.',
    openUntilLabel: 'Deschis până la 04:30 (Vi–Sâ).',
    photoUrl:
      'https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI2MDUxLCJwdXIiOiJibG9iX2lkIn19--75c0ba8c28c22aa938174c4e7f6552b6eb241a14/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/477341347_3169178599908948_5445388176706805250_n.jpg',
    editorialHeadline: "Club & pub retro lângă Casa Tineretului. Petreceri '80s–'90s până la 04:30.",
    editorialWriteup: [
      'Pe Str. Arieș nr. 19, The 80’s Pub adună timișorenii în weekend pentru muzică retro, rock clasic și atmosferă fără dress code rigid.',
    ],
    whatToOrder: [
      { name: 'Bere la draft 0,5 l', priceRon: 15, isMustOrder: true },
      { name: 'Cuba Libre / Gin Tonic', priceRon: 28 },
    ],
    occasionTags: ['Retro', 'Până la 04:30'],
    foodQualityScore: 8.2,
    localsScore: 8.4,
    touristsScore: 7.9,
    googleRawRating: 4.6,
    touristTrapIndex: 14,
    trapTier: 'local-staple',
    trapReasons: ['Prețuri de student și petreceri constante în weekend.'],
    trapBreakdown: {
      touristVsLocalGap: -0.5,
      touristZoneProximityM: 1380,
      priceVsCategoryPct: -14,
      foreignLangReviewsPct: 16,
      singleVisitPct: 21,
    },
    aspectScores: { food: 8.0, service: 8.1, value: 8.7, atmosphere: 9.0 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7429, lng: 21.2368 },
    address: 'Str. Arieș nr. 19 (lângă Casa Tineretului), Timișoara',
    hours: 'Lu–Jo: 09:00 – 01:30, Vi–Sâ: 10:00 – 04:30',
    openNow: true,
    phone: '+40 731 808 080',
    delivery: {
      available: false,
      note: 'Doar în local.',
    },
    crowdSegments: 5,
    crowdLabel: 'Plin / petrecere, acum 5 min',
    drinkTags: ['vineri-noaptea'],
    reviewCounts: { locals: 43, tourists: 11, influencers: 1 },
    reviews: [],
  },

  // MODEST SPONSORED SLOT ON TOPDRINK (Rule #3)
  {
    id: 'darc-pe-mal',
    slug: 'darc-pe-mal',
    name: "D'arc pe Mal",
    vertical: 'drink',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Malul Begăi',
    cuisine: 'Terasă',
    shortCategory: 'Terasă pe Bega',
    categories: ['terasa', 'muzica-live'],
    priceTier: '$$',
    avgMealPriceRon: 19,
    categoryAvgPriceRon: 16,
    priceRangeLabel: 'Pe malul Begăi. Bere: 19 lei.',
    openUntilLabel: 'Deschis până la 00:30.',
    photoUrl:
      'https://timisoara2023.eu/images/BCnNry-P4UQPJQaiQCrKoaIUC9M=/3233/width-640%7Cformat-webp/35442313-bbc4-46ee-b1f9-569169e63676',
    editorialHeadline: 'Terasă pe Bega, lângă Podul Mihai Viteazul. Bere: 19 lei.',
    editorialWriteup: [
      'Slot sponsorizat separat. Scorul de 7,3 reflectă strict voturile comunității.',
    ],
    whatToOrder: [
      { name: 'Bere rece la halbă pe malul Begăi', priceRon: 19 },
      { name: 'Aperol Spritz pe ponton', priceRon: 34 },
    ],
    occasionTags: ['Sponsorizat', 'Malul Begăi'],
    foodQualityScore: 7.3,
    localsScore: 7.1,
    touristsScore: 7.8,
    googleRawRating: 4.5,
    touristTrapIndex: 28,
    trapTier: 'mixed-fair',
    trapReasons: ['Preț bere +19% față de media pub-urilor de cartier.'],
    trapBreakdown: {
      touristVsLocalGap: 0.7,
      touristZoneProximityM: 320,
      priceVsCategoryPct: 19,
      foreignLangReviewsPct: 26,
      singleVisitPct: 36,
    },
    aspectScores: { food: 7.1, service: 7.3, value: 6.7, atmosphere: 8.6 },
    isSponsored: true,
    sponsoredNote: 'Sponsorizat. Nu schimbă scorul.',
    isPartner: true,
    coordinates: { lat: 45.7498, lng: 21.2241 },
    address: 'Splaiul Tudor Vladimirescu (Malul Begăi, lângă Podul Mihai Viteazul), Timișoara',
    hours: 'Lu–Du: 12:00 – 00:30',
    openNow: true,
    phone: '+40 744 502 318',
    delivery: {
      available: false,
      note: 'Doar la terasa de pe malul Begăi.',
    },
    crowdSegments: 3,
    crowdLabel: 'Locuri la terasă, acum 18 min',
    drinkTags: ['vineri-noaptea', 'in-timpul-saptamanii'],
    reviewCounts: { locals: 27, tourists: 19, influencers: 1 },
    reviews: [],
  },

  {
    id: 'beraria-700',
    slug: 'beraria-700',
    name: 'Berăria 700',
    vertical: 'drink',
    neighborhood: 'Cetate / Piața Unirii',
    shortNeighborhood: 'Piața 700',
    cuisine: 'Pub',
    shortCategory: 'Berărie',
    categories: ['pub'],
    priceTier: '$',
    avgMealPriceRon: 14,
    categoryAvgPriceRon: 18,
    priceRangeLabel: 'Bere proaspătă la halbă. Bere 0,5 l: 14 lei.',
    openUntilLabel: 'Deschis până la 00:00.',
    photoUrl:
      'https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI0ODE3LCJwdXIiOiJibG9iX2lkIn19--af7d745af1a157059c0583b7270c1d2f24cba1e9/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/14570728_201289543627472_2323011334516176166_o.jpg',
    editorialHeadline: 'Berărie clasică lângă Piața 700, cu halbă la 14 lei și bucătărie consistentă.',
    editorialWriteup: ['Loc bun atât în timpul săptămânii la halbă, cât și pentru livrări de preparate bavareze și românești.'],
    whatToOrder: [
      { name: 'Bere Timișoreana proaspătă la halbă 0,5 l', priceRon: 14, isMustOrder: true },
      { name: 'Ciolan de porc rumenit cu hrean și varză călită', priceRon: 54 },
    ],
    occasionTags: ['În timpul săptămânii', 'Bere sub 15 lei'],
    foodQualityScore: 8.5,
    localsScore: 8.7,
    touristsScore: 8.0,
    googleRawRating: 4.5,
    touristTrapIndex: 10,
    trapTier: 'local-staple',
    trapReasons: ['Preț 14 lei pentru halbă 0,5 l în zona Piața 700.'],
    trapBreakdown: {
      touristVsLocalGap: -0.7,
      touristZoneProximityM: 560,
      priceVsCategoryPct: -22,
      foreignLangReviewsPct: 9,
      singleVisitPct: 14,
    },
    aspectScores: { food: 8.6, service: 8.5, value: 9.1, atmosphere: 8.4 },
    isSponsored: false,
    isPartner: false,
    coordinates: { lat: 45.7568, lng: 21.2221 },
    address: 'Str. Coriolan Brediceanu nr. 4, Piața 700, Timișoara',
    hours: 'Lu–Du: 11:00 – 00:00',
    openNow: true,
    phone: '+40 256 700 700',
    delivery: {
      available: true,
      platforms: ['Wolt', 'Glovo'],
      minimumOrderRon: 45,
      estimatedTime: '35–50 min',
      note: 'Preparatele de berărie (ciolan, coaste, cârnați) se livrează prin Wolt și Glovo.',
    },
    crowdSegments: 3,
    crowdLabel: 'Atmosferă lejeră, acum 22 min',
    drinkTags: ['in-timpul-saptamanii', 'bere-sub-15-lei'],
    reviewCounts: { locals: 38, tourists: 5, influencers: 0 },
    reviews: [],
  },
];

export const WEEKEND_EVENTS: WeekendEvent[] = [
  {
    id: 'evt-auaelu-scart',
    dayShort: 'vin.',
    dayNumber: '14',
    title: 'Seară de teatru Auăleu & viniluri, Scârț Loc Lejer',
    venueName: 'Scârț Loc Lejer',
    venueId: 'scart-loc-lejer',
    details: 'De la 20:00. Intrare liberă la bar.',
  },
  {
    id: 'evt-retro-80s',
    dayShort: 'sâm.',
    dayNumber: '15',
    title: "Retro Party '80s–'90s, The 80's Pub",
    venueName: "The 80's Pub",
    venueId: 'the-80s-pub',
    details: 'De la 22:00. Str. Arieș nr. 19.',
  },
];

export const TOP_LOCAL_REVIEWERS: TopReviewer[] = [
  {
    id: 'rev-top-1',
    initials: 'AM',
    name: 'Andreea M.',
    role: 'verified-local',
    badgeLabel: 'Localnic din Iosefin',
    helpfulVotes: 312,
  },
  {
    id: 'rev-top-2',
    initials: 'RB',
    name: 'Radu B.',
    role: 'verified-local',
    badgeLabel: 'Localnic din Fabric',
    helpfulVotes: 248,
  },
  {
    id: 'rev-top-3',
    initials: 'TV',
    name: 'Tm Food Vlog',
    role: 'influencer',
    badgeLabel: 'Influencer · 24k',
    helpfulVotes: 190,
  },
];

/**
 * Helper to recalculate a restaurant's Dual-Rating scores when a new community review is submitted
 */
export function recalculateRestaurantWithReview(
  restaurant: Restaurant,
  newReview: Restaurant['reviews'][number]
): Restaurant {
  const updatedReviews = [newReview, ...restaurant.reviews];

  const prevCounts = restaurant.reviewCounts ?? {
    locals: 0,
    tourists: 0,
    influencers: 0,
  };

  const baselineWeight = Math.max(
    12.0,
    prevCounts.locals * 2.0 + prevCounts.tourists * 1.0 + prevCounts.influencers * 0.2
  );
  const reviewWeight = newReview.weightMultiplier;

  const newFoodQualityScore = Number(
    (
      (restaurant.foodQualityScore * baselineWeight +
        newReview.foodScore * reviewWeight) /
      (baselineWeight + reviewWeight)
    ).toFixed(1)
  );

  const newTouristTrapIndex = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (restaurant.touristTrapIndex * baselineWeight +
          newReview.trapEstimatePct * reviewWeight) /
          (baselineWeight + reviewWeight)
      )
    )
  );

  const isLocalReviewer =
    newReview.authorRole === 'verified-local' ||
    newReview.authorRole === 'regular';
  const localsBaseline = Math.max(8, prevCounts.locals * 2.0);
  const newLocalsScore = isLocalReviewer
    ? Number(
        (
          (restaurant.localsScore * localsBaseline +
            newReview.foodScore * reviewWeight) /
          (localsBaseline + reviewWeight)
        ).toFixed(1)
      )
    : restaurant.localsScore;

  const touristsBaseline = Math.max(6, prevCounts.tourists * 1.0);
  const newTouristsScore =
    newReview.authorRole === 'tourist'
      ? Number(
          (
            (restaurant.touristsScore * touristsBaseline + newReview.foodScore) /
            (touristsBaseline + 1)
          ).toFixed(1)
        )
      : restaurant.touristsScore;

  const updatedCounts = {
    locals: prevCounts.locals + (isLocalReviewer ? 1 : 0),
    tourists: prevCounts.tourists + (newReview.authorRole === 'tourist' ? 1 : 0),
    influencers:
      prevCounts.influencers + (newReview.authorRole === 'influencer' ? 1 : 0),
  };

  const updatedTeam = restaurant.team?.map((member) =>
    newReview.praisedEmployee && member.name === newReview.praisedEmployee
      ? { ...member, positiveMentions: member.positiveMentions + 1 }
      : member
  );

  return {
    ...restaurant,
    foodQualityScore: newFoodQualityScore,
    localsScore: newLocalsScore,
    touristsScore: newTouristsScore,
    touristTrapIndex: newTouristTrapIndex,
    trapTier: getTrapTier(newTouristTrapIndex),
    reviewCounts: updatedCounts,
    reviews: updatedReviews,
    team: updatedTeam,
  };
}

/**
 * Helper to recalculate scores when an existing review is edited locally
 */
export function recalculateRestaurantWithUpdatedReview(
  restaurant: Restaurant,
  reviewId: string,
  updates: { foodScore: number; text: string }
): Restaurant {
  const existing = restaurant.reviews.find((r) => r.id === reviewId);
  if (!existing) return restaurant;

  const updatedReviews = restaurant.reviews.map((r) =>
    r.id === reviewId
      ? {
          ...r,
          foodScore: updates.foodScore,
          text: updates.text,
          date: `${r.date.replace(/\s*\(editat\)$/, '')} (editat)`,
        }
      : r
  );

  const prevCounts = restaurant.reviewCounts ?? {
    locals: 0,
    tourists: 0,
    influencers: 0,
  };
  const baselineWeight = Math.max(
    12.0,
    prevCounts.locals * 2.0 + prevCounts.tourists * 1.0 + prevCounts.influencers * 0.2
  );
  const w = existing.weightMultiplier;
  const delta = (updates.foodScore - existing.foodScore) * w;

  const newFoodQualityScore = Number(
    Math.min(10, Math.max(1, restaurant.foodQualityScore + delta / baselineWeight)).toFixed(1)
  );

  const isLocalReviewer =
    existing.authorRole === 'verified-local' || existing.authorRole === 'regular';
  const localsBaseline = Math.max(8, prevCounts.locals * 2.0);
  const newLocalsScore = isLocalReviewer
    ? Number(
        Math.min(10, Math.max(1, restaurant.localsScore + delta / localsBaseline)).toFixed(1)
      )
    : restaurant.localsScore;

  const touristsBaseline = Math.max(6, prevCounts.tourists * 1.0);
  const newTouristsScore =
    existing.authorRole === 'tourist'
      ? Number(
          Math.min(
            10,
            Math.max(1, restaurant.touristsScore + (updates.foodScore - existing.foodScore) / touristsBaseline)
          ).toFixed(1)
        )
      : restaurant.touristsScore;

  return {
    ...restaurant,
    foodQualityScore: newFoodQualityScore,
    localsScore: newLocalsScore,
    touristsScore: newTouristsScore,
    reviews: updatedReviews,
  };
}

/**
 * Helper to remove a review locally and adjust counts/scores
 */
export function recalculateRestaurantWithoutReview(
  restaurant: Restaurant,
  reviewId: string
): Restaurant {
  const existing = restaurant.reviews.find((r) => r.id === reviewId);
  if (!existing) return restaurant;

  const updatedReviews = restaurant.reviews.filter((r) => r.id !== reviewId);
  const prevCounts = restaurant.reviewCounts ?? {
    locals: 0,
    tourists: 0,
    influencers: 0,
  };
  const isLocalReviewer =
    existing.authorRole === 'verified-local' || existing.authorRole === 'regular';

  const updatedCounts = {
    locals: Math.max(0, prevCounts.locals - (isLocalReviewer ? 1 : 0)),
    tourists: Math.max(0, prevCounts.tourists - (existing.authorRole === 'tourist' ? 1 : 0)),
    influencers: Math.max(
      0,
      prevCounts.influencers - (existing.authorRole === 'influencer' ? 1 : 0)
    ),
  };

  const baselineWeight = Math.max(
    12.0,
    prevCounts.locals * 2.0 + prevCounts.tourists * 1.0 + prevCounts.influencers * 0.2
  );
  const remainingWeight = Math.max(1.0, baselineWeight - existing.weightMultiplier);
  const newFoodQualityScore = Number(
    Math.min(
      10,
      Math.max(
        1,
        (restaurant.foodQualityScore * baselineWeight -
          existing.foodScore * existing.weightMultiplier) /
          remainingWeight
      )
    ).toFixed(1)
  );

  return {
    ...restaurant,
    foodQualityScore: newFoodQualityScore,
    reviewCounts: updatedCounts,
    reviews: updatedReviews,
  };
}
