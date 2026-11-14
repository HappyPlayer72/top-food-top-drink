import {
  Accessibility,
  ArrowLeftRight,
  CircleCheck,
  CircleHelp,
  CircleMinus,
  CircleX,
  Laptop,
  MoonStar,
  MoveHorizontal,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Toilet,
  Users,
  Volume1,
  VolumeX,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { MIN_ANSWERS, quickWarnings, type Theme } from '@tftd/scoring/features';
import type { FeatureStatus, QuickStats, VenueFeatureGroup } from '../types';

const FEATURE_ICON: Record<string, LucideIcon> = {
  intrare_fara_trepte: Accessibility,
  toaleta_accesibila: Toilet,
  spatiu_intre_mese: MoveHorizontal,
  wifi: Wifi,
  prize: PlugZap,
  liniste: Volume1,
  atmosfera: Sparkles,
  siguranta: ShieldCheck,
  revin_cu_prietenii: Users,
};

export const THEME_ICON: Record<Theme, LucideIcon> = { accesibilitate: Accessibility, lucru: Laptop, iesiri: MoonStar };

/** Clasele care pun accentul temei (--tema, --tema-bg, --tema-ink din globals.css); `dark` = pe Sticlă (TOP DRINK). */
export const temaClass = (theme: string, dark: boolean) => `tema-${theme}${dark ? ' tema-sticla' : ''}`;

export type DisplayState = 'Da' | 'Nu' | 'Împărțit' | 'Nespecificat';

/** Doar afișare: starea dintr-o privire. Procentul brut al clienților: ≥ 70% Da, ≤ 30% Nu, între ele Împărțit. */
export function displayFeatureState(item: FeatureStatus): DisplayState {
  if (item.state === 'unknown') return 'Nespecificat';
  if (item.state === 'owner') return item.owner === 'yes' ? 'Da' : 'Nu';
  return item.percent >= 70 ? 'Da' : item.percent <= 30 ? 'Nu' : 'Împărțit';
}

const STATE_ICON: Record<DisplayState, LucideIcon> = { Da: CircleCheck, Nu: CircleX, Împărțit: CircleMinus, Nespecificat: CircleHelp };

const muted = (dark: boolean) => (dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]');
const comma = (x: number) => x.toFixed(1).replace('.', ',');

/** Sursa informației: clienți (chenar plin, oameni) sau localul (chenar punctat, prăvălie). Diferă prin formă, nu doar prin culoare. */
export function SourceTag({ kind, dark }: { kind: 'community' | 'owner'; dark: boolean }) {
  const Icon = kind === 'owner' ? Store : Users;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border text-[11px] font-semibold shrink-0 ${
        kind === 'owner'
          ? dark
            ? 'border-dashed border-[#F4EEE2]/60 text-[#F4EEE2]'
            : 'border-dashed border-[#6E5649] text-[#3A2418]'
          : dark
            ? 'border-[#2D5947] bg-[#1E4335] text-[#F4EEE2]'
            : 'border-[#E6DFD5] bg-white text-[#3A2418]'
      }`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {kind === 'owner' ? 'Declarat de local' : 'Clienți'}
    </span>
  );
}

function StateMark({ state, size = 'md' }: { state: DisplayState; size?: 'sm' | 'md' }) {
  const Icon = STATE_ICON[state];
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${size === 'sm' ? 'text-[12px]' : 'text-[14px]'}`}>
      <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0 ${state === 'Da' ? 'text-[var(--tema)]' : ''}`} aria-hidden="true" />
      {state}
    </span>
  );
}

/** Plăcuța mică din rândurile topurilor tematice: iconiță, fapt, stare, procent brut. Părintele pune clasa temei. */
export function FactChip({ fact, dark }: { fact: FeatureStatus; dark: boolean }) {
  if (fact.state === 'unknown') return null;
  const Icon = FEATURE_ICON[fact.key] ?? CircleHelp;
  const fromOwner = fact.state === 'owner';
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 max-w-full rounded-[3px] border px-1.5 py-0.5 text-[12px] ${fromOwner ? 'border-dashed' : ''} ${
        dark ? 'border-[#2D5947] text-[#F4EEE2]' : 'border-[#E6DFD5] bg-white text-[#3A2418]'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--tema)]" aria-hidden="true" />
      <span>{fact.label}:</span>
      <StateMark state={displayFeatureState(fact)} size="sm" />
      {fact.state !== 'owner' && <span className={`text-[11px] tabular-nums ${muted(dark)}`}>{fact.percent}%</span>}
      {fact.state !== 'community' && (
        <span className={`inline-flex items-center gap-0.5 text-[11px] ${muted(dark)}`}>
          <Store className="w-3 h-3" aria-hidden="true" />
          {fromOwner ? <span className="sr-only">declarat de local</span> : <span>localul: {fact.owner === 'yes' ? 'Da' : 'Nu'}</span>}
        </span>
      )}
    </span>
  );
}

function FeatureTile({ item, dark }: { item: FeatureStatus; dark: boolean }) {
  const Icon = FEATURE_ICON[item.key] ?? CircleHelp;
  const state = displayFeatureState(item);
  const unknown = item.state === 'unknown';
  return (
    <li
      className={`min-w-0 rounded-[4px] border p-2.5 space-y-1.5 ${item.state === 'owner' ? 'border-dashed' : ''} ${
        dark ? 'bg-[#122B22] border-[#2D5947]' : 'bg-white border-[#E6DFD5]'
      }`}
    >
      <div className="flex items-start gap-1.5 text-[13px] font-semibold leading-tight">
        <Icon className={`w-4 h-4 shrink-0 ${unknown ? muted(dark) : 'text-[var(--tema)]'}`} aria-hidden="true" />
        <span>{item.label}</span>
      </div>
      <div className={`flex items-baseline gap-1.5 flex-wrap ${unknown ? muted(dark) : ''}`}>
        <StateMark state={state} />
        {(item.state === 'community' || item.state === 'conflict') && (
          <span className={`text-[11px] tabular-nums ${muted(dark)}`}>{item.percent}% din clienți</span>
        )}
      </div>
      {!unknown && <SourceTag kind={item.state === 'owner' ? 'owner' : 'community'} dark={dark} />}
      {item.state === 'conflict' && (
        <div className="space-y-1 pt-1.5 border-t border-dashed border-current/20">
          <span className="flex items-center gap-1 text-[11px] font-semibold">
            <ArrowLeftRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            Surse diferite
          </span>
          <span className="flex items-center gap-1.5 flex-wrap text-[12px]">
            <SourceTag kind="owner" dark={dark} />
            <span className="font-semibold">{item.owner === 'yes' ? 'Da' : 'Nu'}</span>
          </span>
        </div>
      )}
    </li>
  );
}

function QuickTile({ icon: Icon, label, value, note, warn, dark }: { icon: LucideIcon; label: string; value: string | null; note?: string; warn?: boolean; dark: boolean }) {
  return (
    <li
      className={`min-w-0 rounded-[4px] border p-2.5 space-y-1 ${
        warn ? (dark ? 'border-[#FCA5A5]/60 bg-[#3B1D1D]/70' : 'border-[#F5C2C0] bg-[#FDECEC]') : dark ? 'bg-[#122B22] border-[#2D5947]' : 'bg-white border-[#E6DFD5]'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[13px] font-semibold">
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
        {label}
      </div>
      {value ? (
        <div className="text-[14px] font-semibold tabular-nums">
          {value}
          {note && <span className={`block text-[11px] font-normal ${muted(dark)}`}>{note}</span>}
        </div>
      ) : (
        <div className={`text-[12px] ${muted(dark)}`}>Prea puține voturi</div>
      )}
    </li>
  );
}

