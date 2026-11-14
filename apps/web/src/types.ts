/**
 * topfood/timișoara & topdrink/timișoara — Domain & Architecture Types
 * Implements the Dual-Rating System:
 * 1. Scor Onest (0.0 – 10.0) — Quality independent of price or sponsorship
 * 2. Tourist Trap Index (0% – 100%) — Explainable multi-signal trap detector
 */

export type Vertical = 'food' | 'drink';
export type NavSection = 'top' | 'map' | 'monthly' | 'scarnavii' | 'fidelitate';

export interface ScarnaviiActivity {
  id: string;
  title: string;
  category?: string;
}

export type LoyaltyIconId =
  | 'soup'
  | 'coffee'
  | 'croissant'
  | 'pizza'
  | 'beer'
  | 'wine'
  | 'heart'
  | 'cat';

export interface LoyaltyProgram {
  id: string;
  venueName: string;
  neighborhood: string;
  rewardTitle: string;
  stampsRequired: number;
  iconId: LoyaltyIconId;
  accentColor: string;
  stampsCollected: number;
  redeemedCount: number;
  qrSeed: string;
  isCustomVendor?: boolean;
}

export type FoodQuickFilter = 'fara-capcane' | 'deschis-acum' | 'sub-50-lei';
export type DrinkQuickFilter =
  | 'vineri-noaptea'
  | 'in-timpul-saptamanii'
  | 'muzica-live'
  | 'bere-sub-15-lei';

export type Neighborhood =
  | 'Cetate / Piața Unirii'
  | 'Piața Victoriei'
  | 'Piața Libertății'
  | 'Bastion'
  | 'Iosefin'
  | 'Fabric'
  | 'Complexul Studențesc'
  | 'Elisabetin';

export type PriceTier = '$' | '$$' | '$$$' | '$$$$';

export type TrapTier = 'local-staple' | 'mixed-fair' | 'tourist-trap';

export type AuthorRole = 'verified-local' | 'tourist' | 'influencer' | 'regular';

export type UserPreferenceKey =
  | 'accessible'
  | 'outlets'
  | 'goodWifi'
  | 'goodForWork'
  | 'quiet'
  | 'petFriendly'
  | 'softLighting'
  | 'heatedTerrace';

export interface UserPreferenceOption {
  key: UserPreferenceKey;
  label: string;
  question: string;
}

export const USER_PREFERENCE_OPTIONS: UserPreferenceOption[] = [
  {
    key: 'accessible',
    label: 'Accesibil dizabilități',
    question: 'Este accesibil pentru persoane cu dizabilități?',
  },
  {
    key: 'outlets',
    label: 'Prize la mese',
    question: 'Există prize la mese?',
  },
  {
    key: 'goodWifi',
    label: 'Wi-Fi bun',
    question: 'Wi-Fi-ul funcționează bine?',
  },
  {
    key: 'goodForWork',
    label: 'Bun de lucrat',
    question: 'Este un loc bun pentru lucrat (laptop)?',
  },
  {
    key: 'quiet',
    label: 'Liniște / fără gălăgie',
    question: 'Este suficient de liniște?',
  },
  {
    key: 'petFriendly',
    label: 'Pet-friendly',
    question: 'Este pet-friendly?',
  },
  {
    key: 'softLighting',
    label: 'Fără lumină stridentă',
    question: 'Lumina este plăcută (nu deranjant de puternică)?',
  },
  {
    key: 'heatedTerrace',
    label: 'Terasă încălzită',
    question: 'Are terasă încălzită?',
  },
];

export interface UserAccount {
  id: string;
  name: string;
  email?: string;
  role: 'verified-local' | 'tourist';
  neighborhood?: string;
  weightMultiplier: number;
  description: string;
  preferences?: UserPreferenceKey[];
}

export interface SignatureDish {
  name: string;
  priceRon: number;
  description?: string;
  isMustOrder?: boolean;
}

