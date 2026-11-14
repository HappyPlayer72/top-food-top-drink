import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { renderTopShell } from '@/lib/backend/routeShell';
import { CATEGORY_LABELS, categoryMetadata } from '@/lib/backend/venueRoute';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return categoryMetadata('food', decodeURIComponent((await params).category));
}

export default async function TopFoodCategoryPage({ params }: Props) {
  const category = decodeURIComponent((await params).category);
  if (!CATEGORY_LABELS.food[category]) notFound();
  return renderTopShell({ vertical: 'food', section: 'top', category });
}
