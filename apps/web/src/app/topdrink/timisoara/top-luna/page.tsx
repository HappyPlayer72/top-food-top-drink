import type { Metadata } from 'next';
import { renderTopShell } from '@/lib/backend/routeShell';
import { monthlyMetadata } from '@/lib/backend/venueRoute';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = monthlyMetadata('drink');

export default async function TopDrinkMonthlyPage() {
  return renderTopShell({ vertical: 'drink', section: 'monthly' });
}
