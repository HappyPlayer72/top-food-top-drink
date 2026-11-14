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
 * 4b. PlateScore / MugScore — scorul din clasament: pe o farfurie (TOP FOOD) sau pe o halbă (TOP DRINK).
 * Culorile sunt fixe (nu clase hex remapate de html.dark), ca cifrele Cafea / Sticlă să rămână pe farfurie / bere.
 * `lg` = cardul de loc 1, `md` = rândurile; cifrele rămân mai mari decât rangul.
 * Aspectul farfuriei / halbei reflectă scorul: >= 8.5 curat lună, 7.5–8.4 ușor atins, 6.5–7.4 folosit, < 6.5 murdar.
 */
type CleanlinessTier = 'pristine' | 'light' | 'messy' | 'dirty';

function getCleanlinessTier(score: number): CleanlinessTier {
  if (score >= 8.5) return 'pristine';
  if (score >= 7.5) return 'light';
  if (score >= 6.5) return 'messy';
  return 'dirty';
}

export const PlateScore: React.FC<{ score: number; size?: 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  const box = size === 'lg' ? 'w-[92px] h-[92px] sm:w-[104px] sm:h-[104px]' : 'w-[64px] h-[64px] sm:w-[76px] sm:h-[76px]';
  const digits = size === 'lg' ? 'text-[36px] sm:text-[42px]' : 'text-[24px] sm:text-[30px]';
  const tier = getCleanlinessTier(score);

  const outerFill = tier === 'dirty' ? '#E8DEC9' : tier === 'messy' ? '#F5ECE0' : '#FFFFFF';
  const outerStroke = tier === 'dirty' ? '#A6927A' : tier === 'messy' ? '#CBBBA6' : '#D6CFC5';
  const wellFill = tier === 'dirty' ? '#DDD0B8' : tier === 'messy' ? '#EDE0CE' : '#FAF8F5';
  const wellStroke = tier === 'dirty' ? '#B9A58C' : tier === 'messy' ? '#D6C6B2' : '#E6DFD5';

  return (
    <span role="img" aria-label={`Scor Onest ${formatScore(score)} din 10`} className={`relative inline-flex items-center justify-center shrink-0 select-none ${box}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill={outerFill} stroke={outerStroke} strokeWidth="2" />
        <circle cx="50" cy="50" r="36" fill={wellFill} stroke={wellStroke} strokeWidth="1.5" />
        <path d="M22 34a32 32 0 0 1 12-14" fill="none" stroke={tier === 'dirty' ? '#CBBBA6' : '#ECE6DD'} strokeWidth="3" strokeLinecap="round" />

        {tier === 'pristine' && (
          <g fill="#D8B467" opacity="0.9">
            <path d="M77 16l1.3 3.2L81.5 20.5l-3.2 1.3L77 25l-1.3-3.2L72.5 20.5l3.2-1.3Z" />
            <path d="M22 76l.9 2.1L25 79l-2.1.9L22 82l-.9-2.1L19 79l2.1-.9Z" />
          </g>
        )}

        {tier === 'light' && (
          <g aria-hidden="true">
            <path d="M22 65c5 7 12 11 20 12" fill="none" stroke="#BA5D3B" strokeWidth="3.6" strokeLinecap="round" opacity="0.58" />
            <circle cx="72" cy="23" r="1.8" fill="#8C5230" opacity="0.72" />
            <circle cx="77" cy="29" r="1.4" fill="#6E4025" opacity="0.68" />
            <circle cx="27" cy="75" r="1.5" fill="#8C5230" opacity="0.72" />
            <circle cx="67" cy="75" r="1.4" fill="#6E4025" opacity="0.6" />
          </g>
        )}

        {tier === 'messy' && (
          <g aria-hidden="true">
            <path d="M17 59c5 11 15 19 28 21" fill="none" stroke="#A8482B" strokeWidth="5.5" strokeLinecap="round" opacity="0.66" />
            <path d="M60 18c10 4 17 11 20 20" fill="none" stroke="#B87338" strokeWidth="4.2" strokeLinecap="round" opacity="0.58" />
            <ellipse cx="24" cy="27" rx="6" ry="3.4" transform="rotate(-28 24 27)" fill="#A8482B" opacity="0.62" />
            <ellipse cx="74" cy="69" rx="5" ry="3" transform="rotate(22 74 69)" fill="#8C4F2B" opacity="0.55" />
            <circle cx="68" cy="78" r="2.2" fill="#5E351E" opacity="0.75" />
            <circle cx="21" cy="72" r="2.1" fill="#6E4025" opacity="0.78" />
            <circle cx="34" cy="20" r="1.8" fill="#5E351E" opacity="0.7" />
            <circle cx="80" cy="48" r="1.6" fill="#7D4932" opacity="0.68" />
          </g>
        )}

        {tier === 'dirty' && (
          <g aria-hidden="true">
            {/* Heavy rim & well grease / sauce smears */}
            <path d="M14 55c4 15 17 27 34 29" fill="none" stroke="#96361E" strokeWidth="7.5" strokeLinecap="round" opacity="0.78" />
            <path d="M56 15c13 4 23 14 26 27" fill="none" stroke="#7A4422" strokeWidth="6.5" strokeLinecap="round" opacity="0.74" />
            <path d="M16 31c4-9 11-15 20-17" fill="none" stroke="#B3702E" strokeWidth="5" strokeLinecap="round" opacity="0.68" />
            <path d="M58 84c11-3 20-10 25-20" fill="none" stroke="#8C4E28" strokeWidth="5.5" strokeLinecap="round" opacity="0.68" />
            {/* Leftover sauce splatters & smudges */}
            <ellipse cx="22" cy="69" rx="9" ry="5" transform="rotate(24 22 69)" fill="#96361E" opacity="0.75" />
            <ellipse cx="77" cy="64" rx="8" ry="4.5" transform="rotate(-35 77 64)" fill="#7A4422" opacity="0.74" />
            <ellipse cx="72" cy="24" rx="6.5" ry="3.8" transform="rotate(18 72 24)" fill="#96361E" opacity="0.7" />
            <ellipse cx="14" cy="44" rx="4.5" ry="6" transform="rotate(-12 14 44)" fill="#8C5328" opacity="0.66" />
            <circle cx="51" cy="14" r="4" fill="#B3702E" opacity="0.65" />
            {/* Bold dark burnt bits & crumbs */}
            <circle cx="28" cy="79" r="3.1" fill="#3A2418" opacity="0.88" />
            <circle cx="64" cy="80" r="2.6" fill="#4A3020" opacity="0.85" />
            <circle cx="83" cy="47" r="2.8" fill="#3A2418" opacity="0.82" />
            <circle cx="19" cy="23" r="2.5" fill="#4A3020" opacity="0.85" />
            <circle cx="45" cy="13" r="2.2" fill="#3A2418" opacity="0.78" />
            <circle cx="48" cy="87" r="2.6" fill="#4A3020" opacity="0.85" />
            <circle cx="79" cy="34" r="2.1" fill="#3A2418" opacity="0.82" />
            <circle cx="15" cy="59" r="2.3" fill="#3A2418" opacity="0.8" />
          </g>
        )}
      </svg>
      <span className={`relative font-display leading-none tabular-nums ${digits}`} style={{ color: '#3A2418' }}>
        {formatScore(score)}
      </span>
    </span>
  );
};

export const MugScore: React.FC<{ score: number; size?: 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  // Cutia e mai lată decât înaltă (116 × 100) și pornește de la x = -16, ca mijlocul corpului halbei (x = 42) să fie
  // mijlocul cutiei: halba stă centrată sub eticheta „Scor Onest”, iar toarta iese în dreapta.
  const box = size === 'lg' ? 'w-[107px] h-[92px] sm:w-[121px] sm:h-[104px]' : 'w-[74px] h-[64px] sm:w-[88px] sm:h-[76px]';
  const digits = size === 'lg' ? 'text-[32px] sm:text-[38px]' : 'text-[22px] sm:text-[27px]';
  const tier = getCleanlinessTier(score);

  const beerFill =
    tier === 'dirty'
      ? '#CEC3AE'
      : tier === 'messy'
        ? '#CF852B'
        : tier === 'light'
          ? '#ECA03A'
          : '#F2A33A';
  const rimStroke = tier === 'dirty' ? '#7D5E42' : tier === 'messy' ? '#A3774B' : '#B98A5E';

  return (
    <span role="img" aria-label={`Scor Onest ${formatScore(score)} din 10`} className={`relative inline-block shrink-0 select-none ${box}`}>
      <svg viewBox="-16 0 116 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {/* toartă */}
        <path d="M74 40h7a11 11 0 0 1 11 11v13a11 11 0 0 1-11 11h-7" fill="none" stroke={rimStroke} strokeWidth="6" />
        {/* halba cu bere */}
        <rect x="8" y="26" width="68" height="70" rx="8" fill={beerFill} stroke={rimStroke} strokeWidth="3" />

        {tier === 'pristine' && (
          <>
            {/* spuma plină și proaspătă */}
            <path d="M6 34C6 26 13 20 22 21C25 14 36 11 42 16C48 11 59 14 62 21C71 20 78 26 78 34Z" fill="#F4EEE2" stroke="#B98A5E" strokeWidth="3" strokeLinejoin="round" />
            <line x1="15" y1="42" x2="15" y2="84" stroke="#FFF8EC" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
            <path d="M64 11l1.1 2.6L67.7 14.7l-2.6 1.1L64 18.4l-1.1-2.6L60.3 14.7l2.6-1.1Z" fill="#F4EEE2" opacity="0.95" />
          </>
        )}

        {tier === 'light' && (
          <>
            {/* spuma ușor așezată + urme vizibile de spumă pe pahar */}
            <path d="M6 34C6 27 13 22 22 23C26 17 36 15 42 19C48 15 58 17 62 23C71 22 78 27 78 34Z" fill="#F4EEE2" stroke="#B98A5E" strokeWidth="3" strokeLinejoin="round" />
            <path d="M13 40c6 2.5 12 1.5 17 0" fill="none" stroke="#F4EEE2" strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
            <path d="M55 43c5 1.5 10 1 15-1" fill="none" stroke="#F4EEE2" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
          </>
        )}

        {tier === 'messy' && (
          <>
            {/* spuma subțire/lăsată + dâre clare de spumă uscată + picătură */}
            <path d="M7 34C8 29 14 26 22 27C28 24 36 23 42 25C48 23 56 24 62 27C70 26 76 29 77 34Z" fill="#E0D4BE" stroke={rimStroke} strokeWidth="3" strokeLinejoin="round" />
            <path d="M11 41c8 3 16 2 23 0M49 45c8 2 15 1 22-1" fill="none" stroke="#F4EEE2" strokeWidth="2.8" strokeLinecap="round" opacity="0.72" />
            <path d="M13 55c6 2 11 1 15-1M56 60c5 1.5 9 1 13-1" fill="none" stroke="#EFE4D2" strokeWidth="2.4" strokeLinecap="round" opacity="0.62" />
            {/* picătură pe margine */}
            <path d="M67 34v18" stroke="#E0D4BE" strokeWidth="3.6" strokeLinecap="round" opacity="0.88" />
            <ellipse cx="42" cy="90" rx="24" ry="3" fill="#6E4414" opacity="0.42" />
          </>
        )}

        {tier === 'dirty' && (
          <>
            {/* zaț / rest de bere stătută la fundul halbei */}
            <path d="M10 68h64v19a7 7 0 0 1-7 7H17a7 7 0 0 1-7-7Z" fill="#8F5E1D" opacity="0.85" />
            {/* dâre și inele groase de spumă uscată pe sticla murdară */}
            <path d="M12 38c10 3.5 18 2.5 27 0M45 41c9 2.5 17 1.5 25-1" fill="none" stroke="#EFE6D5" strokeWidth="3.4" strokeLinecap="round" opacity="0.85" />
            <path d="M13 52c7 2.5 13 1.5 18-1M52 56c6 2.5 12 1.5 18-1" fill="none" stroke="#9C8462" strokeWidth="3" strokeLinecap="round" opacity="0.82" />
            <path d="M14 65c9 2.5 16 1.5 22-1" fill="none" stroke="#7A6242" strokeWidth="2.6" strokeLinecap="round" opacity="0.78" />
            {/* buză murdară cu spumă ruptă */}
            <path d="M7 33C10 29 17 29 24 31C32 30 37 32 42 30C49 32 56 29 64 31C70 29 75 30 77 33Z" fill="#DDD0B8" stroke={rimStroke} strokeWidth="2.8" strokeLinejoin="round" />
            {/* picături lipicioase pe exterior și pe toartă */}
            <path d="M15 33v21M68 33v27" stroke="#8C6028" strokeWidth="3.6" strokeLinecap="round" opacity="0.88" />
            <circle cx="88" cy="54" r="2.6" fill="#8C6028" opacity="0.82" />
            {/* zaț / impurități groase la fund */}
            <circle cx="20" cy="87" r="2.8" fill="#4A3012" opacity="0.85" />
            <circle cx="33" cy="90" r="2.3" fill="#3D260E" opacity="0.82" />
            <circle cx="51" cy="88" r="3" fill="#4A3012" opacity="0.85" />
            <circle cx="64" cy="86" r="2.2" fill="#3D260E" opacity="0.8" />
          </>
        )}
      </svg>
      {/* cifrele stau pe corpul halbei: x 8–76 → (8 + 16) / 116 = 20,7%, lățime 68 / 116 = 58,6%; y 36–96 din 100 */}
      <span
        className={`absolute flex items-center justify-center font-display leading-none tabular-nums ${digits}`}
        style={{ color: '#17382C', left: '20.7%', width: '58.6%', top: '36%', height: '58%' }}
      >
        {formatScore(score)}
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
