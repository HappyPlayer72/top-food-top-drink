import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Bookmark, ChevronLeft, Link2, MessageSquareText, ShieldCheck, SlidersHorizontal, UserRound, Volume1, Vote, type LucideIcon } from 'lucide-react';
import { myQuickVotes, userProfile } from '@tftd/api';
import { users, venues } from '@tftd/db';
import { NOISE_LEVELS } from '@tftd/scoring/features';
import { LocalnicBadge } from '@/components/BrandPrimitives';
import { ProfileBadges } from '@/components/ProfileBadges';
import { AccountActions, PreferencesSection, SavedVenues, SocialAndTeamSection, VerificationSection } from '@/components/account/AccountClient';
import { HeroArt } from '@/components/owner/Doodles';
import { ThemeToggle } from '@/components/owner/ThemeToggle';
import { Avatar, EmptyState, StatStrip, Tag } from '@/components/owner/ui';
import { toUserAccount } from '@/lib/backend/user';
import { getDb } from '@/lib/server/db';
import { getUserId } from '@/lib/server/session';
import { formatScore } from '@/types';

export const metadata: Metadata = { title: 'Contul meu — topfood/timișoara', robots: { index: false } };
export const dynamic = 'force-dynamic';

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'profil', label: 'Profil și statut', icon: UserRound },
  { id: 'preferinte', label: 'Preferințe', icon: SlidersHorizontal },
  { id: 'activitate', label: 'Voturi și review-uri', icon: Vote },
  { id: 'salvate', label: 'Localuri salvate', icon: Bookmark },
  { id: 'linkuri', label: 'Linkuri și echipă', icon: Link2 },
  { id: 'cont', label: 'Cont', icon: ShieldCheck },
];

const venueHref = (v: { vertical: string; citySlug: string; slug: string }) => `/top${v.vertical}/${v.citySlug}/${encodeURIComponent(v.slug)}`;
const dateRo = (d: Date) => d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

/** Cartonaș de secțiune: iconiță, titlu condensat, o frază; fără umbre. */
function Card({ id, title, note, icon: Icon, children }: { id: string; title: string; note: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titlu`} className="scroll-mt-24 rounded-[4px] border border-o-line bg-o-bg p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-o-line text-o-fg">
          <Icon size={19} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-titlu`} className="font-display text-[28px] leading-none text-o-fg">
            {title}
          </h2>
          <p className="mt-1.5 text-[14px] text-o-muted">{note}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="owner-shell min-h-screen">
      <header className="border-b border-o-line bg-o-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/topfood/timisoara" className="inline-flex min-h-11 items-center gap-1.5 rounded-[4px] text-[14px] font-semibold text-o-muted hover:text-o-fg">
            <ChevronLeft size={17} aria-hidden="true" /> Înapoi la top
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main id="continut" className="mx-auto max-w-5xl px-4 py-8 pb-24">
        {children}
      </main>
    </div>
  );
}

