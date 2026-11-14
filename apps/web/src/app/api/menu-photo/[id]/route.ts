import { menuPhoto } from '@tftd/api';
import { getDb } from '@/lib/server/db';

/** Poza unui fel din meniu. setMenu recreează rândurile la fiecare salvare, deci un id nu-și schimbă niciodată poza. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await menuPhoto(getDb(), id);
  const m = photo?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new Response('Nu există.', { status: 404 });
  return new Response(Buffer.from(m[2]!, 'base64'), {
    headers: { 'Content-Type': m[1]!, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
