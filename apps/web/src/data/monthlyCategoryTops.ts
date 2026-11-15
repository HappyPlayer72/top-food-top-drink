import type { Restaurant, Vertical } from '../types';

export interface PublicVoteCategoryEntry {
  rank: 1 | 2 | 3;
  venueName: string;
  /** Slug din catalogul principal, când localul are fișă dedicată */
  venueSlug?: string;
  neighborhood: string;
  /** Preparatul / produsul semnătură votat de public */
  dishHighlight: string;
  votes: number;
  voteSharePct: number;
  trendLabel: string;
}

export interface PublicVoteNominee {
  candidateSlug: string;
  venueName: string;
  venueSlug?: string;
  neighborhood: string;
  dishHighlight: string;
  votes: number;
  voteSharePct: number;
  rank: number;
  trendLabel: string;
}

export interface ComputedCategoryVoteTop {
  id: string;
  title: string;
  shortLabel: string;
  totalVotes: number;
  top3: [PublicVoteCategoryEntry, PublicVoteCategoryEntry, PublicVoteCategoryEntry];
  allNominees: PublicVoteNominee[];
}

export interface PublicVoteCategoryTop {
  id: string;
  title: string;
  shortLabel: string;
  totalVotes: number;
  top3: [PublicVoteCategoryEntry, PublicVoteCategoryEntry, PublicVoteCategoryEntry];
}

