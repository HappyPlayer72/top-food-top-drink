import { describe, expect, it } from 'vitest';
import { parseBucharest, toBucharestInput } from './time';

// Serverul poate rula în UTC (Vercel); ora introdusă de owner e ora României.
describe('parseBucharest', () => {
  it('iarna (UTC+2)', () => expect(parseBucharest('2026-11-14T18:00')?.toISOString()).toBe('2026-11-14T16:00:00.000Z'));
  it('vara (UTC+3)', () => expect(parseBucharest('2026-07-01T18:00')?.toISOString()).toBe('2026-07-01T15:00:00.000Z'));
  it('null pentru gol sau invalid', () => {
    expect(parseBucharest('')).toBeNull();
    expect(parseBucharest('mâine seară')).toBeNull();
  });
});

describe('toBucharestInput', () => {
  it('UTC → ora României pentru datetime-local', () => {
    expect(toBucharestInput(new Date('2026-11-14T16:00:00Z'))).toBe('2026-11-14T18:00');
    expect(toBucharestInput(new Date('2026-07-01T15:00:00Z'))).toBe('2026-07-01T18:00');
  });
  it('gol pentru null', () => expect(toBucharestInput(null)).toBe(''));
});
