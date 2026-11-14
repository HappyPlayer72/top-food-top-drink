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

export type FoodQuickFilter = 'fara-capcane' | 'deschis-acum' | 'sub-50-lei' | 'livrare';
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

/** Preferințele opționale ale userului și răspunsurile structurate (catalogul e în @tftd/scoring/features). */
export type { Answer, FeatureStatus, Interest, TopKey } from '@tftd/scoring/features';
import type { Answer, FeatureStatus, Interest, QuickStats, Theme } from '@tftd/scoring/features';
export type { QuickKind, QuickStats } from '@tftd/scoring/features';

/** Facilitățile unui local, pe teme, cu sursa fiecărei informații (comunitate / declarat de local / nespecificat). */
export interface VenueFeatureGroup {
  theme: Theme;
  label: string;
  items: FeatureStatus[];
}

/** Un top tematic (Accesibilitate, Locuri pentru lucru…): comunitatea, apoi separat „Declarat de local”. */
export interface ThemeTopEntry {
  slug: string;
  name: string;
  neighborhood: string | null;
  facts: FeatureStatus[];
  /** Voturile rapide (siguranță, zgomot): doar afișate, nu schimbă ordinea. */
  quick: QuickStats;
}
export interface ThemeTop {
  theme: Theme;
  label: string;
  community: (ThemeTopEntry & { rank: number })[];
  declared: ThemeTopEntry[];
}

export interface UserSocialLink {
  platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube';
  url: string;
  verified: boolean;
  followers: number | null;
}

export interface UserEmployment {
  employeeId: string;
  venueId: string;
  venueName: string;
  venueSlug: string;
  vertical?: 'food' | 'drink';
  role: string;
  firstName: string;
  accepted: boolean;
}

export interface UserAccount {
  id: string;
  username?: string;
  name: string;
  email?: string;
  role: 'verified-local' | 'tourist';
  /** Eticheta insignei din „Acces rapid” (ex. „Proprietar”); implicit „Turist”. */
  badgeLabel?: string;
  isInfluencer?: boolean;
  followers?: number | null;
  neighborhood?: string;
  weightMultiplier: number;
  description: string;
  interests?: Interest[];
  savedVenueSlugs?: string[];
  socialLinks?: UserSocialLink[];
  employments?: UserEmployment[];
}

export interface AdBanner {
  id: string;
  advertiser: string;
  creativeUrl: string;
  linkUrl: string;
  placement: string;
}

export interface MonthlyAwards {
  month: string | null;
  months: string[];
  revelation: { venueId: string; name?: string; slug?: string; neighborhood?: string; from: number; to: number } | null;
  employee: { employeeId: string; venueId: string; mentions: number; firstName: string; venue: string; venueSlug?: string } | null;
  local: { userId: string; reviews: number; username?: string; displayName: string; neighborhood: string | null } | null;
  influencer: { userId: string; reviews: number; followers: number | null; username?: string; displayName: string } | null;
}

export interface VenueVideo {
  url: string;
  platform: string;
  dishes: string[];
  prices: { item: string; priceLei: number }[];
  isPaid: boolean;
  adSignal: 'marcat_reclama' | 'posibil_reclama' | 'organic';
  sentiment: 'positive' | 'neutral' | 'negative';
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
  /** Poza pusă de owner (servită de /api/menu-photo/{id}). */
  photoUrl?: string;
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
  /** Atribuirea cerută de Google / Tripadvisor la review-urile importate, ex. „de pe Google” */
  sourceLabel?: string;
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
  /** Cum a fost dovedită vizita: check-in GPS la local sau bonul aprobat de admin. */
  verifiedVia?: 'gps' | 'receipt';
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
  /** Răspunsurile la întrebările din review (Da / Nu / Nu am observat). */
  answers?: Record<string, Answer>;
  /** Owner user ID when authored by a signed-in/local user */
  authorId?: string;
  /** Username-ul autorului pentru profil public `/u/{username}` */
  authorUsername?: string;
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
  neighborhood?: string;
  address?: string;
}

export interface TopReviewer {
  id: string;
  username?: string;
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

export interface VenueDeliveryInfo {
  /** Whether delivery is offered */
  available: boolean;
  /** Platforms or delivery channels (e.g. 'Wolt', 'Glovo', 'Bolt Food', 'Livrare proprie') */
  platforms?: string[];
  /** Whether the venue operates its own delivery fleet */
  ownDelivery?: boolean;
  /** Minimum order in RON, if known */
  minimumOrderRon?: number;
  /** Estimated delivery time label (e.g. '30–45 min') */
  estimatedTime?: string;
  /** Extra details in Romanian */
  note?: string;
}

export interface Restaurant {
  id: string;
  /** UUID-ul din baza de date (lipsește la datele statice); îl folosesc acțiunile din backend. */
  venueId?: string;
  slug: string;
  name: string;
  vertical?: Vertical;
  neighborhood: Neighborhood;
  shortNeighborhood?: string;
  cuisine: string;
  shortCategory?: string;
  categories?: string[];
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
  /** Câte review-uri au vizita dovedită (GPS sau bon), cântărite ×1,3. */
  verifiedVisitCount?: number;
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
  /** Din backend: facilitățile cu sursa lor. Lipsă = date statice (fără backend). */
  features?: VenueFeatureGroup[];
  /** Din backend: media voturilor rapide de siguranță și zgomotul obișnuit (de la prag). */
  quick?: QuickStats;

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

  // --- Warnings, Practical Facilities & Delivery ---
  warnings?: VenueWarnings;
  facilities?: VenueFacilities;
  delivery?: VenueDeliveryInfo;

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
  videos?: VenueVideo[];
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

/** Scorul Onest afișat: „—” cât timp localul nu are review-uri (în formulă scorul nu ajunge niciodată la 0). */
export function formatHonest(score: number): string {
  return score > 0 ? formatScore(score) : '—';
}

/** Pentru aria-label: cititoarele de ecran nu rostesc „—”, deci spunem explicit „fără Scor Onest încă”. */
export function honestSpoken(score: number): string {
  return score > 0 ? `scor ${formatScore(score)} din 10` : 'fără Scor Onest încă';
}