const FOOD_BY_MONTH: Record<string, PublicVoteCategoryTop[]> = {
  '2026-11': [
    {
      id: 'shaorma',
      title: 'Cea mai bună shaorma',
      shortLabel: 'Shaorma',
      totalVotes: 1099,
      top3: [
        {
          rank: 1,
          venueName: 'Antalya Kebab',
          neighborhood: 'Complexul Studențesc',
          dishHighlight: 'Shaorma mare la lipie cu sos de usturoi',
          votes: 418,
          voteSharePct: 38,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Aladdin Kebab',
          neighborhood: 'Piața 700',
          dishHighlight: 'Shaorma vită & pui pe jar',
          votes: 362,
          voteSharePct: 33,
          trendLabel: '▲ 1',
        },
        {
          rank: 3,
          venueName: 'Döner King',
          neighborhood: 'Calea Martirilor',
          dishHighlight: 'Shaorma clasică cu cartofi crocanți',
          votes: 319,
          voteSharePct: 29,
          trendLabel: '▼ 1',
        },
      ],
    },
    {
      id: 'burger',
      title: 'Cel mai bun burger',
      shortLabel: 'Burger',
      totalVotes: 927,
      top3: [
        {
          rank: 1,
          venueName: "Jack's Bistro",
          venueSlug: 'jacks-bistro',
          neighborhood: 'Cetate',
          dishHighlight: "Jack's Burger Black Angus & cheddar",
          votes: 389,
          voteSharePct: 42,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: "Harold's",
          venueSlug: 'harolds-restaurant',
          neighborhood: 'Complexul Studențesc',
          dishHighlight: 'Double Smash Burger cu ceapă caramelizată',
          votes: 287,
          voteSharePct: 31,
          trendLabel: '▲ 1',
        },
        {
          rank: 3,
          venueName: 'Biofresh',
          venueSlug: 'biofresh-timisoara',
          neighborhood: 'Cetate',
          dishHighlight: 'Burger vegan de năut și sfeclă',
          votes: 251,
          voteSharePct: 27,
          trendLabel: 'NOU',
        },
      ],
    },
    {
      id: 'pizza',
      title: 'Cea mai bună pizza',
      shortLabel: 'Pizza',
      totalVotes: 1037,
      top3: [
        {
          rank: 1,
          venueName: 'La Focacceria',
          venueSlug: 'la-focacceria',
          neighborhood: 'Piața Libertății',
          dishHighlight: 'Pizza al taglio cu prosciutto și ciuperci',
          votes: 456,
          voteSharePct: 44,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Pizza Napoleon',
          venueSlug: 'pizza-napoleon',
          neighborhood: 'Complexul Studențesc',
          dishHighlight: 'Pizza Diavola pe vatră',
          votes: 332,
          voteSharePct: 32,
          trendLabel: '▲ 1',
        },
        {
          rank: 3,
          venueName: 'La Piazzetta',
          neighborhood: 'Iosefin',
          dishHighlight: 'Margherita cu mozzarella di bufala',
          votes: 249,
          voteSharePct: 24,
          trendLabel: '▼ 1',
        },
      ],
    },
    {
      id: 'mancare-gatita',
      title: 'Cea mai bună mâncare gătită',
      shortLabel: 'Mâncare gătită',
      totalVotes: 1047,
      top3: [
        {
          rank: 1,
          venueName: 'Restaurant Nora',
          venueSlug: 'restaurant-nora',
          neighborhood: 'Dâmbovița / Iosefin',
          dishHighlight: 'Plescaviță sârbească & ciorbă de burtă',
          votes: 492,
          voteSharePct: 47,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Casa Bunicii',
          venueSlug: 'casa-bunicii',
          neighborhood: 'Elisabetin',
          dishHighlight: 'Gomboți cu prune și șnițelul bunicii',
          votes: 314,
          voteSharePct: 30,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'Grădina Bănățeană',
          venueSlug: 'gradina-banateana',
          neighborhood: 'Malul Begăi',
          dishHighlight: 'Mici bănățeni la grătar',
          votes: 241,
          voteSharePct: 23,
          trendLabel: '▲ 1',
        },
      ],
    },
    {
      id: 'asiatic',
      title: 'Cel mai bun asiatic & street food',
      shortLabel: 'Asiatic',
      totalVotes: 757,
      top3: [
        {
          rank: 1,
          venueName: 'Little Hanoi',
          venueSlug: 'little-hanoi',
          neighborhood: 'Cetate',
          dishHighlight: 'Supă Pho Bo tradițională cu vită',
          votes: 341,
          voteSharePct: 45,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Riyo Wok & Sushi',
          venueSlug: 'riyo-wok-sushi',
          neighborhood: 'Cetate',
          dishHighlight: 'Pad Thai cu creveți',
          votes: 242,
          voteSharePct: 32,
          trendLabel: '▲ 1',
        },
        {
          rank: 3,
          venueName: 'Sushi Ya',
          venueSlug: 'sushi-ya-timisoara',
          neighborhood: 'Piața Victoriei',
          dishHighlight: 'Platou Salmon Lovers',
          votes: 174,
          voteSharePct: 23,
          trendLabel: '▼ 1',
        },
      ],
    },
    {
      id: 'brunch',
      title: 'Cel mai bun brunch & patiserie',
      shortLabel: 'Brunch',
      totalVotes: 794,
      top3: [
        {
          rank: 1,
          venueName: 'Neața Omelette Bistro',
          venueSlug: 'neata-omelette-bistro',
          neighborhood: 'Piața Unirii',
          dishHighlight: 'Ouă Benedict cu somon afumat',
          votes: 365,
          voteSharePct: 46,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Suppa Bar',
          venueSlug: 'suppa-bar',
          neighborhood: 'Cetate',
          dishHighlight: 'Supă cremă de roșii coapte',
          votes: 238,
          voteSharePct: 30,
          trendLabel: 'NOU',
        },
        {
          rank: 3,
          venueName: 'Prospero',
          venueSlug: 'prospero-iulius-town',
          neighborhood: 'Calea Aradului',
          dishHighlight: 'Croissant cu unt & pâine cu maia',
          votes: 191,
          voteSharePct: 24,
          trendLabel: '▼ 1',
        },
      ],
    },
  ],
  '2026-10': [
    {
      id: 'shaorma',
      title: 'Cea mai bună shaorma',
      shortLabel: 'Shaorma',
      totalVotes: 1060,
      top3: [
        {
          rank: 1,
          venueName: 'Antalya Kebab',
          neighborhood: 'Complexul Studențesc',
          dishHighlight: 'Shaorma mare la lipie cu sos de usturoi',
          votes: 394,
          voteSharePct: 37,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Döner King',
          neighborhood: 'Calea Martirilor',
          dishHighlight: 'Shaorma clasică cu cartofi crocanți',
          votes: 348,
          voteSharePct: 33,
          trendLabel: '▲ 1',
        },
        {
          rank: 3,
          venueName: 'Aladdin Kebab',
          neighborhood: 'Piața 700',
          dishHighlight: 'Shaorma vită & pui pe jar',
          votes: 318,
          voteSharePct: 30,
          trendLabel: 'NOU',
        },
      ],
    },
    {
      id: 'burger',
      title: 'Cel mai bun burger',
      shortLabel: 'Burger',
      totalVotes: 845,
      top3: [
        {
          rank: 1,
          venueName: "Jack's Bistro",
          venueSlug: 'jacks-bistro',
          neighborhood: 'Cetate',
          dishHighlight: "Jack's Burger Black Angus & cheddar",
          votes: 370,
          voteSharePct: 44,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Meat Busters',
          neighborhood: 'Fabric',
          dishHighlight: 'Burger cu brisket afumat lent',
          votes: 265,
          voteSharePct: 31,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: "Harold's",
          venueSlug: 'harolds-restaurant',
          neighborhood: 'Complexul Studențesc',
          dishHighlight: 'Double Smash Burger',
          votes: 210,
          voteSharePct: 25,
          trendLabel: '▲ 1',
        },
      ],
    },
    {
      id: 'pizza',
      title: 'Cea mai bună pizza',
      shortLabel: 'Pizza',
      totalVotes: 1006,
      top3: [
        {
          rank: 1,
          venueName: 'La Focacceria',
          venueSlug: 'la-focacceria',
          neighborhood: 'Piața Libertății',
          dishHighlight: 'Pizza al taglio cu prosciutto și ciuperci',
          votes: 430,
          voteSharePct: 43,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'La Piazzetta',
          neighborhood: 'Iosefin',
          dishHighlight: 'Margherita cu mozzarella di bufala',
          votes: 305,
          voteSharePct: 30,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'Pizza Napoleon',
          venueSlug: 'pizza-napoleon',
          neighborhood: 'Complexul Studențesc',
          dishHighlight: 'Pizza Diavola pe vatră',
          votes: 271,
          voteSharePct: 27,
          trendLabel: '▲ 1',
        },
      ],
    },
    {
      id: 'mancare-gatita',
      title: 'Cea mai bună mâncare gătită',
      shortLabel: 'Mâncare gătită',
      totalVotes: 1017,
      top3: [
        {
          rank: 1,
          venueName: 'Restaurant Nora',
          venueSlug: 'restaurant-nora',
          neighborhood: 'Dâmbovița / Iosefin',
          dishHighlight: 'Plescaviță sârbească & ciorbă de burtă',
          votes: 468,
          voteSharePct: 46,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Casa Bunicii',
          venueSlug: 'casa-bunicii',
          neighborhood: 'Elisabetin',
          dishHighlight: 'Gomboți cu prune și șnițelul bunicii',
          votes: 325,
          voteSharePct: 32,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'Suppa Bar',
          venueSlug: 'suppa-bar',
          neighborhood: 'Cetate',
          dishHighlight: 'Supă cremă de roșii coapte',
          votes: 224,
          voteSharePct: 22,
          trendLabel: 'NOU',
        },
      ],
    },
    {
      id: 'asiatic',
      title: 'Cel mai bun asiatic & street food',
      shortLabel: 'Asiatic',
      totalVotes: 722,
      top3: [
        {
          rank: 1,
          venueName: 'Little Hanoi',
          venueSlug: 'little-hanoi',
          neighborhood: 'Cetate',
          dishHighlight: 'Supă Pho Bo tradițională cu vită',
          votes: 318,
          voteSharePct: 44,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Sushi Ya',
          venueSlug: 'sushi-ya-timisoara',
          neighborhood: 'Piața Victoriei',
          dishHighlight: 'Platou Salmon Lovers',
          votes: 215,
          voteSharePct: 30,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'Riyo Wok & Sushi',
          venueSlug: 'riyo-wok-sushi',
          neighborhood: 'Cetate',
          dishHighlight: 'Pad Thai cu creveți',
          votes: 189,
          voteSharePct: 26,
          trendLabel: 'NOU',
        },
      ],
    },
    {
      id: 'brunch',
      title: 'Cel mai bun brunch & patiserie',
      shortLabel: 'Brunch',
      totalVotes: 717,
      top3: [
        {
          rank: 1,
          venueName: 'Neața Omelette Bistro',
          venueSlug: 'neata-omelette-bistro',
          neighborhood: 'Piața Unirii',
          dishHighlight: 'Ouă Benedict cu somon afumat',
          votes: 352,
          voteSharePct: 49,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Prospero',
          venueSlug: 'prospero-iulius-town',
          neighborhood: 'Calea Aradului',
          dishHighlight: 'Croissant cu unt & pâine cu maia',
          votes: 221,
          voteSharePct: 31,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'Biofresh',
          venueSlug: 'biofresh-timisoara',
          neighborhood: 'Cetate',
          dishHighlight: 'Tort raw-vegan cu caju',
          votes: 144,
          voteSharePct: 20,
          trendLabel: 'NOU',
        },
      ],
    },
  ],
};

