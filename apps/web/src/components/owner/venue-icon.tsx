import type { owner } from '@tftd/api';
import { Beer, Cake, Coffee, Fish, Martini, Music, Pizza, Salad, Sandwich, Soup, UtensilsCrossed, Wine, type LucideIcon } from 'lucide-react';

/**
 * Pictograma unui local în lista /owner: poză mică, sau simbol pe un cerc colorat, sau inițialele numelui.
 * Cheile vin din packages/owner (ICON_SYMBOLS / ICON_COLORS); tipurile de mai jos se strică la compilare dacă listele nu se mai potrivesc.
 * Culorile sunt cele din design/README.md, fără albastru (albastrul de plăcuță înseamnă doar „localnic”).
 */
export type IconSymbol = (typeof owner.ICON_SYMBOLS)[number];
export type IconColor = (typeof owner.ICON_COLORS)[number];

export const SYMBOLS: Record<IconSymbol, { Icon: LucideIcon; label: string }> = {
  utensils: { Icon: UtensilsCrossed, label: 'Tacâmuri' },
  pizza: { Icon: Pizza, label: 'Pizza' },
  beer: { Icon: Beer, label: 'Halbă' },
  wine: { Icon: Wine, label: 'Pahar de vin' },
  coffee: { Icon: Coffee, label: 'Cafea' },
  martini: { Icon: Martini, label: 'Cocktail' },
  soup: { Icon: Soup, label: 'Supă' },
  sandwich: { Icon: Sandwich, label: 'Sandviș' },
  cake: { Icon: Cake, label: 'Desert' },
  fish: { Icon: Fish, label: 'Pește' },
  salad: { Icon: Salad, label: 'Salată' },
  music: { Icon: Music, label: 'Muzică' },
};

export const COLORS: Record<IconColor, { bg: string; fg: string; label: string }> = {
  carou: { bg: '#B3261E', fg: '#FFFFFF', label: 'Carou' },
  cafea: { bg: '#3A2418', fg: '#FFFFFF', label: 'Cafea' },
  sticla: { bg: '#17382C', fg: '#F4EEE2', label: 'Sticlă' },
  chihlimbar: { bg: '#F2A33A', fg: '#17382C', label: 'Chihlimbar' },
  carton: { bg: '#B98A5E', fg: '#3A2418', label: 'Carton' },
};

export type VenueIconValue = { symbol: string | null; color: string | null; image: string | null };

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

export function VenueIcon({ name, icon, size = 48 }: { name: string; icon: VenueIconValue; size?: number }) {
  const box = { width: size, height: size };
  if (icon.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon.image} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={box} />;
  }
  const symbol = SYMBOLS[icon.symbol as IconSymbol];
  const color = COLORS[icon.color as IconColor];
  if (symbol && color) {
    return (
      <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-full" style={{ ...box, backgroundColor: color.bg, color: color.fg }}>
        <symbol.Icon size={Math.round(size * 0.5)} strokeWidth={1.9} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="font-display flex shrink-0 items-center justify-center rounded-full bg-o-avatar leading-none text-o-avatar-fg" style={{ ...box, fontSize: Math.round(size * 0.44) }}>
      {initialsOf(name)}
    </span>
  );
}
