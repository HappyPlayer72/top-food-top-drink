import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { moderation, visits } from '@tftd/api';
import { ClaimDetails, MatchDetails, ReceiptDetails, ReportDetails, SuspiciousAccountDetails } from './details';

type Queue = Awaited<ReturnType<typeof moderation.queue>>;
type Receipt = Awaited<ReturnType<typeof visits.receiptQueue>>[number];

it('arată review-ul și contextul necesar moderării', () => {
  const report = { targetType: 'review', reason: 'Limbaj nepotrivit', venue: null, review: { text: 'Textul review-ului', rating: 4, postedAt: new Date('2026-11-13T12:00:00Z'), source: 'native', externalAuthor: null, author: { username: 'ana', displayName: 'Ana' }, venue: { name: 'Localul A', address: 'Strada 1' } } } as Queue['reports'][number];
  const html = renderToStaticMarkup(<ReportDetails report={report} />);
  for (const text of ['Localul A', 'Strada 1', 'Ana', 'Textul review-ului', '4/10', 'Limbaj nepotrivit']) expect(html).toContain(text);
});

it('marchează datele lipsă și explică efectul contestației', () => {
  const report = { targetType: 'trap_appeal', reason: 'Solicit revizuirea', review: null, venue: null } as Queue['reports'][number];
  const match = { venue: null, source: 'google', payload: {}, distanceM: null } as unknown as Queue['matches'][number];
  const claim = { venue: null, user: null, cui: null } as unknown as Queue['claims'][number];
  expect(renderToStaticMarkup(<ReportDetails report={report} />)).toContain('nu modifică automat eticheta');
  expect(renderToStaticMarkup(<MatchDetails match={match} />)).toContain('Indisponibil');
  expect(renderToStaticMarkup(<ClaimDetails claim={claim} />)).toContain('Indisponibil în sistem');
});

it('afișează detaliile bonurilor fiscale și ale conturilor suspecte', () => {
  const proof = { id: 'p1', createdAt: new Date('2026-11-13T12:00:00Z'), user: { username: 'ana', displayName: 'Ana' }, venue: { name: 'Local X', address: 'Str. 1' }, review: { rating: 9, text: 'Foarte bun', visitedAt: '2026-11-12' } } as unknown as Receipt;
  const suspicious = { userId: 'u1', username: 'bot1', displayName: 'Bot', reviewCount: 3, avgFakeProbability: 0.85, reasons: ['Rafală coordonată de note maxime'], latestAt: new Date('2026-11-13T12:00:00Z') } as Queue['suspiciousAccounts'][number];
  const receiptHtml = renderToStaticMarkup(<ReceiptDetails proof={proof} />);
  expect(receiptHtml).toContain('Local X');
  expect(receiptHtml).toContain('/admin/bon/p1');
  const susHtml = renderToStaticMarkup(<SuspiciousAccountDetails account={suspicious} />);
  expect(susHtml).toContain('@bot1');
  expect(susHtml).toContain('85%');
});