const DRINK_BY_MONTH: Record<string, PublicVoteCategoryTop[]> = {
  '2026-11': [
    {
      id: 'bere',
      title: 'Cea mai bună bere la halbă',
      shortLabel: 'Bere la halbă',
      totalVotes: 850,
      top3: [
        {
          rank: 1,
          venueName: 'Scârț Loc Lejer',
          venueSlug: 'scart-loc-lejer',
          neighborhood: 'Elisabetin',
          dishHighlight: 'Timișoreana nefiltrată la halbă 0,5 l',
          votes: 374,
          voteSharePct: 44,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Berăria 700',
          venueSlug: 'beraria-700',
          neighborhood: 'Piața 700',
          dishHighlight: 'Bere proaspătă la halbă 0,5 l',
          votes: 272,
          voteSharePct: 32,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: "The 80's Pub",
          venueSlug: 'the-80s-pub',
          neighborhood: 'Arieș / Complex',
          dishHighlight: 'Bere la draft 0,5 l',
          votes: 204,
          voteSharePct: 24,
          trendLabel: '▲ 1',
        },
      ],
    },
    {
      id: 'cocktail',
      title: 'Cel mai bun cocktail bar',
      shortLabel: 'Cocktail',
      totalVotes: 683,
      top3: [
        {
          rank: 1,
          venueName: 'Aethernativ Café',
          venueSlug: 'aethernativ-cafe',
          neighborhood: 'Mărășești',
          dishHighlight: 'Negroni clasic cu portocală deshidratată',
          votes: 328,
          voteSharePct: 48,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Scârț Loc Lejer',
          venueSlug: 'scart-loc-lejer',
          neighborhood: 'Elisabetin',
          dishHighlight: 'Vin fiert cu scorțișoară & socată de casă',
          votes: 205,
          voteSharePct: 30,
          trendLabel: '▲ 1',
        },
        {
          rank: 3,
          venueName: 'Manufactura',
          venueSlug: 'manufactura-pub',
          neighborhood: 'Iosefin',
          dishHighlight: 'Gin Tonic & long drinks de concert',
          votes: 150,
          voteSharePct: 22,
          trendLabel: '▼ 1',
        },
      ],
    },
    {
      id: 'atmosfera',
      title: 'Cea mai bună atmosferă de seară',
      shortLabel: 'Atmosferă',
      totalVotes: 872,
      top3: [
        {
          rank: 1,
          venueName: 'Scârț Loc Lejer',
          venueSlug: 'scart-loc-lejer',
          neighborhood: 'Elisabetin',
          dishHighlight: 'Curte cu hamace & teatru Auăleu',
          votes: 401,
          voteSharePct: 46,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: "The 80's Pub",
          venueSlug: 'the-80s-pub',
          neighborhood: 'Arieș / Complex',
          dishHighlight: "Petreceri retro '80s–'90s",
          votes: 279,
          voteSharePct: 32,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'Aethernativ Café',
          venueSlug: 'aethernativ-cafe',
          neighborhood: 'Mărășești',
          dishHighlight: 'DJ seturi în curtea interioară',
          votes: 192,
          voteSharePct: 22,
          trendLabel: '▲ 1',
        },
      ],
    },
  ],
  '2026-10': [
    {
      id: 'bere',
      title: 'Cea mai bună bere la halbă',
      shortLabel: 'Bere la halbă',
      totalVotes: 800,
      top3: [
        {
          rank: 1,
          venueName: 'Scârț Loc Lejer',
          venueSlug: 'scart-loc-lejer',
          neighborhood: 'Elisabetin',
          dishHighlight: 'Timișoreana nefiltrată la halbă 0,5 l',
          votes: 360,
          voteSharePct: 45,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Berăria 700',
          venueSlug: 'beraria-700',
          neighborhood: 'Piața 700',
          dishHighlight: 'Bere proaspătă la halbă 0,5 l',
          votes: 255,
          voteSharePct: 32,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'Manufactura',
          venueSlug: 'manufactura-pub',
          neighborhood: 'Iosefin',
          dishHighlight: 'Bere rece la concerte live',
          votes: 185,
          voteSharePct: 23,
          trendLabel: 'NOU',
        },
      ],
    },
    {
      id: 'cocktail',
      title: 'Cel mai bun cocktail bar',
      shortLabel: 'Cocktail',
      totalVotes: 660,
      top3: [
        {
          rank: 1,
          venueName: 'Aethernativ Café',
          venueSlug: 'aethernativ-cafe',
          neighborhood: 'Mărășești',
          dishHighlight: 'Negroni clasic cu portocală deshidratată',
          votes: 310,
          voteSharePct: 47,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: 'Manufactura',
          venueSlug: 'manufactura-pub',
          neighborhood: 'Iosefin',
          dishHighlight: 'Gin Tonic & long drinks de concert',
          votes: 198,
          voteSharePct: 30,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'Scârț Loc Lejer',
          venueSlug: 'scart-loc-lejer',
          neighborhood: 'Elisabetin',
          dishHighlight: 'Socată de casă & vin fiert',
          votes: 152,
          voteSharePct: 23,
          trendLabel: 'NOU',
        },
      ],
    },
    {
      id: 'atmosfera',
      title: 'Cea mai bună atmosferă de seară',
      shortLabel: 'Atmosferă',
      totalVotes: 855,
      top3: [
        {
          rank: 1,
          venueName: 'Scârț Loc Lejer',
          venueSlug: 'scart-loc-lejer',
          neighborhood: 'Elisabetin',
          dishHighlight: 'Curte cu hamace & teatru Auăleu',
          votes: 385,
          voteSharePct: 45,
          trendLabel: '=',
        },
        {
          rank: 2,
          venueName: "The 80's Pub",
          venueSlug: 'the-80s-pub',
          neighborhood: 'Arieș / Complex',
          dishHighlight: "Petreceri retro '80s–'90s",
          votes: 290,
          voteSharePct: 34,
          trendLabel: '=',
        },
        {
          rank: 3,
          venueName: 'FABER',
          venueSlug: 'faber-timisoara',
          neighborhood: 'Fabric',
          dishHighlight: 'Seri culturale pe malul Begăi',
          votes: 180,
          voteSharePct: 21,
          trendLabel: 'NOU',
        },
      ],
    },
  ],
};

