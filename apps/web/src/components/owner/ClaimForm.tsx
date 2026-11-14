'use client';

import { useActionState, useState } from 'react';
import { Check } from 'lucide-react';
import { confirmClaimAction, startClaimAction } from '@/app/owner/actions';
import type { ClaimState } from '@/lib/form';
import { IconDialog } from './IconEditor';
import { Field, FormMessage, SubmitButton } from './ui';
import { buttonClass, inputClass } from './ui-classes';

type Option = { id: string; name: string; group: string; neighborhood: string | null; vertical: 'food' | 'drink' };
/** Revendicare începută și neconfirmată: pagina o duce direct la pasul cu codul. */
type Resume = { claimId: string; venueId: string; venueName: string; vertical: 'food' | 'drink'; sendTo: string | null };

/** Fără diacritice și litere mici, ca „timisoara” să găsească „Timișoara”. */
const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Revendicarea în doi pași: cauți și alegi localul, apoi introduci codul primit la numărul public al localului. */
export function ClaimForm({ venues, resume }: { venues: Option[]; resume?: Resume | null }) {
  const [started, start] = useActionState(startClaimAction, {} as ClaimState);
  const [confirmed, confirm] = useActionState(confirmClaimAction, {} as ClaimState);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Option | null>(null);
  const [skipResume, setSkipResume] = useState(false);
  const [iconOpen, setIconOpen] = useState(true);
  const groups = [...new Set(venues.map((v) => v.group))];

  // Pașii: o cerere nouă pornită aici are prioritate; altfel reluăm cererea începută mai devreme.
  const resuming = !started.claimId && !!resume && !skipResume;
  const claimId = started.claimId ?? (resuming ? resume.claimId : undefined);
  const sendTo = started.claimId ? started.sendTo : resume?.sendTo;
  // Localul se ține din momentul alegerii (sau al reluării): după confirmare dispare și din lista de revendicat, și din `resume`.
  const [firstResume] = useState(resume);
  const target = !started.claimId && !skipResume && firstResume ? { id: firstResume.venueId, name: firstResume.venueName, vertical: firstResume.vertical } : picked;

  if (confirmed.ok) {
    return (
      <div className="flex flex-col items-start gap-3">
        <FormMessage state={confirmed} />
        {target ? (
          <>
            <button type="button" onClick={() => setIconOpen(true)} className={buttonClass('quiet')}>
              Alege poza sau simbolul
            </button>
            <IconDialog
              venueId={target.id}
              venueName={target.name}
              vertical={target.vertical}
              current={{ symbol: null, color: null, image: null }}
              open={iconOpen}
              onClose={() => setIconOpen(false)}
            />
          </>
        ) : null}
      </div>
    );
  }

  const rejected = !!claimId && confirmed.rejectedClaimId === claimId;
  if (claimId && !rejected) {
    return (
      <form action={confirm} className="flex max-w-md flex-col gap-4">
        <input type="hidden" name="claimId" value={claimId} />
        <p className="text-[15px]">
          {resuming ? <>Ai început revendicarea pentru <strong>{resume.venueName}</strong>. </> : null}
          Am trimis un cod de 6 cifre prin SMS la numărul public al localului
          {sendTo ? <> (<span className="tabular-nums">{sendTo}</span>)</> : null}.
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
        <span className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Se verifică…">Confirmă codul</SubmitButton>
          {resuming ? (
            <button type="button" onClick={() => setSkipResume(true)} className={buttonClass('quiet')}>
              Alt local
            </button>
          ) : null}
        </span>
      </form>
    );
  }

  const found = venues.filter((v) => plain(`${v.name} ${v.neighborhood ?? ''}`).includes(plain(query)));

  return (
    <form action={start} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={picked?.id ?? ''} />
      <Field label="Caută localul tău" hint="După nume sau cartier. Îți trimitem un cod la numărul de telefon public al localului.">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" placeholder="Ex. Bodega sau Iosefin" className={inputClass} />
      </Field>
      <div role="radiogroup" aria-label="Localuri" className="max-h-80 overflow-y-auto rounded-[4px] border border-o-line">
        {groups.map((g) => {
          const rows = found.filter((v) => v.group === g);
          return rows.length ? (
            <div key={g} role="group" aria-label={g}>
              <p className="sticky top-0 border-b border-o-line bg-o-surface px-3 py-1.5 text-[13px] font-semibold text-o-muted">{g}</p>
              {rows.map((v) => (
                <label
                  key={v.id}
                  className="group flex min-h-11 cursor-pointer items-center justify-between gap-3 border-b border-o-line px-3 py-2 last:border-b-0 hover:bg-o-fg/[0.06] has-[:checked]:bg-o-active has-[:checked]:text-o-active-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[color:var(--o-focus)]"
                >
                  <input type="radio" checked={picked?.id === v.id} onChange={() => setPicked(v)} className="sr-only" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{v.name}</span>
                    {v.neighborhood ? <span className="block text-[13px] text-o-muted group-has-[:checked]:text-o-active-fg/80">{v.neighborhood}</span> : null}
                  </span>
                  <Check size={18} aria-hidden="true" className="hidden shrink-0 group-has-[:checked]:block" />
                </label>
              ))}
            </div>
          ) : null;
        })}
        {found.length ? null : <p className="px-3 py-6 text-[14px] text-o-muted">Niciun local nu se potrivește. Încearcă alt nume sau cartier.</p>}
      </div>
      <p aria-live="polite" className="text-[14px] text-o-muted">
        {picked ? (
          <>
            Ai ales: <strong className="text-o-fg">{picked.name}</strong>
          </>
        ) : (
          `${found.length} ${found.length === 1 ? 'local' : 'localuri'}`
        )}
      </p>
      <FormMessage state={rejected ? confirmed : started} />
      <SubmitButton pendingLabel="Se trimite codul…" disabled={!picked}>
        Sunt proprietarul
      </SubmitButton>
    </form>
  );
}
