import type { Metadata } from 'next';
import { renderTopShell } from '@/lib/backend/routeShell';
import { monthlyMetadata } from '@/lib/backend/venueRoute';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = monthlyMetadata('food');

export default async function TopFoodMonthlyPage() {
  return renderTopShell({ vertical: 'food', section: 'monthly' });
}
