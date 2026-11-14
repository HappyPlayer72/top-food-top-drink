'use client';

import { useState } from 'react';
import { ShieldCheck, Volume1, VolumeX } from 'lucide-react';
import { INTERESTS, isNoisy, orderTops, quickNoiseText, quickSafetyText, type TopKey } from '@tftd/scoring/features';
import type { Restaurant, ThemeTop, ThemeTopEntry } from '../types';
import { DrinkFeaturedCard, DrinkRow, FoodFeaturedCard, FoodRow } from './VenueCards';
import { FactChip, SourceTag, THEME_ICON, temaClass } from './VenueFeatures';

const TAB_LABEL: Record<TopKey, string> = {
  general: 'General',
  accesibilitate: 'Accesibilitate',
  lucru: 'Locuri pentru lucru',
  iesiri: 'Ieșiri',
};

/** Butoanele de topuri (comutatoare, aria-pressed); ordinea urmează preferințele, dar toate rămân vizibile. */
export function TopTabs({
  themes,
  interests,
  active,
  onChange,
  dark,
}: {
  themes: ThemeTop[];
  interests: readonly string[];
  active: TopKey;
  onChange: (k: TopKey) => void;
  dark: boolean;
}) {
  const available = new Set<TopKey>(['general', ...themes.map((t) => t.theme)]);
  const tabs = orderTops(interests).filter((k) => available.has(k));
  if (tabs.length < 2) return null;
  return (
    <div className="space-y-1.5">
      <div role="group" aria-label="Alege topul" className="no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto">
        {tabs.map((k) => {
          const selected = k === active;
          const Icon = k === 'general' ? null : THEME_ICON[k];
          return (
            <button
              key={k}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(k)}
              className={`btn-press min-h-[44px] shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border text-[13px] font-semibold whitespace-nowrap ${
                k === 'general' ? '' : temaClass(k, dark)
              } ${
                selected
                  ? dark
                    ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                    : 'bg-[#3A2418] border-[#3A2418] text-white'
                  : dark
                    ? 'bg-transparent border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                    : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              {Icon && <Icon className={`w-4 h-4 shrink-0 ${selected ? '' : 'text-[var(--tema)]'}`} aria-hidden="true" />}
              {TAB_LABEL[k]}
            </button>
          );
        })}
      </div>
      {interests.some((i) => i !== 'mancare') && (
        <p className={`text-[12px] ${dark ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'}`}>Ordinea topurilor urmează preferințele tale.</p>
      )}
    </div>
  );
}

/**
 * Un top tematic în stilul topului General (card mare pentru locul 1, rânduri ilustrate), cu faptele temei în locul
 * textului editorial: întâi ce au confirmat clienții (cu rang), apoi separat ce au declarat localurile (fără rang).
 */
export function ThemeTopList({ top, venues, onSelect, dark }: { top: ThemeTop; venues: Restaurant[]; onSelect: (slug: string) => void; dark: boolean }) {
  const muted = dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]';
  // „Doar liniștite” (topul Lucru): ascunde ce vizitatorii votează de obicei Animat sau Zgomotos; nu reordonează.
  const [onlyQuiet, setOnlyQuiet] = useState(false);
  const quietFilter = top.theme === 'lucru' && onlyQuiet;
  const community = quietFilter ? top.community.filter((v) => !isNoisy(v.quick)) : top.community;
  const declared = quietFilter ? top.declared.filter((v) => !isNoisy(v.quick)) : top.declared;
  const bySlug = new Map(venues.map((v) => [v.slug, v]));
  const line = dark ? 'divide-[#285443] border-[#285443]' : 'divide-[#E6DFD5] border-[#E6DFD5]';
  const Icon = THEME_ICON[top.theme];
  const hint = INTERESTS.find((i) => i.key === top.theme)?.hint;
  const [first, ...rest] = community;
  const firstVenue = first && bySlug.get(first.slug);
  const Featured = dark ? DrinkFeaturedCard : FoodFeaturedCard;

  const row = (entry: ThemeTopEntry, idx: number, rank?: number) => {
    const venue = bySlug.get(entry.slug);
    const facts = <EntryFacts entry={entry} theme={top.theme} dark={dark} declaredOnly={rank === undefined} />;
    const Row = dark ? DrinkRow : FoodRow;
    return (
      <li key={entry.slug}>
        {venue ? (
          <Row venue={venue} rank={rank} staggerIdx={Math.min(idx + 1, 6)} themed onSelect={() => onSelect(entry.slug)}>
            {facts}
          </Row>
        ) : (
          // Fără date de afișare (poză, scor) pentru slug: rând simplu, tot cu faptele temei.
          <button type="button" onClick={() => onSelect(entry.slug)} className="btn-press w-full text-left py-3.5 flex gap-3 items-start">
            <span className="font-display text-[22px] leading-none w-5 shrink-0 text-[var(--tema)]">{rank}</span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block font-bold text-[16px]">{entry.name}</span>
              {entry.neighborhood && <span className={`block text-[12px] ${muted}`}>{entry.neighborhood}</span>}
              {facts}
            </span>
          </button>
        )}
      </li>
    );
  };

  return (
    <section aria-label={`Top: ${top.label}`} className={`space-y-5 ${temaClass(top.theme, dark)}`}>
      {/* Titlul „Top: …” e deasupra (EditorialListView); aici doar semnul temei și ce urmărim. */}
      <div className="flex items-center gap-3 rounded-[4px] border-l-[3px] border-[var(--tema)] bg-[var(--tema-bg)] p-3.5">
        <span className="w-10 h-10 shrink-0 rounded-[4px] bg-[var(--tema)] text-[var(--tema-ink)] flex items-center justify-center" aria-hidden="true">
          <Icon className="w-5 h-5" />
        </span>
        <p className={`min-w-0 text-[13px] leading-snug ${dark ? 'text-[#F4EEE2]' : 'text-[#3A2418]'}`}>
          {hint && <span className="font-semibold">{hint}. </span>}
          <span className={muted}>Ce spun clienții, separat de ce declară localul.</span>
        </p>
      </div>

      <details className={`rounded-[4px] border p-3.5 text-[12px] leading-relaxed ${dark ? 'bg-[#143025] border-[#2D5947]' : 'bg-[#FAF8F5] border-[#E6DFD5]'}`}>
        <summary className={`cursor-pointer font-semibold min-h-[32px] flex items-center ${dark ? 'text-[#F2A33A]' : 'text-[#3A2418]'}`}>
          Cum ordonăm topul „{top.label}”?
        </summary>
        <div className="mt-2 space-y-1.5">
          <p>
            Clienții răspund cu Da, Nu sau Nu am observat când scriu un review. Procentul afișat e cel brut: Da / (Da + Nu); „Nu am observat” nu
            intră în calcul.
          </p>
          <p>
            Ordinea ține cont și de câte răspunsuri sunt și de cât de credibili sunt cei care răspund (aceeași pondere ca la Scorul Onest), așa
            că un singur „Da” nu aduce primul loc. O întrebare fără răspunsuri nu e considerată „Da”.
          </p>
          <p>Localurile cu prea puține răspunsuri apar separat, după ce au declarat ele însele. Plata și „Sponsorizat” nu schimbă ordinea.</p>
        </div>
      </details>

      {top.theme === 'lucru' && (
        <div className="space-y-1">
          <button
            type="button"
            aria-pressed={onlyQuiet}
            onClick={() => setOnlyQuiet((v) => !v)}
            className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 px-3.5 rounded-[4px] border text-[13px] font-semibold ${
              onlyQuiet
                ? dark
                  ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] border-[#3A2418] text-white'
                : dark
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
            }`}
          >
            <Volume1 className="w-4 h-4 shrink-0" aria-hidden="true" />
            Doar liniștite
          </button>
          {onlyQuiet && <p className={`text-[12px] ${muted}`}>Ascundem localurile votate de obicei „Animat” sau „Zgomotos”. Cele cu prea puține voturi rămân.</p>}
        </div>
      )}

      <section aria-label={`${top.label}: evaluat de clienți`} className="space-y-3">
        <h3 className="text-[15px] font-bold">Evaluat de clienți</h3>
        {first ? (
          <>
            {firstVenue ? (
              <Featured
                venue={firstVenue}
                themed
                onSelect={() => onSelect(first.slug)}
                badge={
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[var(--tema)] text-[var(--tema-ink)] font-bold text-[11px] leading-none">
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />#1 la {top.label.toLowerCase()}
                  </span>
                }
              >
                <EntryFacts entry={first} theme={top.theme} dark={dark} />
              </Featured>
            ) : (
              <ol className={`divide-y border-y ${line}`}>{row(first, 0, first.rank)}</ol>
            )}
            {rest.length > 0 && (
              <ol start={2} className={`divide-y border-t ${line}`}>
                {rest.map((v, idx) => row(v, idx + 1, v.rank))}
              </ol>
            )}
          </>
        ) : (
          <p className={`text-[13px] ${muted}`}>
            Încă nu avem destule răspunsuri de la clienți. Când scrii un review, poți răspunde la întrebările despre {top.label.toLowerCase()}.
          </p>
        )}
      </section>

      {declared.length > 0 && (
        <section aria-label={`${top.label}: declarat de local`} className="space-y-2">
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold flex items-center gap-2 flex-wrap">
              Declarat de local <SourceTag kind="owner" dark={dark} />
            </h3>
            <p className={`text-[12px] ${muted}`}>Fără loc în top: au încă prea puține răspunsuri de la clienți. Informația vine de la local și nu e confirmată de comunitate.</p>
          </div>
          <ul className={`divide-y border-t ${line}`}>{declared.map((v, idx) => row(v, idx))}</ul>
        </section>
      )}
    </section>
  );
}

/** Faptele temei ca plăcuțe (procent brut, sursă) + linia de vot rapid: siguranța la Ieșiri, zgomotul la Lucru. */
function EntryFacts({ entry, theme, dark, declaredOnly }: { entry: ThemeTopEntry; theme: string; dark: boolean; declaredOnly?: boolean }) {
  const muted = dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]';
  const shown = entry.facts.filter((f) => f.state !== 'unknown');
  const quickLine = theme === 'iesiri' ? quickSafetyText(entry.quick) : theme === 'lucru' ? quickNoiseText(entry.quick) : null;
  const QuickIcon = theme === 'iesiri' ? ShieldCheck : isNoisy(entry.quick) ? VolumeX : Volume1;
  return (
    <span className="flex flex-wrap items-center gap-1.5 pt-1">
      {declaredOnly && <span className="sr-only">Declarat de local, fără loc în top.</span>}
      {shown.map((f) => (
        <FactChip key={f.key} fact={f} dark={dark} />
      ))}
      {quickLine && (
        <span className={`inline-flex items-center gap-1 text-[12px] ${muted}`}>
          <QuickIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {quickLine} (vot rapid)
        </span>
      )}
    </span>
  );
}
