import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ScarnaviiView } from './ScarnaviiView';

// Acțiunile server (aliasul „@/”) nu rulează la randarea statică; turul pe viu le cheamă doar la click.
vi.mock('../app/actions/visits', () => ({}));
vi.mock('../app/actions/user', () => ({}));

it('oferă separat Tasting Tour și sondajul Unde ieșim?', () => {
  const html = renderToStaticMarkup(
    <ScarnaviiView vertical="food" restaurants={[]} allRestaurants={[]} onBack={() => {}} onSelectRestaurant={() => {}} signedIn={false} onRequireLogin={() => {}} />,
  );
  expect(html).toContain('Tasting Tour');
  expect(html).toContain('Unde ieșim?');
  expect(html).toContain('Toate (6)');
});
