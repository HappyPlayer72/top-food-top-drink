'use client';

import { useActionState } from 'react';
import { appealTrapAction } from '@/app/owner/[venueId]/actions-reviews';
import { EMPTY } from '@/lib/form';
import { Disclosure, Field, FormMessage, SubmitButton } from './ui';
import { frameClass, inputClass } from './ui-classes';

export function AppealForm({ venueId, alreadyAppealed }: { venueId: string; alreadyAppealed: boolean }) {
  const [state, action] = useActionState(appealTrapAction.bind(null, venueId), EMPTY);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <div className="flex flex-wrap">
      <Disclosure summary={alreadyAppealed ? 'Ai o contestație în lucru. Mai trimite una' : 'Contestă eticheta de capcană'}>
        <form action={action} className={`${frameClass} flex max-w-xl flex-col gap-4`}>
          <Field label="De ce e greșită eticheta?" hint="Decide un admin. Scorul nu se schimbă până atunci.">
            <textarea name="reason" required minLength={10} rows={3} className={inputClass} />
          </Field>
          <FormMessage state={state} />
          <div>
            <SubmitButton>Trimite contestația</SubmitButton>
          </div>
        </form>
      </Disclosure>
    </div>
  );
}
