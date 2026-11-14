import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, ChevronLeft, MapPin } from 'lucide-react';
import { weekendEvents } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { toWeekendEvent } from '@/lib/backend/toRestaurant';
import { Footer } from '@/components/Footer';
import { DRINK_VENUES, WEEKEND_EVENTS } from '@/data/restaurants';
import type { WeekendEvent } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Evenimente weekend în Timișoara | topdrink/timisoara',
  description: 'Concerte, DJ seturi, seri de vinil și degustări de vineri până duminică în barurile și cluburile din Timișoara.',
  alternates: { canonical: '/topdrink/timisoara/weekend' },
};

const DAY_TITLE: Record<WeekendEvent['dayShort'], string> = {
  'vin.': 'Vineri',
  'sâm.': 'Sâmbătă',
  'dum.': 'Duminică',
};

export default async function TopDrinkWeekendPage() {
  let events: WeekendEvent[] = WEEKEND_EVENTS;
  if (process.env.DATABASE_URL) {
    try {
      const rows = await weekendEvents(getDb(), 'timisoara');
      if (rows.length > 0) events = rows.map(toWeekendEvent);
    } catch {
      events = WEEKEND_EVENTS;
    }
  }

  const venueBySlug = new Map(DRINK_VENUES.map((v) => [v.slug, v]));

  return (
    <div className="min-h-screen flex flex-col bg-[#17382C] text-[#F4EEE2]">
      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/topdrink/timisoara"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]"
            aria-label="Înapoi la topdrink/timișoara"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm text-[#F4EEE2]/70">
            topdrink/timisoara/<strong className="text-[#F2A33A]">weekend</strong>
          </span>
        </div>

        <header className="space-y-2 border-b border-[#285443] pb-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F2A33A]">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Vineri – Duminică în Timișoara
          </div>
          <h1 className="font-display text-4xl sm:text-5xl leading-none">
            Weekendul ăsta
          </h1>
          <p className="text-sm text-[#F4EEE2]/75 max-w-xl">
            Evenimentele anunțate direct de barurile și cluburile din oraș, cu program de weekend și acces rapid către scorul onest al fiecărui local.
          </p>
        </header>

        {events.length === 0 ? (
          <p className="rounded-[6px] border border-[#2D5947] bg-[#143025] p-6 text-sm text-[#F4EEE2]/80">
            Nu sunt evenimente programate pentru acest weekend încă. Revin-o vineri dimineață.
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((evt) => {
              const fb = venueBySlug.get(evt.venueId);
              const neighborhood = evt.neighborhood ?? fb?.shortNeighborhood ?? fb?.neighborhood;
              const address = evt.address ?? fb?.address;
              return (
                <article
                  key={evt.id}
                  className="rounded-[6px] border border-[#2D5947] bg-[#143025] p-5 transition-colors hover:border-[#F2A33A]/70"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 rounded bg-[#F2A33A] px-2.5 py-0.5 text-xs font-bold text-[#17382C]">
                        <span>{DAY_TITLE[evt.dayShort]} {evt.dayNumber}</span>
                      </div>
                      <h2 className="font-display text-2xl leading-tight text-[#F4EEE2]">
                        {evt.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-[#F4EEE2]/80">
                        {evt.details}
                      </p>
                      {(neighborhood || address) && (
                        <p className="inline-flex items-center gap-1.5 text-xs text-[#F4EEE2]/65">
                          <MapPin className="h-3.5 w-3.5 text-[#F2A33A]" aria-hidden="true" />
                          <span>{[neighborhood, address].filter(Boolean).join(' · ')}</span>
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/topdrink/timisoara/${encodeURIComponent(evt.venueId)}`}
                      className="inline-flex min-h-10 shrink-0 items-center rounded-[4px] border border-[#F2A33A] px-3.5 py-2 text-xs font-bold text-[#F2A33A] hover:bg-[#F2A33A] hover:text-[#17382C] transition-colors"
                    >
                      Vezi localul →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        </div>
      </main>
      <Footer vertical="drink" />
    </div>
  );
}
