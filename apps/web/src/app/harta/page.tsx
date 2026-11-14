import { TopFoodShell } from '@/components/TopFoodShell';
import { loadShellData } from '@/lib/backend/load';
import { DRINK_HERO_HEADERS, FOOD_HERO_HEADERS } from '@/data/heroHeaders';

export const dynamic = 'force-dynamic';

export default async function HartaPage() {
  // Datele din backend; null = baza nu e disponibilă, se folosesc datele statice
  const data = await loadShellData();
  const initialFoodHeroIndex = Math.floor(
    Math.random() * FOOD_HERO_HEADERS.length
  );
  const initialDrinkHeroIndex = Math.floor(
    Math.random() * DRINK_HERO_HEADERS.length
  );

  return (
    <TopFoodShell
      initialVertical="food"
      initialSection="map"
      initialFoodHeroIndex={initialFoodHeroIndex}
      initialDrinkHeroIndex={initialDrinkHeroIndex}
      {...(data ?? {})}
    />
  );
}
