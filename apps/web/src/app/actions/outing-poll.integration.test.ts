import { expect, it, vi } from 'vitest';

const browser = vi.hoisted(() => ({ active: 'first', jars: new Map<string, Map<string, string>>() }));
vi.mock('next/headers', () => ({
  cookies: async () => {
    if (!browser.jars.has(browser.active)) browser.jars.set(browser.active, new Map());
    const jar = browser.jars.get(browser.active)!;
    return { get: (name: string) => jar.has(name) ? { value: jar.get(name) } : undefined, set: (name: string, value: string) => jar.set(name, value) };
  },
}));

import { createOutingPoll, getOutingPoll, voteOutingPoll } from './outing-poll';

it.skipIf(process.env.RUN_OUTING_DB_TEST !== '1')('persistă voturile separate ale două browsere și permite schimbarea lor', async () => {
  const created = await createOutingPoll(['restaurant-nora', 'la-focacceria']);
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error(created.error);
  const token = created.token;
  expect(await voteOutingPoll(token, 'restaurant-nora')).toMatchObject({ ok: true, myVote: 'restaurant-nora' });
  browser.active = 'second';
  expect(await voteOutingPoll(token, 'la-focacceria')).toMatchObject({ ok: true, counts: { 'restaurant-nora': 1, 'la-focacceria': 1 } });
  browser.active = 'first';
  expect(await voteOutingPoll(token, 'la-focacceria')).toMatchObject({ ok: true, counts: { 'restaurant-nora': 0, 'la-focacceria': 2 } });
  browser.active = 'second';
  expect(await getOutingPoll(token)).toMatchObject({ ok: true, myVote: 'la-focacceria', counts: { 'restaurant-nora': 0, 'la-focacceria': 2 } });
});
