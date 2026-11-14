/**
 * Desenele cartonașelor din Tasting Tour: câte un medalion (ca în owner/Doodles.tsx) cu un personaj mic, zâmbitor.
 * Doar culorile din design/README.md; decorative, deci ascunse cititoarelor de ecran.
 */
import React from 'react';

const CAROU = '#B3261E';
const CAFEA = '#3A2418';
const MUSTAR = '#E0A526';
const STICLA = '#17382C';
const CHIHLIMBAR = '#F2A33A';
const SPUMA = '#F4EEE2';
const CARTON = '#B98A5E';

/** Ochi, zâmbet și obrăjori; `ink` = culoarea trăsăturilor. */
function Face({ x, y, ink }: { x: number; y: number; ink: string }) {
  return (
    <g>
      <circle cx={x - 4.5} cy={y} r="1.7" fill={ink} />
      <circle cx={x + 4.5} cy={y} r="1.7" fill={ink} />
      <path d={`M${x - 2.5} ${y + 3}q2.5 2.6 5 0`} stroke={ink} strokeWidth="1.6" />
      <circle cx={x - 8} cy={y + 3} r="2" fill="#E8877A" opacity=".7" />
      <circle cx={x + 8} cy={y + 3} r="2" fill="#E8877A" opacity=".7" />
    </g>
  );
}

function Medallion({ fill, children }: { fill: string; children: React.ReactNode }) {
  return (
    <>
      {/* Medalioanele verzi primesc contur, altfel dispar pe fundalul TOP DRINK. */}
      <circle cx="40" cy="40" r="38" fill={fill} stroke={fill === STICLA ? CHIHLIMBAR : 'none'} strokeWidth="2" />
      <circle cx="40" cy="40" r="33" stroke={SPUMA} strokeOpacity=".35" strokeWidth="1.4" />
      {children}
    </>
  );
}

