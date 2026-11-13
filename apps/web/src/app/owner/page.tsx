import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cityPage, owner } from '@tftd/api';
import { AuthForm } from '@/components/owner/AuthForm';
import { ClaimForm } from '@/components/owner/ClaimForm';
import { Panel } from '@/components/owner/ui';
import { buttonClass } from '@/components/owner/ui-classes';
import { getDb } from '@/lib/server/db';
import { getUserId } from '@/lib/server/session';
import { respondToInviteAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function OwnerHome() {
  const userId = await getUserId();
  if (!userId) return <AuthForm />;

  const db = getDb();
  const [mine, invites, food, drink] = await Promise.all([
    owner.managedVenues(db, userId),
    owner.pendingInvites(db, userId),
    cityPage(db, { citySlug: 'timisoara', vertical: 'food', limit: 200 }),
    cityPage(db, { citySlug: 'timisoara', vertical: 'drink', limit: 200 }),
  ]);
  const claimable = [
    ...food.top.map((v) => ({ id: v.id, name: v.name, group: 'Restaurante' })),
    ...drink.top.map((v) => ({ id: v.id, name: v.name, group: 'Baruri și cluburi' })),
  ].filter((v) => !mine.some((m) => m.id === v.id));

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-[44px] leading-none text-o-fg">Panoul proprietarului</h1>

      <Panel id="localele-tale" title="Localele tale">
        {mine.length ? (
          <ul className="flex flex-col divide-y divide-o-line border-y border-o-line">
            {mine.map((v) => (
              <li key={v.id}>
                <Link href={`/owner/${v.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-[4px] px-2 transition-colors hover:bg-o-fg/[0.06]">
                  <span>
                    <span className="block text-[17px] font-semibold">{v.name}</span>
                    <span className="text-[13px] text-o-muted">
                      {v.role === 'owner' ? 'Proprietar' : 'Manager'} · {v.vertical === 'food' ? 'topfood' : 'topdrink'}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="max-w-prose border-l-4 border-o-line pl-4 text-[15px] leading-relaxed text-o-muted">Încă nu administrezi niciun local. Revendică-l mai jos.</p>
        )}
      </Panel>

      {invites.length ? (
        <Panel id="invitatii" title="Invitații în echipă">
          <ul className="flex flex-col gap-3">
            {invites.map((i) => (
              <li key={i.employeeId} className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-o-line p-4">
                <span className="text-[15px]">
                  <strong>{i.venueName}</strong> te-a adăugat ca <strong>{i.role}</strong>. Numele tău apare public doar dacă accepți.
                </span>
                <span className="flex gap-2">
                  <form action={respondToInviteAction.bind(null, i.employeeId, true)}>
                    <button type="submit" aria-label={`Acceptă invitația de la ${i.venueName}`} className={buttonClass()}>
                      Acceptă
                    </button>
                  </form>
                  <form action={respondToInviteAction.bind(null, i.employeeId, false)}>
                    <button type="submit" aria-label={`Refuză invitația de la ${i.venueName}`} className={buttonClass('quiet')}>
                      Refuză
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel id="revendica" title="Ești proprietarul unui local?">
        <ClaimForm venues={claimable} />
      </Panel>
    </div>
  );
}
