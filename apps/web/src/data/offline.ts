/**
 * Ce arată site-ul când baza de date nu răspunde: doar informațiile reale despre localuri din datele statice
 * (nume, adresă, poze, meniu, program, livrare). Scorurile, review-urile, topul lunii, echipa și poveștile
 * din datele statice sunt scrise de mână, deci nu le arătăm: fiecare local apare „fără review-uri”.
 */
import { DRINK_VENUES, INITIAL_RESTAURANTS } from './restaurants';
import type { Restaurant } from '../types';

export function realInfoOnly(r: Restaurant): Restaurant {
  return {
    ...r,
    foodQualityScore: 0,
    localsScore: 0,
    touristsScore: 0,
    googleRawRating: 0,
    touristTrapIndex: 0,
    trapTier: 'mixed-fair',
    trapReasons: [],
    trapBreakdown: { touristVsLocalGap: 0, touristZoneProximityM: 0, priceVsCategoryPct: 0, foreignLangReviewsPct: 0, singleVisitPct: 0 },
    aspectScores: { food: 0, service: 0, value: 0, atmosphere: 0 },
    verifiedVisitCount: undefined,
    scorePriorNote: undefined,
    isSponsored: false,
    sponsoredNote: undefined,
    monthlyRank: undefined,
    monthlyScore: undefined,
    monthlyRankChange: undefined,
    monthlyStatusLabel: undefined,
    crowdSegments: undefined,
    crowdLabel: undefined,
    warnings: undefined,
    reviewCounts: { locals: 0, tourists: 0, influencers: 0 },
    reviews: [],
    kitchenStory: undefined,
    ownerPosts: [],
    team: [],
    videos: [],
    lastUpdated: undefined,
  };
}

export const OFFLINE_FOOD = INITIAL_RESTAURANTS.map(realInfoOnly);
export const OFFLINE_DRINK = DRINK_VENUES.map(realInfoOnly);
