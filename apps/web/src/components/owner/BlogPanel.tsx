'use client';

import { useActionState } from 'react';
import { BadgePercent, Clock, Megaphone, PenLine } from 'lucide-react';
import type { owner } from '@tftd/api';
import { createPostAction, deletePostAction, updatePostAction } from '@/app/owner/[venueId]/actions-blog';
import { EMPTY } from '@/lib/form';
import { toBucharestInput } from '@/lib/time';
import { AlsoVenues, Disclosure, EmptyState, Field, FormMessage, StatStrip, SubHeading, SubmitButton, Tag } from './ui';
import { fieldGrid, frameClass, inputClass, stagger } from './ui-classes';

export type OwnerPost = Awaited<ReturnType<typeof owner.postsForOwner>>[number];

// Meniul are secțiunea lui; aici doar postări.
const TYPES = [
  ['event', 'Eveniment'],
  ['offer', 'Ofertă'],
  ['news', 'Noutate'],
] as const;
const typeLabel = (t: string) => TYPES.find(([v]) => v === t)?.[1] ?? t;

// Fus fix: același text pe server și în browser (fără hidratare nepotrivită).
const dateFmt = new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Bucharest' });
const weekdayFmt = new Intl.DateTimeFormat('ro-RO', { weekday: 'short', timeZone: 'Europe/Bucharest' });
const dayFmt = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', timeZone: 'Europe/Bucharest' });