export default async function AccountPage() {
  if (!process.env.DATABASE_URL)
    return (
      <Shell>
        <EmptyState title="Contul are nevoie de server" icon={<UserRound size={24} aria-hidden="true" />}>
          Pornește baza de date ca să vezi profilul, preferințele și voturile tale. Topurile merg și fără ea.
        </EmptyState>
      </Shell>
    );

  const userId = await getUserId();
  if (!userId) redirect('/topfood/timisoara?login=1');
  const db = getDb();
  const [user, [row], votes, allVenues] = await Promise.all([
    toUserAccount(db, userId),
    db.select({ username: users.username, localUntil: users.localUntil }).from(users).where(eq(users.id, userId)),
    myQuickVotes(db, userId),
    db.select({ id: venues.id, slug: venues.slug, name: venues.name, vertical: venues.vertical, citySlug: venues.citySlug, neighborhood: venues.neighborhood }).from(venues),
  ]);
  if (!user || !row) redirect('/topfood/timisoara?login=1');
  const profile = await userProfile(db, row.username);

  const isLocal = user.role === 'verified-local';
  const byId = new Map(allVenues.map((v) => [v.id, v]));
  const voteRows = Object.entries(votes).flatMap(([venueId, v]) => {
    const venue = byId.get(venueId);
    return venue ? [{ venue, safety: v.safety, noise: NOISE_LEVELS.find((l) => l.value === v.noise)?.label }] : [];
  });
  const saved = allVenues.map((v) => ({ id: v.slug, name: v.name, neighborhood: v.neighborhood, href: venueHref(v) }));

  return (
    <Shell>
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-o-line pb-7">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={user.name} outline={!isLocal} />
          <div className="min-w-0 space-y-2">
            <h1 className="font-display text-[44px] leading-[0.95] text-o-fg sm:text-[56px]">{user.name}</h1>
            {isLocal ? <LocalnicBadge label={`Localnic din ${user.neighborhood ?? 'Timișoara'}`} size="sm" /> : <Tag>Cont obișnuit</Tag>}
          </div>
        </div>
        <HeroArt className="hidden h-24 w-auto sm:block" />
      </header>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Secțiunile contului" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-o-line px-4 py-3 sm:mx-0 sm:px-0 lg:sticky lg:top-4 lg:block lg:self-start lg:border-b-0 lg:py-8">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`} className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-[4px] px-3 text-[14px] font-semibold text-o-muted transition-colors hover:bg-o-fg/[0.07] hover:text-o-fg lg:mb-1">
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>

        <div className="min-w-0 space-y-6 pt-6 lg:pt-8">
          <Card id="profil" title="Profil și statut" icon={UserRound} note={isLocal ? 'Ești localnic verificat: review-urile tale contează dublu.' : 'Review-urile tale contează normal. Localnicii verificați au pondere dublă.'}>
            <StatStrip
              items={[
                { value: `${formatScore(user.weightMultiplier)}×`, label: 'pondere' },
                { value: profile.reviews.length, label: profile.reviews.length === 1 ? 'review' : 'review-uri' },
                { value: voteRows.length, label: 'localuri votate' },
              ]}
            />
            <div className="mt-5 text-o-fg">
              <ProfileBadges tourBadges={profile.tourBadges} categoryBadges={profile.categoryBadges} mutedClass="text-o-muted" />
            </div>
            <div className="mt-5">
              {isLocal ? (
                <p className="text-[15px] text-o-fg">
                  Statutul e valabil{row.localUntil ? ` până pe ${dateRo(row.localUntil)}` : ''}. Îl păstrezi cu check-in-uri în Timișoara.
                </p>
              ) : (
                <VerificationSection />
              )}
            </div>
          </Card>

          <Card id="preferinte" title="Preferințe" icon={SlidersHorizontal} note="Ce te interesează: ordinea topurilor și întrebările din review-uri urmează alegerea ta.">
            <PreferencesSection user={user} />
          </Card>

          <Card id="activitate" title="Voturi și review-uri" icon={Vote} note="Ce ai spus despre localurile din Timișoara.">
            <h3 className="mb-2 text-[15px] font-bold text-o-fg">Voturile mele</h3>
            {voteRows.length ? (
              <ul className="mb-6 divide-y divide-o-line border-y border-o-line">
                {voteRows.map(({ venue, safety, noise }) => (
                  <li key={venue.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                    <Link href={venueHref(venue)} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-o-fg underline-offset-4 hover:underline">
                      {venue.name}
                    </Link>
                    <span className="flex flex-wrap gap-2">
                      {safety != null && (
                        <Tag icon={<ShieldCheck size={14} aria-hidden="true" />}>
                          Siguranță {safety}/5
                        </Tag>
                      )}
                      {noise && <Tag icon={<Volume1 size={14} aria-hidden="true" />}>{noise}</Tag>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-6 text-[14px] text-o-muted">Încă n-ai votat. Pe pagina unui local răspunzi la „Te-ai simțit în siguranță?” și „E liniște?”.</p>
            )}

            <h3 className="mb-2 text-[15px] font-bold text-o-fg">Review-urile mele</h3>
            {profile.reviews.length ? (
              <ul className="divide-y divide-o-line border-y border-o-line">
                {profile.reviews.map((r) => (
                  <li key={r.id} className="space-y-1 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link href={venueHref(r.venue)} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-o-fg underline-offset-4 hover:underline">
                        {r.venue.name}
                      </Link>
                      <span className="text-[13px] text-o-muted">
                        <span className="font-semibold text-o-fg tabular-nums">{formatScore(r.rating)}</span>/10 · {dateRo(r.postedAt)}
                      </span>
                    </div>
                    {r.text && <p className="line-clamp-2 text-[14px] text-o-muted">{r.text}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Niciun review încă" icon={<MessageSquareText size={24} aria-hidden="true" />}>
                Scrie primul tău review din pagina unui local.
              </EmptyState>
            )}
          </Card>

          <Card id="salvate" title="Localuri salvate" icon={Bookmark} note="Lista ta de localuri, salvată în cont.">
            <SavedVenues venues={saved} serverSlugs={user.savedVenueSlugs} />
          </Card>

          <Card id="linkuri" title="Linkuri și echipă" icon={Link2} note="Conturile sociale verificate și invitațiile de la localurile unde lucrezi.">
            <SocialAndTeamSection user={user} />
          </Card>

          <Card id="cont" title="Cont" icon={ShieldCheck} note={user.email ? `Conectat ca ${user.email}.` : 'Conectat.'}>
            <AccountActions email={user.email} />
          </Card>
        </div>
      </div>
    </Shell>
  );
}
