import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TopFoodShell } from '@/components/TopFoodShell';
import { loadShellData } from '@/lib/backend/load';
import { findVenue, venueMetadata } from '@/lib/backend/venueRoute';
import { DRINK_HERO_HEADERS, FOOD_HERO_HEADERS } from '@/data/heroHeaders';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

/** Titlul și descrierea pentru Google și pentru previzualizarea linkului. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return venueMetadata('food', decodeURIComponent((await params).slug));
}

/** URL propriu pentru fiecare local: aceeași aplicație, cu localul deschis (TopFoodShell citește slug-ul din URL). */
export default async function TopFoodVenuePage({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  if (!(await findVenue('food', slug))) notFound();
  const data = await loadShellData();
  return (
    <TopFoodShell
      initialVertical="food"
      initialFoodHeroIndex={Math.floor(Math.random() * FOOD_HERO_HEADERS.length)}
      initialDrinkHeroIndex={Math.floor(Math.random() * DRINK_HERO_HEADERS.length)}
      {...(data ?? {})}
    />
  );
}
