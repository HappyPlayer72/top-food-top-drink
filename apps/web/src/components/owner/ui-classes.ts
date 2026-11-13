// Clase partajate, fără 'use client': le pot importa și componentele de server (layout, Dashboard).
import type { CSSProperties } from 'react';

/** Animația de intrare a listelor (`stagger-fade-in` din globals.css), cu pas mic între elemente. */
export const stagger = (i: number) => ({ '--stagger-idx': Math.min(i, 6) }) as CSSProperties;

export const inputClass =
  'min-h-11 w-full rounded-[4px] border border-o-field-line bg-o-field px-3 py-2 text-[16px] text-o-fg placeholder:text-o-muted focus-visible:border-o-accent';

/** Două coloane pe desktop, una pe telefon. */
export const fieldGrid = 'grid gap-4 sm:grid-cols-2';

/** Chenar pentru formulare: linie fină, fără fundal și fără umbră. */
export const frameClass = 'rounded-[4px] border border-o-line p-5 sm:p-6';

const BUTTON_BASE =
  'btn-press touch-manipulation inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] px-4 text-[15px] font-bold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const BUTTON_LOOK = {
  primary: 'bg-o-accent text-o-accent-fg hover:bg-o-accent-hover',
  quiet: 'border-[1.5px] border-o-fg/80 bg-transparent text-o-fg hover:bg-o-fg/[0.07]',
} as const;

/** Aspectul butoanelor, și pentru <a> sau <summary>: primar (Carou / Chihlimbar) și liniștit (contur). */
export const buttonClass = (variant: keyof typeof BUTTON_LOOK = 'primary') => `${BUTTON_BASE} ${BUTTON_LOOK[variant]}`;
