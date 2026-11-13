'use client';

import { useActionState } from 'react';
import { Check, Star, UserPlus, UsersRound } from 'lucide-react';
import type { owner } from '@tftd/api';
import { inviteEmployeeAction, removeEmployeeAction } from '@/app/owner/[venueId]/actions-team';
import { EMPTY } from '@/lib/form';
import { cate } from '@/lib/ro';
import { Avatar, EmptyState, Field, FormMessage, StatStrip, Stars, SubHeading, SubmitButton, Tag } from './ui';
import { fieldGrid, frameClass, inputClass, stagger } from './ui-classes';

export type TeamMember = Awaited<ReturnType<typeof owner.employeesForOwner>>[number];
export type TeamRating = Awaited<ReturnType<typeof owner.employeeRatingsForOwner>>[number];

/** Media vine ca string numeric din SQL; „—” când nu există note. */
const avg = (x: string | null) => (x == null ? '—' : Number(x).toFixed(1).replace('.', ','));

export function TeamPanel({ venueId, team, ratings }: { venueId: string; team: TeamMember[]; ratings: TeamRating[]; vertical: 'food' | 'drink' }) {
  const [inviteState, invite] = useActionState(inviteEmployeeAction.bind(null, venueId), EMPTY);
  const rated = ratings.filter((r) => Number(r.ratings) > 0);

  return (
    <div className="flex flex-col gap-10">
      <StatStrip
        items={[
          { value: team.filter((m) => m.accepted).length, label: 'Membri activi' },
          { value: team.filter((m) => !m.accepted).length, label: 'Invitații în așteptare' },
          { value: rated.reduce((sum, r) => sum + Number(r.ratings), 0), label: 'Note primite' },
        ]}
      />

      <section aria-labelledby="echipa-lista">
        <SubHeading id="echipa-lista" note="Numele unui om apare public doar după ce acceptă invitația.">
          Membri
        </SubHeading>
        {team.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m, i) => (
              <MemberItem key={m.id} venueId={venueId} member={m} index={i} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Încă nu ai adăugat pe nimeni" icon={<UsersRound size={26} />}>
            Invită ospătarii, barmanii și bucătarii mai jos. Clienții îi pot nota, iar tu vezi notele.
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="echipa-adauga">
        <form action={invite} className={`${frameClass} flex max-w-xl flex-col gap-4 bg-o-card`}>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-o-avatar text-o-avatar-fg">
              <UserPlus size={20} />
            </span>
            <div>
              <h3 id="echipa-adauga" className="font-display text-[28px] leading-none">
                Adaugă un om în echipă
              </h3>
              <p className="mt-1 text-[13px] text-o-muted">Primește o invitație și apare public doar dacă acceptă.</p>
            </div>
          </div>
          <div className={fieldGrid}>
            <Field label="Prenume">
              <input name="firstName" required maxLength={60} autoComplete="off" className={inputClass} />
            </Field>
            <Field label="Rol">
              <input name="role" required maxLength={60} autoComplete="off" placeholder="ex. ospătar, barman, bucătar…" className={inputClass} />
            </Field>
          </div>
          <Field label="Nume de utilizator" hint="Contul lui de pe topfood.">
            <input name="username" required maxLength={60} autoComplete="off" autoCapitalize="none" spellCheck={false} className={inputClass} />
          </Field>
          <FormMessage state={inviteState} />
          <div>
            <SubmitButton>Trimite invitația</SubmitButton>
          </div>
        </form>
      </section>

      <section aria-labelledby="echipa-note">
        <SubHeading id="echipa-note" note="Doar tu le vezi, inclusiv notele mici. Medii de la 1 la 5.">
          Notele echipei
        </SubHeading>
        {rated.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rated.map((r, i) => (
              <RatingCard key={r.employeeId} rating={r} index={i} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Încă nu sunt note de la clienți" icon={<Star size={26} />}>
            Clienții notează angajații după vizită. Mediile pe amabilitate și rapiditate apar aici.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function MemberItem({ venueId, member: m, index }: { venueId: string; member: TeamMember; index: number }) {
  return (
    <li style={stagger(index)} className="stagger-fade-in flex flex-col items-center rounded-[4px] border border-o-line bg-o-card px-5 pb-5 pt-3 text-center">
      {/* fanta ecusonului de pe uniformă */}
      <span aria-hidden="true" className={`mb-4 h-1.5 w-8 rounded-full ${m.accepted ? 'bg-o-fg' : 'bg-o-line'}`} />
      <Avatar name={m.firstName} outline={!m.accepted} />
      <p className="font-display mt-3 break-words text-[30px] leading-none">{m.firstName}</p>
      <p className="mt-1.5 text-[14px] text-o-muted">{m.role}</p>
      <div className="mt-4">
        {m.accepted ? (
          <Tag icon={<Check size={14} aria-hidden="true" />}>Activ</Tag>
        ) : (
          <Tag tone="quiet">Invitat, așteaptă acceptul</Tag>
        )}
      </div>
      <form
        className="mt-5 w-full"
        action={removeEmployeeAction.bind(null, venueId, m.id)}
        onSubmit={(e) => {
          if (!window.confirm(`Scoți ${m.firstName} din echipă? Datele lui publice dispar.`)) e.preventDefault();
        }}
      >
        <SubmitButton variant="quiet" pendingLabel="Se scoate…" className="w-full">
          Scoate din echipă
        </SubmitButton>
      </form>
    </li>
  );
}

function RatingCard({ rating: r, index }: { rating: TeamRating; index: number }) {
  return (
    <li style={stagger(index)} className="stagger-fade-in rounded-[4px] border border-o-line bg-o-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display break-words text-[30px] leading-none">{r.firstName}</span>
        <span className="text-[13px] text-o-muted">{cate(Number(r.ratings), 'notă', 'note')}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-o-line pt-5">
        {[
          ['Amabilitate', r.friendliness],
          ['Rapiditate', r.speed],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[13px] text-o-muted">{label}</p>
            <p className="font-display mt-1 text-[52px] leading-[0.9] tabular-nums">{avg(value)}</p>
            <div className="mt-2">{value != null ? <Stars value={Number(value)} max={5} size={15} /> : null}</div>
          </div>
        ))}
      </div>
    </li>
  );
}
