'use server';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { outingPolls, outingPollVotes, venues } from '@tftd/db';
import { getDb } from '../../lib/server/db';

const tokenPattern = /^[a-f0-9]{48}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const cookieName = 'tftd_outing_voter';
const offline = { ok: false as const, error: 'Sondajele nu sunt disponibile momentan. Încearcă mai târziu.' };
const invalid = { ok: false as const, error: 'Sondajul sau localurile selectate nu sunt valide.' };

// ponytail: limită per proces; un limitator partajat este necesar la mai multe instanțe.
const state = globalThis as typeof globalThis & { outingPollRequests?: Record<'read' | 'write', number[]> };
function allowRequest(kind: 'read' | 'write') {
  const now = Date.now();
  state.outingPollRequests ??= { read: [], write: [] };
  state.outingPollRequests[kind] = state.outingPollRequests[kind].filter((time) => now - time < 60_000);
  if (state.outingPollRequests[kind].length >= (kind === 'read' ? 1200 : 120)) return false;
  state.outingPollRequests[kind].push(now);
  return true;
}
function validSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 120 && slugPattern.test(value);
}
function validToken(value: unknown): value is string {
  return typeof value === 'string' && tokenPattern.test(value);
}
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }

export async function createOutingPoll(venueIds: string[]) {
  if (!Array.isArray(venueIds) || venueIds.length < 2 || venueIds.length > 4 || !venueIds.every(validSlug) || new Set(venueIds).size !== venueIds.length) return invalid;
  if (!process.env.DATABASE_URL || !allowRequest('write')) return offline;
  try {
    const db = getDb();
    const found = await db.select({ slug: venues.slug }).from(venues).where(and(
      eq(venues.citySlug, 'timisoara'), eq(venues.status, 'active'), inArray(venues.slug, venueIds),
    ));
    if (found.length !== venueIds.length || new Set(found.map((v) => v.slug)).size !== venueIds.length) return invalid;
    const token = randomBytes(24).toString('hex');
    await db.insert(outingPolls).values({ token, venueSlugs: venueIds });
    return { ok: true as const, token };
  } catch { return offline; }
}

async function readPoll(token: string) {
  const db = getDb();
  const [poll] = await db.select().from(outingPolls).where(eq(outingPolls.token, token));
  if (!poll) return invalid;
  const counts: Record<string, number> = Object.fromEntries(poll.venueSlugs.map((slug) => [slug, 0]));
  const results = await db.select({ venueSlug: outingPollVotes.venueSlug, count: sql<number>`count(*)::int` })
    .from(outingPollVotes).where(eq(outingPollVotes.pollToken, token)).groupBy(outingPollVotes.venueSlug);
  for (const row of results) if (Object.hasOwn(counts, row.venueSlug)) counts[row.venueSlug] = row.count;
  const voter = (await cookies()).get(cookieName)?.value;
  let myVote: string | null = null;
  if (voter && validToken(voter)) {
    const [vote] = await db.select({ venueSlug: outingPollVotes.venueSlug }).from(outingPollVotes)
      .where(and(eq(outingPollVotes.pollToken, token), eq(outingPollVotes.voterHash, hash(voter))));
    myVote = vote?.venueSlug ?? null;
  }
  return { ok: true as const, venueIds: poll.venueSlugs, counts, myVote };
}

export async function getOutingPoll(token: string) {
  if (!validToken(token)) return invalid;
  if (!process.env.DATABASE_URL || !allowRequest('read')) return offline;
  try { return await readPoll(token); } catch { return offline; }
}

export async function voteOutingPoll(token: string, venueId: string) {
  if (!validToken(token) || !validSlug(venueId)) return invalid;
  if (!process.env.DATABASE_URL || !allowRequest('write')) return offline;
  try {
    const db = getDb();
    const [poll] = await db.select({ venueSlugs: outingPolls.venueSlugs }).from(outingPolls).where(eq(outingPolls.token, token));
    if (!poll?.venueSlugs.includes(venueId)) return invalid;
    const jar = await cookies();
    let voter = jar.get(cookieName)?.value;
    if (!voter || !validToken(voter)) {
      voter = randomBytes(24).toString('hex');
      jar.set(cookieName, voter, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 365 * 24 * 60 * 60 });
    }
    await db.insert(outingPollVotes).values({ pollToken: token, voterHash: hash(voter), venueSlug: venueId })
      .onConflictDoUpdate({ target: [outingPollVotes.pollToken, outingPollVotes.voterHash], set: { venueSlug: venueId, updatedAt: new Date() } });
    return await readPoll(token);
  } catch { return offline; }
}
