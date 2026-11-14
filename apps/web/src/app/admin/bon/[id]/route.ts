/**
 * Poza bonului pentru o dovadă de vizită: doar adminii, doar cât așteaptă decizia, fără cache.
 * După decizie poza e ștearsă din bază (GDPR), deci linkul întoarce 404.
 */
import { ServiceError, visits } from '@tftd/api';
import { currentUserId, getDb } from '../../server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return new Response('Neautentificat', { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Nu există', { status: 404 });
  try {
    const img = await visits.receiptImage(getDb(), userId, id);
    return new Response(new Uint8Array(img.bytes), {
      headers: {
        'Content-Type': img.type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch (e) {
    if (e instanceof ServiceError) return new Response(e.message, { status: e.code === 'forbidden' ? 403 : 404 });
    throw e;
  }
}
