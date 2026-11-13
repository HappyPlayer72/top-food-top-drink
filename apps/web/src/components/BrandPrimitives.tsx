'use client';

import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { TrapBreakdown, Vertical, formatScore } from '../types';

/**
 * 1. CarouMark — Fața de masă în carouri (square gingham icon for topfood)
 */
export const CarouMark: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    className={`shrink-0 ${className}`}
  >
    <rect
      x="1"
      y="1"
      width="30"
      height="30"
      rx="5"
      fill="#B3261E"
      stroke="#9E1F18"
      strokeWidth="2"
    />
    <rect x="4" y="4" width="12" height="12" rx="1.5" fill="#D96B63" />
    <rect x="16" y="4" width="12" height="12" rx="1.5" fill="#C44037" />
    <rect x="4" y="16" width="12" height="12" rx="1.5" fill="#C44037" />
    <rect x="16" y="16" width="12" height="12" rx="1.5" fill="#B3261E" />
  </svg>
);

/**
 * 2. CarouStrip — Horizontal tablecloth bar (appears at most ONCE per screen: hero divider or under score)
 */
export const CarouStrip: React.FC<{
  height?: number;
  className?: string;
}> = ({ height = 10, className = '' }) => {
  const cell = Math.max(4, Math.round(height / 2));
  return (
    <div
      className={`w-full overflow-hidden flex items-stretch ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {/* Left 2-row gingham weave */}
      <div className="flex shrink-0">
        <div className="flex flex-col">
          <div style={{ width: cell, height: cell, backgroundColor: '#FAF5F0' }} />
          <div style={{ width: cell, height: cell, backgroundColor: '#E08A84' }} />
        </div>
        <div className="flex flex-col">
          <div style={{ width: cell, height: cell, backgroundColor: '#E08A84' }} />
          <div style={{ width: cell, height: cell, backgroundColor: '#C94A42' }} />
        </div>
        <div className="flex flex-col">
          <div style={{ width: cell, height: cell, backgroundColor: '#C94A42' }} />
          <div style={{ width: cell, height: cell, backgroundColor: '#B3261E' }} />
        </div>
      </div>
      {/* Solid Carou extension */}
      <div className="flex-1 bg-[#B3261E]" />
    </div>
  );
};

/**
 * 3. CoasterMark — Suportul de bere (icon for topdrink wordmark)
 */
export const CoasterMark: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) => (
  <span
    aria-hidden="true"
    style={{ width: size, height: size }}
    className={`inline-flex items-center justify-center rounded-full bg-[#F4EEE2] border-[2.5px] border-[#B98A5E] shrink-0 ${className}`}
  >
    <span className="w-[74%] h-[74%] rounded-full border border-[#B98A5E]/35" />
  </span>
);

/**
 * 4. CoasterScore — Score inside Suportul de bere (Spumă fill, Carton border, Sticlă numerals)
 */
export const CoasterScore: React.FC<{
  score: number;
  size?: 'md' | 'lg';
  className?: string;
}> = ({ score, size = 'md', className = '' }) => {
  const dims = size === 'lg' ? 'w-20 h-20 text-[34px]' : 'w-14 h-14 text-[26px]';
  return (
    <div
      className={`coaster-badge inline-flex items-center justify-center shrink-0 select-none ${dims} ${className}`}
      aria-label={`Scor onest ${formatScore(score)} din 10`}
    >
      <span className="font-display leading-none text-[#17382C] tabular-nums">
        {formatScore(score)}
      </span>
    </div>
  );
};

/**
 * 5. BrandWordmark — topfood/timișoara or topdrink/timișoara
 */
export const BrandWordmark: React.FC<{
  vertical: Vertical;
  compact?: boolean;
  onClick?: () => void;
}> = ({ vertical, compact = false, onClick }) => {
  const isDrink = vertical === 'drink';
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-press inline-flex items-center gap-2.5 text-left focus:outline-none group"
    >
      {isDrink ? (
        <CoasterMark size={compact ? 24 : 28} />
      ) : (
        <CarouMark size={compact ? 24 : 28} />
      )}
      <span
        className={`inline-flex items-baseline leading-none ${
          compact ? 'text-[22px]' : 'text-[25px] sm:text-[28px]'
        } ${isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'}`}
      >
        <span className="font-display">
          {isDrink ? 'topdrink' : 'topfood'}
        </span>
        <span className="font-display-light opacity-90">/timișoara</span>
      </span>
    </button>
  );
};

/**
 * 6. LocalnicBadge — Plăcuță (#1F4E8C), strictly reserved for "Localnic"
 */
export const LocalnicBadge: React.FC<{
  label: string;
  size?: 'xs' | 'sm';
  className?: string;
}> = ({ label, size = 'sm', className = '' }) => (
  <span
    className={`badge-placuta inline-flex items-center font-semibold leading-none whitespace-nowrap ${
      size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'
    } ${className}`}
  >
    {label}
  </span>
);

/**
 * 7. InfluencerBadge — Outlined Cafea (#3A2418) badge with camera icon
 */
export const InfluencerBadge: React.FC<{
  label: string;
  dark?: boolean;
  className?: string;
}> = ({ label, dark = false, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] border text-[12px] font-semibold leading-tight whitespace-nowrap ${
      dark
        ? 'border-[#F4EEE2]/60 text-[#F4EEE2]'
        : 'border-[#3A2418] text-[#3A2418]'
    } ${className}`}
  >
    <Camera className="w-3.5 h-3.5 shrink-0" />
    <span>{label}</span>
  </span>
);

/**
 * 8. PartnerBadge — Discreet tag on venue page
 */
export const PartnerBadge: React.FC<{
  label?: string;
  dark?: boolean;
  className?: string;
}> = ({ label = 'Partener TOP FOOD', dark = false, className = '' }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-[3px] border text-[11px] font-semibold leading-tight ${
      dark
        ? 'border-[#F4EEE2]/30 text-[#F4EEE2]/75'
        : 'border-[#D6CFC5] text-[#6E5649] bg-white'
    } ${className}`}
  >
    {label}
  </span>
);

/**
 * Warning triangle SVG — Rule #4: Trap is recognized by shape (triangle) AND color
 */
const WarningTriangleIcon: React.FC<{
  variant: 'severe' | 'possible';
  className?: string;
}> = ({ variant, className = 'w-3.5 h-3.5' }) => {
  if (variant === 'severe') {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className={`shrink-0 ${className}`}
      >
        <path
          d="M8 1.5L14.8 13.5H1.2L8 1.5Z"
          fill="#FFFFFF"
        />
        <rect x="7.3" y="5.6" width="1.4" height="4.2" rx="0.6" fill="#B3261E" />
        <circle cx="8" cy="11.4" r="0.85" fill="#B3261E" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M8 2L14.4 13.4H1.6L8 2Z"
        stroke="#3A2418"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="7.35" y="6" width="1.3" height="3.8" rx="0.5" fill="#3A2418" />
      <circle cx="8" cy="11.3" r="0.8" fill="#3A2418" />
    </svg>
  );
};

/**
 * 9. TrapBadge — Capcană turistică (Carou + white solid triangle) / Posibilă capcană (Muștar + Cafea outline triangle)
 */
export const TrapBadge: React.FC<{
  variant: 'severe' | 'possible';
  label?: string;
  className?: string;
}> = ({ variant, label, className = '' }) => {
  const defaultLabel =
    variant === 'severe' ? 'Capcană turistică' : 'Posibilă capcană turistică';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold leading-none whitespace-nowrap ${
        variant === 'severe' ? 'badge-capcana' : 'badge-posibila-capcana'
      } ${className}`}
    >
      <WarningTriangleIcon variant={variant} />
      <span>{label ?? defaultLabel}</span>
    </span>
  );
};

/**
 * 10. EmployeeEcusonCard — Ecusonul de pe uniformă (Pages 2 & 4)
 */
export const EmployeeEcusonCard: React.FC<{
  name: string;
  role: string;
  isEmployeeOfMonth?: boolean;
  monthLabel?: string;
  selected?: boolean;
  onClick?: () => void;
  dark?: boolean;
}> = ({
  name,
  role,
  isEmployeeOfMonth = false,
  monthLabel = 'angajata lunii',
  selected = false,
  onClick,
  dark = false,
}) => {
  const borderClass = isEmployeeOfMonth || selected
    ? dark
      ? 'border-[#F2A33A]'
      : 'border-[#3A2418]'
    : dark
    ? 'border-[#2D5947]'
    : 'border-[#E6DFD5]';

  const slotColor = isEmployeeOfMonth || selected
    ? dark
      ? 'bg-[#F2A33A]'
      : 'bg-[#3A2418]'
    : dark
    ? 'bg-[#2D5947]'
    : 'bg-[#D6CFC5]';

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`w-full rounded-[4px] border px-3 py-3 text-center flex flex-col items-center ${borderClass} ${
        dark ? 'bg-[#17382C]' : 'bg-white'
      } ${onClick ? 'btn-press cursor-pointer hover:border-[#B3261E]' : 'transition-colors'}`}
    >
      {/* Top horizontal badge punch slot */}
      <span className={`w-6 h-1 rounded-full mb-2.5 ${slotColor}`} />
      <span
        className={`text-[16px] font-bold leading-tight ${
          dark ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
        }`}
      >
        {name}
      </span>
      <span
        className={`text-[12px] mt-0.5 ${
          dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
        }`}
      >
        {role}
      </span>
      {isEmployeeOfMonth && (
        <span
          className={`text-[11px] font-bold mt-1 ${
            dark ? 'text-[#F2A33A]' : 'text-[#B3261E]'
          }`}
        >
          {monthLabel}
        </span>
      )}
    </Tag>
  );
};

/**
 * 11. LocalVsTouristBars — Page 2 & Page 4 comparison bars
 */
export const LocalVsTouristBars: React.FC<{
  localsScore: number;
  touristsScore: number;
  showSummary?: boolean;
  dark?: boolean;
}> = ({ localsScore, touristsScore, showSummary = false, dark = false }) => {
  const gap = Math.abs(touristsScore - localsScore);
  const formattedGap = formatScore(gap);
  const touristsHigher = touristsScore - localsScore >= 1.2;

  return (
    <div className="space-y-2.5">
      {/* Localnici row */}
      <div className="flex items-center gap-3">
        <div className="w-24 shrink-0">
          <LocalnicBadge label="Localnici" size="xs" />
        </div>
        <div
          className={`flex-1 h-2 rounded-[2px] overflow-hidden ${
            dark ? 'bg-[#285443]' : 'bg-[#F2EFE9]'
          }`}
        >
          <div
            className="h-full bg-[#1F4E8C] bar-scale-fill"
            style={{ width: `${Math.min(100, Math.max(4, localsScore * 10))}%` }}
          />
        </div>
        <span
          className={`font-display text-[19px] leading-none tabular-nums w-8 text-right ${
            dark ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
          }`}
        >
          {formatScore(localsScore)}
        </span>
      </div>

      {/* Turiști row */}
      <div className="flex items-center gap-3">
        <div className="w-24 shrink-0">
          <span
            className={`text-[13px] font-semibold ${
              dark ? 'text-[#F4EEE2]/80' : 'text-[#3A2418]'
            }`}
          >
            Turiști
          </span>
        </div>
        <div
          className={`flex-1 h-2 rounded-[2px] overflow-hidden ${
            dark ? 'bg-[#285443]' : 'bg-[#F2EFE9]'
          }`}
        >
          <div
            className="h-full bg-[#9C8978] bar-scale-fill"
            style={{
              width: `${Math.min(100, Math.max(4, touristsScore * 10))}%`,
              animationDelay: '60ms',
            }}
          />
        </div>
        <span
          className={`font-display text-[19px] leading-none tabular-nums w-8 text-right ${
            dark ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
          }`}
        >
          {formatScore(touristsScore)}
        </span>
      </div>

      {showSummary && touristsHigher && (
        <p className={`text-[12px] ${dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>
          Diferență de {formattedGap} puncte: turiștii îl laudă, localnicii nu.
        </p>
      )}
    </div>
  );
};

