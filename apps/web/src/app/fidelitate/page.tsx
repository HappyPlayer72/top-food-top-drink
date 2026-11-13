import { TopFoodShell } from '@/components/TopFoodShell';
import { DRINK_HERO_HEADERS, FOOD_HERO_HEADERS } from '@/data/heroHeaders';

export const dynamic = 'force-dynamic';

export default function FidelitatePage() {
  const initialFoodHeroIndex = Math.floor(
    Math.random() * FOOD_HERO_HEADERS.length
  );
  const initialDrinkHeroIndex = Math.floor(
    Math.random() * DRINK_HERO_HEADERS.length
  );

  return (
    <TopFoodShell
      initialVertical="food"
      initialSection="fidelitate"
      initialFoodHeroIndex={initialFoodHeroIndex}
      initialDrinkHeroIndex={initialDrinkHeroIndex}
    />
  );
}
