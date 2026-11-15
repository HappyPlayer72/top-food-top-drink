import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { WhoPaysMinigame } from './WhoPaysMinigame';

it('alegi întâi jocul, cu masa goală, fără jucători inventați', () => {
  const html = renderToStaticMarkup(<WhoPaysMinigame vertical="food" />);
  expect(html).toContain('Cine plătește?');
  expect(html).toContain('Numele unui jucător');
  for (const name of ['Ruleta', 'Eliminarea', 'Cartea neagră', 'Bomba', 'Zarurile', 'Haosul']) expect(html).toContain(name);
  expect(html).not.toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>).)*(Ruleta|Eliminarea|Cartea neagră|Bomba|Zarurile|Haosul)/);
  for (const gone of ['Andreea', 'Gașcă', 'Mod de joc', 'Locul', 'Câți sunteți']) expect(html).not.toContain(gone);
});
