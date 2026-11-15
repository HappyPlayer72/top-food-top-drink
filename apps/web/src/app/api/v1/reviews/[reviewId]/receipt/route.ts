import { visits } from '@tftd/api';
import {
  apiError,
  apiFromError,
  apiOffline,
  apiOk,
  apiOptions,
  hasDbConfigured,
  requireAuthUserId,
} from '@/lib/api/http';
import { getDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const OPTIONS = apiOptions;

export async function POST(req: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  if (!hasDbConfigured()) return apiOffline();
  const auth = await requireAuthUserId(req, 'Intră în cont.');
  if (!auth.ok) return auth.response;

  const { reviewId } = await params;
  const contentType = req.headers.get('content-type') ?? '';
  let bytes: Uint8Array | null = null;

  if (contentType.includes('multipart/form-data')) {
    try {
      const fd = await req.formData();
      const file = fd.get('receipt') ?? fd.get('file');
      if (file instanceof Blob) {
        bytes = new Uint8Array(await file.arrayBuffer());
      }
    } catch {
      return apiError('invalid', 'FormData invalid pentru poza bonului.', 400);
    }
  } else if (contentType.startsWith('image/')) {
    bytes = new Uint8Array(await req.arrayBuffer());
  } else if (contentType.includes('application/json')) {
    try {
      const body = (await req.json()) as { base64?: string };
      const raw = body?.base64?.replace(/^data:image\/[a-z+]+;base64,/i, '') ?? '';
      if (raw) bytes = Uint8Array.from(Buffer.from(raw, 'base64'));
    } catch {
      return apiError('invalid', 'Corp JSON invalid pentru poza bonului.', 400);
    }
  }

  if (!bytes || !bytes.length) {
    return apiError('invalid', 'Alege o poză cu bonul.', 400);
  }

  try {
    await visits.submitReceipt(getDb(), auth.userId, reviewId, bytes);
    return apiOk(
      { message: 'Bonul a ajuns la verificare. După aprobare, review-ul tău cântărește ×1,3.' },
      { status: 201 }
    );
  } catch (e) {
    return apiFromError(e);
  }
}
