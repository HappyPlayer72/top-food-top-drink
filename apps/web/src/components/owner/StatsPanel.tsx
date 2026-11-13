import type { owner } from '@tftd/api';
import { AvertizareaCard, CoasterScore, LocalVsTouristBars } from '@/components/BrandPrimitives';
import { formatScore } from '@/types';
import { AppealForm } from './AppealForm';

type Stats = Awaited<ReturnType<typeof owner.venueStats>>;

const ASPECT_LABELS: Record<string, string> = {
  mancare: 'Mâncare',
  servire: 'Servire',
  pret: 'Preț',
  curatenie: 'Curățenie',
  atmosfera: 'Atmosferă',
};
const label = (k: string) => ASPECT_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
const monthName = (ym: string) =>
  new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' }).format(new Date(`${ym}-01T12:00:00Z`));

export function StatsPanel({ venueId, venueName, stats }: { venueId: string; venueName: string; stats: Stats }) {
  const { scores, byMonth, aspects } = stats;
  const trap = scores.touristTrapIndex ?? 0;
  const months = [...new Set(byMonth.map((r) => r.month))];
  const cell = (month: string, type: 'local' | 'tourist') => byMonth.find((r) => r.month === month && r.authorType === type);
  const sortedAspects = Object.entries(aspects).sort((a, b) => a[1] - b[1]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-6">
        {scores.honest != null ? <CoasterScore score={scores.honest} size="lg" /> : null}
        <div className="min-w-64 flex-1">
          <p className="text-[14px] text-muted-cafea">
            Scor Onest din {scores.explanation?.reviewCount ?? 0} review-uri: {scores.explanation?.localCount ?? 0} de la localnici,{' '}
            {scores.explanation?.touristCount ?? 0} de la turiști. Localnicii verificați cântăresc ×2, review-urile plătite ×0,2, iar
            scorul e tras spre media orașului.
            {scores.explanation && !scores.explanation.enoughData ? ' Date puține: scorul se va mișca pe măsură ce vin review-uri noi.' : ''}
          </p>
          {scores.locals != null && scores.tourists != null ? (
            <LocalVsTouristBars localsScore={scores.locals} touristsScore={scores.tourists} showSummary />
          ) : (
            <p className="text-[15px]">Încă nu sunt destule review-uri ca să separăm localnicii de turiști.</p>
          )}
        </div>
      </div>

      {trap >= 60 ? (
        <div className="flex flex-col gap-3">
          <AvertizareaCard
            venueName={venueName}
            trapIndex={Math.round(trap)}
            reasons={(scores.explanation?.trapReasons ?? []).map((r) => r.text)}
            defaultOpen
          />
          <AppealForm venueId={venueId} alreadyAppealed={stats.trapAppeals.length > 0} />
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-[17px] font-semibold">Ce zice lumea, pe aspecte</h3>
        {sortedAspects.length ? (
          <ul className="flex flex-col gap-2">
            {sortedAspects.map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3 border-b border-hairline py-2 text-[15px]">
                <span>{label(k)}</span>
                <span className={`tabular-nums font-semibold ${v < 0 ? 'text-carou' : 'text-cafea'}`}>
                  {v < -0.2 ? 'criticat' : v > 0.2 ? 'lăudat' : 'neutru'} ({v > 0 ? '+' : ''}{formatScore(v)})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-muted-cafea">Niciun aspect menționat în ultimele 6 luni.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-[17px] font-semibold">Ultimele 6 luni</h3>
        {months.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-96 text-left text-[15px] tabular-nums">
              <thead className="text-[13px] text-muted-cafea">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-semibold">Luna</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Localnici</th>
                  <th scope="col" className="py-2 font-semibold">Turiști</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m} className="border-t border-hairline">
                    <th scope="row" className="py-2 pr-3 font-normal">{monthName(m)}</th>
                    {(['local', 'tourist'] as const).map((t) => {
                      const c = cell(m, t);
                      return (
                        <td key={t} className="py-2 pr-3">
                          {c ? `${formatScore(Number(c.avgRating))} · ${c.reviews} review-uri` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[15px] text-muted-cafea">Niciun review în ultimele 6 luni.</p>
        )}
      </div>
    </div>
  );
}
