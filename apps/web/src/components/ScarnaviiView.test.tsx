import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ScarnaviiView } from './ScarnaviiView';

it('oferă separat Tasting Tour și sondajul Unde ieșim?', () => {
  const html = renderToStaticMarkup(
    <ScarnaviiView vertical="food" restaurants={[]} allRestaurants={[]} onBack={() => {}} onSelectRestaurant={() => {}} />,
  );
  expect(html).toContain('Tasting Tour');
  expect(html).toContain('Unde ieșim?');
  expect(html).toContain('Toate (6)');
});
