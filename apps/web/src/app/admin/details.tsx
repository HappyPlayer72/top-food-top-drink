import React from 'react';
import type { moderation } from '@tftd/api';

type Queue = Awaited<ReturnType<typeof moderation.queue>>;
const value = (v: string | null | undefined) => v?.trim() || 'Indisponibil';
const date = (v: Date) => new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeZone: 'Europe/Bucharest' }).format(v);

export function ReportDetails({ report }: { report: Queue['reports'][number] }) {
  const r = report.review;
  const venue = r?.venue ?? report.venue;
  return <div className="space-y-2">
    <p><strong>Local:</strong> {value(venue?.name)} · {value(venue?.address)}</p>
    {report.targetType === 'review' && (r ? <>
      <p><strong>Autor:</strong> {value(r.author?.displayName ?? r.externalAuthor?.name)}{r.author?.username ? ` (@${r.author.username})` : ''} · <strong>Data:</strong> {date(r.postedAt)} · <strong>Sursa:</strong> {r.source}</p>
      <p><strong>Notă:</strong> {r.rating}/10</p><p><strong>Review:</strong> {value(r.text)}</p>
    </> : <p>Review-ul nu mai este disponibil.</p>)}
    {report.targetType === 'trap_appeal' && <>
      <p><strong>Indice capcană:</strong> {report.venue?.touristTrapIndex ?? 'Indisponibil'}</p>
      <p><strong>Motivele actuale ale etichetei:</strong></p>
      {report.venue?.scoreExplanation?.trapReasons?.length ? <ul className="list-disc pl-6">{report.venue.scoreExplanation.trapReasons.map((reason, i) => <li key={i}>{reason.text}</li>)}</ul> : <p>Indisponibile</p>}
      <p>Acceptarea sau respingerea înregistrează decizia; nu modifică automat eticheta.</p>
    </>}
    {report.targetType !== 'review' && report.targetType !== 'trap_appeal' && <p>Decizia înregistrează soluționarea raportului; nu modifică automat elementul raportat.</p>}
    <p><strong>{report.targetType === 'trap_appeal' ? 'Explicația ownerului' : 'Motivul raportării'}:</strong> {report.reason}</p>
  </div>;
}

export function MatchDetails({ match }: { match: Queue['matches'][number] }) {
  const external = match.payload && typeof match.payload === 'object' ? match.payload as Record<string, unknown> : {};
  const field = (key: string) => typeof external[key] === 'string' ? value(external[key] as string) : 'Indisponibil';
  return <div className="space-y-2">
    <p><strong>Local existent:</strong> {value(match.venue?.name)} · {value(match.venue?.address)}</p>
    <p><strong>Local extern ({match.source}):</strong> {field('name')} · {field('address')}</p>
    <p><strong>Distanță:</strong> {match.distanceM == null ? 'Indisponibilă' : `${Math.round(match.distanceM)} m`}</p>
  </div>;
}

export function ClaimDetails({ claim }: { claim: Queue['claims'][number] }) {
  return <div className="space-y-2">
    <p><strong>Local:</strong> {value(claim.venue?.name)} · {value(claim.venue?.address)}</p>
    <p><strong>Solicitant:</strong> {value(claim.user?.displayName)}{claim.user?.username ? ` (@${claim.user.username})` : ''}</p>
    <p><strong>CUI:</strong> {value(claim.cui)}</p><p><strong>Document justificativ:</strong> Indisponibil în sistem.</p>
  </div>;
}

export function ReceiptDetails({ receipt }: { receipt: Queue['receipts'][number] }) {
  return <div className="space-y-2">
    <p><strong>Local:</strong> {value(receipt.venue.name)} · {value(receipt.venue.address)}</p>
    <p><strong>Autor:</strong> {value(receipt.author?.displayName)}{receipt.author?.username ? ` (@${receipt.author.username})` : ''} · <strong>Notă:</strong> {receipt.rating}/10 · <strong>Trimis la:</strong> {date(receipt.postedAt)}</p>
    <p><strong>Review:</strong> {value(receipt.text)}</p>
    {receipt.receiptPhotoUrl ? (
      <div className="mt-2">
        <img src={receipt.receiptPhotoUrl} alt={`Bon fiscal pentru ${receipt.venue.name}`} className="max-h-64 rounded border border-cafea/20 object-contain" />
      </div>
    ) : null}
  </div>;
}

export function SuspiciousAccountDetails({ account }: { account: Queue['suspiciousAccounts'][number] }) {
  return <div className="space-y-2">
    <p><strong>Cont:</strong> {value(account.displayName)} (@{account.username})</p>
    <p><strong>Review-uri analizate:</strong> {account.reviewCount} · <strong>Probabilitate medie falsă:</strong> {Math.round(account.avgFakeProbability * 100)}%</p>
    <ul className="list-disc pl-6">
      {account.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
    </ul>
  </div>;
}
