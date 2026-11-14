import Link from 'next/link';
import { moderation, ServiceError, visits } from '@tftd/api';
import { decideClaim, decideMatch, decideReceipt, decideReport } from './actions';
import { currentUserId, getDb } from './server';
import { ClaimDetails, MatchDetails, ReceiptDetails, ReportDetails } from './details';

export const metadata = { title: 'Moderare — TOP FOOD / TOP DRINK', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const userId = await currentUserId();
  if (!userId) return <main className="mx-auto max-w-4xl p-6"><h1>Moderare</h1><p>Autentifică-te pentru a accesa această pagină.</p><Link href="/owner">Autentificare</Link></main>;

  let items: Awaited<ReturnType<typeof moderation.queue>>;
  let receipts: Awaited<ReturnType<typeof visits.receiptQueue>>;
  try {
    [items, receipts] = await Promise.all([moderation.queue(getDb(), userId), visits.receiptQueue(getDb(), userId)]);
  } catch (error) {
    if (error instanceof ServiceError && error.code === 'forbidden') {
      return <main className="mx-auto max-w-4xl p-6"><h1>Acces interzis</h1><p>Doar administratorii pot accesa moderarea.</p></main>;
    }
    throw error;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6 text-cafea">
      <header><Link href="/topfood/timisoara">← Înapoi la top</Link><h1 className="mt-4 text-3xl font-bold">Moderare</h1><p>Elemente care așteaptă o decizie.</p></header>
      <section className="space-y-4" aria-labelledby="reports"><h2 id="reports" className="text-2xl font-bold">Rapoarte și contestații</h2>
        {!items.reports.length && <p>Nu există rapoarte în așteptare.</p>}
        {items.reports.map((r) => <article key={r.id} className="space-y-2 rounded border p-4">
          <p><strong>{r.targetType === 'review' ? (r.reportedBy ? 'Review raportat' : 'Review reținut de filtrul anti-bot (nu apare și nu contează până decizi)') : r.targetType === 'trap_appeal' ? 'Contestație capcană turistică' : `Raport: ${r.targetType}`}</strong></p>
          <ReportDetails report={r} />
          <form className="flex flex-wrap gap-2"><input type="hidden" name="id" value={r.id} /><label>Notă <input className="rounded border p-2" name="note" maxLength={1000} /></label>
            {r.targetType === 'review' ? <><button className="rounded border px-3 py-2" formAction={decideReport.bind(null, 'hide')}>Ascunde review</button><button className="rounded border px-3 py-2" formAction={decideReport.bind(null, 'keep')}>Păstrează review</button></> : <><button className="rounded border px-3 py-2" formAction={decideReport.bind(null, 'accept')}>Acceptă</button><button className="rounded border px-3 py-2" formAction={decideReport.bind(null, 'reject')}>Respinge</button></>}
          </form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="receipts"><h2 id="receipts" className="text-2xl font-bold">Bonuri pentru vizită verificată</h2>
        <p>Aprobă doar dacă bonul e de la acest local și din jurul datei vizitei. Aprobat, review-ul cântărește ×1,3. Poza se șterge după decizie.</p>
        {!receipts.length && <p>Nu există bonuri în așteptare.</p>}
        {receipts.map((p) => <article key={p.id} className="space-y-3 rounded border p-4"><ReceiptDetails proof={p} />
          <form className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={p.id} /><label className="flex flex-col">Notă (opțional) <input className="rounded border p-2" name="note" maxLength={500} placeholder="ex. bon de la alt local" /></label>
            <button className="rounded border px-3 py-2" formAction={decideReceipt.bind(null, 'approve')}>Aprobă vizita</button><button className="rounded border px-3 py-2" formAction={decideReceipt.bind(null, 'reject')}>Respinge</button></form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="matches"><h2 id="matches" className="text-2xl font-bold">Potriviri de localuri</h2>
        {!items.matches.length && <p>Nu există potriviri în așteptare.</p>}
        {items.matches.map((m) => <article key={m.id} className="space-y-2 rounded border p-4"><MatchDetails match={m} />
          <form className="flex gap-2"><input type="hidden" name="id" value={m.id} /><button className="rounded border px-3 py-2" formAction={decideMatch.bind(null, 'confirm')}>Confirmă potrivirea</button><button className="rounded border px-3 py-2" formAction={decideMatch.bind(null, 'reject')}>Respinge</button></form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="claims"><h2 id="claims" className="text-2xl font-bold">Revendicări</h2>
        {!items.claims.length && <p>Nu există revendicări în așteptare.</p>}
        {items.claims.map((c) => <article key={c.id} className="space-y-2 rounded border p-4"><ClaimDetails claim={c} />
          <form className="flex gap-2"><input type="hidden" name="id" value={c.id} /><button className="rounded border px-3 py-2" formAction={decideClaim.bind(null, 'approve')}>Aprobă</button><button className="rounded border px-3 py-2" formAction={decideClaim.bind(null, 'reject')}>Respinge</button></form>
        </article>)}
      </section>
    </main>
  );
}
