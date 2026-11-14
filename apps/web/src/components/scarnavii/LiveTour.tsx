'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Flag, LocateFixed, MapPin, Star, X } from 'lucide-react';
import type { ThemedTour } from '@tftd/api/tours';
import type { TasteTourStop } from './tasteTourLogic';
import { checkInAtVenue, finishThemedTour } from '../../app/actions/visits';
import { reviewFormToken, submitReview } from '../../app/actions/user';

/** Clasele de culoare din TasteTour (food / drink). */
export type TourUi = { panel: string; input: string; primary: string; muted: string; border: string; selected: string };

/** null = încă nu, 'checkin' = check-in verificat pe server, 'manual' = „am ajuns” fără check-in. */
type Reached = null | 'checkin' | 'manual';
type Progress = { startedAt: number; current: number; reached: Reached[]; finished: boolean };

/** Turul pornit, salvat în browser: pe telefon tab-ul se poate închide cât ești în Google Maps. */
export type SavedLiveTour = Progress & {
  themedSlug: string | null;
  stops: { restaurantId: string; item: TasteTourStop['item']; category: TasteTourStop['category'] }[];
};
const STORAGE_KEY = 'tftd:live-tour:v1';
const MAX_AGE_MS = 12 * 3_600_000;

export function loadLiveTour(): SavedLiveTour | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as SavedLiveTour | null;
    if (!saved) return null;
    if (Date.now() - saved.startedAt > MAX_AGE_MS || !Array.isArray(saved.stops) || saved.reached?.length !== saved.stops.length) {
      clearLiveTour();
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}
export function clearLiveTour() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage blocat: nu e nimic de șters */ }
}

interface LiveTourProps {
  stops: TasteTourStop[];
  themed: ThemedTour | null;
  signedIn: boolean;
  onRequireLogin: () => void;
  onExit: () => void;
  ui: TourUi;
  /** Progresul unui tur reluat din browser. */
  initial?: Progress | null;
}

type Status = { ok: boolean; text: string } | null;
const MIN_REVIEW_CHARS = 20;

const currentPosition = () => new Promise<{ lat: number; lng: number } | null>((resolve) => {
  if (!('geolocation' in navigator)) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
  );
});

