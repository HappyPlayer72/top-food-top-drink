import React from 'react';
import { ArrowRight } from 'lucide-react';
import { type Restaurant, formatScore } from '../types';
import { CrowdMeter, LocalnicBadge, MugScore, PlateScore } from './BrandPrimitives';

/**
 * Cardul de loc 1 și rândul ilustrat din topul General, refolosite de topurile tematice.
 * `children` înlocuiește textul editorial (topurile tematice pun acolo faptele temei);
 * `themed` colorează rangul și marginea cu accentul temei (clasa `tema-*` vine de la părinte).
 */
type CardProps = {
  venue: Restaurant;
  onSelect: () => void;
  /** Eticheta de pe poză (ex. „#1 În topul localnicilor”). */
  badge?: React.ReactNode;
  themed?: boolean;
  children?: React.ReactNode;
};

type RowProps = CardProps & { rank?: number; staggerIdx: number };

/** Spunem sub număr ce e (și în topurile tematice, unde ordinea vine din răspunsurile Da/Nu, ca să nu pară că 7,8 bate 8,9). */
function ScoreLabel({ dark, children }: { themed?: boolean; dark?: boolean; children: React.ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-2 shrink-0">
      {children}
      {/* aria-hidden: farfuria / halba spun deja „Scor Onest” cititorului de ecran */}
      <span aria-hidden="true" className={`text-[13px] font-bold leading-none whitespace-nowrap ${dark ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}>
        Scor Onest
      </span>
    </span>
  );
}

const stagger = (i: number) => ({ '--stagger-idx': i }) as React.CSSProperties;

/** Livrare (serban): „Livrare: Glovo, Tazz” sau „Doar în local”. Doar în topul General. */
function DeliveryBadge({ venue, featured }: { venue: Restaurant; featured?: boolean }) {
  if (!venue.delivery) return null;
  const on = venue.delivery.available;
  return (
    <span
      className={`${featured ? 'inline-flex items-center text-[11px] font-medium px-2 py-1' : 'text-[11px] font-medium px-1.5 py-0.5'} rounded-[3px] border shrink-0 ${
        on ? 'bg-[#EEF6F0] border-[#CFE3D5] text-[#1E6B43]' : `${featured ? 'bg-white' : 'bg-[#FAF7F2]'} border-[#E6DFD5] text-[#6E5649]`
      }`}
    >
      {on ? `Livrare: ${venue.delivery.platforms?.slice(0, 2).join(', ') || 'Disponibilă'}` : 'Doar în local'}
    </span>
  );
}

export function FoodFeaturedCard({ venue, onSelect, badge, themed, children }: CardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={stagger(0)}
      className={`venue-row-interactive stagger-fade-in w-full text-left rounded-[6px] border border-[#E6DFD5] bg-[#FAF8F5] hover:border-[#3A2418]/40 overflow-hidden group ${
        themed ? 'border-t-[3px] border-t-[var(--tema)]' : ''
      }`}
    >
      <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-[#ECE6DD]">
        <img src={venue.photoUrl} alt="" className="w-full h-full object-cover object-center venue-photo-zoom" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
          {badge}
          <LocalnicBadge label={`Localnici ${formatScore(venue.localsScore)}`} size="xs" />
        </div>
      </div>

      <div className="p-3.5 sm:p-5 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className={`font-display text-[30px] sm:text-[34px] leading-none shrink-0 ${themed ? 'text-[var(--tema)]' : 'text-[#B3261E]'}`}>1</span>
              <h3 className="font-display text-[24px] sm:text-[30px] leading-[1.05] text-[#3A2418] line-clamp-2 sm:truncate">{venue.name}</h3>
            </div>
            <div className="text-[13px] text-[#6E5649]">
              {venue.shortCategory ?? venue.cuisine}, {venue.shortNeighborhood ?? venue.neighborhood},{' '}
              {venue.priceRangeLabel ?? `~${venue.avgMealPriceRon} lei`}
            </div>
          </div>
          <ScoreLabel themed={themed}>
            <PlateScore score={venue.foodQualityScore} size="lg" />
          </ScoreLabel>
        </div>

        {children ?? <p className="text-[13px] text-[#3A2418]/85 line-clamp-2 leading-snug">{venue.editorialHeadline}</p>}

        <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
          {!children && (venue.whatToOrder[0] || venue.delivery) ? (
            <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
              {venue.whatToOrder[0] && (
                <div className="inline-flex max-w-full overflow-hidden items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[3px] bg-white border border-[#E6DFD5] text-[#3A2418]">
                  <span className="text-[#B3261E] font-semibold shrink-0">Recomandat:</span>
                  <span className="min-w-0 truncate">{venue.whatToOrder[0].name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">· {venue.whatToOrder[0].priceRon} lei</span>
                </div>
              )}
              <DeliveryBadge venue={venue} featured />
            </div>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#B3261E] ml-auto shrink-0">
            <span>Vezi fișa</span>
            <ArrowRight className="w-3.5 h-3.5 venue-cta-arrow opacity-75" />
          </span>
        </div>
      </div>
    </button>
  );
}

export function FoodRow({ venue, onSelect, rank, staggerIdx, themed, children }: RowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={stagger(staggerIdx)}
      className="venue-row-interactive stagger-fade-in w-full py-3.5 flex items-center justify-between gap-2.5 sm:gap-3.5 text-left hover:bg-[#FAF8F5] px-0 sm:px-1.5 sm:-mx-1.5 rounded-[4px]"
    >
      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        <span
          aria-hidden={rank ? undefined : true}
          className={`font-display text-[22px] sm:text-[26px] leading-none w-4 sm:w-5 pt-0.5 sm:pt-0 shrink-0 ${themed ? 'text-[var(--tema)]' : 'text-[#3A2418]'}`}
        >
          {rank}
        </span>
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden shrink-0 bg-[#ECE6DD] border border-[#E6DFD5]">
          <img src={venue.photoUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover object-center venue-photo-zoom" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-bold text-[16px] sm:text-[17px] text-[#3A2418] leading-snug line-clamp-2 sm:truncate">{venue.name}</div>
          <div className="text-[12px] sm:text-[13px] text-[#6E5649] truncate">
            {venue.shortCategory ?? venue.cuisine}, {venue.shortNeighborhood ?? venue.neighborhood},{' '}
            {venue.priceRangeLabel ?? `~${venue.avgMealPriceRon} lei`}
          </div>
          {children ?? (
            <>
              <p className="text-[12px] text-[#6E5649]/90 line-clamp-1">{venue.editorialHeadline}</p>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <LocalnicBadge label={`Localnici ${formatScore(venue.localsScore)}`} size="xs" />
                <DeliveryBadge venue={venue} />
                {venue.whatToOrder[0] && <span className="text-[11px] text-[#6E5649] truncate max-w-full">{venue.whatToOrder[0].name}</span>}
              </div>
            </>
          )}
        </div>
      </div>

      <ScoreLabel themed={themed}>
        <PlateScore score={venue.foodQualityScore} />
      </ScoreLabel>
    </button>
  );
}

export function DrinkFeaturedCard({ venue, onSelect, badge, themed, children }: CardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={stagger(0)}
      className={`venue-row-interactive stagger-fade-in w-full text-left rounded-[6px] border border-[#2D5947] bg-[#143025] hover:border-[#F2A33A]/70 overflow-hidden group ${
        themed ? 'border-t-[3px] border-t-[var(--tema)]' : ''
      }`}
    >
      <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-[#122B22]">
        <img src={venue.photoUrl} alt="" className="w-full h-full object-cover object-center venue-photo-zoom" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#143025] via-[#143025]/25 to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
          {badge}
          <LocalnicBadge label={`Localnici ${formatScore(venue.localsScore)}`} size="xs" />
        </div>
      </div>

      <div className="p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className={`font-display text-[28px] sm:text-[30px] leading-none shrink-0 ${themed ? 'text-[var(--tema)]' : 'text-[#F2A33A]'}`}>1</span>
              <h3 className="font-display text-[22px] sm:text-[26px] leading-[1.05] text-[#F4EEE2] line-clamp-2 sm:truncate">{venue.name}</h3>
            </div>
            <div className="text-[13px] text-[#F4EEE2]/75 leading-snug">
              {venue.shortCategory ?? venue.cuisine}, {venue.shortNeighborhood ?? venue.neighborhood}. {venue.priceRangeLabel}
            </div>
          </div>
          <ScoreLabel themed={themed} dark>
            <MugScore score={venue.foodQualityScore} size="lg" />
          </ScoreLabel>
        </div>

        {children ??
          (venue.whatToOrder[0] && (
            <div className="inline-flex max-w-full overflow-hidden items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[3px] bg-[#1E4335] text-[#F4EEE2]/90">
              <span className="text-[#F2A33A] font-semibold shrink-0">Ce să iei:</span>
              <span className="min-w-0 truncate">{venue.whatToOrder[0].name}</span>
              <span className="shrink-0 font-semibold tabular-nums">· {venue.whatToOrder[0].priceRon} lei</span>
            </div>
          ))}

        <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
          <div className="min-w-0">
            {!children && venue.crowdSegments && venue.crowdLabel && <CrowdMeter segments={venue.crowdSegments} label={venue.crowdLabel} />}
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#F2A33A] ml-auto shrink-0 pt-1">
            <span>Vezi fișa</span>
            <ArrowRight className="w-3.5 h-3.5 venue-cta-arrow opacity-75" />
          </span>
        </div>
      </div>
    </button>
  );
}

export function DrinkRow({ venue, onSelect, rank, staggerIdx, themed, children }: RowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={stagger(staggerIdx)}
      className="venue-row-interactive stagger-fade-in w-full py-4 flex items-center justify-between gap-2.5 sm:gap-3.5 text-left hover:bg-[#1C4234] px-0 sm:px-1.5 sm:-mx-1.5 rounded-[4px]"
    >
      <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        <span
          aria-hidden={rank ? undefined : true}
          className={`font-display text-[22px] sm:text-[24px] leading-none w-4 pt-1 shrink-0 ${themed ? 'text-[var(--tema)]' : 'text-[#F4EEE2]/70'}`}
        >
          {rank}
        </span>
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden shrink-0 border border-[#285443] bg-[#122B22]">
          <img src={venue.photoUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover object-center venue-photo-zoom" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[16px] sm:text-[17px] leading-snug text-[#F4EEE2] line-clamp-2 sm:truncate">{venue.name}</div>
          <div className="text-[12px] sm:text-[13px] text-[#F4EEE2]/75 mt-0.5 leading-snug">
            {venue.shortCategory ?? venue.cuisine}, {venue.shortNeighborhood ?? venue.neighborhood}. {venue.priceRangeLabel}
          </div>
          {children ?? (
            <>
              {venue.whatToOrder[0] && (
                <div className="flex items-center gap-1 text-[12px] text-[#F2A33A]/90 mt-1 min-w-0">
                  <span className="min-w-0 truncate">Recomandat: {venue.whatToOrder[0].name}</span>
                  <span className="shrink-0 tabular-nums">({venue.whatToOrder[0].priceRon} lei)</span>
                </div>
              )}
              {venue.crowdSegments && venue.crowdLabel && <CrowdMeter segments={venue.crowdSegments} label={venue.crowdLabel} />}
            </>
          )}
        </div>
      </div>

      <ScoreLabel themed={themed} dark>
        <MugScore score={venue.foodQualityScore} />
      </ScoreLabel>
    </button>
  );
}
