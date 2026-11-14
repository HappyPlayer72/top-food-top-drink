import { renderMonthlyOgImage } from '@/lib/backend/ogImage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vertical = searchParams.get('vertical') === 'drink' ? 'drink' : 'food';
  const month = searchParams.get('month') ?? undefined;
  return renderMonthlyOgImage(vertical, month, { width: 1080, height: 1920 });
}
