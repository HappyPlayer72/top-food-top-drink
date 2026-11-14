import type { Vertical } from '../../../types';

export type Tone = 'a' | 'b' | 'c' | 'd';

/**
 * Culorile jocurilor de la masă, alese o singură dată.
 * Food: doar clase pe care globals.css le remapează sub `html.dark`.
 * Drink: clasele „istorice” pe care globals.css le remapează pe crem în tema deschisă.
 * `tones` sunt culori SVG (nu se remapează), bune pe ambele fundaluri; `ink` are contrast ≥ 4,5:1 pe `fill`.
 */
export interface TableTheme {
  surface: string;
  surfaceRaised: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  primaryInk: string;
  accent: string;
  danger: string;
  seat: string;
  seatActive: string;
  seatOut: string;
  receipt: string;
  placeholder: string;
  tones: Record<Tone, { fill: string; ink: string }>;
}

const FOOD: TableTheme = {
  surface: 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]',
  surfaceRaised: 'bg-white border-[#E6DFD5] text-[#3A2418]',
  ink: 'text-[#3A2418]',
  muted: 'text-[#6E5649]',
  line: 'border-[#E6DFD5]',
  primary: 'bg-[#B3261E] text-white hover:bg-[#9E1F18]',
  primaryInk: 'text-white',
  accent: 'text-[#B3261E]',
  danger: 'text-[#B3261E]',
  seat: 'bg-white border-[#D6CFC5] text-[#3A2418]',
  seatActive: 'bg-[#3A2418] border-[#3A2418] text-white',
  seatOut: 'bg-[#F2EFE9] border-[#E6DFD5] text-[#6E5649] opacity-60',
  receipt: 'bg-white border-[#E6DFD5] text-[#3A2418]',
  placeholder: 'placeholder-[#8C7B70]',
  tones: {
    a: { fill: '#E0A526', ink: '#3A2418' },
    b: { fill: '#B3261E', ink: '#FFFFFF' },
    c: { fill: '#3A2418', ink: '#F4EEE2' },
    d: { fill: '#F4EEE2', ink: '#3A2418' },
  },
};

const DRINK: TableTheme = {
  surface: 'bg-[#143025] border-[#285443] text-[#F4EEE2]',
  surfaceRaised: 'bg-[#1E4335] border-[#2D5947] text-[#F4EEE2]',
  ink: 'text-[#F4EEE2]',
  muted: 'text-[#F4EEE2]/75',
  line: 'border-[#285443]',
  primary: 'bg-[#F2A33A] text-[#17382C] hover:brightness-105',
  primaryInk: 'text-[#17382C]',
  accent: 'text-[#F2A33A]',
  danger: 'text-[#FCA5A5]',
  seat: 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]',
  seatActive: 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]',
  seatOut: 'bg-[#143025] border-[#285443] text-[#F4EEE2]/60 opacity-60',
  receipt: 'bg-[#F4EEE2] border-[#B98A5E] text-[#17382C]',
  // globals.css: prima e remapată pe crem (#6d7463), a doua pe verde (75% opac)
  placeholder: 'placeholder:text-[#F4EEE2]/50 placeholder:text-[#f7f1e8]/50',
  tones: {
    a: { fill: '#F2A33A', ink: '#17382C' },
    b: { fill: '#B3261E', ink: '#FFFFFF' },
    c: { fill: '#285443', ink: '#FFFFFF' },
    d: { fill: '#F4EEE2', ink: '#17382C' },
  },
};

export function tableTheme(vertical: Vertical): TableTheme {
  return vertical === 'drink' ? DRINK : FOOD;
}