export const LiveTour: React.FC<LiveTourProps> = ({ stops, themed, signedIn, onRequireLogin, onExit, ui, initial }) => {
  const [startedAt] = useState(() => initial?.startedAt ?? Date.now());
  const [current, setCurrent] = useState(initial?.current ?? 0);
  const [reached, setReached] = useState<Reached[]>(() => initial?.reached ?? stops.map(() => null));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [finished, setFinished] = useState(initial?.finished ?? false);
  const [stamp, setStamp] = useState<Status>(null);
  const [stampBusy, setStampBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // Ecranul se schimbă sub buton („Finalizează turul” dispare): focusul merge pe titlul nou.
  useEffect(() => { heading.current?.focus(); }, [finished]);

  useEffect(() => {
    const saved: SavedLiveTour = {
      startedAt, current, reached, finished,
      themedSlug: themed?.slug ?? null,
      stops: stops.map(({ restaurant, item, category }) => ({ restaurantId: restaurant.id, item, category })),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { /* fără storage turul merge, doar nu se reia */ }
  }, [startedAt, current, reached, finished, themed, stops]);

  const exit = () => { clearLiveTour(); onExit(); };

  const stop = stops[current];
  const done = reached.filter(Boolean).length;
  const allReached = done === stops.length;
  const allCheckedIn = reached.every((r) => r === 'checkin');

  const markReached = (how: 'checkin' | 'manual') => setReached((list) => list.map((r, i) => (i === current ? (r === 'checkin' ? r : how) : r)));

  const checkIn = async () => {
    const venueId = stop.restaurant.venueId;
    if (!venueId) return;
    setBusy(true);
    setStatus(null);
    try {
      let result = await checkInAtVenue(venueId);
      if (!result.ok && 'needLocation' in result) {
        const loc = await currentPosition();
        result = loc ? await checkInAtVenue(venueId, loc) : { ok: false, error: 'Nu am putut afla locația. Permite accesul la locație și încearcă din nou.' };
      }
      if (result.ok) markReached('checkin');
      setStatus({ ok: result.ok, text: result.ok ? result.message : result.error });
    } catch {
      setStatus({ ok: false, text: 'Check-in-ul nu a mers. Încearcă din nou.' });
    } finally {
      setBusy(false);
    }
  };

  const next = () => { setCurrent(current + 1); setStatus(null); };

  const canStamp = !!themed && signedIn && allCheckedIn;

  const requestStamp = async () => {
    if (!themed || stampBusy) return;
    setStampBusy(true);
    try {
      const r = await finishThemedTour(themed.slug, stops.map(({ restaurant }) => restaurant.venueId ?? ''));
      setStamp({ ok: r.ok, text: r.ok ? r.message : r.error });
    } catch {
      setStamp({ ok: false, text: 'Nu am putut salva ștampila. Încearcă din nou.' });
    } finally {
      setStampBusy(false);
    }
  };

  const finish = () => {
    setFinished(true);
    if (canStamp) void requestStamp();
    else if (themed && signedIn) setStamp({ ok: false, text: 'Ștampila se dă doar cu check-in la fiecare oprire.' });
  };

  if (finished) return (
    <div className="space-y-4 stagger-fade-in">
      <div className={`rounded-[6px] border p-4 sm:p-5 space-y-2 ${ui.panel}`}>
        <h2 ref={heading} tabIndex={-1} className="font-display text-[26px] sm:text-[30px] leading-tight focus:outline-none">Tur terminat{themed ? `: ${themed.name}` : ''}</h2>
        {stamp && <p role="status" className="flex items-start gap-2 text-[13px] font-semibold">{stamp.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0" />}{stamp.text}</p>}
        {canStamp && !stamp?.ok && <button type="button" onClick={requestStamp} disabled={stampBusy} className={`btn-press rounded-[4px] border px-4 py-2.5 text-[13px] font-bold disabled:opacity-45 ${ui.border}`}>
          {stampBusy ? 'Salvăm ștampila…' : stamp ? 'Încearcă din nou' : 'Primește ștampila'}
        </button>}
        {signedIn
          ? <p className={`text-[13px] ${ui.muted}`}>Spune-le și altora cum a fost. Fiecare review trece prin aceleași verificări ca oricare altul; poți sări peste oricare local.</p>
          : <div className="space-y-2">
              <p className={`text-[13px] ${ui.muted}`}>Fără cont nu salvăm nimic: nici review-urile, nici ștampila turului.</p>
              <button type="button" onClick={onRequireLogin} className={`btn-press rounded-[4px] px-4 py-2.5 text-[13px] font-bold ${ui.primary}`}>Intră în cont</button>
            </div>}
      </div>
      {signedIn && <ul className="space-y-3">
        {stops.map(({ restaurant }) => restaurant.venueId && <li key={restaurant.id}><QuickReview venueId={restaurant.venueId} name={restaurant.name} ui={ui} /></li>)}
      </ul>}
      <button type="button" onClick={exit} className={`btn-press rounded-[4px] border px-4 py-2.5 text-[13px] font-bold ${ui.border}`}>Gata, închide turul</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={`rounded-[6px] border p-4 sm:p-5 space-y-4 ${ui.panel}`}>
        <div className="space-y-2">
          <p className={`text-[12px] font-bold uppercase tracking-wide ${ui.muted}`}>Oprirea {current + 1} din {stops.length}{themed ? ` · ${themed.name}` : ''}</p>
          <div className="flex gap-1.5" role="progressbar" aria-label="Progresul turului" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={done}>
            {stops.map(({ restaurant }, i) => <span key={restaurant.id} className={`h-1.5 flex-1 rounded-full ${reached[i] ? 'bg-current' : 'bg-current opacity-20'}`} />)}
          </div>
        </div>
        <div className="space-y-1">
          <h2 ref={heading} tabIndex={-1} className="font-display text-[28px] sm:text-[32px] leading-tight focus:outline-none">{stop.restaurant.name}</h2>
          <p className={`text-[13px] ${ui.muted}`}><MapPin className="mr-1 inline h-3.5 w-3.5" />{stop.restaurant.address}</p>
          <p className="text-[14px]"><strong>{stop.item.name}</strong> · {stop.item.priceRon} lei</p>
        </div>

        {reached[current] && <p className="flex items-center gap-1.5 text-[13px] font-semibold"><Check className="h-4 w-4" />{reached[current] === 'checkin' ? 'Check-in făcut.' : 'Ai ajuns.'}</p>}
        {reached[current] !== 'checkin' && <div className="flex flex-wrap gap-2">
              {signedIn && stop.restaurant.venueId && <button type="button" onClick={checkIn} disabled={busy} className={`btn-press inline-flex items-center gap-1.5 rounded-[4px] px-4 py-2.5 text-[13px] font-bold disabled:opacity-45 ${ui.primary}`}>
                <LocateFixed className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`} />{busy ? 'Verificăm locația…' : 'Fac check-in aici'}
              </button>}
              {!reached[current] && <button type="button" onClick={() => markReached('manual')} className={`btn-press rounded-[4px] border px-4 py-2.5 text-[13px] font-bold ${ui.border}`}>Am ajuns</button>}
            </div>}
        {status && <p role={status.ok ? 'status' : 'alert'} className={`text-[12px] ${status.ok ? ui.muted : 'font-semibold'}`}>{status.text}</p>}
        {!signedIn && <p className={`text-[12px] ${ui.muted}`}>Fără cont turul merge, dar check-in-ul nu se poate face și nu salvăm nimic. <button type="button" onClick={onRequireLogin} className="font-bold underline underline-offset-2">Intră în cont</button></p>}
        {signedIn && themed && <p className={`text-[12px] ${ui.muted}`}>Pentru ștampila din profil ai nevoie de check-in la fiecare oprire.</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button type="button" onClick={exit} className={`btn-press rounded-[4px] border px-4 py-2.5 text-[13px] font-bold ${ui.border}`}>Oprește turul</button>
          {current < stops.length - 1
            ? <button type="button" onClick={next} disabled={!reached[current]} className={`btn-press inline-flex items-center gap-1.5 rounded-[4px] px-5 py-2.5 text-[13px] font-bold disabled:opacity-45 ${ui.primary}`}>Următoarea oprire<ArrowRight className="h-4 w-4" /></button>
            : <button type="button" onClick={finish} disabled={!allReached} className={`btn-press inline-flex items-center gap-1.5 rounded-[4px] px-5 py-2.5 text-[13px] font-bold disabled:opacity-45 ${ui.primary}`}><Flag className="h-4 w-4" />Finalizează turul</button>}
        </div>
      </div>
    </div>
  );
};

/** Review scurt după tur: același drum ca formularul din fișa localului (token anti-bot, capcană, cooldown pe server). */
function QuickReview({ venueId, name, ui }: { venueId: string; name: string; ui: TourUi }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const token = useRef<string | undefined>(undefined);
  const honeypot = useRef<HTMLInputElement>(null);
  const fieldId = `tour-review-${venueId}`;

  const loadToken = React.useCallback(() => {
    token.current = undefined;
    reviewFormToken(venueId).then((r) => { if (r.ok) token.current = r.token; }).catch(() => undefined);
  }, [venueId]);
  useEffect(loadToken, [loadToken]);

  const published = status?.ok === true;
  const tooShort = text.trim().length < MIN_REVIEW_CHARS;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stars || tooShort || busy) return;
    setBusy(true);
    try {
      const r = await submitReview({ venueId, rating: stars * 2, text: text.trim(), formToken: token.current, website: honeypot.current?.value });
      setStatus({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (!r.ok) loadToken();
    } catch {
      setStatus({ ok: false, text: 'Review-ul nu a plecat. Încearcă din nou.' });
      loadToken();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`relative rounded-[6px] border p-4 space-y-3 ${ui.panel}`}>
      <h3 className="font-display text-[22px] leading-tight">{name}</h3>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${fieldId}-website`}>Website</label>
        <input ref={honeypot} id={`${fieldId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <fieldset disabled={published} className="space-y-3">
        <legend className="sr-only">Nota pentru {name}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} ${n === 1 ? 'stea' : 'stele'}`} aria-pressed={stars === n} onClick={() => setStars(n)} className="btn-press flex h-11 w-11 items-center justify-center rounded-[4px]">
            <Star className={`h-6 w-6 ${n <= stars ? 'fill-current' : 'opacity-40'}`} />
          </button>)}
        </div>
        <label htmlFor={fieldId} className="block text-[13px] font-bold">Ce ai gustat și cum a fost?</label>
        <textarea id={fieldId} rows={2} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} className={`w-full rounded-[4px] border px-3 py-2 text-[14px] ${ui.input}`} />
        <p className={`text-[12px] ${ui.muted}`}>Cel puțin {MIN_REVIEW_CHARS} de caractere, ca orice review ({text.trim().length}/{MIN_REVIEW_CHARS}).</p>
        <button type="submit" disabled={!stars || tooShort || busy} className={`btn-press rounded-[4px] px-4 py-2.5 text-[13px] font-bold disabled:opacity-45 ${ui.primary}`}>{busy ? 'Se publică…' : 'Publică review-ul'}</button>
      </fieldset>
      {status && <p role={status.ok ? 'status' : 'alert'} className={`text-[12px] ${status.ok ? ui.muted : 'font-semibold'}`}>{status.text}</p>}
    </form>
  );
}
