'use client';

import { useActionState } from 'react';
import type { owner } from '@tftd/api';
import { createPostAction, deletePostAction, updatePostAction } from '@/app/owner/[venueId]/actions-blog';
import { EMPTY } from '@/lib/form';
import { toBucharestInput } from '@/lib/time';
import { Field, FormMessage, SubmitButton, inputClass } from './ui';

export type OwnerPost = Awaited<ReturnType<typeof owner.postsForOwner>>[number];

const TYPES = [
  ['menu', 'Meniu'],
  ['event', 'Eveniment'],
  ['offer', 'Ofertă'],
  ['news', 'Noutate'],
] as const;
const typeLabel = (t: string) => TYPES.find(([v]) => v === t)?.[1] ?? t;

// Fus fix: același text pe server și în browser (fără hidratare nepotrivită).
const dateFmt = new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Bucharest' });


export function BlogPanel({ venueId, posts }: { venueId: string; posts: OwnerPost[] }) {
  const [state, create] = useActionState(createPostAction.bind(null, venueId), EMPTY);
  return (
    <div className="flex flex-col gap-6">
      <form action={create} className="group flex flex-col gap-3">
        <h3 className="font-display text-[22px] leading-none text-cafea">Postare nouă</h3>
        <PostFields />
        <FormMessage state={state} />
        <div>
          <SubmitButton>Publică postarea</SubmitButton>
        </div>
      </form>

      {posts.length ? (
        <ul className="flex flex-col divide-y divide-hairline">
          {posts.map((p) => (
            <PostItem key={p.id} venueId={venueId} post={p} />
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-muted-cafea">Încă nu ai postări. Scrie meniul zilei sau un eveniment.</p>
      )}
    </div>
  );
}

/** Câmpurile comune formularului nou și celui de editare. Data evenimentului apare doar la „Eveniment" (CSS :has, fără state, deci se resetează odată cu formularul). */
function PostFields({ post }: { post?: OwnerPost }) {
  return (
    <>
      <Field label="Tip">
        <select name="type" defaultValue={post?.type ?? 'menu'} className={inputClass}>
          {TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Titlu">
        <input name="title" required maxLength={140} defaultValue={post?.title} className={inputClass} />
      </Field>
      <Field label="Text">
        <textarea name="body" required maxLength={5000} rows={4} defaultValue={post?.body} className={inputClass} />
      </Field>
      <Field label="Poze (opțional)" hint="URL-uri care încep cu https://, unul pe linie.">
        <textarea name="photos" rows={2} defaultValue={post?.photos.join('\n')} className={inputClass} />
      </Field>
      <div className="hidden group-has-[option[value=event]:checked]:block">
        <Field label="Data evenimentului">
          <input type="datetime-local" name="eventAt" defaultValue={toBucharestInput(post?.eventAt ?? null)} className={inputClass} />
        </Field>
      </div>
      <Field label="Publică la" hint={post ? 'Gol = rămâne data de acum.' : 'Gol = acum'}>
        <input type="datetime-local" name="publishAt" defaultValue={toBucharestInput(post?.publishAt ?? null)} className={inputClass} />
      </Field>
    </>
  );
}

function PostItem({ venueId, post: p }: { venueId: string; post: OwnerPost }) {
  const [state, update] = useActionState(updatePostAction.bind(null, venueId, p.id), EMPTY);
  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-2 text-[14px]">
        <h3 className="font-display text-[22px] leading-none text-cafea">{p.title}</h3>
        <span className="rounded-[4px] border border-hairline px-2 py-0.5">{typeLabel(p.type)}</span>
        {p.scheduled ? (
          <span className="rounded-[4px] bg-sponsored-food px-2 py-0.5">Programată pentru {dateFmt.format(p.publishAt)}</span>
        ) : (
          <span className="text-muted-cafea">{dateFmt.format(p.publishAt)}</span>
        )}
        {p.eventAt ? <span className="text-muted-cafea">· eveniment: {dateFmt.format(p.eventAt)}</span> : null}
      </div>
      <p className="text-[15px] break-words whitespace-pre-line">{p.body}</p>
      <div className="flex flex-wrap items-start gap-2">
        <details className="min-w-64 flex-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-[4px] border border-hairline px-3 text-[14px] font-semibold">
            Editează
          </summary>
          <form action={update} className="group mt-2 flex flex-col gap-3">
            <PostFields post={p} />
            <FormMessage state={state} />
            <div>
              <SubmitButton>Salvează modificările</SubmitButton>
            </div>
          </form>
        </details>
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