export function getPublicVoteCategoryTops(
  vertical: Vertical,
  month: string
): PublicVoteCategoryTop[] {
  const map = vertical === 'drink' ? DRINK_BY_MONTH : FOOD_BY_MONTH;
  return map[month] ?? map['2026-11'] ?? [];
}

/** Luna activă în care voturile sunt deschise (prima lună din listă sau 2026-11). */
export function getCurrentActiveVoteMonth(availableMonths?: string[]): string {
  return availableMonths?.[0] ?? '2026-11';
}

export function toCandidateSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shaorma: ['shaorma', 'kebab', 'doner', 'döner', 'oriental', 'libanez', 'lipie', 'street food'],
  burger: ['burger', 'smash', 'bistro', 'american', 'angus', 'grill'],
  pizza: ['pizza', 'pizzerie', 'focaccia', 'focacceria', 'napoletana', 'trattoria', 'italian'],
  'mancare-gatita': ['ciorba', 'gulas', 'papricas', 'romanesc', 'traditional', 'gatita', 'sarmale', 'banatean', 'bistro', 'restaurant'],
  asiatic: ['asiatic', 'ramen', 'sushi', 'thai', 'wok', 'curry', 'vietnamez', 'coreean', 'noodles', 'pho'],
  brunch: ['brunch', 'cafea', 'specialitate', 'mic dejun', 'croissant', 'patiserie', 'ou', 'shakshuka', 'coffee'],
  bere: ['bere', 'craft', 'pub', 'berarie', 'tap', 'ipa', 'halba'],
  cocktail: ['cocktail', 'gin', 'speakeasy', 'bar', 'negroni', 'sour', 'mixology'],
  atmosfera: ['atmosfera', 'terasa', 'muzica', 'live', 'gradina', 'cultural', 'pub', 'jazz', 'bar', 'bistro'],
};

