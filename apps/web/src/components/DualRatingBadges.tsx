'use client';

import React, { useState } from 'react';
import { Restaurant, TrapBreakdown, TrapTier, formatScore, getTrapTier } from '../types';
import { LocalVsTouristBars, TrapBadge } from './BrandPrimitives';

export interface DualRatingBadgesProps {
  restaurant?: Restaurant;
  foodQualityScore?: number;
  localsScore?: number;
  touristsScore?: number;
  googleRawRating?: number;
  touristTrapIndex?: number;
  trapTier?: TrapTier;
  trapReasons?: string[];
  trapBreakdown?: TrapBreakdown;
  variant?: 'card' | 'compact' | 'detail';
  showBreakdownToggle?: boolean;
  className?: string;
}

export function getTrapTierMeta(touristTrapIndex: number, tierOverride?: TrapTier) {
  const tier = tierOverride ?? getTrapTier(touristTrapIndex);
  if (tier === 'local-staple') {
    return {
      tier,
      label: 'Fără capcană',
      roLabel: 'Local de încredere',
      rangeLabel: '0–25%',
      badgeClass: 'bg-[#FAF8F5] text-[#3A2418] border border-[#D6CFC5]',
      barColor: '#3A2418',
    };
  }
  if (tier === 'mixed-fair') {
    return {
      tier,
      label: 'Posibilă capcană',
      roLabel: 'Mixt / Preț de centru',
      rangeLabel: '26–60%',
      badgeClass: 'badge-posibila-capcana',
      barColor: '#E0A526',
    };
  }
  return {
    tier,
    label: 'Capcană turistică',
    roLabel: 'Capcană turistică',
    rangeLabel: '61–100%',
    badgeClass: 'badge-capcana',
    barColor: '#B3261E',
  };
}

export const TrapTierBadge: React.FC<{
  touristTrapIndex: number;
  trapTier?: TrapTier;
  size?: 'sm' | 'md';
}> = ({ touristTrapIndex, trapTier }) => {
  const tier = trapTier ?? getTrapTier(touristTrapIndex);
  if (tier === 'tourist-trap') {
    return (
      <TrapBadge
        variant={touristTrapIndex >= 80 ? 'severe' : 'possible'}
        label={
          touristTrapIndex >= 80
            ? `Capcană (${touristTrapIndex}%)`
            : `Posibilă capcană (${touristTrapIndex}%)`
        }
      />
    );
  }
  if (tier === 'mixed-fair') {
    return (
      <TrapBadge
        variant="possible"
        label={`Atenție (${touristTrapIndex} din 100)`}
      />
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] border border-[#D6CFC5] text-[12px] font-semibold text-[#3A2418]">
      {touristTrapIndex} din 100
    </span>
  );
};

export const DualRatingBadges: React.FC<DualRatingBadgesProps> = ({
  restaurant,
  foodQualityScore: propFoodScore,
  localsScore: propLocalsScore,
  touristsScore: propTouristsScore,
  touristTrapIndex: propTrapIndex,
  trapReasons: propTrapReasons,
  trapBreakdown: propTrapBreakdown,
  showBreakdownToggle = true,
  className = '',
}) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const foodScore = propFoodScore ?? restaurant?.foodQualityScore ?? 0;
  const localsScore = propLocalsScore ?? restaurant?.localsScore ?? foodScore;
  const touristsScore = propTouristsScore ?? restaurant?.touristsScore ?? foodScore;
  const trapIndex = propTrapIndex ?? restaurant?.touristTrapIndex ?? 0;
  const trapReasons = propTrapReasons ?? restaurant?.trapReasons ?? [];
  const trapBreakdown = propTrapBreakdown ?? restaurant?.trapBreakdown;

  return (
    <div
      className={`border border-[#E6DFD5] bg-white rounded-[4px] p-4 space-y-3 ${className}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-breakdown-toggle]')) {
          e.stopPropagation();
        }
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <span className="text-[12px] text-[#6E5649] block">
            Scor onest din 10
          </span>
          <span className="font-display text-[36px] leading-none text-[#3A2418] tabular-nums">
            {formatScore(foodScore)}
          </span>
        </div>

        <TrapTierBadge touristTrapIndex={trapIndex} />
      </div>

      <LocalVsTouristBars
        localsScore={localsScore}
        touristsScore={touristsScore}
        showSummary={trapIndex >= 60}
      />

      {showBreakdownToggle && trapBreakdown && (
        <div>
          <button
            type="button"
            data-breakdown-toggle="true"
            onClick={(e) => {
              e.stopPropagation();
              setIsBreakdownOpen((prev) => !prev);
            }}
            className="text-[12px] font-semibold text-[#B3261E] underline underline-offset-4"
          >
            {isBreakdownOpen ? 'Ascunde calculul' : 'Cum calculăm asta'}
          </button>

          {isBreakdownOpen && trapReasons.length > 0 && (
            <ul className="mt-2 list-disc pl-4 space-y-1 text-[12px] text-[#6E5649]">
              {trapReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default DualRatingBadges;
