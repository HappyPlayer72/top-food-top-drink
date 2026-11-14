import Link from 'next/link';
import { moderation, monetization, ServiceError } from '@tftd/api';
import { createAd, decideClaim, decideMatch, decideReceipt, decideReport, decideSuspicious, deleteAd } from './actions';
import { currentUserId, getDb } from './server';
import { ClaimDetails, MatchDetails, ReceiptDetails, ReportDetails, SuspiciousAccountDetails } from './details';

export const metadata = { title: 'Moderare — TOP FOOD / TOP DRINK', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const userId = await currentUserId();
  if (!userId) return <div className="doodle-wallpaper min-h-screen"><main className="mx-auto max-w-4xl p-6"><h1>Moderare</h1><p>Autentifică-te pentru a accesa această pagină.</p><Link href="/owner">Autentificare</Link></main></div>;

  let items: Awaited<ReturnType<typeof moderation.queue>>;
  let ads: Awaited<ReturnType<typeof monetization.listAdSlots>>;
  try {
    const db = getDb();
    [items, ads] = await Promise.all([
      moderation.queue(db, userId),
      monetization.listAdSlots(db, userId),
    ]);
  } catch (error) {
    if (error instanceof ServiceError && error.code === 'forbidden') {
      return <div className="doodle-wallpaper min-h-screen"><main className="mx-auto max-w-4xl p-6"><h1>Acces interzis</h1><p>Doar administratorii pot accesa moderarea.</p></main></div>;
    }
    throw error;
  }

  return (
    <div className="doodle-wallpaper min-h-screen"><main className="mx-auto max-w-4xl space-y-10 p-6 text-cafea">
      <header><Link href="/topfood/timisoara">← Înapoi la top</Link><h1 className="mt-4 text-3xl font-bold">Moderare</h1><p>Elemente care așteaptă o decizie.</p></header>
      <section className="space-y-4" aria-labelledby="receipts"><h2 id="receipts" className="text-2xl font-bold">Bonuri fiscale de verificat</h2>
        {!items.receipts.length && <p>Nu există bonuri în așteptare.</p>}
        {items.receipts.map((rec) => <article key={rec.id} className="space-y-3 rounded border bg-hartie/80 p-4"><ReceiptDetails receipt={rec} />
          <form action={decideReceipt} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={rec.id} />
            <button className="rounded border bg-patrunjel px-3 py-2 text-white" name="decision" value="approve">Aprobă bon (vizită verificată ×1,3)</button>
            <button className="rounded border px-3 py-2" name="decision" value="reject">Respinge bon</button>
          </form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="suspicious"><h2 id="suspicious" className="text-2xl font-bold">Conturi suspecte</h2>
        {!items.suspiciousAccounts.length && <p>Nu există conturi semnalate momentan.</p>}
        {items.suspiciousAccounts.map((acc) => <article key={acc.userId} className="space-y-3 rounded border bg-hartie/80 p-4"><SuspiciousAccountDetails account={acc} />
          <form action={decideSuspicious} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={acc.userId} />
            <button className="rounded border bg-carou px-3 py-2 text-white" name="decision" value="hide_reviews">Ascunde review-urile suspecte</button>
            <button className="rounded border px-3 py-2" name="decision" value="dismiss">Ignoră semnalarea</button>
          </form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="reports"><h2 id="reports" className="text-2xl font-bold">Rapoarte și contestații</h2>
        {!items.reports.length && <p>Nu există rapoarte în așteptare.</p>}
        {items.reports.map((r) => <article key={r.id} className="space-y-2 rounded border p-4">
          <p><strong>{r.targetType === 'review' ? 'Review raportat' : r.targetType === 'trap_appeal' ? 'Contestație capcană turistică' : `Raport: ${r.targetType}`}</strong></p>
          <ReportDetails report={r} />
          <form action={decideReport} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={r.id} /><label>Notă <input className="rounded border p-2" name="note" maxLength={1000} /></label>
            {r.targetType === 'review' ? <><button className="rounded border px-3 py-2" name="decision" value="hide">Ascunde review</button><button className="rounded border px-3 py-2" name="decision" value="keep">Păstrează review</button></> : <><button className="rounded border px-3 py-2" name="decision" value="accept">Acceptă</button><button className="rounded border px-3 py-2" name="decision" value="reject">Respinge</button></>}
          </form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="matches"><h2 id="matches" className="text-2xl font-bold">Potriviri de localuri</h2>
        {!items.matches.length && <p>Nu există potriviri în așteptare.</p>}
        {items.matches.map((m) => <article key={m.id} className="space-y-2 rounded border p-4"><MatchDetails match={m} />
          <form action={decideMatch} className="flex gap-2"><input type="hidden" name="id" value={m.id} /><button className="rounded border px-3 py-2" name="decision" value="confirm">Confirmă potrivirea</button><button className="rounded border px-3 py-2" name="decision" value="reject">Respinge</button></form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="claims"><h2 id="claims" className="text-2xl font-bold">Revendicări</h2>
        {!items.claims.length && <p>Nu există revendicări în așteptare.</p>}
        {items.claims.map((c) => <article key={c.id} className="space-y-2 rounded border p-4"><ClaimDetails claim={c} />
          <form action={decideClaim} className="flex gap-2"><input type="hidden" name="id" value={c.id} /><button className="rounded border px-3 py-2" name="decision" value="approve">Aprobă</button><button className="rounded border px-3 py-2" name="decision" value="reject">Respinge</button></form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="ads"><h2 id="ads" className="text-2xl font-bold">Bannere reclamă (SlotReclamă)</h2>
        <p className="text-sm text-cafea-deschis">Apar exclusiv în slotul de banner dedicat orașului (etichetat „Reclamă”) și nu influențează niciodată scorul sau clasamentul.</p>
        <form action={createAd} className="grid gap-3 rounded border bg-hartie/80 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Partener<input name="advertiser" required className="mt-1 w-full rounded border p-2" placeholder="Ex: Bere Timișoreana Artizanală" /></label>
          <label className="text-sm font-medium">Secțiune<select name="vertical" className="mt-1 w-full rounded border p-2"><option value="food">TOP FOOD</option><option value="drink">TOP DRINK</option></select></label>
          <label className="text-sm font-medium">URL banner / imagine<input name="creativeUrl" required className="mt-1 w-full rounded border p-2" placeholder="https://..." /></label>
          <label className="text-sm font-medium">Link destinație<input name="linkUrl" required className="mt-1 w-full rounded border p-2" placeholder="https://... sau /topfood/timisoara/..." /></label>
          <label className="text-sm font-medium">Durată (zile)<input name="days" type="number" min={1} max={365} defaultValue={30} className="mt-1 w-full rounded border p-2" /></label>
          <div className="flex items-end"><button type="submit" className="rounded border bg-cafea px-4 py-2 text-hartie">Adaugă banner</button></div>
        </form>
        {!ads.length && <p>Nu există bannere configurate.</p>}
        {ads.map((ad) => (
          <article key={ad.id} className="flex flex-wrap items-center justify-between gap-3 rounded border bg-hartie/80 p-4">
            <div className="space-y-1 text-sm">
              <p><strong>{ad.advertiser}</strong> · {ad.vertical.toUpperCase()} ({ad.placement})</p>
              <p>Afișări: {ad.impressions} · Click-uri: {ad.clicks}</p>
            </div>
            <form action={deleteAd}><input type="hidden" name="id" value={ad.id} /><button className="rounded border px-3 py-1.5 text-sm">Șterge</button></form>
          </article>
        ))}
      </section>
    </main></div>
  );
}
