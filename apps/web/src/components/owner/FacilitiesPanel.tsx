'use client';

import { useActionState } from 'react';
import { QUESTIONS, THEMES } from '@tftd/scoring/features';
import { saveFacilitiesAction } from '@/app/owner/[venueId]/actions-facilities';
import { EMPTY } from '@/lib/form';
import { FormMessage, SubmitButton } from './ui';
import { frameClass } from './ui-classes';

const CHOICES = [
  { value: 'yes', label: 'Da' },
  { value: 'no', label: 'Nu' },
  { value: 'unspecified', label: 'Nespecificat' },
] as const;

/** Ce declară owner-ul despre local. Apare public ca „Declarat de local”, separat de răspunsurile clienților. */
export function FacilitiesPanel({ venueId, declarations }: { venueId: string; declarations: Record<string, 'yes' | 'no'> }) {
  const [state, save] = useActionState(saveFacilitiesAction.bind(null, venueId), EMPTY);
  const current = (key: string) => state.values?.[key] ?? declarations[key] ?? 'unspecified';
  const groups = THEMES.map((t) => ({ ...t, questions: QUESTIONS.filter((q) => q.theme === t.key && q.ownerDeclarable) })).filter((g) => g.questions.length);

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-prose text-[15px] text-o-muted">
        Ce bifezi aici apare pe pagina localului marcat „Declarat de local”, separat de ce spun clienții. Când destui clienți răspund la
        aceeași întrebare, pagina arată procentul lor; dacă nu sunteți de acord, se văd ambele. Lucrurile pe care le simt clienții (liniște,
        atmosferă, siguranță) nu se pot declara.
      </p>
      <form key={state.seq} action={save} className="flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`fac-${g.key}`} className={`${frameClass} flex flex-col gap-4 bg-o-card`}>
            <h3 id={`fac-${g.key}`} className="font-display text-[26px] leading-none">
              {g.label}
            </h3>
            {g.questions.map((q) => (
              <fieldset key={q.key} className="flex flex-col gap-2">
                <legend className="text-[15px] font-semibold">{q.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {CHOICES.map((c) => (
                    <label
                      key={c.value}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[4px] border border-o-line px-3 text-[15px] has-[:checked]:border-o-fg has-[:checked]:font-semibold"
                    >
                      <input type="radio" name={`f:${q.key}`} value={c.value} defaultChecked={current(q.key) === c.value} className="size-5 accent-o-accent" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>
        ))}
        <FormMessage state={state} />
        <div>
          <SubmitButton pendingLabel="Se salvează…">Salvează facilitățile</SubmitButton>
        </div>
      </form>
    </div>
  );
}
