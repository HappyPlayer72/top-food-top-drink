import { describe, expect, it } from 'vitest';
import {
  buildBlackDeck,
  chaosSplit,
  cleanName,
  withMyName,
  eliminationSteps,
  nextTurn,
  parseStoredPlayers,
  pickDareRound,
  rollDice,
  wheelIndexAt,
  wheelLabel,
  wheelTargetRotation,
} from './tableGames';

describe('tableGames', () => {
  it('roata se oprește pe felia cerută, după cel puțin 4 ture', () => {
    for (const count of [3, 6, 8, 12]) for (let i = 0; i < count; i++) for (const current of [0, 137, 1990]) for (const jitter of [-0.35, 0, 0.35]) {
      const target = wheelTargetRotation(current, i, count, 5, jitter);
      expect(wheelIndexAt(target, count)).toBe(i);
      expect(target - current).toBeGreaterThanOrEqual(4 * 360);
    }
  });
  it('etichetele lungi se scurtează', () => {
    expect(wheelLabel('Alexandra-Maria', 6)).toBe('Alexandra…');
    expect(wheelLabel('Ana', 12)).toBe('Ana');
    expect(wheelLabel('Alexandra', 12)).toBe('Alexa…');
  });
  it('numele se curăță și se limitează', () => {
    expect(cleanName('  Ana   Maria ')).toBe('Ana Maria');
    expect(cleanName('x'.repeat(40))).toHaveLength(20);
  });
  it('rândul trece pe la toți, apoi o ia de la capăt; un jucător șters nu blochează', () => {
    const order = ['a', 'b', 'c'];
    expect([null, 'a', 'b', 'c'].map((last) => nextTurn(order, last))).toEqual(['a', 'b', 'c', 'a']);
    expect(nextTurn(['a', 'c'], 'b')).toBe('a');
    expect(nextTurn([], null)).toBeNull();
  });
  it('numele salvate se citesc doar dacă sunt valide', () => {
    expect(parseStoredPlayers(null)).toEqual([]);
    expect(parseStoredPlayers('nu e json')).toEqual([]);
    expect(parseStoredPlayers('{"a":1}')).toEqual([]);
    expect(parseStoredPlayers(JSON.stringify(['  Ana ', 3, '', 'Radu']))).toEqual(['Ana', 'Radu']);
    expect(parseStoredPlayers(JSON.stringify(Array(20).fill('X')))).toHaveLength(12);
  });
  it('provocarea nu se repetă, iar ținta e pe roată', () => {
    const pool = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'];
    for (let k = 0; k < 50; k++) {
      const { segmentIds, targetIndex } = pickDareRound(pool, 'd3');
      expect(segmentIds).toHaveLength(8);
      expect(segmentIds[targetIndex]).not.toBe('d3');
    }
    const small = pickDareRound(['d1', 'd2'], 'd1', () => 0);
    expect(small.segmentIds.length).toBeGreaterThanOrEqual(4);
    expect(small.segmentIds[small.targetIndex]).toBe('d2');
    expect(pickDareRound(['d1'], 'd1').segmentIds.every((id) => id === 'd1')).toBe(true);
  });
  it('împărțirea haotică dă 100%, un 0% și se potrivește cu jucătorii', () => {
    for (const n of [2, 3, 7]) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const split = chaosSplit(ids);
      expect(split.map((s) => s.id).sort()).toEqual([...ids].sort());
      expect(split.reduce((a, s) => a + s.pct, 0)).toBe(100);
      if (n > 2) expect(split.some((s) => s.pct === 0)).toBe(true);
    }
  });
  it('zarurile au mereu un singur pierzător', () => {
    const r = rollDice(['a', 'b'], () => 0); // toți dau 1+1 → egalitate → departajare
    expect(['a', 'b']).toContain(r.loserId);
    expect(r.hadTie).toBe(true);
  });
  it('eliminarea se oprește pe cel ales, nu mereu pe primul', () => {
    for (let len = 2; len <= 12; len++) for (let target = 0; target < len; target++) {
      const steps = eliminationSteps(len, target);
      expect(steps % len).toBe(target);
      expect(steps).toBeGreaterThanOrEqual(6);
    }
  });
  it('numele celui logat stă primul, o singură dată', () => {
    expect(withMyName([], 'Alex Tunea')).toEqual(['Alex Tunea']);
    expect(withMyName(['Ana'], '  Alex  ')).toEqual(['Alex', 'Ana']);
    const already = ['Ana', 'alex'];
    expect(withMyName(already, 'Alex')).toBe(already);
    expect(withMyName(already, null)).toBe(already);
    expect(withMyName(Array(12).fill('X'), 'Alex')).toHaveLength(12);
  });
  it('pachetul are o carte neagră și, de la 3 jucători, una de bacșiș', () => {
    expect(buildBlackDeck(2).map((c) => c.outcome).sort()).toEqual(['loser', 'safe']);
    expect(buildBlackDeck(5).filter((c) => c.outcome === 'tip')).toHaveLength(1);
  });
});
