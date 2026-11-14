'use client';

import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './SpinWheel';
import type { TableTheme } from './theme';

interface VerdictReceiptProps {
  theme: TableTheme;
  title: string;
  loserName?: string;
  lines: { label: string; value: string }[];
  note?: string;
  stamp?: string;
  actions: React.ReactNode;
}

/** Bonul cu verdictul: primește focus la apariție, iar cititorul de ecran îl anunță. */
export function VerdictReceipt({ theme, title, loserName, lines, note, stamp, actions }: VerdictReceiptProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  return (
    <div className="space-y-4 stagger-fade-in">
      <div ref={ref} tabIndex={-1} role="status" className={`table-receipt border rounded-t-[6px] px-5 pt-5 pb-9 space-y-3 outline-none ${theme.receipt}`}>
        <p className="text-[13px] font-semibold opacity-80">{title}</p>
        {loserName && <p className="font-display text-[40px] sm:text-[48px] leading-none break-words">{loserName}</p>}
        {stamp && (
          <span className="table-stamp inline-block -rotate-[8deg] border-[3px] border-double rounded-[4px] px-3 py-1 text-[18px] font-bold uppercase tracking-wider">
            {stamp}
          </span>
        )}
        {note && <p className="text-[16px] leading-snug">{note}</p>}
        {lines.length > 0 && (
          <dl className="space-y-1.5 pt-1 text-[15px]">
            {lines.map((l) => (
              <div key={l.label} className="flex items-baseline gap-2">
                <dt>{l.label}</dt>
                <span aria-hidden="true" className="flex-1 border-b-2 border-dotted border-current opacity-30" />
                <dd className="font-bold tabular-nums">{l.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {actions}
    </div>
  );
}
