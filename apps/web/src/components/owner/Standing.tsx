import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { owner } from '@tftd/api';
import { cate } from '@/lib/ro';
import { SubHeading } from './ui';

type Standing = Awaited<ReturnType<typeof owner.standing>>;

const monthName = (ym: string) => new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' }).format(new Date(`${ym}-01T12:00:00Z`));
const formatGap = (n: number) => n.toFixed(1).replace('.', ',');

/** Locul localului în oraș: cel de acum (din scorul curent) și cel din clasamentul lunar înghețat. Numerele rămân sub scor ca mărime. */
export function StandingPanel({ standing, vertical }: { standing: Standing; vertical: 'food' | 'drink' }) {
  const { live, month } = standing;
  const list = vertical === 'drink' ? 'TOP DRINK' : 'TOP FOOD';
  const big = 'font-display text-[56px] leading-[0.9] tabular-nums text-o-fg';

  return (
    <section aria-labelledby="loc-titlu" className="rounded-[4px] border border-o-line bg-o-card p-6 sm:p-8">
      <SubHeading id="loc-titlu" note="Clasamentul se calculează doar din scorul onest. Plata nu îl schimbă.">
        Locul tău în {list} Timișoara
      </SubHeading>
      <div className="grid gap-8 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-o-line">
        <div className="sm:pr-8">
          <h3 className="text-[14px] font-semibold text-o-muted">Acum, după scorul curent</h3>
          {live ? (
            <>
              <p className="mt-3 flex items-baseline gap-2">
                <span className={big}>{live.rank}</span>
                <span className="text-[15px] text-o-muted">din {live.total}</span>
              </p>
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed">
                {live.gap != null && live.nextName ? (
                  <>
                    La <strong className="tabular-nums">{formatGap(live.gap)}</strong> {live.gap === 1 ? 'punct' : 'puncte'} de locul {live.rank - 1}, <strong>{live.nextName}</strong>.
                  </>
                ) : (
                  'Ești pe primul loc.'
                )}
              </p>
            </>
          ) : (
            <p className="mt-3 text-[15px] text-o-muted">Încă nu ai scor, deci nici loc în clasament.</p>
          )}
        </div>

        <div className="sm:pl-8">
          <h3 className="text-[14px] font-semibold text-o-muted">{month ? `Clasamentul lunii ${monthName(month.month)}` : 'Clasamentul lunar'}</h3>
          {month?.rank != null ? (
            <>
              <p className="mt-3 flex items-baseline gap-2">
                <span className={big}>{month.rank}</span>
                <span className="text-[15px] text-o-muted">în top {month.size}</span>
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[15px]">
                {month.movement == null ? (
                  'Ai intrat în top luna asta.'
                ) : month.movement > 0 ? (
                  <>
                    <ArrowUp size={17} aria-hidden="true" /> Ai urcat {cate(month.movement, 'loc', 'locuri')} față de luna dinainte.
                  </>
                ) : month.movement < 0 ? (
                  <>
                    <ArrowDown size={17} aria-hidden="true" /> Ai coborât {cate(-month.movement, 'loc', 'locuri')} față de luna dinainte.
                  </>
                ) : (
                  <>
                    <Minus size={17} aria-hidden="true" /> Același loc ca luna dinainte.
                  </>
                )}
              </p>
            </>
          ) : month ? (
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-o-muted">
              Nu ai intrat în top {month.size} luna asta. Intră doar localurile cu destule review-uri de la localnici.
            </p>
          ) : (
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-o-muted">Primul clasament lunar se îngheață pe 1 ale lunii și rămâne neschimbat.</p>
          )}
        </div>
      </div>
    </section>
  );
}