const ART: Record<string, React.ReactNode> = {
  // Castron de ciorbă cu abur și lingură
  'turul-ciorbelor': (
    <Medallion fill={MUSTAR}>
      <path d="M33 30c-3-4 3-6 0-10M41 28c-3-4 3-6 0-10M49 30c-3-4 3-6 0-10" stroke={CAFEA} strokeOpacity=".6" strokeWidth="2" />
      <path d="M53 34l9-11" stroke={CARTON} strokeWidth="3" />
      <path d="M17 38h46c0 13-10 22-23 22S17 51 17 38z" fill={CAROU} stroke={CAFEA} strokeWidth="2" />
      <path d="M17 38h46" stroke={SPUMA} strokeWidth="2.4" />
      <Face x={40} y={46} ink={SPUMA} />
    </Medallion>
  ),
  // Halbă pe valurile Begăi
  'bere-pe-bega': (
    <Medallion fill={STICLA}>
      <path d="M17 62q4-3 8 0t8 0 8 0 8 0 8 0 8 0" stroke={SPUMA} strokeOpacity=".55" strokeWidth="2" />
      <path d="M46 32h5c4 0 6 3 6 6v5c0 4-2 6-6 6h-5" stroke={CARTON} strokeWidth="3" />
      <path d="M22 26h24v28c0 3-2 5-5 5H27c-3 0-5-2-5-5z" fill={CHIHLIMBAR} stroke={CARTON} strokeWidth="2" />
      <path d="M21 27c-4-1-4-8 1-8 2-5 9-5 11-1 4-2 10 1 8 5 3 1 4 3 4 4z" fill={SPUMA} stroke={CARTON} strokeWidth="1.8" />
      <Face x={34} y={40} ink={CAFEA} />
    </Medallion>
  ),
  // Brioșă cu cireașă
  'turul-dulce': (
    <Medallion fill={CHIHLIMBAR}>
      <path d="M26 44h28l-4 17H30z" fill={CAROU} stroke={CAFEA} strokeWidth="2" />
      <path d="M33 45l1 15M40 45v15M47 45l-1 15" stroke={SPUMA} strokeOpacity=".5" strokeWidth="1.4" />
      <path d="M23 45c0-7 5-11 10-11 2-6 12-6 14 0 5 0 10 4 10 11z" fill={SPUMA} stroke={CAFEA} strokeWidth="2" />
      <circle cx="40" cy="25" r="4.5" fill={CAROU} stroke={CAFEA} strokeWidth="1.6" />
      <path d="M41 21c1-3 3-5 6-6" stroke={STICLA} strokeWidth="1.6" />
      <Face x={40} y={51} ink={SPUMA} />
    </Medallion>
  ),
  // Mici pe farfurie și o halbă mică
  'romanesc-si-o-bere': (
    <Medallion fill={CAROU}>
      <circle cx="35" cy="46" r="17" fill={SPUMA} stroke={CAFEA} strokeWidth="2" />
      <rect x="23" y="33" width="20" height="6" rx="3" fill={CARTON} stroke={CAFEA} strokeWidth="1.6" transform="rotate(-12 33 36)" />
      <rect x="25" y="39" width="20" height="6" rx="3" fill={CARTON} stroke={CAFEA} strokeWidth="1.6" transform="rotate(-6 35 42)" />
      <Face x={35} y={52} ink={CAFEA} />
      <path d="M58 33h3c2 0 3 2 3 4v3c0 2-1 4-3 4h-3" stroke={SPUMA} strokeWidth="2" />
      <path d="M48 30h11v17c0 2-1 3-3 3h-5c-2 0-3-1-3-3z" fill={CHIHLIMBAR} stroke={SPUMA} strokeWidth="1.6" />
      <path d="M47 31c-2-1-2-5 1-5 1-3 6-3 7 0 3-1 5 1 5 3z" fill={SPUMA} />
    </Medallion>
  ),
  // Pahar de vin sub lună
  'seara-cu-vin': (
    <Medallion fill={STICLA}>
      <path d="M58 17a8 8 0 1 0 6 13 6.5 6.5 0 1 1-6-13z" fill={SPUMA} />
      <path d="M21 27l1.2 2.6 2.6 1.2-2.6 1.2L21 34.6l-1.2-2.6-2.6-1.2 2.6-1.2zM63 46l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill={MUSTAR} />
      <path d="M29 22h22c0 15-5 22-11 22s-11-7-11-22z" fill={SPUMA} fillOpacity=".15" stroke={SPUMA} strokeWidth="2" />
      <path d="M29.6 29h20.8c-.8 10-4.8 14-10.4 14s-9.6-4-10.4-14z" fill={CAROU} />
      <Face x={40} y={34} ink={SPUMA} />
      <path d="M40 44v13M32 59h16" stroke={SPUMA} strokeWidth="2.4" />
    </Medallion>
  ),
};

// „Construiește-ți turul”: pin vesel pe un drum punctat, în culoarea textului butonului; fața are culoarea butonului.
const buildOwn = (ink: string) => (
  <>
    <circle cx="40" cy="40" r="38" fill="currentColor" opacity=".14" />
    <path d="M14 60c8-2 10-10 18-10s10 8 18 6 8-8 14-10" stroke="currentColor" strokeWidth="2.2" strokeDasharray="1 5" />
    <path d="M40 54s-13-12-13-22a13 13 0 0 1 26 0c0 10-13 22-13 22z" fill="currentColor" />
    <circle cx="35.5" cy="31" r="1.7" fill={ink} />
    <circle cx="44.5" cy="31" r="1.7" fill={ink} />
    <path d="M37.5 35q2.5 2.6 5 0" strokeWidth="1.6" stroke={ink} />
    <path d="M60 18l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" fill="currentColor" />
  </>
);

export function TourArt({ slug, className = '', ink = CAROU }: { slug: string; className?: string; ink?: string }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {ART[slug] ?? buildOwn(ink)}
    </svg>
  );
}
