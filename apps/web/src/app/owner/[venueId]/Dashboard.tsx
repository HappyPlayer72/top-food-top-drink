import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BarChart3, BookOpenText, ChevronLeft, Clapperboard, MessageSquareText, UsersRound } from 'lucide-react';
import { owner, venuePage } from '@tftd/api';
import { BlogPanel } from '@/components/owner/BlogPanel';
import { ReviewsPanel } from '@/components/owner/ReviewsPanel';
import { StandingPanel } from '@/components/owner/Standing';
import { StatsPanel } from '@/components/owner/StatsPanel';
import { TeamPanel } from '@/components/owner/TeamPanel';
import { SocialLinks } from '@/components/SocialLinks';
import { getDb } from '@/lib/server/db';
import { buttonClass } from '@/components/owner/ui-classes';
import { INITIAL_RESTAURANTS } from '@/data/restaurants';
import { getUserId } from '@/lib/server/session';

const SECTIONS = [
  { id: 'statistici', label: 'Statistici', description: 'Scorul și ce spun oamenii despre localul tău.', icon: BarChart3 },
  { id: 'review-uri', label: 'Review-uri', description: 'Citește și răspunde la review-urile primite.', icon: MessageSquareText },
  { id: 'blog', label: 'Blog', description: 'Noutăți, meniuri și evenimente pentru clienții tăi.', icon: BookOpenText },
  { id: 'echipa', label: 'Echipa', description: 'Gestionează oamenii care dau viață localului.', icon: UsersRound },
  { id: 'videouri', label: 'Videouri', description: 'Adaugă și urmărește videourile despre localul tău.', icon: Clapperboard },
] as const;

type Section = (typeof SECTIONS)[number]['id'];

// Aceleași poze de rezervă ca pe paginile publice.
const PLACEHOLDER_PHOTO = {
  food: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  drink: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
};

export async function Dashboard({ venueId, section }: { venueId: string; section: string }) {
  const selected = SECTIONS.find((item) => item.id === section);
  if (!selected) notFound();
  const userId = await getUserId();
  if (!userId) redirect('/owner');
  const db = getDb();
  const venue = (await owner.managedVenues(db, userId)).find((v) => v.id === venueId);
  if (!venue) notFound();
  const isDrink = venue.vertical === 'drink';
  const known = INITIAL_RESTAURANTS.find((r) => r.slug === venue.slug);
  const photo = known?.photoUrl ?? PLACEHOLDER_PHOTO[venue.vertical];
  const meta = known ? `${known.cuisine}, ${known.neighborhood}` : null;
  let content: React.ReactNode;
  switch (selected.id as Section) {
    case 'statistici': {
      const [stats, standing] = await Promise.all([owner.venueStats(db, userId, venue.id), owner.standing(db, userId, venue.id)]);
      content = <StatsPanel venueId={venue.id} venueName={venue.name} stats={stats} vertical={venue.vertical} afterScore={<StandingPanel standing={standing} vertical={venue.vertical} />} />;
      break;
    }
    case 'review-uri': {
      const page = await venuePage(db, { citySlug: venue.citySlug, vertical: venue.vertical, slug: venue.slug, reviews: 'all', limit: 50 });
      content = <ReviewsPanel venueId={venue.id} reviews={page.reviews} vertical={venue.vertical} />;
      break;
    }
    case 'blog': {
      const posts = await owner.postsForOwner(db, userId, venue.id);
      content = <BlogPanel venueId={venue.id} posts={posts} />;
      break;
    }
    case 'echipa': {
      const [team, ratings] = await Promise.all([owner.employeesForOwner(db, userId, venue.id), owner.employeeRatingsForOwner(db, userId, venue.id)]);
      content = <TeamPanel venueId={venue.id} team={team} ratings={ratings} vertical={venue.vertical} />;
      break;
    }
    case 'videouri': {
      const page = await venuePage(db, { citySlug: venue.citySlug, vertical: venue.vertical, slug: venue.slug, reviews: 'all', limit: 50 });
      content = <SocialLinks venueId={venue.id} venueName={venue.name} videos={page.videos} />;
      break;
    }
  }

  return (
    <div data-vertical={venue.vertical} className="pb-12">
      <Link href="/owner" className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-o-muted transition-colors hover:text-o-fg">
        <ChevronLeft size={17} aria-hidden="true" /> Localele tale
      </Link>
      <header className="mt-4 sm:mt-6">
        <div className="relative h-44 overflow-hidden rounded-[4px] sm:h-60">
          {/* poza localului, ca pe pagina lui publică */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" width={1200} height={480} fetchPriority="high" className="h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-[3px] bg-black/75 px-2.5 py-1 text-[12px] font-bold text-white sm:left-4 sm:top-4">
            Spațiul proprietarului · {isDrink ? 'TOP DRINK' : 'TOP FOOD'}
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-o-line pb-7 pt-5 sm:pb-9">
          <div className="min-w-0">
            <h1 className="font-display text-[46px] leading-[0.95] text-o-fg sm:text-[60px]">{venue.name}</h1>
            <p className="mt-3 text-[15px] text-o-muted">{meta ? `${meta}. ` : ''}Administrează-ți localul, într-un singur loc.</p>
          </div>
          <Link href={`/top${venue.vertical}/${venue.citySlug}?venue=${encodeURIComponent(venue.slug)}`} className={buttonClass('quiet')}>
            Vezi localul <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <div className="mt-0 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Secțiunile localului" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-o-line px-4 py-3 sm:mx-0 sm:px-0 lg:block lg:overflow-visible lg:border-b-0 lg:border-r lg:py-8 lg:pr-5">
          <p className="hidden px-3 pb-3 text-[12px] font-semibold text-o-muted lg:block">Administrare</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = id === selected.id;
            const href = id === 'statistici' ? `/owner/${venue.id}` : `/owner/${venue.id}/${id}`;
            return <Link key={id} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-[4px] px-3 text-[14px] font-semibold transition-colors lg:mb-1 ${active ? 'bg-o-active text-o-active-fg' : 'text-o-muted hover:bg-o-fg/[0.07] hover:text-o-fg'}`}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />{label}
            </Link>;
          })}
        </nav>
        <section aria-labelledby="dashboard-section-title" className="min-w-0 pt-8 sm:pt-10">
          <div className="mb-7 border-b border-o-line pb-6 sm:mb-8">
            <h2 id="dashboard-section-title" className="font-display text-[36px] leading-none text-o-fg sm:text-[40px]">{selected.label}</h2>
            <p className="mt-2 text-[15px] text-o-muted">{selected.description}</p>
          </div>
          {content}
        </section>
      </div>
    </div>
  );
}
