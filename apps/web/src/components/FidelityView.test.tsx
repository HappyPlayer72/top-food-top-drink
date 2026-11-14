import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { FidelityView, RealQrSvg } from './FidelityView';

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

it('revendică ștampilele doar prin scanarea codului QR și păstrează butonul de recompensă', () => {
  const user = { id: 'test', name: 'Ana', email: 'ana@example.com', role: 'verified-local' as const, weightMultiplier: 2, description: '' };
  const html = renderToStaticMarkup(<FidelityView vertical="drink" currentUser={user} onBack={() => {}} />);
  expect(html).toContain('Scanează codul QR de la casă');
  expect(html).toContain('Scanează codul QR');
  expect(html).toContain('Revendică recompensa');
  expect(html).not.toContain('+1 ștampilă');
});

it('generează un SVG QR real pentru codul de fidelitate', () => {
  const html = renderToStaticMarkup(<RealQrSvg value="TOPFOOD:RESTAURANT-NORA:IOSEFIN:V1" />);
  expect(html).toContain('<svg');
  expect(html).toContain('<path');
  expect(html).toContain('TOPFOOD:RESTAURANT-NORA:IOSEFIN:V1');
});
