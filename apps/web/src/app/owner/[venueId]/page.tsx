import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { owner, venuePage } from '@tftd/api';
import { BlogPanel } from '@/components/owner/BlogPanel';
import { ReviewsPanel } from '@/components/owner/ReviewsPanel';
import { StatsPanel } from '@/components/owner/StatsPanel';
import { TeamPanel } from '@/components/owner/TeamPanel';
import { Panel } from '@/components/owner/ui';
import { SocialLinks } from '@/components/SocialLinks';
import { getDb } from '@/lib/server/db';
import { getUserId } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

const SECTIONS = [
  ['statistici', 'Statistici'],
  ['review-uri', 'Review-uri'],
  ['blog', 'Blog'],
  ['echipa', 'Echipa'],
  ['videouri', 'Videouri'],
] as const;

export default async function VenueDashboard({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const userId = await getUserId();
  if (!userId) redirect('/owner');

  const db = getDb();
  // Accesul: doar localele pe care userul le administrează (altfel 404, fără să confirmăm că localul există).
  const venue = (await owner.managedVenues(db, userId)).find((v) => v.id === venueId);
  if (!venue) notFound();

  const [stats, page, posts, team, ratings] = await Promise.all([
    owner.venueStats(db, userId, venue.id),
    venuePage(db, { citySlug: venue.citySlug, vertical: venue.vertical, slug: venue.slug, reviews: 'all', limit: 50 }),
    owner.postsForOwner(db, userId, venue.id),
    owner.employeesForOwner(db, userId, venue.id),
    owner.employeeRatingsForOwner(db, userId, venue.id),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/owner" className="inline-flex min-h-11 items-center text-[14px] hover:underline">
          ← Localele tale
        </Link>
        <h1 className="font-display text-[44px] leading-none">{venue.name}</h1>
        <nav aria-label="Secțiuni" className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-[4px] border border-hairline px-3 text-[14px] font-semibold hover:border-cafea">
              {label}
            </a>
          ))}
        </nav>
      </div>

      <Panel id="statistici" title="Statistici">
        <StatsPanel venueId={venue.id} venueName={venue.name} stats={stats} />
      </Panel>
      <Panel id="review-uri" title="Review-uri">
        <ReviewsPanel venueId={venue.id} reviews={page.reviews} />
      </Panel>
      <Panel id="blog" title="Blogul localului">
        <BlogPanel venueId={venue.id} posts={posts} />
      </Panel>
      <Panel id="echipa" title="Echipa">
        <TeamPanel venueId={venue.id} team={team} ratings={ratings} />
      </Panel>
      <Panel id="videouri" title="Videouri despre local">
        <SocialLinks venueId={venue.id} venueName={venue.name} videos={page.videos} />
      </Panel>
    </div>
  );
}
