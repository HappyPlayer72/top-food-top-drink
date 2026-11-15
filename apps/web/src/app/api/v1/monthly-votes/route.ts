import { and, eq, sql } from 'drizzle-orm';
import { ensureExtendedSchema, monthlyCategoryVotes } from '@tftd/db';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  parseJsonBody,
  requireAuthUserId,
} from '@/lib/api/http';
import { getPublicVoteCategoryTops } from '@/data/monthlyCategoryTops';
import { getDb } from '@/lib/server/db';
import type { Vertical } from '@/types';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

const MONTH_RE = /^\d{4}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(req: Request) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să votezi în Topul lunii.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{
    vertical?: Vertical;
    month?: string;
    activeMonth?: string;
    categoryId?: string;
    venueSlug?: string;
    venueName?: string;
  }>(req);
  if (!parsed.ok) return parsed.response;

  const { vertical, month, activeMonth, categoryId, venueSlug, venueName } = parsed.body;
  if (
    (vertical !== 'food' && vertical !== 'drink') ||
    !month ||
    !MONTH_RE.test(month) ||
    !categoryId ||
    !venueSlug ||
    !SLUG_RE.test(venueSlug) ||
    !venueName ||
    venueName.trim().length < 2
  ) {
    return apiError('invalid', 'Selecția de vot nu este validă.', 400);
  }

  if (activeMonth && month !== activeMonth) {
    return apiError('invalid', 'Votul pentru această lună s-a încheiat.', 400);
  }

  const validCategory = getPublicVoteCategoryTops(vertical, month).some((c) => c.id === categoryId);
  if (!validCategory) {
    return apiError('invalid', 'Categoria aleasă nu există în această lună.', 400);
  }

  try {
    const db = getDb();
    await ensureExtendedSchema(db);
    const inserted = await db
      .insert(monthlyCategoryVotes)
      .values({
        month,
        vertical,
        categoryId,
        userId: auth.userId,
        venueSlug,
        venueName: venueName.trim().slice(0, 120),
      })
      .onConflictDoNothing()
      .returning({ venueSlug: monthlyCategoryVotes.venueSlug });

    const [grouped, mine] = await Promise.all([
      db
        .select({
          categoryId: monthlyCategoryVotes.categoryId,
          venueSlug: monthlyCategoryVotes.venueSlug,
          count: sql<number>`count(*)::int`,
        })
        .from(monthlyCategoryVotes)
        .where(and(eq(monthlyCategoryVotes.month, month), eq(monthlyCategoryVotes.vertical, vertical)))
        .groupBy(monthlyCategoryVotes.categoryId, monthlyCategoryVotes.venueSlug),
      db
        .select({
          categoryId: monthlyCategoryVotes.categoryId,
          venueSlug: monthlyCategoryVotes.venueSlug,
        })
        .from(monthlyCategoryVotes)
        .where(
          and(
            eq(monthlyCategoryVotes.month, month),
            eq(monthlyCategoryVotes.vertical, vertical),
            eq(monthlyCategoryVotes.userId, auth.userId)
          )
        ),
    ]);

    const countsByCategory: Record<string, Record<string, number>> = {};
    for (const row of grouped) {
      countsByCategory[row.categoryId] ??= {};
      countsByCategory[row.categoryId]![row.venueSlug] = row.count;
    }
    const myVotesByCategory: Record<string, string> = {};
    for (const row of mine) {
      myVotesByCategory[row.categoryId] = row.venueSlug;
    }

    if (inserted.length === 0) {
      return apiError(
        'conflict',
        'Ai votat deja în această secțiune luna aceasta (1 vot / secțiune / lună).',
        409,
        { countsByCategory, myVotesByCategory }
      );
    }

    return apiOk({ countsByCategory, myVotesByCategory }, { status: 201 });
  } catch (e) {
    return apiFromError(e);
  }
}
