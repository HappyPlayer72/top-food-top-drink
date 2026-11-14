'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { ensureExtendedSchema, monthlyCategoryVotes } from '@tftd/db';
import { getPublicVoteCategoryTops } from '../../data/monthlyCategoryTops';
import { getDb } from '../../lib/server/db';
import { getUserId } from '../../lib/server/session';
import type { Vertical } from '../../types';
import type { Result } from './user';

export interface MonthlyVotesSnapshot {
  /** Extra voturi din DB: categoryId -> (candidateSlug -> count) */
  countsByCategory: Record<string, Record<string, number>>;
  /** Votul userului curent: categoryId -> candidateSlug */
  myVotesByCategory: Record<string, string>;
}

const MONTH_RE = /^\d{4}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hasDb = () => !!process.env.DATABASE_URL;
const OFFLINE = { ok: false as const, offline: true, error: 'Baza de date nu e disponibilă.' };

async function readMonthlySnapshot(
  vertical: Vertical,
  month: string,
  userId: string | null
): Promise<MonthlyVotesSnapshot> {
  const db = getDb();
  await ensureExtendedSchema(db);

  const grouped = await db
    .select({
      categoryId: monthlyCategoryVotes.categoryId,
      venueSlug: monthlyCategoryVotes.venueSlug,
      count: sql<number>`count(*)::int`,
    })
    .from(monthlyCategoryVotes)
    .where(and(eq(monthlyCategoryVotes.month, month), eq(monthlyCategoryVotes.vertical, vertical)))
    .groupBy(monthlyCategoryVotes.categoryId, monthlyCategoryVotes.venueSlug);

  const countsByCategory: Record<string, Record<string, number>> = {};
  for (const row of grouped) {
    countsByCategory[row.categoryId] ??= {};
    countsByCategory[row.categoryId][row.venueSlug] = row.count;
  }

  const myVotesByCategory: Record<string, string> = {};
  if (userId) {
    const mine = await db
      .select({
        categoryId: monthlyCategoryVotes.categoryId,
        venueSlug: monthlyCategoryVotes.venueSlug,
      })
      .from(monthlyCategoryVotes)
      .where(
        and(
          eq(monthlyCategoryVotes.month, month),
          eq(monthlyCategoryVotes.vertical, vertical),
          eq(monthlyCategoryVotes.userId, userId)
        )
      );

    for (const row of mine) {
      myVotesByCategory[row.categoryId] = row.venueSlug;
    }
  }

  return { countsByCategory, myVotesByCategory };
}

export async function getMonthlyVotesState(input: {
  vertical: Vertical;
  month: string;
}): Promise<Result<MonthlyVotesSnapshot>> {
  if (!hasDb()) return OFFLINE;
  if ((input.vertical !== 'food' && input.vertical !== 'drink') || !MONTH_RE.test(input.month)) {
    return { ok: false, error: 'Parametri invalizi pentru votul lunii.' };
  }
  try {
    const userId = await getUserId();
    const snapshot = await readMonthlySnapshot(input.vertical, input.month, userId);
    return { ok: true, ...snapshot };
  } catch {
    return OFFLINE;
  }
}

export async function castMonthlyCategoryVote(input: {
  vertical: Vertical;
  month: string;
  activeMonth?: string;
  categoryId: string;
  venueSlug: string;
  venueName: string;
}): Promise<Result<MonthlyVotesSnapshot>> {
  if (!hasDb()) return OFFLINE;
  const userId = await getUserId();
  if (!userId) {
    return { ok: false, error: 'Intră în cont ca să votezi în Topul lunii.' };
  }

  if (
    (input.vertical !== 'food' && input.vertical !== 'drink') ||
    !MONTH_RE.test(input.month) ||
    !SLUG_RE.test(input.venueSlug) ||
    input.venueName.trim().length < 2
  ) {
    return { ok: false, error: 'Selecția de vot nu este validă.' };
  }

  if (input.activeMonth && input.month !== input.activeMonth) {
    return { ok: false, error: 'Votul pentru această lună s-a încheiat.' };
  }

  const validCategory = getPublicVoteCategoryTops(input.vertical, input.month).some(
    (c) => c.id === input.categoryId
  );
  if (!validCategory) {
    return { ok: false, error: 'Categoria aleasă nu există în această lună.' };
  }

  try {
    const db = getDb();
    await ensureExtendedSchema(db);

    const inserted = await db
      .insert(monthlyCategoryVotes)
      .values({
        month: input.month,
        vertical: input.vertical,
        categoryId: input.categoryId,
        userId,
        venueSlug: input.venueSlug,
        venueName: input.venueName.trim().slice(0, 120),
      })
      .onConflictDoNothing()
      .returning({ venueSlug: monthlyCategoryVotes.venueSlug });

    if (inserted.length === 0) {
      const snapshot = await readMonthlySnapshot(input.vertical, input.month, userId);
      return {
        ok: false,
        error: 'Ai votat deja în această secțiune luna aceasta (1 vot / secțiune / lună).',
        ...snapshot,
      } as Result<MonthlyVotesSnapshot>;
    }

    const snapshot = await readMonthlySnapshot(input.vertical, input.month, userId);
    revalidatePath('/');
    return { ok: true, ...snapshot };
  } catch {
    return OFFLINE;
  }
}
