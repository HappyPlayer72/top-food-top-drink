/**
 * Ilustrația din antetul paginii /owner: două medalioane care se suprapun curat (farfuria TOP FOOD, suportul TOP DRINK)
 * și o insignă Muștar. Culorile sunt cele din design/README.md; fără împrăștiat, fără umplutură.
 */
const CAROU = '#B3261E';
const CAFEA = '#3A2418';
const MUSTAR = '#E0A526';
const STICLA = '#17382C';
const CHIHLIMBAR = '#F2A33A';
const SPUMA = '#F4EEE2';
const CARTON = '#B98A5E';

/** Pune centrul desenului (cx, cy, în caseta de 64) în punctul (x, y). Centrul se ia din forma reală, nu din caseta goală. */
const at = (x: number, y: number, scale: number, cx = 32, cy = 32) => `translate(${x} ${y}) scale(${scale}) translate(${-cx} ${-cy})`;

export function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 380 300"
      aria-hidden="true"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`[&_circle]:[vector-effect:non-scaling-stroke] [&_path]:[vector-effect:non-scaling-stroke] ${className}`}
    >
      {/* Farfuria: Carou, cu buza fină și tacâmurile drepte */}
      <circle cx="136" cy="166" r="100" fill={CAROU} />
      <circle cx="136" cy="166" r="87" stroke={SPUMA} strokeOpacity=".4" strokeWidth="1.6" />
      <g transform={at(112, 166, 2.1, 32, 33)} stroke={SPUMA} strokeWidth="3.2">
        <path d="M22 6v16M32 6v16M42 6v16M22 22c0 7 4 10 10 10s10-3 10-10M32 32v28" />
      </g>
      <g transform={at(160, 166, 2.1, 32, 33)} stroke={SPUMA} strokeWidth="3.2">
        <path d="M26 6c12 2 16 14 12 30H26zM26 36v24" />
      </g>

      {/* Suportul de bere: Sticlă, cu marginea de Carton, decupat din farfurie cu inelul culorii cardului */}
      <circle cx="268" cy="100" r="84" style={{ fill: 'var(--o-card)' }} />
      <circle cx="268" cy="100" r="74" fill={STICLA} />
      <circle cx="268" cy="100" r="67" stroke={CARTON} strokeWidth="2.4" />
      {/* Halba: x 5–49 (cu toartă), y 4–56, deci centrul ei real e (27, 30) */}
      <g transform={at(268, 100, 1.75, 27, 30)}>
        <path d="M36 24h6c4 0 6 3 6 7v6c0 4-2 7-6 7h-6" stroke={CARTON} strokeWidth="3.2" />
        <path d="M10 18h26v32c0 3-2 5-5 5H15c-3 0-5-2-5-5z" fill={CHIHLIMBAR} stroke={CARTON} strokeWidth="2.2" />
        <path d="M18 28v18M27 28v18" stroke={STICLA} strokeOpacity=".25" strokeWidth="2" />
        <path d="M10 18c-5-1-5-9 1-9 2-6 10-6 12-1 5-2 11 1 9 6 3 1 4 3 4 4z" fill={SPUMA} stroke={CARTON} strokeWidth="2" />
      </g>

      {/* Insigna Muștar */}
      <circle cx="310" cy="236" r="38" style={{ fill: 'var(--o-card)' }} />
      <circle cx="310" cy="236" r="32" fill={MUSTAR} />
      <g transform={at(310, 236, 0.78)} stroke={CAFEA} strokeWidth="2.6">
        <path d="M32 6l7 18 19 2-14 13 4 19-16-10-16 10 4-19L6 26l19-2z" />
      </g>
    </svg>
  );
}
