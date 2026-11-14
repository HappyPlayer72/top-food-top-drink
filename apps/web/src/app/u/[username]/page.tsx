import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, ChevronLeft, ExternalLink, House, ShieldCheck, Star } from 'lucide-react';
import { userProfile } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { TOP_LOCAL_REVIEWERS } from '@/data/restaurants';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ username: string }> };

type ProfileData = Awaited<ReturnType<typeof userProfile>>;

async function loadProfile(username: string): Promise<ProfileData | null> {
  if (process.env.DATABASE_URL) {
    try {
      return await userProfile(getDb(), username);
    } catch {
      // fallback doar dacă baza e offline sau userul e din seed-ul static
    }
  }
  const staticMatch = TOP_LOCAL_REVIEWERS.find(
    (r) => r.id.toLowerCase() === username.toLowerCase() || (r.username?.toLowerCase() === username.toLowerCase())
  );
  if (!staticMatch) return null;
  return {
    username: staticMatch.username ?? staticMatch.id,
    displayName: staticMatch.name,
    avatarUrl: null,
    roles: staticMatch.role === 'influencer' ? ['user', 'influencer'] : ['user', 'local'],
    local: staticMatch.role === 'verified-local'
      ? { citySlug: 'timisoara', neighborhood: staticMatch.badgeLabel.replace(/^Localnic din\s+/i, '') }
      : null,
    followers: null,
    socialLinks: [],
    reviews: [],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const username = decodeURIComponent((await params).username);
  const p = await loadProfile(username);
  if (!p) return { title: 'Profil negăsit | topfood/timișoara' };
  return {
    title: `${p.displayName} (@${p.username}) | topfood/timișoara`,
    description: `Profilul și review-urile publicate de ${p.displayName} pe topfood/timișoara și topdrink/timișoara.`,
    alternates: { canonical: `/u/${encodeURIComponent(p.username)}` },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const username = decodeURIComponent((await params).username);
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const isLocal = !!profile.local;
  const isInfluencer = profile.roles.includes('influencer');
  const initials = profile.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="doodle-wallpaper min-h-screen px-4 py-8 sm:px-6 text-cafea">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/topfood/timisoara"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-cafea/20 bg-hartie text-cafea hover:border-cafea"
            aria-label="Înapoi la topfood/timișoara"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm text-cafea-deschis">
            u/<strong className="text-cafea">{profile.username}</strong>
          </span>
        </div>

        <section className="rounded-[6px] border border-cafea/15 bg-hartie p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className="h-16 w-16 rounded-full object-cover border border-cafea/15" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cafea text-xl font-bold text-hartie">
                {initials}
              </div>
            )}
            <div className="space-y-1">
              <h1 className="font-display text-3xl sm:text-4xl leading-none">{profile.displayName}</h1>
              <p className="text-sm text-cafea-deschis">@{profile.username}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isLocal && (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[var(--localnic-soft)] px-2.5 py-1 text-xs font-bold text-[var(--localnic)]">
                <House className="h-3.5 w-3.5" aria-hidden="true" />
                Localnic verificat{profile.local?.neighborhood ? ` · ${profile.local.neighborhood}` : ''} (2,0×)
              </span>
            )}
            {isInfluencer && (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-carou/12 px-2.5 py-1 text-xs font-bold text-carou">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Influencer{profile.followers ? ` · ${profile.followers.toLocaleString('ro-RO')} urmăritori` : ''}
              </span>
            )}
            {!isLocal && !isInfluencer && (
              <span className="inline-flex items-center rounded-[4px] border border-cafea/20 px-2.5 py-1 text-xs font-semibold text-cafea-deschis">
                Membru al comunității
              </span>
            )}
          </div>

          {profile.socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.socialLinks.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[4px] border border-cafea/20 bg-white px-3 py-1.5 text-xs font-semibold hover:border-cafea"
                >
                  <span className="uppercase">{s.platform}</span>
                  {s.followers ? <span className="text-cafea-deschis">({s.followers.toLocaleString('ro-RO')})</span> : null}
                  {s.verified && <CheckCircle2 className="h-3.5 w-3.5 text-patrunjel" aria-label="Cont verificat" />}
                  <ExternalLink className="h-3 w-3 text-cafea-deschis" />
                </a>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="recenzii-profil" className="space-y-4">
          <h2 id="recenzii-profil" className="font-display text-2xl">
            Review-uri publicate ({profile.reviews.length})
          </h2>
          {profile.reviews.length === 0 ? (
            <p className="rounded-[6px] border border-cafea/15 bg-hartie p-5 text-sm text-cafea-deschis">
              Acest utilizator nu are încă review-uri publice.
            </p>
          ) : (
            <ul className="space-y-3">
              {profile.reviews.map((rev) => (
                <li key={rev.id} className="rounded-[6px] border border-cafea/15 bg-hartie p-5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/top${rev.venue.vertical}/timisoara/${encodeURIComponent(rev.venue.slug)}`}
                      className="font-display text-xl text-cafea hover:text-carou hover:underline"
                    >
                      {rev.venue.name}
                    </Link>
                    <span className="inline-flex items-center gap-1 rounded bg-cafea px-2 py-0.5 text-sm font-bold text-hartie tabular-nums">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      {rev.rating}/10
                    </span>
                  </div>
                  {rev.text && <p className="text-sm leading-relaxed text-cafea/90">{rev.text}</p>}
                  <p className="text-xs text-cafea-deschis">
                    {new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeZone: 'Europe/Bucharest' }).format(new Date(rev.postedAt))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