/**
 * 12. AvertizareaCard — Page 2 warning block ("82 din 100")
 */
export const AvertizareaCard: React.FC<{
  venueName: string;
  trapIndex: number;
  reasons: string[];
  breakdown?: TrapBreakdown;
  onSelectVenue?: () => void;
  defaultOpen?: boolean;
}> = ({
  venueName,
  trapIndex,
  reasons,
  breakdown,
  onSelectVenue,
  defaultOpen = false,
}) => {
  const [showFormula, setShowFormula] = useState(defaultOpen);
  const isSevere = trapIndex >= 80;

  return (
    <div className="border-t-[3px] border-[#B3261E] pt-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <TrapBadge
          variant={isSevere ? 'severe' : 'possible'}
          label={isSevere ? 'Capcană turistică' : 'Posibilă capcană turistică'}
        />
        <span className="font-display text-[24px] leading-none text-[#3A2418] tabular-nums">
          {trapIndex} din 100
        </span>
      </div>

      {onSelectVenue ? (
        <button
          type="button"
          onClick={onSelectVenue}
          className="font-display text-[26px] leading-tight text-[#3A2418] hover:text-[#B3261E] text-left block transition-colors"
        >
          {venueName}
        </button>
      ) : (
        <h3 className="font-display text-[26px] leading-tight text-[#3A2418]">
          {venueName}
        </h3>
      )}

      <ul className="space-y-1 text-[14px] text-[#3A2418] list-disc pl-4">
        {reasons.map((reason, idx) => (
          <li key={idx}>{reason}</li>
        ))}
      </ul>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowFormula((prev) => !prev)}
          aria-expanded={showFormula}
          className="btn-press text-[13px] font-semibold text-[#B3261E] underline underline-offset-4 hover:opacity-80"
        >
          {showFormula ? 'Ascunde calculul' : 'Cum calculăm asta'}
        </button>
      </div>

      {breakdown && (
        <div className="collapse-grid" data-open={showFormula}>
          <div className="collapse-inner">
            <div className="bg-[#FAF8F5] border border-[#E6DFD5] p-3 rounded-[4px] space-y-2 text-[12px] text-[#3A2418]">
              <p className="font-semibold">
                Formula Tourist Trap Index ({trapIndex} din 100) combină 5 semnale obiective:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#6E5649]">
                <div>
                  • 30% decalaj turiști vs. localnici:{' '}
                  <strong className="text-[#3A2418]">
                    {breakdown.touristVsLocalGap > 0
                      ? `+${formatScore(breakdown.touristVsLocalGap)}`
                      : formatScore(breakdown.touristVsLocalGap)}{' '}
                    puncte
                  </strong>
                </div>
                <div>
                  • 20% distanță de zona turistică:{' '}
                  <strong className="text-[#3A2418]">
                    {breakdown.touristZoneProximityM} m
                  </strong>
                </div>
                <div>
                  • 20% preț față de categorie:{' '}
                  <strong className="text-[#3A2418]">
                    {breakdown.priceVsCategoryPct > 0
                      ? `+${breakdown.priceVsCategoryPct}%`
                      : `${breakdown.priceVsCategoryPct}%`}
                  </strong>
                </div>
                <div>
                  • 15% review-uri în limbi străine:{' '}
                  <strong className="text-[#3A2418]">
                    {breakdown.foreignLangReviewsPct}%
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  • 15% clienți care nu revin (o singură vizită):{' '}
                  <strong className="text-[#3A2418]">
                    {breakdown.singleVisitPct}%
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 13. CrowdMeter — 5-segment Chihlimbar (#F2A33A) live crowd bar for topdrink (Page 5)
 */
export const CrowdMeter: React.FC<{
  segments: 1 | 2 | 3 | 4 | 5;
  label: string;
}> = ({ segments, label }) => (
  <div className="flex items-center gap-2.5 flex-wrap mt-2">
    <div className="flex items-center gap-1" aria-label={`Grad de ocupare ${segments} din 5`}>
      {[1, 2, 3, 4, 5].map((idx) => (
        <span
          key={idx}
          style={idx <= segments ? { animationDelay: `${(idx - 1) * 35}ms` } : undefined}
          className={`w-5 h-1.5 rounded-[1px] ${
            idx <= segments ? 'bg-[#F2A33A] bar-scale-fill' : 'bg-[#285443]'
          }`}
        />
      ))}
    </div>
    <span className="text-[12px] text-[#F4EEE2]/75">{label}</span>
  </div>
);
