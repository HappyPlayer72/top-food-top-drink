import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { TableSeats } from './TableSeats';
import { tableTheme } from './theme';

const noop = () => {};
const render = (names: string[]) =>
  renderToStaticMarkup(
    <TableSeats
      players={names.map((name, i) => ({ id: `seat-${i + 1}`, name }))}
      theme={tableTheme('food')}
      min={2}
      onAdd={noop}
      onRename={noop}
      onRemove={noop}
    />,
  );

it('masa goală nu inventează jucători', () => {
  const html = render([]);
  expect(html).toContain('Cine e la masă?');
  expect(html).toContain('Numele unui jucător');
  expect(html).not.toContain('Locul');
  for (const name of ['Andreea', 'Radu', 'Elena']) expect(html).not.toContain(name);
});

it('arată jucătorii primiți', () => {
  const html = render(['Ana', 'Mihai', 'Ioana']);
  for (const name of ['Ana', 'Mihai', 'Ioana']) expect(html).toContain(name);
});
