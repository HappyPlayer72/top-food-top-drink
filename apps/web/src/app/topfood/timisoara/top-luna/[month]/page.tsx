import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { renderTopShell } from '@/lib/backend/routeShell';
import { monthlyMetadata } from '@/lib/backend/venueRoute';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ month: string }> };

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return monthlyMetadata('food', decodeURIComponent((await params).month));
}

export default async function TopFoodMonthlyArchivePage({ params }: Props) {
  const month = decodeURIComponent((await params).month);
  if (!MONTH_RE.test(month)) notFound();
  return renderTopShell({ vertical: 'food', section: 'monthly', month });
}
