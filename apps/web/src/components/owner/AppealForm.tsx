'use client';

import { useActionState } from 'react';
import { appealTrapAction } from '@/app/owner/[venueId]/actions-reviews';
import { EMPTY } from '@/lib/form';
import { Field, FormMessage, SubmitButton, inputClass } from './ui';

export function AppealForm({ venueId, alreadyAppealed }: { venueId: string; alreadyAppealed: boolean }) {
  const [state, action] = useActionState(appealTrapAction.bind(null, venueId), EMPTY);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <details className="rounded-[4px] border border-hairline p-3">
      <summary className="min-h-11 cursor-pointer content-center text-[15px] font-semibold">
        {alreadyAppealed ? 'Ai o contestație în lucru. Mai trimite una' : 'Contestă eticheta de capcană'}
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <Field label="De ce e greșită eticheta?" hint="Decide un admin. Scorul nu se schimbă până atunci.">
          <textarea name="reason" required minLength={10} rows={3} className={inputClass} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton>Trimite contestația</SubmitButton>
      </form>
    </details>
  );
}
