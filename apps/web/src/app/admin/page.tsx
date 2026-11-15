import Link from 'next/link';
import { moderation, monetization, ServiceError, visits } from '@tftd/api';
import { createAd, decideClaim, decideMatch, decideReceipt, decideReport, decideSuspicious, deleteAd, removeSocialLink, grantPartnership, cancelPartnership } from './actions';
import { currentUserId, getDb } from './server';
import { asc, eq } from 'drizzle-orm';
import { venues } from '@tftd/db';
import { ClaimDetails, MatchDetails, ReceiptDetails, ReportDetails, SuspiciousAccountDetails } from './details';

export const metadata = { title: 'Moderare — TOP FOOD / TOP DRINK', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const userId = await currentUserId();
  if (!userId) return <div className="min-h-screen bg-hartie text-cafea"><main className="mx-auto max-w-4xl p-6"><h1>Moderare</h1><p>Autentifică-te pentru a accesa această pagină.</p><Link href="/owner" className="mt-3 inline-flex min-h-11 items-center rounded border px-4 py-2 font-semibold">Autentificare</Link></main></div>;

  let items: Awaited<ReturnType<typeof moderation.queue>>;
  let ads: Awaited<ReturnType<typeof monetization.listAdSlots>>;
  let receipts: Awaited<ReturnType<typeof visits.receiptQueue>>;
  let socialLinks: Awaited<ReturnType<typeof moderation.autoSocialLinks>>;
  let partnerships: Awaited<ReturnType<typeof monetization.listPartnerships>>;
  let venueOptions: { id: string; name: string; vertical: 'food' | 'drink' }[];
  try {
    const db = getDb();
    [items, ads, receipts, socialLinks, partnerships, venueOptions] = await Promise.all([
      moderation.queue(db, userId),
      monetization.listAdSlots(db, userId),
      visits.receiptQueue(db, userId),
      moderation.autoSocialLinks(db, userId),
      monetization.listPartnerships(db, userId),
      db.select({ id: venues.id, name: venues.name, vertical: venues.vertical }).from(venues).where(eq(venues.status, 'active')).orderBy(asc(venues.name)),
    ]);
  } catch (error) {
    if (error instanceof ServiceError && error.code === 'forbidden') {
      return <div className="min-h-screen bg-hartie text-cafea"><main className="mx-auto max-w-4xl p-6"><h1>Acces interzis</h1><p>Doar administratorii pot accesa moderarea.</p></main></div>;
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-hartie text-cafea"><main className="mx-auto max-w-4xl space-y-10 p-4 text-cafea sm:p-6">
      <header><Link href="/topfood/timisoara" className="inline-flex min-h-11 items-center font-semibold hover:underline">← Înapoi la top</Link><h1 className="mt-4 text-3xl font-bold">Moderare</h1><p>Elemente care așteaptă o decizie.</p></header>
      <section className="space-y-4" aria-labelledby="suspicious"><h2 id="suspicious" className="text-2xl font-bold">Conturi suspecte</h2>
        {!items.suspiciousAccounts.length && <p>Nu există conturi semnalate momentan.</p>}
        {items.suspiciousAccounts.map((acc) => <article key={acc.userId} className="space-y-3 rounded border bg-hartie/80 p-4"><SuspiciousAccountDetails account={acc} />
          <form action={decideSuspicious} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={acc.userId} />
            <button className="min-h-11 rounded border bg-carou px-3 py-2 text-white" name="decision" value="hide_reviews">Ascunde review-urile suspecte</button>
            <button className="min-h-11 rounded border px-3 py-2" name="decision" value="dismiss">Ignoră semnalarea</button>
          </form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="reports"><h2 id="reports" className="text-2xl font-bold">Rapoarte și contestații</h2>
        {!items.reports.length && <p>Nu există rapoarte în așteptare.</p>}
        {items.reports.map((r) => <article key={r.id} className="space-y-2 rounded border p-4">
          <p><strong>{r.targetType === 'review' ? (r.reportedBy ? 'Review raportat' : 'Review reținut de filtrul anti-bot (nu apare și nu contează până decizi)') : r.targetType === 'trap_appeal' ? 'Contestație capcană turistică' : `Raport: ${r.targetType}`}</strong></p>
          <ReportDetails report={r} />
          <form className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={r.id} /><label className="flex flex-col gap-1">Notă <input className="min-h-11 rounded border p-2 text-[16px] sm:text-[14px]" name="note" maxLength={1000} /></label>
            {r.targetType === 'review' ? <><button className="min-h-11 rounded border px-3 py-2" formAction={decideReport.bind(null, 'hide')}>Ascunde review</button><button className="min-h-11 rounded border px-3 py-2" formAction={decideReport.bind(null, 'keep')}>Păstrează review</button></> : <><button className="min-h-11 rounded border px-3 py-2" formAction={decideReport.bind(null, 'accept')}>Acceptă</button><button className="min-h-11 rounded border px-3 py-2" formAction={decideReport.bind(null, 'reject')}>Respinge</button></>}
          </form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="receipts"><h2 id="receipts" className="text-2xl font-bold">Bonuri pentru vizită verificată</h2>
        <p>Aprobă doar dacă bonul e de la acest local și din jurul datei vizitei. Aprobat, review-ul cântărește ×1,3. Poza se șterge după decizie.</p>
        {!receipts.length && <p>Nu există bonuri în așteptare.</p>}
        {receipts.map((p) => <article key={p.id} className="space-y-3 rounded border p-4"><ReceiptDetails proof={p} />
          <form className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={p.id} /><label className="flex flex-col gap-1">Notă (opțional) <input className="min-h-11 rounded border p-2 text-[16px] sm:text-[14px]" name="note" maxLength={500} placeholder="ex. bon de la alt local" /></label>
            <button className="min-h-11 rounded border px-3 py-2" formAction={decideReceipt.bind(null, 'approve')}>Aprobă vizita</button><button className="min-h-11 rounded border px-3 py-2" formAction={decideReceipt.bind(null, 'reject')}>Respinge</button></form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="matches"><h2 id="matches" className="text-2xl font-bold">Potriviri de localuri</h2>
        {!items.matches.length && <p>Nu există potriviri în așteptare.</p>}
        {items.matches.map((m) => <article key={m.id} className="space-y-2 rounded border p-4"><MatchDetails match={m} />
          <form className="flex flex-wrap gap-2"><input type="hidden" name="id" value={m.id} /><button className="min-h-11 rounded border px-3 py-2" formAction={decideMatch.bind(null, 'confirm')}>Confirmă potrivirea</button><button className="min-h-11 rounded border px-3 py-2" formAction={decideMatch.bind(null, 'reject')}>Respinge</button></form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="social"><h2 id="social" className="text-2xl font-bold">Linkuri de pe social media găsite automat</h2>
        <p>Apar pe pagina localului cu „Găsit automat”. Scoate-l pe cel care nu e despre acest local.</p>
        {!socialLinks.length && <p>Nu există linkuri găsite automat.</p>}
        {socialLinks.length > 0 && <ul className="space-y-2">{socialLinks.map((l) => <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
          <span className="min-w-0"><strong>{l.venue.name}</strong> · {l.platform}{l.title ? <>: {l.title}</> : null}<br />
            <a className="break-all underline" href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`Deschide postarea ${l.platform} pentru ${l.venue.name} (se deschide într-o filă nouă)`}>{l.url}</a></span>
          <form action={removeSocialLink}><input type="hidden" name="id" value={l.id} /><button className="rounded border px-3 py-2">Scoate linkul<span className="sr-only"> pentru {l.venue.name}, {l.platform}{l.title ? `: ${l.title}` : ''}</span></button></form>
        </li>)}</ul>}
      </section>
      <section className="space-y-4" aria-labelledby="claims"><h2 id="claims" className="text-2xl font-bold">Revendicări</h2>
        {!items.claims.length && <p>Nu există revendicări în așteptare.</p>}
        {items.claims.map((c) => <article key={c.id} className="space-y-2 rounded border p-4"><ClaimDetails claim={c} />
          <form className="flex flex-wrap gap-2"><input type="hidden" name="id" value={c.id} /><button className="min-h-11 rounded border px-3 py-2" formAction={decideClaim.bind(null, 'approve')}>Aprobă</button><button className="min-h-11 rounded border px-3 py-2" formAction={decideClaim.bind(null, 'reject')}>Respinge</button></form>
        </article>)}
      </section>
      <section className="space-y-4" aria-labelledby="sponsor"><h2 id="sponsor" className="text-2xl font-bold">Sponsorizat (demo, fără plată)</h2>
        <p className="text-sm text-cafea-deschis">Până la plata reală, aici pui un local în banda „Sponsorizat”. Apare separat, etichetat, și nu schimbă scorul sau locul în top. O capcană turistică (indice ≥ 80) nu poate fi sponsorizată.</p>
        <form action={grantPartnership} className="grid gap-3 rounded border bg-hartie/80 p-4 sm:grid-cols-3">
          <label className="text-sm font-medium sm:col-span-3">Localul<select name="venueId" required className="mt-1 w-full rounded border p-2" defaultValue="">
            <option value="" disabled>Alege localul</option>
            <optgroup label="TOP FOOD">{venueOptions.filter((v) => v.vertical === 'food').map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
            <optgroup label="TOP DRINK">{venueOptions.filter((v) => v.vertical === 'drink').map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
          </select></label>
          <label className="text-sm font-medium">Plan<select name="plan" className="mt-1 w-full rounded border p-2" defaultValue="highlight"><option value="highlight">Highlight (apare la Sponsorizat)</option><option value="basic">Basic (blog, statistici, fidelitate)</option></select></label>
          <label className="text-sm font-medium">Durată (zile)<input name="days" type="number" min={1} max={365} defaultValue={30} className="mt-1 w-full rounded border p-2" /></label>
          <div className="flex items-end"><button className="rounded border bg-carou px-3 py-2 text-white">Pune la Sponsorizat</button></div>
        </form>
        {!partnerships.length && <p>Niciun parteneriat activ.</p>}
        {partnerships.length > 0 && <ul className="space-y-2">{partnerships.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
          <span><strong>{p.venue.name}</strong> · {p.plan === 'highlight' ? 'Highlight' : 'Basic'} · {p.status === 'paid' ? 'activ' : 'în așteptarea plății'} până pe {new Date(p.endsAt).toLocaleDateString('ro-RO')}</span>
          <form action={cancelPartnership}><input type="hidden" name="id" value={p.id} /><button type="submit" className="rounded border px-3 py-2">Oprește<span className="sr-only"> parteneriatul pentru {p.venue.name}</span></button></form>
        </li>)}</ul>}
      </section>
      <section className="space-y-4" aria-labelledby="ads"><h2 id="ads" className="text-2xl font-bold">Bannere reclamă (SlotReclamă)</h2>
        <p className="text-sm text-cafea-deschis">Apar exclusiv în slotul de banner dedicat orașului (etichetat „Reclamă”) și nu influențează niciodată scorul sau clasamentul.</p>
        <form action={createAd} className="grid gap-3 rounded border bg-hartie/80 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Partener<input name="advertiser" required className="mt-1 min-h-11 w-full rounded border p-2 text-[16px] sm:text-[14px]" placeholder="Ex: Bere Timișoreana Artizanală" /></label>
          <label className="text-sm font-medium">Secțiune<select name="vertical" className="mt-1 min-h-11 w-full rounded border p-2 text-[16px] sm:text-[14px]"><option value="food">TOP FOOD</option><option value="drink">TOP DRINK</option></select></label>
          <label className="text-sm font-medium">URL banner / imagine<input name="creativeUrl" required className="mt-1 min-h-11 w-full rounded border p-2 text-[16px] sm:text-[14px]" placeholder="https://..." /></label>
          <label className="text-sm font-medium">Link destinație<input name="linkUrl" required className="mt-1 min-h-11 w-full rounded border p-2 text-[16px] sm:text-[14px]" placeholder="https://... sau /topfood/timisoara/..." /></label>
          <label className="text-sm font-medium">Durată (zile)<input name="days" type="number" min={1} max={365} defaultValue={30} className="mt-1 min-h-11 w-full rounded border p-2 text-[16px] sm:text-[14px]" /></label>
          <div className="flex items-end"><button type="submit" className="min-h-11 rounded border bg-cafea px-4 py-2 text-hartie">Adaugă banner</button></div>
        </form>
        {!ads.length && <p>Nu există bannere configurate.</p>}
        {ads.map((ad) => (
          <article key={ad.id} className="flex flex-wrap items-center justify-between gap-3 rounded border bg-hartie/80 p-4">
            <div className="space-y-1 text-sm">
              <p><strong>{ad.advertiser}</strong> · {ad.vertical.toUpperCase()} ({ad.placement})</p>
              <p>Afișări: {ad.impressions} · Click-uri: {ad.clicks}</p>
            </div>
            <form action={deleteAd}><input type="hidden" name="id" value={ad.id} /><button className="min-h-11 rounded border px-3 py-2 text-sm">Șterge</button></form>
          </article>
        ))}
      </section>
    </main></div>
  );
}
