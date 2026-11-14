import type { BadgeLevel, CategoryBadge } from '@tftd/api';
import { CATEGORY_BADGE_LEVELS } from '@tftd/api/tours';
import { CATEGORY_LABELS } from '@/lib/backend/venueRoute';

const LEVELS: Record<BadgeLevel, { label: string; className: string }> = {
  bronze: { label: 'Bronz', className: 'bg-[#A0612B] text-white' },
  // Nuanțe închise: text alb cu contrast ≥ 4,5:1.
  silver: { label: 'Argint', className: 'bg-[#5C6770] text-white' },
  gold: { label: 'Aur', className: 'bg-[#8A6508] text-white' },
};
const categoryLabel = (slug: string) => CATEGORY_LABELS.food[slug] ?? CATEGORY_LABELS.drink[slug] ?? slug;
const day = (d: Date) => new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Bucharest' }).format(new Date(d));

/** Ștampilele de pașaport (tururi tematice) și etichetele pe categorii, pentru /u/[username] și /cont. */
export function ProfileBadges({ tourBadges, categoryBadges, mutedClass }: {
  tourBadges: { slug: string; name: string; completedAt: Date }[];
  categoryBadges: CategoryBadge[];
  mutedClass: string;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-[15px] font-bold">Ștampile de tur</h3>
        {tourBadges.length ? (
          <ul className="flex flex-wrap gap-4">
            {tourBadges.map((b, i) => (
              <li key={b.slug} style={{ rotate: `${i % 2 ? 4 : -5}deg` }} className="flex size-28 flex-col items-center justify-center rounded-full border-[3px] border-double border-current p-2 text-center opacity-90">
                <span className="text-[9px] font-bold uppercase tracking-widest">Tasting Tour</span>
                <span className="font-display text-[17px] leading-[1.05]">{b.name}</span>
                <span className="text-[10px] font-semibold">{day(b.completedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-[14px] ${mutedClass}`}>Încă nicio ștampilă. Se primesc la tururile tematice din Tasting Tour, cu check-in la fiecare oprire.</p>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-[15px] font-bold">Insigne pe categorii</h3>
        {categoryBadges.length ? (
          <ul className="flex flex-wrap gap-2">
            {categoryBadges.map((b) => (
              <li key={b.category} className="inline-flex items-stretch overflow-hidden rounded-[4px] border border-current/25 text-[13px] font-semibold">
                <span className={`px-2 py-1 font-bold ${LEVELS[b.level].className}`}>{LEVELS[b.level].label}</span>
                <span className="px-2 py-1">{categoryLabel(b.category)} · {b.venues} {b.venues === 1 ? 'local' : 'localuri'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-[14px] ${mutedClass}`}>
            Bronz la {CATEGORY_BADGE_LEVELS.bronze} localuri diferite dintr-o categorie, Argint la {CATEGORY_BADGE_LEVELS.silver}, Aur la {CATEGORY_BADGE_LEVELS.gold} cu vizită verificată.
          </p>
        )}
      </div>
    </div>
  );
}
