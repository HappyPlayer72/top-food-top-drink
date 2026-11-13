import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { moderation } from '@tftd/api';
import { ClaimDetails, MatchDetails, ReportDetails } from './details';

type Queue = Awaited<ReturnType<typeof moderation.queue>>;

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
