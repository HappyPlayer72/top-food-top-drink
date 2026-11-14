import { DRINK_VENUES, INITIAL_RESTAURANTS } from '@/data/restaurants';
import { loadShellData } from '@/lib/backend/load';
import { SharedOutingPoll } from './shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Unde ieșim? | topfood/timișoara', robots: { index: false, follow: false } };

export default async function SharedOutingPollPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadShellData();
  const restaurants = data ? [...data.foodRestaurants, ...data.drinkVenues] : [...INITIAL_RESTAURANTS, ...DRINK_VENUES];
  return <SharedOutingPoll token={token} restaurants={restaurants} />;
}
