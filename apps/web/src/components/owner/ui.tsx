'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { Check, ChevronDown, CircleAlert, Star } from 'lucide-react';
import type { FormState } from '@/lib/form';
import { buttonClass } from './ui-classes';

/**
 * Primitivele zonei /owner. Culorile vin din tokenii `o-*` (globals.css): alb + Cafea + Carou la TOP FOOD,
 * hârtie caldă (sau Sticlă) + Chihlimbar la TOP DRINK. Fără umbre, fără majuscule, un singur font (Archivo).
 */

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
      <label htmlFor={id} className="text-[14px] font-semibold text-o-fg">
        {label}
      </label>
      {React.cloneElement(children, { id })}
      {hint ? <p className="text-[13px] leading-snug text-o-muted">{hint}</p> : null}
    </div>
  );
}

/** Buton de trimitere; rămâne activ până pornește cererea, apoi arată „…”. */
export function SubmitButton({ children, pendingLabel = 'Se trimite…', variant = 'primary', className = '', disabled = false, name, value }: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'quiet';
  className?: string;
  disabled?: boolean;
  /** Perechea name/value ajunge în FormData doar dacă ăsta e butonul apăsat (mai multe acțiuni într-un formular). */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} aria-busy={pending} className={`${buttonClass(variant)} ${className}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Eroarea sau confirmarea unei acțiuni, anunțată și cititoarelor de ecran. Se recunoaște după icon și text, nu doar după culoare. */
export function FormMessage({ state }: { state: FormState }) {
  const text = state.error ?? state.message;
  return (
    <p
      aria-live="polite"
      className={text ? `flex items-start gap-2 text-[14px] font-semibold leading-snug ${state.error ? 'text-o-danger' : 'text-o-fg'}` : 'sr-only'}
    >
      {text ? (
        <>
          {state.error ? <CircleAlert size={17} aria-hidden="true" className="mt-px shrink-0" /> : <Check size={17} aria-hidden="true" className="mt-px shrink-0" />}
          <span>{text}</span>
        </>
      ) : null}
    </p>
  );
}

/** Secțiune de dashboard: titlu condensat + conținut, fără umbre. */
export function Panel({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-titlu` : undefined} className="scroll-mt-20 border-t border-o-line pt-6">
      <h2 id={id ? `${id}-titlu` : undefined} className="font-display mb-4 text-balance text-[28px] leading-none text-o-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Titlu de grup în interiorul unei pagini (condensat, ca „Review-uri” din pagina localului). */
export function SubHeading({ id, children, note }: { id?: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-5">
      <h3 id={id} className="font-display text-balance text-[28px] leading-none text-o-fg">
        {children}
      </h3>
      {note ? <p className="mt-2 text-[14px] text-o-muted">{note}</p> : null}
    </div>
  );
}

/** Stare goală: cerc cu icon, ce lipsește și ce poate face ownerul (opțional cu buton). */
export function EmptyState({ title, children, icon, action }: { title: string; children?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[4px] border border-dashed border-o-field-line bg-o-surface px-6 py-8 sm:flex-row sm:items-center sm:gap-6">
      {icon ? (
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-o-card text-o-fg shadow-[inset_0_0_0_1.5px_var(--o-fg)]">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="font-display text-balance text-[26px] leading-none text-o-fg">{title}</p>
        {children ? <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-o-muted">{children}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Etichetă mică. `outline`: contur (tip de postare, influencer); `quiet`: gri modest, doar pentru ce e plătit sau neverificat. */
export function Tag({ tone = 'outline', icon, children }: { tone?: 'outline' | 'quiet'; icon?: React.ReactNode; children: React.ReactNode }) {
  const look = tone === 'quiet' ? 'bg-o-quiet text-o-muted' : 'text-o-fg shadow-[inset_0_0_0_1.5px_var(--o-fg)]';
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[3px] px-2.5 text-[13px] font-semibold ${look}`}>
      {icon}
      {children}
    </span>
  );
}

/** Cercul cu inițiale. Localnic/obișnuit: plin; turist: doar contur. */
export function Avatar({ name, outline = false }: { name: string; outline?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className={`font-display flex size-12 shrink-0 items-center justify-center rounded-full text-[21px] leading-none ${
        outline ? 'text-o-fg shadow-[inset_0_0_0_1.5px_var(--o-fg)]' : 'bg-o-avatar text-o-avatar-fg'
      }`}
    >
      {initials || '?'}
    </span>
  );
}

/** Stele (decorative: nota în cifre e mereu lângă ele). `value` din `max`, cu jumătăți de stea. */
export function Stars({ value, max = 10, size = 16 }: { value: number; max?: number; size?: number }) {
  const stars = (Math.max(0, Math.min(max, value)) / max) * 5;
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, stars - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={0} fill="currentColor" className="absolute inset-0 text-o-star-off" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} strokeWidth={0} fill="currentColor" className="text-o-star" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Rezumatul din capul paginii: numere mari, etichete mici, fără cutii identice. */
export function StatStrip({ items }: { items: { value: string | number; label: string }[] }) {
  return (
    <dl
      className="grid divide-x divide-o-line rounded-[4px] border border-o-line bg-o-surface"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((i) => (
        <div key={i.label} className="flex flex-col-reverse justify-end gap-2 px-4 py-5 sm:px-7">
          <dt className="text-[13px] leading-tight text-o-muted">{i.label}</dt>
          <dd className="font-display text-[44px] leading-[0.9] tabular-nums text-o-fg sm:text-[52px]">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Filtru sub formă de pastilă, ca „Localnici 112 / Turiști 26” din pagina publică a localului. */
export function Chip({ active, count, onClick, children }: { active: boolean; count?: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`btn-press touch-manipulation inline-flex min-h-11 items-center gap-2 rounded-[4px] px-3.5 text-[14px] font-semibold transition-colors ${
        active ? 'bg-o-active text-o-active-fg' : 'border border-o-field-line text-o-fg hover:bg-o-fg/[0.07]'
      }`}
    >
      {children}
      {count != null ? <span className={`tabular-nums ${active ? 'opacity-80' : 'text-o-muted'}`}>{count}</span> : null}
    </button>
  );
}

/** Buton care deschide un formular sub el (<details>); pe telefon împart rândul, deschis ocupă tot rândul. */
export function Disclosure({ summary, icon, children, variant = 'quiet' }: {
  summary: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'primary' | 'quiet';
}) {
  return (
    <details className="min-w-0 flex-1 open:min-w-full sm:flex-none">
      <summary className={`owner-summary w-full cursor-pointer sm:w-auto ${buttonClass(variant)}`}>
        {icon}
        {summary}
        <ChevronDown size={16} aria-hidden="true" className="owner-chevron" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

/** Bife „aplică și la”: celelalte localuri ale aceluiași owner primesc o copie (câmpul `alsoVenueIds`). */
export function AlsoVenues({ venues, legend, selected = '' }: { venues: { id: string; name: string }[]; legend: string; selected?: string }) {
  if (!venues.length) return null;
  // `selected` = valorile trimise înainte (din state.values), ca bifele să rămână după o eroare.
  const checked = new Set(selected.split(','));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[14px] font-semibold text-o-fg">{legend}</legend>
      {venues.map((v) => (
        <label key={v.id} className="flex min-h-11 items-center gap-3 text-[15px]">
          <input type="checkbox" name="alsoVenueIds" value={v.id} defaultChecked={checked.has(v.id)} className="size-5 accent-o-accent" />
          {v.name}
        </label>
      ))}
    </fieldset>
  );
}
