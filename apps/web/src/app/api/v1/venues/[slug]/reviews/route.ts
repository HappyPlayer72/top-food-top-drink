import { writeReview } from '@tftd/api';
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
import { resolveVenueId } from '@/lib/api/service';
import { getDb } from '@/lib/server/db';
import { getRequestClientHash } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont ca să scrii un review.');
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{
    rating?: number;
    text?: string;
    visitedAt?: string;
    weekendNight?: boolean;
    servedByEmployeeId?: string;
    employeeRating?: { friendliness: number; speed: number; comment?: string };
    answers?: Record<string, string>;
    formToken?: string;
    website?: string;
  }>(req);
  if (!parsed.ok) return parsed.response;

  const { rating, text, formToken, website, ...rest } = parsed.body;
  if (typeof rating !== 'number' || typeof text !== 'string') {
    return apiError('invalid', 'Trimite nota (`rating`) și textul review-ului (`text`).', 400);
  }

  const { slug } = await params;
  try {
    const db = getDb();
    const venueId = await resolveVenueId(db, slug);
    const r = await writeReview(
      db,
      auth.userId,
      {
        venueId,
        rating: Math.round(rating),
        text,
        visitedAt: rest.visitedAt,
        weekendNight: rest.weekendNight,
        servedByEmployeeId: rest.servedByEmployeeId,
        employeeRating: rest.employeeRating,
        answers: rest.answers,
      },
      new Date(),
      {
        formToken,
        honeypot: website,
        clientHash: getRequestClientHash(req),
      }
    );

    if (r.status === 'flagged') {
      return apiOk(
        {
          reviewId: r.id,
          verifiedVisit: false,
          held: true,
          message: 'Review-ul tău a ajuns la verificare la un moderator și apare după ce îl aprobă.',
        },
        { status: 202 }
      );
    }

    const weight = (r.weight ?? 1).toFixed(1).replace('.', ',');
    const why =
      r.fakeProbability >= 0.5
        ? ` Atenție: arată ca un review suspect (${Math.round(r.fakeProbability * 100)}%), așa că pondera e mică.`
        : r.authorType === 'local'
          ? ' Ești localnic verificat, nota ta contează dublu.'
          : '';
    const visit = r.verifiedVisit ? ' Vizită verificată prin check-in (×1,3).' : '';

    return apiOk(
      {
        reviewId: r.id,
        verifiedVisit: r.verifiedVisit,
        held: false,
        message: `Review publicat. Pondere ×${weight}.${why}${visit} Scorul localului s-a recalculat.`,
      },
      { status: 201 }
    );
  } catch (e) {
    return apiFromError(e);
  }
}
