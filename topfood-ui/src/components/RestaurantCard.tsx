import React from 'react';
import { Restaurant, formatScore } from '../types';
import { TrapBadge } from './BrandPrimitives';

export interface RestaurantCardProps {
  restaurant: Restaurant;
  rank?: number;
  onSelect?: (restaurant: Restaurant) => void;
  onClick?: (restaurant: Restaurant) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  rank,
  onSelect,
  onClick,
}) => {
  const handleSelect = () => {
    if (onSelect) onSelect(restaurant);
    else if (onClick) onClick(restaurant);
  };

  const isSevereTrap = restaurant.touristTrapIndex >= 80;
  const isPossibleTrap =
    restaurant.touristTrapIndex >= 60 && restaurant.touristTrapIndex < 80;

  if (restaurant.isSponsored) {
    return (
      <button
        type="button"
        onClick={handleSelect}
        className="w-full px-4 py-3.5 rounded-[4px] bg-[#F2EFE9] flex items-center justify-between gap-4 text-left hover:bg-[#EAE5DC] transition-colors"
      >
        <div className="min-w-0">
          <div className="text-[11px] text-[#6E5649]">
            {restaurant.sponsoredNote ??
              'Sponsorizat. Nu schimbă scorul și nici locul în top.'}
          </div>
          <div className="font-semibold text-[15px] text-[#3A2418] mt-0.5">
            {restaurant.name}
          </div>
          <div className="text-[12px] text-[#6E5649]">
            {restaurant.shortCategory ?? restaurant.cuisine},{' '}
            {restaurant.shortNeighborhood ?? restaurant.neighborhood},{' '}
            {restaurant.priceRangeLabel ?? `~${restaurant.avgMealPriceRon} lei`}
          </div>
        </div>
        <span className="font-display-regular text-[24px] leading-none text-[#6E5649] tabular-nums shrink-0">
          {formatScore(restaurant.foodQualityScore)}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      className="w-full py-3.5 border-b border-[#E6DFD5] flex items-center justify-between gap-4 text-left hover:bg-[#FAF8F5] transition-colors px-1 -mx-1 rounded-[3px]"
    >
      <div className="flex items-center gap-4 min-w-0">
        {typeof rank === 'number' && (
          <span className="font-display text-[26px] leading-none text-[#3A2418] w-5 shrink-0">
            {rank}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[16px] text-[#3A2418]">
              {restaurant.name}
            </span>
            {isSevereTrap && <TrapBadge variant="severe" label="Capcană" />}
            {isPossibleTrap && (
              <TrapBadge variant="possible" label="Posibilă capcană" />
            )}
          </div>
          <div className="text-[13px] text-[#6E5649]">
            {restaurant.shortCategory ?? restaurant.cuisine},{' '}
            {restaurant.shortNeighborhood ?? restaurant.neighborhood},{' '}
            {restaurant.priceRangeLabel ?? `~${restaurant.avgMealPriceRon} lei`}
          </div>
        </div>
      </div>

      <span className="font-display text-[32px] leading-none text-[#3A2418] tabular-nums shrink-0">
        {formatScore(restaurant.foodQualityScore)}
      </span>
    </button>
  );
};

export default RestaurantCard;
