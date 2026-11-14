import { TopFoodShell } from '@/components/TopFoodShell';
import { DRINK_HERO_HEADERS, FOOD_HERO_HEADERS } from '@/data/heroHeaders';
import { loadShellData } from './load';
import type { NavSection, Vertical } from '../../types';

export async function renderTopShell(opts: {
  vertical: Vertical;
  section?: NavSection;
  category?: string | null;
  month?: string | null;
}) {
  const data = await loadShellData();
  return (
    <TopFoodShell
      initialVertical={opts.vertical}
      initialSection={opts.section ?? 'top'}
      initialCategory={opts.category ?? null}
      initialMonth={opts.month ?? null}
      initialFoodHeroIndex={Math.floor(Math.random() * FOOD_HERO_HEADERS.length)}
      initialDrinkHeroIndex={Math.floor(Math.random() * DRINK_HERO_HEADERS.length)}
      {...(data ?? {})}
    />
  );
}
