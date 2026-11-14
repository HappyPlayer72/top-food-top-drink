/**
 * Tururile tematice din Tasting Tour și regulile insignelor. Fără importuri: modulul e folosit și în browser
 * (`@tftd/api/tours`). Insignele nu se cumpără: contează doar check-in-urile și review-urile care trec filtrele.
 */

export type ThemedTour = {
  slug: string;
  name: string;
  blurb: string;
  /** Categoriile din Tasting Tour (`TasteCategory` în apps/web), în ordinea opririlor. */
  categories: readonly string[];
  /** Ora sugerată de plecare, HH:MM. */
  time: string;
  budgetRon: number;
  stops: 2 | 3;
  /** Pe categorie, slug-urile localurilor care se potrivesc temei. Doar din ele se face traseul și se dă ștampila. */
  venues: Readonly<Record<string, readonly string[]>>;
};

const BEER = ["aethernativ-cafe", "beraria-700", "darc-pe-mal", "scart-loc-lejer", "the-80s-pub"];

/**
 * Verificate pe datele din DB (30 de localuri): ies traseele complete în fiecare zi, din toate punctele de plecare.
 * shortcut: listele `venues` sunt generate o dată din meniuri; un local nou intră într-un tur doar după ce le regenerezi
 * (scriptul de verificare a tururilor). Trecem pe potrivire pe server când meniurile stau toate în `menu_items`.
 */
export const THEMED_TOURS: readonly ThemedTour[] = [
  {
    slug: "turul-ciorbelor", name: "Turul ciorbelor", blurb: "Trei supe și ciorbe, de la bănățene la pho.", categories: ["soup"], time: "13:00", budgetRon: 100, stops: 3,
    venues: { soup: ["biofresh-timisoara", "casa-bunicii", "gradina-banateana", "little-hanoi", "restaurant-nora", "sabres-restaurant", "suppa-bar"] },
  },
  { slug: "bere-pe-bega", name: "Bere pe Bega", blurb: "Trei halbe, cu pontonul de pe Bega la mijloc.", categories: ["beer"], time: "19:00", budgetRon: 60, stops: 3, venues: { beer: BEER } },
  {
    slug: "turul-dulce", name: "Turul dulce", blurb: "Trei deserturi, de la papanași la cannoli.", categories: ["dessert"], time: "15:00", budgetRon: 80, stops: 3,
    venues: { dessert: ["biofresh-timisoara", "casa-bunicii", "la-focacceria", "neata-omelette-bistro", "restaurant-nora"] },
  },
  {
    slug: "romanesc-si-o-bere", name: "Românesc + o bere", blurb: "Mici sau sarmale, apoi o bere rece.", categories: ["romanian", "beer"], time: "19:00", budgetRon: 90, stops: 2,
    venues: { romanian: ["casa-bunicii", "gradina-banateana", "restaurant-nora"], beer: BEER },
  },
  {
    slug: "seara-cu-vin", name: "Seară cu vin", blurb: "Două pahare de vin din Banat.", categories: ["wine"], time: "19:00", budgetRon: 90, stops: 2,
    venues: { wine: ["aethernativ-cafe", "scart-loc-lejer", "vinto-gastro-wine-bar"] },
  },
];

export const findThemedTour = (slug: string) => THEMED_TOURS.find((tour) => tour.slug === slug) ?? null;

/** Toate localurile din care se poate face turul (pentru generatorul din browser). */
export const themedTourVenues = (tour: ThemedTour) => new Set(Object.values(tour.venues).flat());

/**
 * Opririle (slug-uri, câte una pe local) se potrivesc turului: fiecare e în lista unei categorii, iar fiecare
 * categorie are o oprire a ei („Românesc + o bere” cere un local românesc ȘI unul cu bere, nu două beri).
 */
export function stopsMatchTour(tour: ThemedTour, slugs: readonly string[]): boolean {
  const pool = themedTourVenues(tour);
  if (!slugs.every((slug) => pool.has(slug))) return false;
  // Potrivire categorie → oprire diferită; cel mult 3 opriri, deci căutarea completă e ieftină.
  const assign = (index: number, used: Set<string>): boolean => {
    if (index === tour.categories.length) return true;
    const options = tour.venues[tour.categories[index]!] ?? [];
    return slugs.some((slug) => !used.has(slug) && options.includes(slug) && assign(index + 1, new Set([...used, slug])));
  };
  return assign(0, new Set());
}

/** Câte localuri DIFERITE dintr-o categorie: Bronz și Argint din review-urile publicate, Aur doar din vizite verificate. */
export const CATEGORY_BADGE_LEVELS = { bronze: 3, silver: 10, gold: 25 } as const;
export type BadgeLevel = keyof typeof CATEGORY_BADGE_LEVELS;
/** Peste acest prag analiza marchează review-ul ca suspect (același prag ca mesajul din submitReview). */
const SUSPECT_FAKE_PROBABILITY = 0.5;

export type BadgeReview = {
  venueId: string;
  categories: readonly string[];
  status: "published" | "flagged" | "hidden";
  fakeProbability: number;
  isPaid: boolean;
  verifiedVisit: boolean;
};
export type CategoryBadge = { category: string; level: BadgeLevel; venues: number; verifiedVenues: number };

export function categoryBadges(reviews: readonly BadgeReview[]): CategoryBadge[] {
  const byCategory = new Map<string, { venues: Set<string>; verified: Set<string> }>();
  for (const r of reviews) {
    if (r.status !== "published" || r.fakeProbability >= SUSPECT_FAKE_PROBABILITY || r.isPaid) continue;
    for (const category of new Set(r.categories)) {
      const entry = byCategory.get(category) ?? { venues: new Set<string>(), verified: new Set<string>() };
      entry.venues.add(r.venueId);
      if (r.verifiedVisit) entry.verified.add(r.venueId);
      byCategory.set(category, entry);
    }
  }
  const rank: Record<BadgeLevel, number> = { gold: 3, silver: 2, bronze: 1 };
  return [...byCategory]
    .flatMap(([category, { venues, verified }]) => {
      const level: BadgeLevel | null =
        verified.size >= CATEGORY_BADGE_LEVELS.gold ? "gold"
        : venues.size >= CATEGORY_BADGE_LEVELS.silver ? "silver"
        : venues.size >= CATEGORY_BADGE_LEVELS.bronze ? "bronze"
        : null;
      return level ? [{ category, level, venues: venues.size, verifiedVenues: verified.size }] : [];
    })
    .sort((a, b) => rank[b.level] - rank[a.level] || b.venues - a.venues || a.category.localeCompare(b.category));
}
