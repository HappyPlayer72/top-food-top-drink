'use client';

import Link from 'next/link';
import { OutingPoll } from '@/components/scarnavii/OutingPoll';
import type { Restaurant } from '@/types';

export function SharedOutingPoll({ token, restaurants }: { token: string; restaurants: Restaurant[] }) {
  return (
    <main className="doodle-wallpaper min-h-screen bg-white text-[#3A2418] pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Link href="/" className="inline-block font-display text-[22px] text-[#3A2418]">topfood/timișoara</Link>
        <OutingPoll vertical="food" restaurants={restaurants} pollId={token} onSelectRestaurant={(restaurant) => {
          const vertical = restaurant.vertical === 'drink' ? 'drink' : 'food';
          window.location.href = `/top${vertical}/timisoara/${encodeURIComponent(restaurant.slug)}`;
        }} />
      </div>
    </main>
  );
}
