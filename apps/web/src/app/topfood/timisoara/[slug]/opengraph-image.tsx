import { renderVenueOgImage } from '@/lib/backend/ogImage';

export const alt = 'Scor Onest — topfood/timișoara';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return renderVenueOgImage('food', decodeURIComponent((await params).slug));
}