function matchesCategoryKeywords(venue: Restaurant, categoryId: string): boolean {
  const keywords = CATEGORY_KEYWORDS[categoryId];
  if (!keywords) return true;
  const haystack = [
    venue.cuisine,
    venue.shortCategory ?? '',
    ...(venue.categories ?? []),
    ...venue.occasionTags,
    ...venue.whatToOrder.map((d) => `${d.name} ${d.description ?? ''}`),
  ]
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return keywords.some((kw) => haystack.includes(kw));
}

export function mergeCategoryTopWithVotes(
  category: PublicVoteCategoryTop,
  restaurants: Restaurant[],
  vertical: Vertical,
  extraVotesBySlug: Record<string, number> = {}
): ComputedCategoryVoteTop {
  const seen = new Map<
    string,
    {
      candidateSlug: string;
      venueName: string;
      venueSlug?: string;
      neighborhood: string;
      dishHighlight: string;
      votes: number;
      baselineOrder: number;
      trendLabel: string;
    }
  >();

  category.top3.forEach((entry, idx) => {
    const slug = entry.venueSlug ?? toCandidateSlug(entry.venueName);
    seen.set(slug, {
      candidateSlug: slug,
      venueName: entry.venueName,
      venueSlug: entry.venueSlug,
      neighborhood: entry.neighborhood,
      dishHighlight: entry.dishHighlight,
      votes: entry.votes + (extraVotesBySlug[slug] ?? 0),
      baselineOrder: idx,
      trendLabel: entry.trendLabel,
    });
  });

  for (const venue of restaurants) {
    if (venue.isSponsored || venue.touristTrapIndex >= 60) continue;
    if ((venue.vertical ?? vertical) !== vertical) continue;
    if (!matchesCategoryKeywords(venue, category.id)) continue;
    if (seen.has(venue.slug)) continue;

    seen.set(venue.slug, {
      candidateSlug: venue.slug,
      venueName: venue.name,
      venueSlug: venue.slug,
      neighborhood: venue.shortNeighborhood ?? venue.neighborhood,
      dishHighlight: venue.whatToOrder[0]?.name ?? venue.shortCategory ?? venue.cuisine,
      votes: extraVotesBySlug[venue.slug] ?? 0,
      baselineOrder: 100,
      trendLabel: 'NOU',
    });
  }

  const sorted = Array.from(seen.values()).sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    if (a.baselineOrder !== b.baselineOrder) return a.baselineOrder - b.baselineOrder;
    return a.venueName.localeCompare(b.venueName, 'ro');
  });

  const totalVotes = sorted.reduce((sum, item) => sum + item.votes, 0);
  const allNominees: PublicVoteNominee[] = sorted.map((item, idx) => ({
    candidateSlug: item.candidateSlug,
    venueName: item.venueName,
    venueSlug: item.venueSlug,
    neighborhood: item.neighborhood,
    dishHighlight: item.dishHighlight,
    votes: item.votes,
    voteSharePct: totalVotes > 0 ? Math.round((item.votes / totalVotes) * 100) : 0,
    rank: idx + 1,
    trendLabel: item.trendLabel,
  }));

  const top3 = allNominees.slice(0, 3).map((item, idx) => ({
    rank: (idx + 1) as 1 | 2 | 3,
    venueName: item.venueName,
    venueSlug: item.venueSlug,
    neighborhood: item.neighborhood,
    dishHighlight: item.dishHighlight,
    votes: item.votes,
    voteSharePct: item.voteSharePct,
    trendLabel: item.trendLabel,
  })) as [PublicVoteCategoryEntry, PublicVoteCategoryEntry, PublicVoteCategoryEntry];

  return {
    id: category.id,
    title: category.title,
    shortLabel: category.shortLabel,
    totalVotes,
    top3,
    allNominees,
  };
}

