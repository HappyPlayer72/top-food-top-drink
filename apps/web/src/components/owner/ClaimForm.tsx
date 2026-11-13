'use client';

import { useActionState } from 'react';
import { confirmClaimAction, startClaimAction } from '@/app/owner/actions';
import type { ClaimState } from '@/lib/form';
import { Field, FormMessage, SubmitButton, inputClass } from './ui';

type Option = { id: string; name: string; group: string };

/** Revendicarea în doi pași: alegi localul, apoi introduci codul primit la numărul public al localului. */
export function ClaimForm({ venues }: { venues: Option[] }) {
  const [started, start] = useActionState(startClaimAction, {} as ClaimState);
  const [confirmed, confirm] = useActionState(confirmClaimAction, {} as ClaimState);
  const groups = [...new Set(venues.map((v) => v.group))];

  if (confirmed.ok) return <FormMessage state={confirmed} />;

  if (started.claimId) {
    return (
      <form action={confirm} className="flex max-w-md flex-col gap-4">
        <input type="hidden" name="claimId" value={started.claimId} />
        <p className="text-[15px]">
          Am trimis un cod de 6 cifre prin SMS la numărul public al localului
          {started.sendTo ? <> (<span className="tabular-nums">{started.sendTo}</span>)</> : null}.
        </p>
        <Field label="Codul primit">
          <input
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            spellCheck={false}
            className={`${inputClass} max-w-40 tabular-nums tracking-[0.2em]`}
          />
        </Field>
        <FormMessage state={confirmed} />
        <SubmitButton pendingLabel="Se verifică…">Confirmă codul</SubmitButton>
      </form>
    );
  }

  return (
    <form action={start} className="flex max-w-md flex-col gap-4">
      <Field label="Localul tău" hint="Îți trimitem un cod la numărul de telefon public al localului.">
        <select name="venueId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Alege localul…
          </option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {venues
                .filter((v) => v.group === g)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <FormMessage state={started} />
      <SubmitButton pendingLabel="Se trimite codul…">Sunt proprietarul</SubmitButton>
    </form>
  );
}
