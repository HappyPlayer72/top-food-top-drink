import { afterEach, expect, test, vi } from 'vitest';
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('../../lib/server/db', () => ({ getDb: vi.fn() }));
import { createOutingPoll, getOutingPoll, voteOutingPoll } from './outing-poll';

afterEach(() => vi.unstubAllEnvs());

test('rejects unavailable shared storage without pretending a link was created', async () => {
  vi.stubEnv('DATABASE_URL', '');
  expect(await createOutingPoll(['one', 'two'])).toMatchObject({ ok: false });
});

test('rejects invalid polls and votes before accessing storage', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  expect(await createOutingPoll(['same', 'same'])).toMatchObject({ ok: false });
  expect(await createOutingPoll(['one'])).toMatchObject({ ok: false });
  expect(await getOutingPoll('invalid')).toMatchObject({ ok: false });
  expect(await voteOutingPoll('invalid', 'one')).toMatchObject({ ok: false });
});

test('creates a shared poll and changes one anonymous browser vote without adding another', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  const { getDb } = await import('../../lib/server/db');
  const { cookies } = await import('next/headers');
  const { venues, outingPolls, outingPollVotes } = await import('@tftd/db');
  let poll: { token: string; venueSlugs: string[] } | undefined;
  let vote: { venueSlug: string } | undefined;
  let cookie: string | undefined;
  vi.mocked(cookies).mockResolvedValue({
    get: () => cookie ? { value: cookie } : undefined,
    set: (_name: string, value: string) => { cookie = value; },
  } as never);
  const db = {
    select: () => ({ from: (table: unknown) => ({ where: () => {
      const rows = table === venues ? [{ slug: 'one' }, { slug: 'two' }]
        : table === outingPolls ? (poll ? [poll] : []) : (vote ? [vote] : []);
      return Object.assign(Promise.resolve(rows), { groupBy: async () => vote ? [{ venueSlug: vote.venueSlug, count: 1 }] : [] });
    } }) }),
    insert: (table: unknown) => ({ values: (data: any) => {
      if (table === outingPolls) { poll = data; return Promise.resolve(); }
      if (table === outingPollVotes) return { onConflictDoUpdate: async () => { vote = { venueSlug: data.venueSlug }; } };
      throw new Error('Unexpected table');
    } }),
  };
  vi.mocked(getDb).mockReturnValue(db as never);
  const created = await createOutingPoll(['one', 'two']);
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error('Poll not created');
  expect(created.token).toMatch(/^[a-f0-9]{48}$/);
  expect(await getOutingPoll(created.token)).toMatchObject({ ok: true, counts: { one: 0, two: 0 }, myVote: null });
  expect(await voteOutingPoll(created.token, 'other')).toMatchObject({ ok: false });
  expect(await voteOutingPoll(created.token, 'one')).toMatchObject({ ok: true, counts: { one: 1, two: 0 }, myVote: 'one' });
  expect(await voteOutingPoll(created.token, 'two')).toMatchObject({ ok: true, counts: { one: 0, two: 1 }, myVote: 'two' });
});

test('does not create a poll for unlisted venues', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  const { getDb } = await import('../../lib/server/db');
  vi.mocked(getDb).mockReturnValue({ select: () => ({ from: () => ({ where: async () => [{ slug: 'one' }] }) }) } as never);
  expect(await createOutingPoll(['one', 'missing'])).toMatchObject({ ok: false });
});