export interface MenuItem {
  name: string;
  priceRon: number;
  description?: string;
  portion?: string;
  isMustOrder?: boolean;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export interface WeeklyHoursEntry {
  day: string;
  hours: string;
}

/**
 * Multi-signal Tourist Trap Index breakdown (weights from TOP FOOD Architecture):
 * - 30% Discrepancy between Tourist scores and Verified Local scores
 * - 20% Proximity to high-traffic tourist plazas (<300m radius)
 * - 20% Price markup vs category average in Timișoara
 * - 15% Share of foreign-language reviews
 * - 15% Single-visit (non-returning customer) rate
 */
export interface TrapBreakdown {
  /** Positive means tourists rate it higher than locals (e.g. +3.3 points) */
  touristVsLocalGap: number;
  /** Distance in meters to nearest primary tourist plaza (Unirii, Victoriei, Libertății, Bastion) */
  touristZoneProximityM: number;
  /** Percentage difference from category average price (e.g. +60 or -15) */
  priceVsCategoryPct: number;
  /** Percentage of reviews written in foreign languages (0–100) */
  foreignLangReviewsPct: number;
  /** Percentage of reviewers who never return for a second visit (0–100) */
  singleVisitPct: number;
}

export interface AspectScores {
  food: number;
  service: number;
  value: number;
  atmosphere: number;
}

export type NoiseLevel = 'linistit' | 'moderat' | 'animat' | 'zgomotos';

export interface Review {
  id?: string;
  authorName: string;
  authorRole: AuthorRole;
  /** Neighborhood displayed inside the Plăcuță badge, e.g. 'Iosefin', 'Fabric' */
  authorNeighborhood?: string;
  /** Follower count badge for influencers, e.g. '24k' */
  followerCountText?: string;
  /** How many people found the review useful */
  helpfulCount?: number;
  /**
   * Trust weight multiplier from TOP FOOD Architecture:
   * - 2.0x for verified Timișoara local (GPS residence / @e-uvt.ro / @upt.ro)
   * - 1.3x for GPS/receipt verified visit
   * - 1.0x for regular/tourist user
   * - 0.2x for declared paid influencer collaboration
   */
  weightMultiplier: number;
  isVerifiedVisit: boolean;
  isPaidCollab?: boolean;
  /** Independent Score 1: Food & Experience Quality (0.0 – 10.0) */
  foodScore: number;
  /** Independent Score 2: Value & Tourist Trap Estimate (0 – 100%) */
  trapEstimatePct: number;
  /** Whether the reviewer explicitly flagged this venue as a tourist trap */
  markedAsTouristTrap?: boolean;
  date: string;
  text: string;
  language: string;
  /** Rule #2: Owners can reply publicly, but can NEVER delete or hide a review */
  ownerReply?: string;
  /** Optional owner display name for reply, e.g. 'Sandu, proprietar' */
  ownerReplyAuthor?: string;
  /** Optional employee praised in this visit ("Rate the Employee / Angajatul lunii") */
  praisedEmployee?: string;
  /** How safe the reviewer felt (1–5) */
  safetyScore?: number;
  /** Perceived noise level at the venue */
  noiseLevel?: NoiseLevel;
  /** Optional answers to preference questions after posting a review */
  preferenceAnswers?: Partial<Record<UserPreferenceKey, boolean>>;
}

export interface OwnerPost {
  id: string;
  type: 'menu' | 'event' | 'offer' | 'news';
  title: string;
  content: string;
  date: string;
}

export interface KitchenStory {
  author: string;
  date: string;
  title: string;
  body: string;
  photoUrl?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  positiveMentions: number;
  isEmployeeOfMonth?: boolean;
  monthLabel?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TouristZone {
  id: string;
  name: string;
  shortName: string;
  description: string;
  center: Coordinates;
  radiusM: number;
}

export interface WeekendEvent {
  id: string;
  dayShort: 'vin.' | 'sâm.' | 'dum.';
  dayNumber: string;
  title: string;
  venueName: string;
  venueId: string;
  details: string;
}

export interface TopReviewer {
  id: string;
  initials: string;
  name: string;
  role: 'verified-local' | 'influencer';
  badgeLabel: string;
  helpfulVotes: number;
}

export interface VenueWarnings {
  /** Venue or surrounding area can feel unsafe (e.g. poorly lit street at night) */
  unsafeFeeling?: string;
  /** Very noisy environment (loud music, echo, crowded room) */
  veryNoisy?: string;
  /** Very bright or harsh lighting (important for sensory sensitivity) */
  brightLights?: string;
}

export interface VenueFacilities {
  /** Wheelchair / step-free access & accessible restroom */
  disabilityFriendly?: boolean | string;
  /** Power outlets available at tables */
  hasOutlets?: boolean;
  /** Other notable facilities (Wi-Fi, pet-friendly, baby changing, bike rack, etc.) */
  otherFacilities?: string[];
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  vertical?: Vertical;
  neighborhood: Neighborhood;
  shortNeighborhood?: string;
  cuisine: string;
  shortCategory?: string;
  priceTier: PriceTier;
  avgMealPriceRon: number;
  categoryAvgPriceRon: number;
  priceRangeLabel?: string;
  openUntilLabel?: string;
  photoUrl: string;
  editorialHeadline: string;
  editorialWriteup: string[];
  whatToOrder: SignatureDish[];
  occasionTags: string[];

  // --- Dual-Rating System ---
  foodQualityScore: number;
  localsScore: number;
  touristsScore: number;
  googleRawRating: number;
  touristTrapIndex: number;
  trapTier: TrapTier;
  trapReasons: string[];
  trapBreakdown: TrapBreakdown;
  aspectScores: AspectScores;

  // --- Monetization & Editorial ---
  isSponsored: boolean;
  sponsoredNote?: string;
  isPartner: boolean;
  coordinates: Coordinates;
  address: string;
  hours: string;
  weeklyHours?: WeeklyHoursEntry[];
  openNow: boolean;
  phone: string;
  lastUpdated?: string;
  menuCategories?: MenuCategory[];

  // --- Monthly Leaderboard ---
  monthlyRank?: number;
  monthlyScore?: number;
  monthlyStatusLabel?: string;
  monthlyRankChange?: number;
  isRisingStar?: boolean;

  // --- topdrink Live Vibe Check ---
  crowdSegments?: 1 | 2 | 3 | 4 | 5;
  crowdLabel?: string;
  drinkTags?: DrinkQuickFilter[];

  // --- Warnings & Practical Facilities ---
  warnings?: VenueWarnings;
  facilities?: VenueFacilities;

  // --- Reviews & Owner Kitchen Story & Team ---
  reviewCounts?: {
    locals: number;
    tourists: number;
    influencers: number;
  };
  reviews: Review[];
  kitchenStory?: KitchenStory;
  ownerPosts?: OwnerPost[];
  team?: TeamMember[];
}

/**
 * Helper to derive semantic TrapTier from a 0–100% Tourist Trap Index
 */
export function getTrapTier(touristTrapIndex: number): TrapTier {
  if (touristTrapIndex <= 25) return 'local-staple';
  if (touristTrapIndex <= 60) return 'mixed-fair';
  return 'tourist-trap';
}

/**
 * Format decimal scores in Romanian comma format (e.g. 9.1 -> "9,1")
 */
export function formatScore(score: number): string {
  return score.toFixed(1).replace('.', ',');
}
