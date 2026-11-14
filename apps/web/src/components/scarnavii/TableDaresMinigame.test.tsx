import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { TableDaresMinigame } from './TableDaresMinigame';

it.each(['food', 'drink'] as const)('roata (%s) e un joc, nu un formular', (vertical) => {
  const html = renderToStaticMarkup(<TableDaresMinigame vertical={vertical} />);
  expect(html).toContain('Roata provocărilor');
  expect(html).toContain('Învârte roata');
  expect(html).toContain('<svg');
  for (const gone of ['Andreea', 'Alege și jucătorul', 'Pentru:', 'Locul', '•']) expect(html).not.toContain(gone);
});
