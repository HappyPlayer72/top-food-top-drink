import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { FidelityView } from './FidelityView';

vi.mock('@/app/actions/loyalty', () => ({}));

it('cere autentificarea înainte de afișarea cardurilor', () => {
  const html = renderToStaticMarkup(<FidelityView vertical="food" currentUser={null} onBack={() => {}} onRequireLogin={() => {}} />);
  expect(html).toContain('Conectează-te');
  expect(html).not.toContain('Cardurile mele');
  expect(html).not.toContain('Înscrie-ți localul');
});

it('afișează portofelul pentru utilizatorii conectați fără formularul de înscriere pentru local', () => {
  const user = { id: 'test', name: 'Ana', email: 'ana@example.com', role: 'tourist' as const, weightMultiplier: 1, description: '' };
  const html = renderToStaticMarkup(<FidelityView vertical="food" currentUser={user} onBack={() => {}} />);
  expect(html).toContain('Cardurile mele');
  expect(html).not.toContain('Înscriere local');
});
