import { renderMonthlyOgImage } from '@/lib/backend/ogImage';

export const alt = 'Topul lunii — topfood/timișoara';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return renderMonthlyOgImage('food');
}
