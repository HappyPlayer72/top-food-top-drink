'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createProgramAction } from '@/app/owner/[venueId]/actions-loyalty';
import { EMPTY } from '@/lib/form';
import { Field, FormMessage, SubHeading, SubmitButton } from './ui';

const ICON_LABELS: Record<string, string> = {
  soup: 'Ciorbă',
  coffee: 'Cafea',
  croissant: 'Patiserie',
  pizza: 'Pizza',
  beer: 'Bere',
  wine: 'Vin',
  heart: 'Inimă',
  cat: 'Pisică',
};
const inputClass = 'min-h-11 w-full rounded-[4px] border border-o-line bg-o-card px-3 text-[16px] text-o-fg sm:text-[15px]';

export type ProgramView = { rewardTitle: string; stampsRequired: number; icon: string } | null;

/**
 * Fidelitate pentru owner: creează cardul și arată codul QR pe care îl scanează clienții.
 * Codul se schimbă la fiecare minut (o poză făcută azi nu mai merge mâine); pagina îl reîmprospătează singură.
 */
export function LoyaltyPanel({
  venueId,
  program,
  qrSvg,
  code,
  expiresInSeconds,
}: {
  venueId: string;
  program: ProgramView;
  qrSvg: string | null;
  /** Textul codului, pentru telefoanele fără citire QR (se scrie de mână) */
  code?: string | null;
  expiresInSeconds: number | null;
}) {
  const router = useRouter();
  const [state, create] = useActionState(createProgramAction.bind(null, venueId), EMPTY);

  // Cere codul nou exact când expiră cel afișat
  useEffect(() => {
    if (expiresInSeconds == null) return;
    const t = window.setTimeout(() => router.refresh(), (expiresInSeconds + 1) * 1000);
    return () => window.clearTimeout(t);
  }, [expiresInSeconds, router, qrSvg]);

  return (
    <div className="flex flex-col gap-12">
      {program && qrSvg ? (
        <section aria-labelledby="qr-titlu" className="grid gap-8 rounded-[4px] border border-o-line bg-o-card p-6 sm:p-8 md:grid-cols-[260px_minmax(0,1fr)]">
          <figure className="m-0 flex flex-col items-center gap-3">
            <div
              role="img"
              aria-label={`Cod QR pentru ștampilă: ${program.rewardTitle}. Se schimbă la fiecare minut.`}
              className="w-full max-w-[260px] rounded-[4px] bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <figcaption className="text-[13px] text-o-muted text-center">
              {code ? <code className="block break-all text-[12px] text-o-fg">{code}</code> : null}
              Codul se reîmprospătează automat în fiecare minut.
            </figcaption>
          </figure>
          <div className="min-w-0 space-y-3">
            <h3 id="qr-titlu" className="font-display text-[30px] leading-tight text-o-fg">
              Arată codul ăsta la casă
            </h3>
            <p className="max-w-prose text-[15px] leading-relaxed text-o-muted">
              Clientul îl scanează din aplicație și primește o ștampilă. Premiul:{' '}
              <strong className="text-o-fg">{program.rewardTitle}</strong>, la {program.stampsRequired} ștampile.
            </p>
            <p className="max-w-prose text-[15px] leading-relaxed text-o-muted">
              Codul se schimbă la fiecare minut și fiecare client primește cel mult o ștampilă pe zi, așa că o poză făcută
              codului nu ajută pe nimeni să trișeze.
            </p>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="program-titlu" className="flex flex-col gap-5">
        <SubHeading id="program-titlu" note={program ? 'Un card nou îl înlocuiește pe cel actual.' : undefined}>
          {program ? 'Schimbă cardul de fidelitate' : 'Creează cardul de fidelitate'}
        </SubHeading>
        <form action={create} className="flex max-w-xl flex-col gap-4 rounded-[4px] border border-o-line bg-o-card p-5 sm:p-7">
          <div key={state.seq} className="contents">
          <Field label="Premiul" hint="Ce primește clientul când strânge toate ștampilele.">
            <input name="rewardTitle" required maxLength={80} defaultValue={state.values?.rewardTitle ?? ''} className={inputClass} placeholder="ex. O ciorbă din partea casei" />
          </Field>
          <Field label="Câte ștampile">
            <select name="stampsRequired" defaultValue={state.values?.stampsRequired ?? '6'} className={inputClass}>
              {[4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} ștampile
                </option>
              ))}
            </select>
          </Field>
          <Field label="Iconița de pe card">
            <select name="icon" defaultValue={state.values?.icon ?? 'heart'} className={inputClass}>
              {Object.entries(ICON_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          </div>
          <FormMessage state={state} />
          <div>
            <SubmitButton>{program ? 'Înlocuiește cardul' : 'Creează cardul'}</SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
