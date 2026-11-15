'use client';

import { useActionState, useState } from 'react';
import { Camera, Flag, Inbox, MessageSquareText, Reply } from 'lucide-react';
import type { venuePage } from '@tftd/api';
import { replyAction, reportAction } from '@/app/owner/[venueId]/actions-reviews';
import { EMPTY } from '@/lib/form';
import { formatScore } from '@/types';
import { LocalnicBadge, TuristBadge } from '@/components/BrandPrimitives';
import { Avatar, Chip, Disclosure, EmptyState, Field, FormMessage, StatStrip, Stars, SubmitButton, Tag } from './ui';
import { frameClass, inputClass, stagger } from './ui-classes';

type Review = Awaited<ReturnType<typeof venuePage>>['reviews'][number];
type Filter = 'all' | 'local' | 'tourist' | 'open';

const dateFmt = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' });

export function ReviewsPanel({ venueId, reviews }: { venueId: string; reviews: Review[]; vertical: 'food' | 'drink' }) {
  const [filter, setFilter] = useState<Filter>('all');

  if (!reviews.length) {
    return (
      <EmptyState title="Încă nu sunt review-uri" icon={<MessageSquareText size={26} />}>
        Când vin primele, le vezi aici. Poți răspunde public sau raporta un review suspect.
      </EmptyState>
    );
  }

  const counts = {
    all: reviews.length,
    local: reviews.filter((r) => r.authorType === 'local').length,
    tourist: reviews.filter((r) => r.authorType === 'tourist').length,
    open: reviews.filter((r) => !r.replies.length).length,
  };
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const shown = reviews.filter((r) => (filter === 'local' ? r.authorType === 'local' : filter === 'tourist' ? r.authorType === 'tourist' : filter === 'open' ? !r.replies.length : true));

  return (
    <div className="flex flex-col gap-6">
      <StatStrip
        items={[
          { value: formatScore(average), label: 'Nota medie, din 10' },
          { value: counts.all, label: 'Review-uri' },
          { value: counts.open, label: 'Fără răspuns' },
        ]}
      />

      <div role="group" aria-label="Filtrează review-urile" className="flex flex-wrap gap-2">
        <Chip active={filter === 'all'} count={counts.all} onClick={() => setFilter('all')}>Toate</Chip>
        <Chip active={filter === 'local'} count={counts.local} onClick={() => setFilter('local')}>Localnici</Chip>
        <Chip active={filter === 'tourist'} count={counts.tourist} onClick={() => setFilter('tourist')}>Turiști</Chip>
        <Chip active={filter === 'open'} count={counts.open} onClick={() => setFilter('open')}>Fără răspuns</Chip>
      </div>

      <p className="max-w-prose text-[14px] leading-relaxed text-o-muted">
        Poți răspunde public sau raporta un review suspect. Raportarea ajunge la un admin; review-ul nu dispare automat.
      </p>

      {shown.length ? (
        <ul className="flex flex-col gap-4">
          {shown.map((r, i) => (
            <ReviewCard key={r.id} venueId={venueId} review={r} index={i} />
          ))}
        </ul>
      ) : (
        <EmptyState title="Niciun review aici" icon={<Inbox size={26} />}>
          Niciun review nu se potrivește filtrului ales. Alege „Toate” ca să le vezi pe toate.
        </EmptyState>
      )}
    </div>
  );
}

function ReviewCard({ venueId, review: r, index }: { venueId: string; review: Review; index: number }) {
  const [replyState, reply] = useActionState(replyAction.bind(null, venueId, r.id), EMPTY);
  const [reportState, report] = useActionState(reportAction.bind(null, venueId, r.id), EMPTY);
  const author = r.author?.displayName ?? r.externalAuthor?.name ?? 'Anonim';
  const answered = r.replies.length > 0;

  return (
    <li style={stagger(index)} className="stagger-fade-in overflow-hidden rounded-[4px] border border-o-line bg-o-card">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <Avatar name={author} outline={r.authorType === 'tourist'} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="break-words text-[18px] font-semibold leading-tight">{author}</span>
              <time className="text-[13px] text-o-muted">{dateFmt.format(new Date(r.postedAt))}</time>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {r.authorType === 'local' ? <LocalnicBadge size="sm" label={r.author?.neighborhood ? `Localnic din ${r.author.neighborhood}` : 'Localnic'} /> : null}
              {r.authorType === 'tourist' ? <TuristBadge size="sm" /> : null}
              {r.isPaid ? <Tag icon={<Camera size={14} aria-hidden="true" />}>Colaborare plătită</Tag> : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-[44px] leading-[0.85] tabular-nums">
              {r.rating}
              <span className="sr-only"> din 10</span>
            </p>
            <div className="mt-2 flex justify-end">
              <Stars value={r.rating} />
            </div>
          </div>
        </div>

        {r.text ? <p className="mt-5 max-w-prose break-words text-[16px] leading-relaxed sm:pl-[62px]">{r.text}</p> : null}

        {r.replies.map((x, i) => (
          <div key={i} className="mt-5 rounded-[4px] border border-o-line bg-o-quiet p-4 sm:ml-[62px]">
            <p className="text-[13px] font-semibold">Răspunsul localului</p>
            <p className="mt-1 max-w-prose break-words text-[15px] leading-relaxed">{x.text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-2 border-t border-o-line bg-o-surface px-5 py-3.5 sm:px-6">
        <Disclosure summary="Răspunde" icon={<Reply size={16} aria-hidden="true" />} variant={answered ? 'quiet' : 'primary'}>
          <form action={reply} className={`${frameClass} flex max-w-xl flex-col gap-4 bg-o-card`}>
            <Field label="Răspunsul tău (public)">
              <textarea name="text" required maxLength={2000} rows={3} className={inputClass} />
            </Field>
            <FormMessage state={replyState} />
            <div>
              <SubmitButton>Publică răspunsul</SubmitButton>
            </div>
          </form>
        </Disclosure>
        <Disclosure summary="Raportează" icon={<Flag size={16} aria-hidden="true" />}>
          <form action={report} className={`${frameClass} flex max-w-xl flex-col gap-4 bg-o-card`}>
            <Field label="De ce e suspect?" hint="Minim 10 caractere. Decide un admin.">
              <textarea name="reason" required minLength={10} rows={3} className={inputClass} />
            </Field>
            <FormMessage state={reportState} />
            <div>
              <SubmitButton variant="quiet">Trimite raportarea</SubmitButton>
            </div>
          </form>
        </Disclosure>
      </div>
    </li>
  );
}
