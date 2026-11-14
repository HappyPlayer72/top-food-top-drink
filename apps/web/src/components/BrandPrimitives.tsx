'use client';

import React, { useState } from 'react';
import { Camera, Globe, House } from 'lucide-react';
import { TrapBreakdown, Vertical, formatHonest, formatScore } from '../types';

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
 * 3. CoasterMark — Halba / cana de bere (mug icon for topdrink wordmark)
 */
export const CoasterMark: React.FC<{ size?: number; className?: string }> = ({
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
    {/* Mug handle */}
    <path
      d="M20.5 13.5H24C25.933 13.5 27.5 15.067 27.5 17V21.5C27.5 23.433 25.933 25 24 25H20.5"
      stroke="#B98A5E"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Mug body */}
    <rect
      x="5"
      y="10"
      width="16"
      height="18"
      rx="3.5"
      fill="#F2A33A"
      stroke="#B98A5E"
      strokeWidth="2"
    />
    {/* Subtle vertical mug flutes */}
    <line
      x1="9.5"
      y1="15.5"
      x2="9.5"
      y2="24"
      stroke="#17382C"
      strokeOpacity="0.18"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <line
      x1="13.5"
      y1="15.5"
      x2="13.5"
      y2="24"
      stroke="#17382C"
      strokeOpacity="0.18"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    {/* Foam head */}
    <path
      d="M5.5 11.5C4.5 11.5 4 10.5 4.3 9.2C4.7 7.3 6.5 6.2 8.3 6.6C9.3 4.8 11.8 4.2 13.7 5.2C15.2 4.3 17.5 4.8 18.4 6.5C20.3 6.2 21.8 7.6 21.8 9.5C21.8 10.7 21.2 11.5 20.2 11.5H18.5V13.2C18.5 13.9 17.9 14.4 17.2 14.4C16.5 14.4 16 13.9 16 13.2V11.5H5.5Z"
      fill="#F4EEE2"
      stroke="#B98A5E"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 4. CoasterScore — Score inside Suportul de bere (Spumă fill, Carton border, Sticlă numerals)
 */
export const CoasterScore: React.FC<{
  score: number;
  size?: 'md' | 'lg';
  className?: string;
}> = ({ score, size = 'md', className = '' }) => {
  const dims =
    size === 'lg'
      ? 'w-16 h-16 text-[28px] sm:w-20 sm:h-20 sm:text-[34px]'
      : 'w-12 h-12 text-[22px] sm:w-14 sm:h-14 sm:text-[26px]';
  return (
    <div
      role="img"
      className={`coaster-badge inline-flex items-center justify-center shrink-0 select-none ${dims} ${className}`}
      aria-label={score > 0 ? `Scor onest ${formatScore(score)} din 10` : "Fără Scor Onest încă: localul nu are review-uri"}
    >
      <span aria-hidden="true" className="font-display leading-none text-[#17382C] tabular-nums">
        {formatHonest(score)}
      </span>
    </div>
  );
};

/**
 * 4b. PlateScore / MugScore — scorul din clasament: pe o farfurie (TOP FOOD) sau pe o halbă (TOP DRINK).
 * Culorile sunt fixe (nu clase hex remapate de html.dark), ca cifrele Cafea / Sticlă să rămână pe farfurie / bere.
 * `lg` = cardul de loc 1, `md` = rândurile; cifrele rămân mai mari decât rangul.
 */
export const PlateScore: React.FC<{ score: number; size?: 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  const box = size === 'lg' ? 'w-[92px] h-[92px] sm:w-[104px] sm:h-[104px]' : 'w-[64px] h-[64px] sm:w-[76px] sm:h-[76px]';
  const digits = size === 'lg' ? 'text-[36px] sm:text-[42px]' : 'text-[24px] sm:text-[30px]';
  return (
    <span role="img" aria-label={score > 0 ? `Scor Onest ${formatScore(score)} din 10` : 'Fără Scor Onest încă: localul nu are review-uri'} className={`relative inline-flex items-center justify-center shrink-0 select-none ${box}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#D6CFC5" strokeWidth="2" />
        <circle cx="50" cy="50" r="36" fill="#FAF8F5" stroke="#E6DFD5" strokeWidth="1.5" />
        <path d="M22 34a32 32 0 0 1 12-14" fill="none" stroke="#ECE6DD" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className={`relative font-display leading-none tabular-nums ${digits}`} style={{ color: '#3A2418' }}>
        {formatHonest(score)}
      </span>
    </span>
  );
};

export const MugScore: React.FC<{ score: number; size?: 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  // Cutia e mai lată decât înaltă (116 × 100) și pornește de la x = -16, ca mijlocul corpului halbei (x = 42) să fie
  // mijlocul cutiei: halba stă centrată sub eticheta „Scor Onest”, iar toarta iese în dreapta.
  const box = size === 'lg' ? 'w-[107px] h-[92px] sm:w-[121px] sm:h-[104px]' : 'w-[74px] h-[64px] sm:w-[88px] sm:h-[76px]';
  const digits = size === 'lg' ? 'text-[32px] sm:text-[38px]' : 'text-[22px] sm:text-[27px]';
  return (
    <span role="img" aria-label={score > 0 ? `Scor Onest ${formatScore(score)} din 10` : 'Fără Scor Onest încă: localul nu are review-uri'} className={`relative inline-block shrink-0 select-none ${box}`}>
      <svg viewBox="-16 0 116 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {/* toartă */}
        <path d="M74 40h7a11 11 0 0 1 11 11v13a11 11 0 0 1-11 11h-7" fill="none" stroke="#B98A5E" strokeWidth="6" />
        {/* halba cu bere */}
        <rect x="8" y="26" width="68" height="70" rx="8" fill="#F2A33A" stroke="#B98A5E" strokeWidth="3" />
        {/* spuma */}
        {/* simetrică față de mijlocul halbei (x = 42), cu 2 unități peste margine pe fiecare parte */}
        <path d="M6 34C6 26 13 20 22 21C25 14 36 11 42 16C48 11 59 14 62 21C71 20 78 26 78 34Z" fill="#F4EEE2" stroke="#B98A5E" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      {/* cifrele stau pe corpul halbei: x 8–76 → (8 + 16) / 116 = 20,7%, lățime 68 / 116 = 58,6%; y 36–96 din 100 */}
      <span
        className={`absolute flex items-center justify-center font-display leading-none tabular-nums ${digits}`}
        style={{ color: '#17382C', left: '20.7%', width: '58.6%', top: '36%', height: '58%' }}
      >
        {formatHonest(score)}
      </span>
    </span>
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
      className="btn-press inline-flex items-center gap-2 sm:gap-2.5 text-left rounded-[4px] group min-w-0 min-h-[44px] py-1.5 px-1 -mx-1"
    >
      {isDrink ? (
        <CoasterMark
          size={compact ? 24 : 28}
          className={compact ? '' : 'max-[374px]:w-6 max-[374px]:h-6'}
        />
      ) : (
        <CarouMark
          size={compact ? 24 : 28}
          className={compact ? '' : 'max-[374px]:w-6 max-[374px]:h-6'}
        />
      )}
      <span
        className={`inline-flex items-baseline leading-none max-md:truncate md:whitespace-nowrap ${
          compact
            ? 'text-[19px] min-[375px]:text-[22px]'
            : 'text-[20px] min-[375px]:text-[24px] sm:text-[28px]'
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
 * 6. LocalnicBadge — plăcuța verde-brad cu căsuță (--localnic), doar pentru „Localnic”. TuristBadge — contur nisip cu glob.
 */
export const LocalnicBadge: React.FC<{
  label: string;
  size?: 'xs' | 'sm';
  className?: string;
}> = ({ label, size = 'sm', className = '' }) => (
  <span
    className={`badge-placuta inline-flex items-center gap-1 font-semibold leading-none whitespace-nowrap ${
      size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'
    } ${className}`}
  >
    <House className={size === 'xs' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} aria-hidden="true" />
    {label}
  </span>
);

export const TuristBadge: React.FC<{
  label?: string;
  size?: 'xs' | 'sm';
  className?: string;
}> = ({ label = 'Turist', size = 'sm', className = '' }) => (
  <span
    className={`badge-turist inline-flex items-center gap-1 font-semibold leading-none whitespace-nowrap ${
      size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'
    } ${className}`}
  >
    <Globe className={size === 'xs' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} aria-hidden="true" />
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
            className="h-full bg-[var(--localnic)] bar-scale-fill"
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
          <TuristBadge label="Turiști" size="xs" />
        </div>
        <div
          className={`flex-1 h-2 rounded-[2px] overflow-hidden ${
            dark ? 'bg-[#285443]' : 'bg-[#F2EFE9]'
          }`}
        >
          <div
            className="h-full bg-[var(--turist-line)] bar-scale-fill"
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
  dark?: boolean;
}> = ({
  venueName,
  trapIndex,
  reasons,
  breakdown,
  onSelectVenue,
  defaultOpen = false,
  dark = false,
}) => {
  const [showFormula, setShowFormula] = useState(defaultOpen);
  const isSevere = trapIndex >= 80;
  const strongTextClass = dark ? 'text-[#F4EEE2]' : 'text-[#3A2418]';

  return (
    <div className="border-t-[3px] border-[#B3261E] pt-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <TrapBadge
          variant={isSevere ? 'severe' : 'possible'}
          label={isSevere ? 'Capcană turistică' : 'Posibilă capcană turistică'}
        />
        <span
          className={`font-display text-[24px] leading-none tabular-nums ${
            dark ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
          }`}
        >
          {trapIndex} din 100
        </span>
      </div>

      {onSelectVenue ? (
        <button
          type="button"
          onClick={onSelectVenue}
          className={`font-display text-[26px] leading-tight text-left inline-flex items-center min-h-[44px] py-1 transition-colors ${
            dark
              ? 'text-[#F4EEE2] hover:text-[#F2A33A]'
              : 'text-[#3A2418] hover:text-[#B3261E]'
          }`}
        >
          {venueName}
        </button>
      ) : (
        <h3
          className={`font-display text-[26px] leading-tight ${
            dark ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
          }`}
        >
          {venueName}
        </h3>
      )}

      <ul
        className={`space-y-1 text-[14px] list-disc pl-4 ${
          dark ? 'text-[#F4EEE2]/90' : 'text-[#3A2418]'
        }`}
      >
        {reasons.map((reason, idx) => (
          <li key={idx}>{reason}</li>
        ))}
      </ul>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowFormula((prev) => !prev)}
          aria-expanded={showFormula}
          className={`btn-press min-h-[44px] -my-2 inline-flex items-center text-[13px] font-semibold underline underline-offset-4 hover:opacity-80 ${
            dark ? 'text-[#F2A33A]' : 'text-[#B3261E]'
          }`}
        >
          {showFormula ? 'Ascunde calculul' : 'Cum calculăm asta'}
        </button>
      </div>

      {breakdown && (
        <div className="collapse-grid" data-open={showFormula}>
          <div className="collapse-inner">
            <div
              className={`border p-3 rounded-[4px] space-y-2 text-[12px] ${
                dark
                  ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                  : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
              }`}
            >
              <p className="font-semibold">
                Formula Tourist Trap Index ({trapIndex} din 100) combină 5 semnale obiective:
              </p>
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 ${
                  dark ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                }`}
              >
                <div>
                  • 30% decalaj turiști vs. localnici:{' '}
                  <strong className={strongTextClass}>
                    {breakdown.touristVsLocalGap > 0
                      ? `+${formatScore(breakdown.touristVsLocalGap)}`
                      : formatScore(breakdown.touristVsLocalGap)}{' '}
                    puncte
                  </strong>
                </div>
                <div>
                  • 20% distanță de zona turistică:{' '}
                  <strong className={strongTextClass}>
                    {breakdown.touristZoneProximityM} m
                  </strong>
                </div>
                <div>
                  • 20% preț față de categorie:{' '}
                  <strong className={strongTextClass}>
                    {breakdown.priceVsCategoryPct > 0
                      ? `+${breakdown.priceVsCategoryPct}%`
                      : `${breakdown.priceVsCategoryPct}%`}
                  </strong>
                </div>
                <div>
                  • 15% review-uri în limbi străine:{' '}
                  <strong className={strongTextClass}>
                    {breakdown.foreignLangReviewsPct}%
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  • 15% clienți care nu revin (o singură vizită):{' '}
                  <strong className={strongTextClass}>
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

/** Scorul Onest ca text: „—” vizual când nu există, plus „fără scor încă” pentru cititoarele de ecran. */
export const HonestValue: React.FC<{ score: number }> = ({ score }) =>
  score > 0 ? (
    <>{formatHonest(score)}</>
  ) : (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">fără scor încă</span>
    </>
  );
