'use client';

import { useState } from 'react';
import { isNoisy, orderTops, quickNoiseText, quickSafetyText, type TopKey } from '@tftd/scoring/features';
import type { FeatureStatus, ThemeTop, ThemeTopEntry } from '../types';
import { SourceTag } from './VenueFeatures';

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
          return (
            <button
              key={k}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(k)}
              className={`btn-press min-h-[44px] shrink-0 px-3.5 py-2 rounded-[4px] border text-[13px] font-semibold whitespace-nowrap ${
                selected
                  ? dark
                    ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                    : 'bg-[#3A2418] border-[#3A2418] text-white'
                  : dark
                    ? 'bg-transparent border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                    : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
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

/** Un top tematic: întâi ce au confirmat clienții, apoi separat ce au declarat localurile. */
export function ThemeTopList({ top, onSelect, dark }: { top: ThemeTop; onSelect: (slug: string) => void; dark: boolean }) {
  const muted = dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]';
  // „Doar liniștite” (topul Lucru): ascunde ce vizitatorii votează de obicei Animat sau Zgomotos; nu reordonează.
  const [onlyQuiet, setOnlyQuiet] = useState(false);
  const quietFilter = top.theme === 'lucru' && onlyQuiet;
  const community = quietFilter ? top.community.filter((v) => !isNoisy(v.quick)) : top.community;
  const declared = quietFilter ? top.declared.filter((v) => !isNoisy(v.quick)) : top.declared;
  const line = dark ? 'border-[#285443]' : 'border-[#E6DFD5]';
  return (
    <section aria-label={`Top: ${top.label}`} className="space-y-5">
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
            className={`btn-press min-h-[44px] px-3.5 rounded-[4px] border text-[13px] font-semibold ${
              onlyQuiet
                ? dark
                  ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] border-[#3A2418] text-white'
                : dark
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
            }`}
          >
            Doar liniștite
          </button>
          {onlyQuiet && <p className={`text-[12px] ${muted}`}>Ascundem localurile votate de obicei „Animat” sau „Zgomotos”. Cele cu prea puține voturi rămân.</p>}
        </div>
      )}

      <section aria-label={`${top.label}: evaluat de clienți`} className="space-y-2">
        <h3 className="text-[15px] font-bold">Evaluat de clienți</h3>
        {community.length ? (
          <ol className={`divide-y ${dark ? 'divide-[#285443]' : 'divide-[#E6DFD5]'} border-y ${line}`}>
            {community.map((v) => (
              <EntryRow key={v.slug} entry={v} rank={v.rank} onSelect={onSelect} dark={dark} theme={top.theme} />
            ))}
          </ol>
        ) : (
          <p className={`text-[13px] ${muted}`}>
            Încă nu avem destule răspunsuri de la clienți. Când scrii un review, poți răspunde la întrebările despre {top.label.toLowerCase()}.
          </p>
        )}
      </section>

      {declared.length > 0 && (
        <section aria-label={`${top.label}: declarat de local`} className="space-y-2">
          <div>
            <h3 className="text-[15px] font-bold">Declarat de local</h3>
            <p className={`text-[12px] ${muted}`}>Încă au prea puține răspunsuri de la clienți. Informația vine de la local și nu e confirmată de comunitate.</p>
          </div>
          <ul className={`divide-y ${dark ? 'divide-[#285443]' : 'divide-[#E6DFD5]'} border-y ${line}`}>
            {declared.map((v) => (
              <EntryRow key={v.slug} entry={v} onSelect={onSelect} dark={dark} theme={top.theme} declaredOnly />
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function EntryRow({ entry, rank, onSelect, dark, theme, declaredOnly }: { entry: ThemeTopEntry; rank?: number; onSelect: (slug: string) => void; dark: boolean; theme: string; declaredOnly?: boolean }) {
  const muted = dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]';
  const shown = entry.facts.filter((f) => f.state !== 'unknown');
  // Voturile rapide doar ca informație: siguranța la Ieșiri, zgomotul la Lucru.
  const quickLine = theme === 'iesiri' ? quickSafetyText(entry.quick) : theme === 'lucru' ? quickNoiseText(entry.quick) : null;
  return (
    <li>
      <button type="button" onClick={() => onSelect(entry.slug)} className={`btn-press w-full text-left py-3 flex gap-3 items-start ${dark ? 'hover:bg-[#143025]' : 'hover:bg-[#FAF8F5]'}`}>
        {rank ? (
          <span className={`font-display text-[28px] leading-none tabular-nums w-8 shrink-0 ${dark ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}>{rank}</span>
        ) : (
          <span className="w-8 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-[22px] leading-none">{entry.name}</span>
            {declaredOnly && <SourceTag kind="owner" dark={dark} />}
          </span>
          {entry.neighborhood && <span className={`block text-[12px] ${muted}`}>{entry.neighborhood}</span>}
          <span className="block space-y-0.5">
            {shown.map((f) => (
              <Fact key={f.key} fact={f} dark={dark} />
            ))}
            {quickLine && <span className={`block text-[13px] ${muted}`}>{quickLine} (vot rapid)</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function Fact({ fact, dark }: { fact: FeatureStatus; dark: boolean }) {
  const muted = dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]';
  if (fact.state === 'community') return <span className="block text-[13px]">{fact.text}</span>;
  if (fact.state === 'owner') return <span className={`block text-[13px] ${muted}`}>{fact.label}: {fact.owner === 'yes' ? 'Da' : 'Nu'} (declarat de local)</span>;
  if (fact.state === 'conflict')
    return (
      <span className="block text-[13px]">
        {fact.text} <span className={muted}>· localul declară {fact.owner === 'yes' ? 'Da' : 'Nu'}</span>
      </span>
    );
  return null;
}