/**
 * Facilitățile localului ca plăcuțe: stare dintr-o privire (Da / Nu / Împărțit / Nespecificat), procentul brut mic,
 * sursa marcată prin formă. Frazele lunge stau în „De unde știm?”. Logica rămâne în @tftd/scoring/features.
 */
export function VenueFeatures({ groups, quick, dark }: { groups: VenueFeatureGroup[]; quick?: QuickStats; dark: boolean }) {
  const warn = quick ? quickWarnings(quick) : {};
  const explained = groups.flatMap((g) => g.items).filter((i) => i.state !== 'unknown');
  return (
    <div className="space-y-4">
      <section aria-label="Din voturile rapide" className="space-y-1.5">
        <h4 className="text-[13px] font-bold">Din voturile rapide</h4>
        <ul className="grid grid-cols-2 gap-2">
          <QuickTile
            icon={warn.unsafeFeeling ? ShieldAlert : ShieldCheck}
            label="Siguranță"
            value={quick?.safety ? `${comma(quick.safety.average)}/5` : null}
            note={quick?.safety ? `media din ${quick.safety.votes} voturi` : undefined}
            warn={!!warn.unsafeFeeling}
            dark={dark}
          />
          <QuickTile
            icon={quick?.noise && quick.noise.level >= 3 ? VolumeX : Volume1}
            label="Zgomot"
            value={quick?.noise ? `De obicei ${quick.noise.label.toLowerCase()}` : null}
            note={quick?.noise ? `din ${quick.noise.votes} voturi` : undefined}
            warn={!!warn.veryNoisy}
            dark={dark}
          />
        </ul>
      </section>

      {groups.map((g) => {
        const Icon = THEME_ICON[g.theme as Theme] ?? CircleHelp;
        return (
          <section key={g.theme} aria-label={g.label} className={`space-y-1.5 ${temaClass(g.theme, dark)}`}>
            <h4 className="flex items-center gap-1.5 text-[14px] font-bold">
              <Icon className="w-4 h-4 shrink-0 text-[var(--tema)]" aria-hidden="true" />
              {g.label}
            </h4>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {g.items.map((item) => (
                <FeatureTile key={item.key} item={item} dark={dark} />
              ))}
            </ul>
          </section>
        );
      })}

      <details className={`text-[12px] leading-snug ${muted(dark)}`}>
        <summary className={`cursor-pointer min-h-[44px] flex items-center font-semibold ${dark ? 'text-[#F4EEE2]' : 'text-[#3A2418]'}`}>De unde știm?</summary>
        <div className="space-y-1.5 pb-1">
          <p>
            Procentul vine din răspunsurile clienților la review-uri, de la {MIN_ANSWERS} răspunsuri Da/Nu; „Nu am observat” nu intră în calcul.
            De la 70% arătăm Da, până la 30% Nu, între ele Împărțit. Sub prag arătăm ce a declarat localul, cu chenar punctat.
          </p>
          {explained.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5">
              {explained.map((i) => (
                <li key={i.key}>
                  {i.label}: {i.text}
                  {i.state === 'conflict' ? `; ${i.ownerText.toLowerCase()}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
