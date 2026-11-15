import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { invalid, notFound, outingPolls, outingPollVotes, rateLimited, venues } from '@tftd/db';
import { DEFAULT_CITY_SLUG } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';

const TOKEN_RE = /^[a-f0-9]{48}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const OUTING_VOTER_COOKIE = 'tftd_outing_voter';

const state = globalThis as typeof globalThis & { apiOutingPollRequests?: Record<'read' | 'write', number[]> };
export function assertPollRateLimit(kind: 'read' | 'write') {
  const now = Date.now();
  state.apiOutingPollRequests ??= { read: [], write: [] };
  state.apiOutingPollRequests[kind] = state.apiOutingPollRequests[kind].filter((t) => now - t < 60_000);
  if (state.apiOutingPollRequests[kind].length >= (kind === 'read' ? 1200 : 120)) {
    throw rateLimited('Prea multe cereri pentru sondaje. Încearcă din nou într-un minut.');
  }
  state.apiOutingPollRequests[kind].push(now);
}

export const isValidPollToken = (value: unknown): value is string =>
  typeof value === 'string' && TOKEN_RE.test(value);

export const isValidVenueSlug = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 120 && SLUG_RE.test(value);

export const hashVoterToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export async function getVoterToken(req: Request): Promise<string | null> {
  const fromHeader = req.headers.get('x-voter-token')?.trim();
  if (fromHeader && isValidPollToken(fromHeader)) return fromHeader;
  try {
    const fromCookie = (await cookies()).get(OUTING_VOTER_COOKIE)?.value;
    if (fromCookie && isValidPollToken(fromCookie)) return fromCookie;
  } catch {
    // No Next.js cookie jar in unit test context
  }
  return null;
}

export async function createPollRecord(venueIds: unknown): Promise<{ token: string; venueIds: string[] }> {
  if (
    !Array.isArray(venueIds) ||
    venueIds.length < 2 ||
    venueIds.length > 4 ||
    !venueIds.every(isValidVenueSlug) ||
    new Set(venueIds).size !== venueIds.length
  ) {
    throw invalid('Alege între 2 și 4 localuri valide pentru sondaj.');
  }
  assertPollRateLimit('write');
  const db = getDb();
  const found = await db
    .select({ slug: venues.slug })
    .from(venues)
    .where(and(eq(venues.citySlug, DEFAULT_CITY_SLUG), eq(venues.status, 'active'), inArray(venues.slug, venueIds)));

  if (found.length !== venueIds.length || new Set(found.map((v) => v.slug)).size !== venueIds.length) {
    throw invalid('Sondajul sau localurile selectate nu sunt valide.');
  }

  const token = randomBytes(24).toString('hex');
  await db.insert(outingPolls).values({ token, venueSlugs: venueIds });
  return { token, venueIds };
}

export async function readPollRecord(token: string, voterToken: string | null) {
  if (!isValidPollToken(token)) throw invalid('Tokenul sondajului nu este valid.');
  assertPollRateLimit('read');
  const db = getDb();
  const [poll] = await db.select().from(outingPolls).where(eq(outingPolls.token, token));
  if (!poll) throw notFound('Sondajul');

  const counts: Record<string, number> = Object.fromEntries(poll.venueSlugs.map((slug) => [slug, 0]));
  const results = await db
    .select({ venueSlug: outingPollVotes.venueSlug, count: sql<number>`count(*)::int` })
    .from(outingPollVotes)
    .where(eq(outingPollVotes.pollToken, token))
    .groupBy(outingPollVotes.venueSlug);

  for (const row of results) {
    if (Object.hasOwn(counts, row.venueSlug)) counts[row.venueSlug] = row.count;
  }

  let myVote: string | null = null;
  if (voterToken && isValidPollToken(voterToken)) {
    const [vote] = await db
      .select({ venueSlug: outingPollVotes.venueSlug })
      .from(outingPollVotes)
      .where(and(eq(outingPollVotes.pollToken, token), eq(outingPollVotes.voterHash, hashVoterToken(voterToken))));
    myVote = vote?.venueSlug ?? null;
  }

  return { token, venueIds: poll.venueSlugs, counts, myVote };
}

export async function votePollRecord(token: string, venueSlug: string, existingVoterToken: string | null) {
  if (!isValidPollToken(token) || !isValidVenueSlug(venueSlug)) {
    throw invalid('Sondajul sau localul selectat nu este valid.');
  }
  assertPollRateLimit('write');
  const db = getDb();
  const [poll] = await db.select({ venueSlugs: outingPolls.venueSlugs }).from(outingPolls).where(eq(outingPolls.token, token));
  if (!poll) throw notFound('Sondajul');
  if (!poll.venueSlugs.includes(venueSlug)) {
    throw invalid('Localul selectat nu face parte din acest sondaj.');
  }

  const voterToken = existingVoterToken && isValidPollToken(existingVoterToken)
    ? existingVoterToken
    : randomBytes(24).toString('hex');

  try {
    (await cookies()).set(OUTING_VOTER_COOKIE, voterToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });
  } catch {
    // No cookie jar in non-browser/test context
  }

  await db
    .insert(outingPollVotes)
    .values({
      pollToken: token,
      voterHash: hashVoterToken(voterToken),
      venueSlug,
    })
    .onConflictDoUpdate({
      target: [outingPollVotes.pollToken, outingPollVotes.voterHash],
      set: { venueSlug, updatedAt: new Date() },
    });

  const data = await readPollRecord(token, voterToken);
  return { ...data, voterToken };
}