export interface VenueMonthlyCategoryAward {
  categoryId: string;
  categoryTitle: string;
  shortLabel: string;
  rank: 1 | 2 | 3;
  votes: number;
  voteSharePct: number;
  dishHighlight: string;
}

export function getVenueMonthlyCategoryAwards(
  vertical: Vertical,
  venueSlug: string,
  month = '2026-11',
  extraVotesByCategorySlug?: Record<string, Record<string, number>>,
  restaurants: Restaurant[] = []
): VenueMonthlyCategoryAward[] {
  const categories = getPublicVoteCategoryTops(vertical, month);
  const awards: VenueMonthlyCategoryAward[] = [];

  for (const cat of categories) {
    const merged =
      extraVotesByCategorySlug && extraVotesByCategorySlug[cat.id]
        ? mergeCategoryTopWithVotes(cat, restaurants, vertical, extraVotesByCategorySlug[cat.id]).top3
        : cat.top3;
    const match = merged.find((entry) => entry.venueSlug === venueSlug);
    if (match) {
      awards.push({
        categoryId: cat.id,
        categoryTitle: cat.title,
        shortLabel: cat.shortLabel,
        rank: match.rank,
        votes: match.votes,
        voteSharePct: match.voteSharePct,
        dishHighlight: match.dishHighlight,
      });
    }
  }

  return awards.sort((a, b) => a.rank - b.rank);
}
