'use client';

import { useActionState } from 'react';
import type { venuePage } from '@tftd/api';
import { LocalnicBadge } from '@/components/BrandPrimitives';
import { replyAction, reportAction } from '@/app/owner/[venueId]/actions-reviews';
import { EMPTY } from '@/lib/form';
import { Field, FormMessage, SubmitButton, inputClass } from './ui';

type Review = Awaited<ReturnType<typeof venuePage>>['reviews'][number];

const dateFmt = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' });

export function ReviewsPanel({ venueId, reviews }: { venueId: string; reviews: Review[] }) {
  if (!reviews.length) return <p className="text-[15px] text-muted-cafea">Încă nu sunt review-uri.</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] text-muted-cafea">
        Poți răspunde public sau raporta un review suspect. Raportarea ajunge la un admin; review-ul nu dispare automat.
      </p>
      <ul className="flex flex-col divide-y divide-hairline">
        {reviews.map((r) => (
          <ReviewItem key={r.id} venueId={venueId} review={r} />
        ))}
      </ul>
    </div>
  );
}

function ReviewItem({ venueId, review: r }: { venueId: string; review: Review }) {
  const [replyState, reply] = useActionState(replyAction.bind(null, venueId, r.id), EMPTY);
  const [reportState, report] = useActionState(reportAction.bind(null, venueId, r.id), EMPTY);
  const author = r.author?.displayName ?? r.externalAuthor?.name ?? 'Anonim';

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-2 text-[14px]">
        <span className="font-display text-[22px] leading-none tabular-nums">{r.rating}/10</span>
        <span className="font-semibold">{author}</span>
        {r.authorType === 'local' ? <LocalnicBadge size="xs" label={r.author?.neighborhood ? `Localnic din ${r.author.neighborhood}` : "Localnic"} /> : null}
        {r.authorType === 'tourist' ? <span className="text-muted-cafea">turist</span> : null}
        {r.isPaid ? <span className="rounded-[4px] bg-sponsored-food px-2 py-0.5">colaborare plătită</span> : null}
        <span className="text-muted-cafea">· {dateFmt.format(new Date(r.postedAt))}</span>
      </div>
      {r.text ? <p className="text-[15px] break-words">{r.text}</p> : null}
      {r.replies.map((x, i) => (
        <p key={i} className="ml-4 border-l-2 border-hairline pl-3 text-[15px]">
          <span className="font-semibold">Răspunsul localului: </span>
          {x.text}
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        <details className="min-w-64 flex-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-[4px] border border-hairline px-3 text-[14px] font-semibold">
            Răspunde
          </summary>
          <form action={reply} className="mt-2 flex flex-col gap-2">
            <Field label="Răspunsul tău (public)">
              <textarea name="text" required maxLength={2000} rows={3} className={inputClass} />
            </Field>
            <FormMessage state={replyState} />
            <SubmitButton>Publică răspunsul</SubmitButton>
          </form>
        </details>
        <details className="min-w-64 flex-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-[4px] border border-hairline px-3 text-[14px] font-semibold">
            Raportează
          </summary>
          <form action={report} className="mt-2 flex flex-col gap-2">
            <Field label="De ce e suspect?" hint="Minim 10 caractere. Decide un admin.">
              <textarea name="reason" required minLength={10} rows={2} className={inputClass} />
            </Field>
            <FormMessage state={reportState} />
            <SubmitButton variant="quiet">Trimite raportarea</SubmitButton>
          </form>
        </details>
      </div>
    </li>
  );
}
