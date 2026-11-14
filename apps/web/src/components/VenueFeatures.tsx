import { MIN_ANSWERS } from '@tftd/scoring/features';
import type { FeatureStatus, VenueFeatureGroup } from '../types';

/**
 * Facilitățile localului cu sursa fiecărei informații. Procentul comunității apare doar de la prag;
 * declarația owner-ului nu e prezentată niciodată ca procent al clienților.
 */
export function VenueFeatures({ groups, dark }: { groups: VenueFeatureGroup[]; dark: boolean }) {
  const muted = dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]';
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.theme} className="space-y-1.5">
          <h4 className="text-[13px] font-bold">{g.label}</h4>
          <ul className="space-y-1.5">
            {g.items.map((item) => (
              <FeatureRow key={item.key} item={item} dark={dark} />
            ))}
          </ul>
        </div>
      ))}
      <p className={`text-[12px] leading-snug ${muted}`}>
        Procentul vine din răspunsurile clienților la review-uri, de la {MIN_ANSWERS} răspunsuri Da/Nu; „Nu am observat” nu intră în calcul.
        Sub prag arătăm ce a declarat localul, marcat separat.
      </p>
    </div>
  );
}

export function SourceTag({ kind, dark }: { kind: 'community' | 'owner'; dark: boolean }) {
  const label = kind === 'community' ? 'Clienți' : 'Declarat de local';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] border text-[11px] font-semibold shrink-0 ${
        kind === 'owner'
          ? dark
            ? 'border-[#F4EEE2]/50 text-[#F4EEE2] border-dashed'
            : 'border-[#6E5649] text-[#3A2418] border-dashed'
          : dark
            ? 'border-[#2D5947] bg-[#1E4335] text-[#F4EEE2]'
            : 'border-[#E6DFD5] bg-white text-[#3A2418]'
      }`}
    >
      {label}
    </span>
  );
}

function FeatureRow({ item, dark }: { item: FeatureStatus; dark: boolean }) {
  const box = `text-[13px] px-3 py-2 rounded-[4px] border ${dark ? 'bg-[#122B22] border-[#285443]' : 'bg-white border-[#E6DFD5]'}`;
  const muted = dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]';
  return (
    <li className={box}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{item.label}</span>
        {item.state === 'unknown' ? <span className={muted}>Nespecificat</span> : null}
      </div>
      {item.state === 'community' || item.state === 'conflict' ? (
        <p className="mt-1 flex items-start gap-2">
          <SourceTag kind="community" dark={dark} />
          <span>{item.text}</span>
        </p>
      ) : null}
      {item.state === 'owner' || item.state === 'conflict' ? (
        <p className="mt-1 flex items-start gap-2">
          <SourceTag kind="owner" dark={dark} />
          {/* Eticheta spune deja sursa; aici doar ce a declarat localul. */}
          <span>{item.owner === 'yes' ? 'Da' : 'Nu'}</span>
        </p>
      ) : null}
      {item.state === 'conflict' ? <p className={`mt-1 text-[12px] ${muted}`}>Sursele nu spun același lucru; le arătăm pe amândouă.</p> : null}
    </li>
  );
}
