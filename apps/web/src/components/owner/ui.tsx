'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/form';

/** Câmp cu etichetă vizibilă (regula: fiecare control are <label>). */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-semibold text-cafea">
        {label}
      </label>
      {React.cloneElement(children, { id })}
      {hint ? <p className="text-[13px] text-muted-cafea">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  'min-h-11 w-full rounded-[4px] border border-hairline bg-white px-3 py-2 text-[16px] text-cafea placeholder:text-muted-cafea focus-visible:border-carou';

/** Buton principal; rămâne activ până pornește cererea, apoi arată „…”. */
export function SubmitButton({ children, pendingLabel = 'Se trimite…', variant = 'primary' }: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'quiet';
}) {
  const { pending } = useFormStatus();
  const look =
    variant === 'primary'
      ? 'bg-carou text-white hover:bg-[#9E1F18]'
      : 'border border-hairline bg-white text-cafea hover:border-cafea';
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-11 rounded-[4px] px-4 text-[15px] font-semibold transition-colors disabled:opacity-60 ${look}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Eroarea sau confirmarea unei acțiuni, anunțată și cititoarelor de ecran. */
export function FormMessage({ state }: { state: FormState }) {
  return (
    <p aria-live="polite" className={`text-[14px] ${state.error ? 'font-semibold text-carou' : 'text-cafea'}`}>
      {state.error ?? state.message ?? ''}
    </p>
  );
}

/** Secțiune de dashboard: titlu condensat + conținut, fără umbre. */
export function Panel({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-titlu` : undefined} className="scroll-mt-20 border-t border-hairline pt-6">
      <h2 id={id ? `${id}-titlu` : undefined} className="font-display mb-4 text-[28px] leading-none text-cafea">
        {title}
      </h2>
      {children}
    </section>
  );
}