export function BlogPanel({ venueId, posts, otherVenues }: { venueId: string; posts: OwnerPost[]; otherVenues: { id: string; name: string }[] }) {
  const [state, create] = useActionState(createPostAction.bind(null, venueId), EMPTY);
  return (
    <div className="flex flex-col gap-10">
      <StatStrip
        items={[
          { value: posts.length, label: 'Postări' },
          { value: posts.filter((p) => p.scheduled).length, label: 'Programate' },
          { value: posts.filter((p) => p.type === 'event').length, label: 'Evenimente' },
        ]}
      />

      <section aria-labelledby="postare-noua">
        <form key={state.seq} action={create} className={`group ${frameClass} flex flex-col gap-4 bg-o-card`}>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-o-avatar text-o-avatar-fg">
              <PenLine size={20} />
            </span>
            <div>
              <h3 id="postare-noua" className="font-display text-[28px] leading-none">
                Postare nouă
              </h3>
              <p className="mt-1 text-[13px] text-o-muted">O ofertă, un eveniment sau o noutate.</p>
            </div>
          </div>
          <PostFields values={state.values} />
          <AlsoVenues venues={otherVenues} legend="Publică și la" selected={state.values?.alsoVenueIds} />
          <FormMessage state={state} />
          <div>
            <SubmitButton>Publică postarea</SubmitButton>
          </div>
        </form>
      </section>

      <section aria-labelledby="postari-titlu">
        <SubHeading id="postari-titlu" note="Apar pe pagina localului, în ordinea în care le publici.">
          Postările tale
        </SubHeading>
        {posts.length ? (
          <ul className="flex flex-col gap-4">
            {posts.map((p, i) => (
              <PostItem key={p.id} venueId={venueId} post={p} index={i} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Încă nu ai postări" icon={<PenLine size={26} />}>
            Scrie o ofertă, o noutate sau un eveniment de weekend. Completează formularul de mai sus.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

/** Câmpurile comune formularului nou și celui de editare. Data evenimentului apare doar la „Eveniment" (CSS :has, fără state, deci se resetează odată cu formularul). */
function PostFields({ post, values }: { post?: OwnerPost; values?: Record<string, string> }) {
  return (
    <>
      <div className={fieldGrid}>
        <Field label="Tip">
          <select name="type" defaultValue={values?.type ?? post?.type ?? 'news'} className={inputClass}>
            {TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Publică la" hint={post ? 'Gol = rămâne data de acum.' : 'Gol = acum'}>
          <input type="datetime-local" name="publishAt" defaultValue={values?.publishAt ?? toBucharestInput(post?.publishAt ?? null)} className={inputClass} />
        </Field>
      </div>
      <div className="hidden group-has-[option[value=event]:checked]:block">
        <Field label="Data evenimentului">
          <input type="datetime-local" name="eventAt" defaultValue={values?.eventAt ?? toBucharestInput(post?.eventAt ?? null)} className={`${inputClass} sm:max-w-xs`} />
        </Field>
      </div>
      <Field label="Titlu">
        <input name="title" required maxLength={140} autoComplete="off" defaultValue={values?.title ?? post?.title} className={inputClass} />
      </Field>
      <Field label="Text">
        <textarea name="body" required maxLength={5000} rows={4} defaultValue={values?.body ?? post?.body} className={inputClass} />
      </Field>
      <Field label="Poze (opțional)" hint="URL-uri care încep cu https://, unul pe linie.">
        <textarea name="photos" rows={2} defaultValue={values?.photos ?? post?.photos.join('\n')} className={inputClass} />
      </Field>
    </>
  );
}

/** Ca în „Weekendul ăsta”: ziua și data într-un chenar, doar la evenimente. */
function DateBox({ date }: { date: Date }) {
  return (
    <div aria-hidden="true" className="flex h-[76px] w-16 shrink-0 flex-col items-center justify-center rounded-[4px] border-[1.5px] border-o-outline">
      <span className="text-[13px] font-semibold text-o-outline">{weekdayFmt.format(date)}</span>
      <span className="font-display text-[34px] leading-none">{dayFmt.format(date)}</span>
    </div>
  );
}

// `menu` rămâne în enum-ul din DB; migrarea 0004 a mutat postările vechi la „news”.
const TYPE_ICON = { menu: Megaphone, offer: BadgePercent, news: Megaphone } as const;

/** Ofertă, noutate: același chenar ca la dată, cu iconul tipului. */
function TypeBox({ type }: { type: keyof typeof TYPE_ICON }) {
  const Icon = TYPE_ICON[type];
  return (
    <div aria-hidden="true" className="flex h-[76px] w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-[4px] border-[1.5px] border-o-outline text-o-outline">
      <Icon size={24} strokeWidth={1.8} />
      <span className="text-[11px] font-semibold">{typeLabel(type)}</span>
    </div>
  );
}

function PostItem({ venueId, post: p, index }: { venueId: string; post: OwnerPost; index: number }) {
  const [state, update] = useActionState(updatePostAction.bind(null, venueId, p.id), EMPTY);
  return (
    <li style={stagger(index)} className="stagger-fade-in overflow-hidden rounded-[4px] border border-o-line bg-o-card">
      <div className="flex gap-4 p-5 sm:p-6">
        {p.type === 'event' && p.eventAt ? <DateBox date={p.eventAt} /> : p.type !== 'event' ? <TypeBox type={p.type} /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="font-display break-words text-[28px] leading-none">{p.title}</h3>
            {p.type === 'event' ? <Tag>Eveniment</Tag> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-o-muted">
            {p.scheduled ? (
              <Tag icon={<Clock size={14} aria-hidden="true" />}>Programată pentru {dateFmt.format(p.publishAt)}</Tag>
            ) : (
              <span>Publicată {dateFmt.format(p.publishAt)}</span>
            )}
            {p.eventAt ? <span className="font-semibold text-o-fg">Eveniment: {dateFmt.format(p.eventAt)}</span> : null}
          </div>
          <p className="max-w-prose break-words whitespace-pre-line text-[16px] leading-relaxed">{p.body}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2 border-t border-o-line bg-o-surface px-5 py-3.5 sm:px-6">
        <Disclosure summary="Editează">
          <form key={state.seq} action={update} className={`group ${frameClass} flex flex-col gap-4 bg-o-card`}>
            <PostFields post={p} values={state.values} />
            <FormMessage state={state} />
            <div>
              <SubmitButton>Salvează modificările</SubmitButton>
            </div>
          </form>
        </Disclosure>
        <form
          action={deletePostAction.bind(null, venueId, p.id)}
          onSubmit={(e) => {
            if (!window.confirm('Ștergi postarea?')) e.preventDefault();
          }}
        >
          <SubmitButton variant="quiet" pendingLabel="Se șterge…">
            Șterge
          </SubmitButton>
        </form>
      </div>
    </li>
  );
}
