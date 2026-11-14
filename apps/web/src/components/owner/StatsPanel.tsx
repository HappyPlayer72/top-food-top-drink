import { CalendarDays, MessageCircle } from 'lucide-react';
import type { owner } from '@tftd/api';
import { AvertizareaCard, CarouStrip, CoasterScore, LocalnicBadge, LocalVsTouristBars } from '@/components/BrandPrimitives';
import { formatScore } from '@/types';
import { AppealForm } from './AppealForm';
import { EmptyState, SubHeading } from './ui';
import { cate } from '@/lib/ro';

type Stats = Awaited<ReturnType<typeof owner.venueStats>>;

const ASPECT_LABELS: Record<string, string> = {
  mancare: 'Mâncare',
  servire: 'Servire',
  pret: 'Preț',
  curatenie: 'Curățenie',
  atmosfera: 'Atmosferă',
};
const label = (k: string) => ASPECT_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
const cardClass = 'rounded-[4px] border border-o-line bg-o-card p-5 sm:p-7';
const monthName = (ym: string) =>
  new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' }).format(new Date(`${ym}-01T12:00:00Z`));

export function StatsPanel({ venueId, venueName, stats, vertical, afterScore }: { venueId: string; venueName: string; stats: Stats; vertical: 'food' | 'drink'; afterScore?: React.ReactNode }) {
  const { scores, byMonth, aspects } = stats;
  const isDrink = vertical === 'drink';
  const trap = scores.touristTrapIndex ?? 0;
  const months = [...new Set(byMonth.map((r) => r.month))];
  const cell = (month: string, type: 'local' | 'tourist') => byMonth.find((r) => r.month === month && r.authorType === type);
  const sortedAspects = Object.entries(aspects).sort((a, b) => a[1] - b[1]);

  return (
    <div className="flex flex-col gap-12">
      {/* Scorul e cel mai mare număr de pe ecran. Food: caroul o singură dată, pe marginea de sus a panoului. Drink: suportul de bere pe Sticlă. */}
      <section aria-labelledby="scor-titlu" className="overflow-hidden rounded-[4px] border border-o-line bg-o-card">
        {isDrink ? null : <CarouStrip height={14} />}
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12">
          <div className="flex flex-col items-start">
            <h3 id="scor-titlu" className="text-[14px] font-semibold text-o-muted">
              Scorul tău onest
            </h3>
            {scores.honest == null ? (
              <span className="font-display mt-3 block text-[88px] leading-[0.85]">—</span>
            ) : isDrink ? (
              <div className="mt-4 flex flex-col items-start gap-3">
                <CoasterScore score={scores.honest} size="lg" className="h-28! w-28! text-[48px]!" />
                <span className="text-[13px] text-o-muted">Scor onest din 10</span>
              </div>
            ) : (
              <>
                <span className="font-display mt-3 block text-[120px] leading-[0.82] tabular-nums text-o-fg">{formatScore(scores.honest)}</span>
                <span className="mt-3 text-[13px] text-o-muted">din 10 puncte</span>
              </>
            )}
          </div>

          <div className="min-w-0 space-y-6 md:border-l md:border-o-line md:pl-12">
            <div>
              <h3 className="text-[14px] font-semibold text-o-muted">De unde vine scorul</h3>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed">
                Scor Onest din {cate(scores.explanation?.reviewCount ?? 0, 'review', 'review-uri')}: {scores.explanation?.localCount ?? 0} de la localnici,{' '}
                {scores.explanation?.touristCount ?? 0} de la turiști. Localnicii verificați cântăresc ×2, review-urile plătite ×0,2, iar
                scorul e tras spre media orașului.
                {scores.explanation && !scores.explanation.enoughData ? ' Date puține: scorul se va mișca pe măsură ce vin review-uri noi.' : ''}
              </p>
            </div>
            <div>
              <h3 className="mb-3 text-[14px] font-semibold text-o-muted">Localnici față de turiști</h3>
              {scores.locals != null && scores.tourists != null ? (
                <LocalVsTouristBars localsScore={scores.locals} touristsScore={scores.tourists} showSummary dark={isDrink} />
              ) : (
                <p className="text-[15px] text-o-muted">Încă nu sunt destule review-uri ca să separăm localnicii de turiști.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {afterScore}

      {trap >= 60 ? (
        <section aria-label="Avertizare: capcană turistică" className="flex flex-col gap-4">
          <AvertizareaCard
            venueName={venueName}
            trapIndex={Math.round(trap)}
            reasons={(scores.explanation?.trapReasons ?? []).map((r) => r.text)}
            defaultOpen
            dark={isDrink}
          />
          <AppealForm venueId={venueId} alreadyAppealed={stats.trapAppeals.length > 0} />
        </section>
      ) : null}

      <section aria-labelledby="aspecte-titlu" className={cardClass}>
        <SubHeading id="aspecte-titlu" note="Temele menționate în review-urile din ultimele 6 luni. Cele criticate apar primele.">
          Ce zice lumea, pe aspecte
        </SubHeading>
        {sortedAspects.length ? (
          <ul className="flex flex-col border-t border-o-line">
            {sortedAspects.map(([k, v]) => (
              <AspectRow key={k} name={label(k)} value={v} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Niciun aspect încă" icon={<MessageCircle size={26} />}>Niciun aspect menționat în ultimele 6 luni. Apar aici când review-urile încep să vorbească despre mâncare, servire sau preț.</EmptyState>
        )}
      </section>

      <section aria-labelledby="luni-titlu" className={cardClass}>
        <SubHeading id="luni-titlu" note="Nota medie și numărul de review-uri, separat pe localnici și turiști.">
          Ultimele 6 luni
        </SubHeading>
        {months.length ? (
          <table className="w-full border-collapse text-left tabular-nums">
            <thead>
              <tr className="border-b border-o-line text-[13px] text-o-muted">
                <th scope="col" className="py-2.5 pr-3 font-semibold">Luna</th>
                <th scope="col" className="py-2.5 pr-3 font-semibold">
                  <LocalnicBadge label="Localnici" size="xs" />
                </th>
                <th scope="col" className="py-2.5 font-semibold">Turiști</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m} className="border-b border-o-line align-top">
                  <th scope="row" className="py-3 pr-3 text-[15px] font-semibold capitalize">{monthName(m)}</th>
                  {(['local', 'tourist'] as const).map((t) => {
                    const c = cell(m, t);
                    return (
                      <td key={t} className="py-3 pr-3 last:pr-0">
                        {c ? (
                          <>
                            <span className="font-display block text-[28px] leading-none">{formatScore(Number(c.avgRating))}</span>
                            <span className="mt-1 block text-[13px] text-o-muted">{cate(Number(c.reviews), 'review', 'review-uri')}</span>
                          </>
                        ) : (
                          <span className="text-o-muted" aria-label="fără review-uri">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Niciun review în 6 luni" icon={<CalendarDays size={26} />}>Când vin review-uri, vezi aici cum se împart între localnici și turiști, lună de lună.</EmptyState>
        )}
      </section>
    </div>
  );
}

/** Un aspect: bară divergentă (stânga = criticat, dreapta = lăudat) + cuvântul și nota. Cuvântul poartă sensul, nu doar culoarea. */
function AspectRow({ name, value }: { name: string; value: number }) {
  const verdict = value < -0.2 ? 'criticat' : value > 0.2 ? 'lăudat' : 'neutru';
  const half = Math.min(Math.abs(value), 1) * 50;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 border-b border-o-line py-3.5 sm:grid-cols-[110px_minmax(0,1fr)_140px]">
      <span className="text-[16px] font-semibold">{name}</span>
      <div aria-hidden="true" className="relative order-3 col-span-2 h-2 bg-o-line sm:order-none sm:col-span-1">
        <span className="absolute -top-1 left-1/2 h-4 w-px bg-o-fg/60" />
        {value > 0 ? (
          <span className="absolute top-0 h-2 bg-o-fg" style={{ left: '50%', width: `${half}%` }} />
        ) : (
          <span className="absolute top-0 h-2 bg-o-danger" style={{ right: '50%', width: `${half}%` }} />
        )}
      </div>
      <span className={`text-right text-[15px] tabular-nums ${verdict === 'criticat' ? 'font-semibold text-o-danger' : verdict === 'lăudat' ? 'font-semibold' : 'text-o-muted'}`}>
        {verdict} ({value > 0 ? '+' : ''}{formatScore(value)})
      </span>
    </li>
  );
}
