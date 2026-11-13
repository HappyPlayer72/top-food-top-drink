'use client';

import { useActionState } from 'react';
import type { owner } from '@tftd/api';
import { EmployeeEcusonCard } from '@/components/BrandPrimitives';
import { inviteEmployeeAction, removeEmployeeAction } from '@/app/owner/[venueId]/actions-team';
import { EMPTY } from '@/lib/form';
import { Field, FormMessage, SubmitButton, inputClass } from './ui';

export type TeamMember = Awaited<ReturnType<typeof owner.employeesForOwner>>[number];
export type TeamRating = Awaited<ReturnType<typeof owner.employeeRatingsForOwner>>[number];

/** Media vine ca string numeric din SQL; „—” când nu există note. */
const avg = (x: string | null) => (x == null ? '—' : Number(x).toFixed(1).replace('.', ','));

export function TeamPanel({ venueId, team, ratings }: { venueId: string; team: TeamMember[]; ratings: TeamRating[] }) {
  const [inviteState, invite] = useActionState(inviteEmployeeAction.bind(null, venueId), EMPTY);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="echipa-lista" className="flex flex-col gap-3">
        <h3 id="echipa-lista" className="text-[18px] font-semibold text-cafea">
          Echipa
        </h3>
        {team.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => (
              <MemberItem key={m.id} venueId={venueId} member={m} />
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-muted-cafea">Încă nu ai adăugat pe nimeni.</p>
        )}
      </section>

      <section aria-labelledby="echipa-adauga" className="flex flex-col gap-3">
        <h3 id="echipa-adauga" className="text-[18px] font-semibold text-cafea">
          Adaugă un om în echipă
        </h3>
        <form action={invite} className="flex max-w-xl flex-col gap-3">
          <Field label="Prenume">
            <input name="firstName" required maxLength={60} autoComplete="off" className={inputClass} />
          </Field>
          <Field label="Rol">
            <input name="role" required maxLength={60} autoComplete="off" placeholder="ex. ospătar, barman, bucătar" className={inputClass} />
          </Field>
          <Field
            label="Nume de utilizator"
            hint="Contul lui de pe topfood. Primește o invitație și apare public doar dacă acceptă."
          >
            <input name="username" required maxLength={60} autoComplete="off" autoCapitalize="none" spellCheck={false} className={inputClass} />
          </Field>
          <FormMessage state={inviteState} />
          <div>
            <SubmitButton>Trimite invitația</SubmitButton>
          </div>
        </form>
      </section>

      <section aria-labelledby="echipa-note" className="flex flex-col gap-3">
        <h3 id="echipa-note" className="text-[18px] font-semibold text-cafea">
          Notele echipei (doar tu le vezi)
        </h3>
        <RatingsTable ratings={ratings} />
      </section>
    </div>
  );
}

function MemberItem({ venueId, member: m }: { venueId: string; member: TeamMember }) {
  return (
    <li className="flex flex-col gap-2">
      <EmployeeEcusonCard name={m.firstName} role={m.role} />
      <p className={`text-center text-[14px] ${m.accepted ? 'text-cafea' : 'text-muted-cafea'}`}>
        {m.accepted ? 'Activ' : 'Invitat, așteaptă acceptul'}
      </p>
      <form
        action={removeEmployeeAction.bind(null, venueId, m.id)}
        onSubmit={(e) => {
          if (!window.confirm(`Scoți ${m.firstName} din echipă? Datele lui publice dispar.`)) e.preventDefault();
        }}
      >
        <SubmitButton variant="quiet" pendingLabel="Se scoate…">
          Scoate din echipă
        </SubmitButton>
      </form>
    </li>
  );
}

function RatingsTable({ ratings }: { ratings: TeamRating[] }) {
  if (ratings.every((r) => Number(r.ratings) === 0)) {
    return <p className="text-[15px] text-muted-cafea">Încă nu sunt note de la clienți.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-96 border-collapse text-left text-[15px] tabular-nums">
        <thead>
          <tr className="border-b border-hairline text-[14px] text-muted-cafea">
            <th scope="col" className="py-2 pr-3 font-semibold">Nume</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Note</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Amabilitate</th>
            <th scope="col" className="py-2 text-right font-semibold">Rapiditate</th>
          </tr>
        </thead>
        <tbody>
          {ratings.map((r) => (
            <tr key={r.employeeId} className="border-b border-hairline">
              <th scope="row" className="py-2 pr-3 font-semibold text-cafea">{r.firstName}</th>
              <td className="py-2 pr-3 text-right">{r.ratings}</td>
              <td className="py-2 pr-3 text-right">{avg(r.friendliness)}</td>
              <td className="py-2 text-right">{avg(r.speed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
