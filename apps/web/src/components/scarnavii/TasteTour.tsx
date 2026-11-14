'use client';

import { HonestValue } from '../BrandPrimitives';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Bike, Car, Map as MapIcon, Clock, Footprints, LocateFixed, MapPin, Minus, Navigation, Plus, Sparkles } from 'lucide-react';
import { Coordinates, Restaurant, Vertical } from '../../types';
import { distance, explainNoTour, generateBestEffortTour, generateTasteTour, googleMapsDirectionsUrl, isOpenAt, parseTasteRequest, STAY_MINUTES, TASTE_CATEGORIES, tourTimeline, type TasteCategory } from './tasteTourLogic';
import { getVenueWeeklyHours } from '../../data/venueExtras';
import { getTasteTourGoogleData } from '../../app/actions/taste-tour';
import { StartPointPicker } from './StartPointPicker';

interface TasteTourProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurant: Restaurant) => void;
}

type StartPoint = { label: string; coordinates: Coordinates };

const LANDMARKS: StartPoint[] = [
  { label: 'Piața Unirii', coordinates: { lat: 45.758, lng: 21.229 } },
  { label: 'Piața Victoriei', coordinates: { lat: 45.7536, lng: 21.2257 } },
  { label: 'Complexul Studențesc', coordinates: { lat: 45.7478, lng: 21.2412 } },
  { label: 'Piața Maria (Iosefin)', coordinates: { lat: 45.7488, lng: 21.2156 } },
];
const DRINK_FIRST: TasteCategory[] = ['coffee', 'beer', 'cocktail', 'wine'];
const COMPANY = ['Date', 'Cu gașca', 'Cu familia', 'Cu colegii', 'Cu câinele'];
const TRAVEL = {
  walk: { label: 'Pe jos', icon: Footprints, speedKmh: 4.5, mapsMode: 'walking', verb: 'pe jos' },
  bike: { label: 'Cu bicicleta', icon: Bike, speedKmh: 14, mapsMode: 'bicycling', verb: 'cu bicicleta' },
  // ~20 km/h de medie include traficul din oraș și câteva minute de parcare.
  car: { label: 'Cu mașina', icon: Car, speedKmh: 20, mapsMode: 'driving', verb: 'cu mașina' },
} as const;
const ALCOHOL: TasteCategory[] = ['beer', 'cocktail', 'wine'];
const STEPS = ['Ce vrei să guști', 'Cu cine ieși', 'Când și cât timp', 'De unde pleci'];
const MAX_PEOPLE = 12;
// Aceleași limite ca în acțiunea Google; în afara lor nu calculăm traseul.
const inCity = (p: Coordinates) => p.lat >= 45.65 && p.lat <= 45.85 && p.lng >= 21.1 && p.lng <= 21.38;
const MAP_PICK = 'Punct ales pe hartă';
const formatAccuracy = (meters: number) => meters >= 1000 ? `~${Math.round(meters / 1000)} km` : `~${Math.round(meters)} m`;
const clock = (date: Date) => date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

export const TasteTour: React.FC<TasteTourProps> = ({ vertical, restaurants, onSelectRestaurant }) => {
  const isDrink = vertical === 'drink';
  const [step, setStep] = useState(0);
  // Pasul 1
  const [categories, setCategories] = useState<TasteCategory[]>([]);
  const [note, setNote] = useState('');
  // Pasul 2
  const [people, setPeople] = useState(2);
  const [company, setCompany] = useState<string | null>(null);
  const [budget, setBudget] = useState('100');
  // Pasul 3
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [time, setTime] = useState('19:00');
  const [stopCount, setStopCount] = useState<2 | 3>(2);
  // Pasul 4
  const [start, setStart] = useState<StartPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [travel, setTravel] = useState<keyof typeof TRAVEL>('walk');
  const [driverAcknowledged, setDriverAcknowledged] = useState(false);
  // Rezultat
  const [tour, setTour] = useState<ReturnType<typeof generateTasteTour>>(null);
  const [departure, setDeparture] = useState<Date | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [droppedCategories, setDroppedCategories] = useState<TasteCategory[]>([]);
  const [googleData, setGoogleData] = useState<Awaited<ReturnType<typeof getTasteTourGoogleData>> | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    if (!tour || !start) { setGoogleData(null); setLoadingGoogle(false); return; }
    let active = true;
    setGoogleData(null);
    setLoadingGoogle(true);
    void getTasteTourGoogleData({
      origin: start.coordinates,
      stops: tour.stops.map(({ restaurant }) => ({ ...restaurant.coordinates, venueId: restaurant.venueId })),
    }).then((data) => { if (active) setGoogleData(data); })
      .catch(() => { if (active) setGoogleData(null); })
      .finally(() => { if (active) setLoadingGoogle(false); });
    return () => { active = false; };
  }, [tour, start]);

  const panel = isDrink ? 'bg-[#143025] border-[#285443]' : 'bg-[#FAF8F5] border-[#E6DFD5]';
  const input = isDrink ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]' : 'bg-white border-[#D6CFC5] text-[#3A2418]';
  const primary = isDrink ? 'bg-[#F2A33A] text-[#17382C]' : 'bg-[#B3261E] text-white';
  const muted = isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]';
  const selected = isDrink ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]' : 'bg-[#3A2418] border-[#3A2418] text-white';
  const border = isDrink ? 'border-[#2D5947]' : 'border-[#D6CFC5]';
  const chip = (active: boolean) => `btn-press inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-2 text-[13px] font-semibold ${active ? selected : border}`;

  // Textul liber e opțional: adaugă categorii și exclude ce scrie după „fără”.
  const parsedNote = note.trim() ? parseTasteRequest(note) : null;
  const excluded = parsedNote?.excluded ?? [];
  const chosen = [
    ...categories.filter((id) => !excluded.includes(id)),
    ...(parsedNote?.categories ?? []).filter((id) => !categories.includes(id)),
  ];
  const orderedCategories = isDrink
    ? [...TASTE_CATEGORIES].sort((a, b) => Number(DRINK_FIRST.includes(b.id)) - Number(DRINK_FIRST.includes(a.id)))
    : TASTE_CATEGORIES;
  const labelOf = (id: TasteCategory) => TASTE_CATEGORIES.find((entry) => entry.id === id)?.label ?? id;
  const budgetValue = Number(budget);
  const budgetValid = Number.isFinite(budgetValue) && budgetValue > 0;
  const minStops = Math.max(2, chosen.length);

  const hasAlcohol = chosen.some((id) => ALCOHOL.includes(id));
  // Singur și cu alcool pe traseu: nu are cine conduce. În grup, un șofer care nu bea, după confirmare.
  const carBlocked = hasAlcohol && people === 1;
  const carNeedsAck = travel === 'car' && hasAlcohol && !carBlocked;
  const canContinue = [
    chosen.length >= 1 && chosen.length <= 3,
    budgetValid,
    stopCount >= chosen.length && (when === 'now' || /^\d{2}:\d{2}$/.test(time)),
    start !== null && !(travel === 'car' && carBlocked) && (!carNeedsAck || driverAcknowledged),
  ][step];

  const toggleCategory = (id: TasteCategory) => {
    setCategories((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  };

  const departureTime = () => {
    const date = new Date();
    if (when === 'later') {
      const [hours, minutes] = time.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
      // O oră deja trecută înseamnă mâine.
      if (date.getTime() < Date.now() - 60_000) date.setDate(date.getDate() + 1);
    }
    return date;
  };

  const pickOnMap = (point: Coordinates) => {
    setAccuracy(null);
    if (!inCity(point)) { setLocationError('Punctul ales e în afara Timișoarei. Alege unul din oraș.'); return; }
    setLocationError(null);
    setStart({ label: MAP_PICK, coordinates: point });
  };

  const locate = () => {
    if (!('geolocation' in navigator)) { setLocationError('Browserul nu permite localizarea. Alege un punct pe hartă sau din listă.'); setShowMap(true); return; }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        setShowMap(true);
        const point = { lat: coords.latitude, lng: coords.longitude };
        if (!inCity(point)) {
          const km = Math.round(distance(point, LANDMARKS[1].coordinates));
          setLocationError(`Browserul te-a localizat la ~${km} km de centrul Timișoarei (precizie ${formatAccuracy(coords.accuracy)}), probabil după rețea, nu după GPS. Apasă pe hartă unde ești.`);
          return;
        }
        setAccuracy(coords.accuracy);
        setStart({ label: 'Locația mea', coordinates: point });
      },
      () => { setLocating(false); setShowMap(true); setLocationError('Nu am putut afla locația. Apasă pe hartă unde ești sau alege un punct din listă.'); },
      // Poziție proaspătă: una din cache (ex. de pe altă rețea) ne-a dat orașul greșit.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const createTour = () => {
    if (!start || !budgetValid) return;
    const leaveAt = departureTime();
    // Ora aproximativă la care ajungi la ultima oprire (opririle de dinainte + ~15 min de drum).
    const lastArrival = new Date(leaveAt.getTime() + ((stopCount - 1) * STAY_MINUTES + 15) * 60_000);
    // shortcut: localul trebuie să fie deschis la plecare sau la ultima sosire; ora exactă se verifică în traseu (avertisment pe oprire).
    const open = restaurants.filter((restaurant) => {
      const week = getVenueWeeklyHours(restaurant);
      return isOpenAt(week, leaveAt) || isOpenAt(week, lastArrival);
    });
    const input = { categories: chosen, excluded, budgetRon: budgetValue, stopCount, start: start.coordinates };
    const result = generateBestEffortTour({ ...input, restaurants: open });
    setTour(result?.tour ?? null);
    setDroppedCategories(result?.droppedCategories ?? []);
    setFailure(result ? null : explainNoTour({ ...input, allRestaurants: restaurants, openRestaurants: open, label: labelOf }));
    setDeparture(leaveAt);
    setStep(STEPS.length);
  };

  const next = () => {
    if (!canContinue) return;
    if (step === 0 && stopCount < minStops) setStopCount(minStops as 2 | 3);
    if (step === STEPS.length - 1) createTour();
    else setStep(step + 1);
  };

  const mode = TRAVEL[travel];
  const timeline = tour && start && departure ? tourTimeline(start.coordinates, tour.stops, departure, mode.speedKmh) : [];
  const mapsLink = tour && start ? googleMapsDirectionsUrl(start.coordinates, tour.stops, mode.mapsMode) : null;

  const showingResult = step === STEPS.length;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`} />
          <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">Tasting Tour</h1>
        </div>
        <p className={`text-[13px] sm:text-[14px] ${muted}`}>Răspunde la 4 întrebări scurte și îți facem un traseu prin localuri, cu ore și drum.</p>
      </div>

      {!showingResult && <div className={`rounded-[6px] border p-4 sm:p-5 space-y-5 ${panel}`}>
        <div className="space-y-2">
          <p className={`text-[12px] font-bold uppercase tracking-wide ${muted}`}>Pasul {step + 1} din {STEPS.length}</p>
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((label, index) => <span key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? (isDrink ? 'bg-[#F2A33A]' : 'bg-[#B3261E]') : (isDrink ? 'bg-[#2D5947]' : 'bg-[#E6DFD5]')}`} />)}
          </div>
          <h2 className="font-display text-[26px] sm:text-[30px] leading-tight">{STEPS[step]}</h2>
        </div>

        {step === 0 && <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-bold">Alege 1–3 lucruri, în ordinea în care vrei să le guști</legend>
            <div className="flex flex-wrap gap-2">
              {orderedCategories.map((category) => {
                const position = chosen.indexOf(category.id);
                return <button key={category.id} type="button" aria-pressed={categories.includes(category.id)} onClick={() => toggleCategory(category.id)} className={chip(position >= 0)}>
                  {position >= 0 && <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[11px] font-black">{position + 1}</span>}
                  {category.label}
                </button>;
              })}
            </div>
            {chosen.length > 3 && <p role="alert" className={`text-[12px] ${muted}`}>Cel mult 3 opriri: scoate una dintre alegeri.</p>}
          </fieldset>
          <div className="space-y-1.5">
            <label htmlFor="taste-note" className="block text-[13px] font-bold">Altceva? <span className={`font-normal ${muted}`}>(opțional)</span></label>
            <textarea id="taste-note" maxLength={300} rows={2} value={note} onChange={(event) => setNote(event.target.value)}
              placeholder="De exemplu: fără pizza, ceva dulce la final"
              className={`w-full rounded-[4px] border px-3 py-2 text-[14px] ${input}`} />
            {excluded.length > 0 && <p className={`text-[12px] ${muted}`}>Evităm: {excluded.map(labelOf).join(', ')}.</p>}
            {parsedNote?.needsClarification && <p className={`text-[12px] ${muted}`}>Nu putem verifica alergii, ingrediente sau alte restricții alimentare. Confirmă aceste detalii direct cu localul.</p>}
          </div>
        </div>}

        {step === 1 && <div className="space-y-4">
          <div className="space-y-2">
            <p id="taste-people-label" className="text-[13px] font-bold">Câte persoane sunteți?</p>
            <div className="inline-flex items-center gap-3" role="group" aria-labelledby="taste-people-label">
              <button type="button" aria-label="Mai puține persoane" disabled={people <= 1} onClick={() => setPeople(people - 1)} className={`btn-press flex h-11 w-11 items-center justify-center rounded-[4px] border disabled:opacity-40 ${border}`}><Minus className="h-4 w-4" /></button>
              <output aria-live="polite" className="min-w-[3ch] text-center font-display text-[28px]">{people}</output>
              <button type="button" aria-label="Mai multe persoane" disabled={people >= MAX_PEOPLE} onClick={() => setPeople(people + 1)} className={`btn-press flex h-11 w-11 items-center justify-center rounded-[4px] border disabled:opacity-40 ${border}`}><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-bold">Cu cine ieși? <span className={`font-normal ${muted}`}>(opțional)</span></legend>
            <div className="flex flex-wrap gap-2">
              {COMPANY.map((label) => <button key={label} type="button" aria-pressed={company === label} onClick={() => setCompany(company === label ? null : label)} className={chip(company === label)}>{label}</button>)}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <label htmlFor="taste-budget" className="block text-[13px] font-bold">Buget maxim de persoană (lei)</label>
            <input id="taste-budget" type="number" inputMode="numeric" min="1" step="1" value={budget} onChange={(event) => setBudget(event.target.value)} className={`w-full max-w-[12rem] rounded-[4px] border px-3 py-2 text-[14px] ${input}`} />
            {budgetValid && people > 1 && <p className={`text-[12px] ${muted}`}>Până la {budgetValue * people} lei pentru toți {people}.</p>}
          </div>
        </div>}

        {step === 2 && <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-bold">Când plecați?</legend>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-pressed={when === 'now'} onClick={() => setWhen('now')} className={chip(when === 'now')}>Acum</button>
              <button type="button" aria-pressed={when === 'later'} onClick={() => setWhen('later')} className={chip(when === 'later')}><Clock className="h-3.5 w-3.5" />La o anumită oră</button>
              {when === 'later' && <input type="time" aria-label="Ora de plecare" value={time} onChange={(event) => setTime(event.target.value)} className={`rounded-[4px] border px-3 py-2 text-[14px] ${input}`} />}
            </div>
            <p className={`text-[12px] ${muted}`}>Alegem doar localuri deschise pe durata turului.</p>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-bold">Cât timp aveți?</legend>
            <div className="flex flex-wrap gap-2">
              {([2, 3] as const).map((count) => <button type="button" key={count} disabled={count < chosen.length} aria-pressed={stopCount === count} onClick={() => setStopCount(count)} className={`${chip(stopCount === count)} disabled:opacity-40`}>
                ~{count === 2 ? '1h30' : '2h30'} · {count} opriri
              </button>)}
            </div>
            <p className={`text-[12px] ${muted}`}>Socotim cam {STAY_MINUTES} de minute la fiecare local, plus drumul.</p>
          </fieldset>
        </div>}

        {step === 3 && <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-bold">Punct de plecare</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={locate} disabled={locating} aria-pressed={start?.label === 'Locația mea'} className={chip(start?.label === 'Locația mea')}>
                <LocateFixed className={`h-3.5 w-3.5 ${locating ? 'animate-pulse' : ''}`} />{locating ? 'Te căutăm…' : 'Locația mea'}
              </button>
              {LANDMARKS.map((point) => <button key={point.label} type="button" aria-pressed={start?.label === point.label} onClick={() => { setStart(point); setLocationError(null); setAccuracy(null); }} className={chip(start?.label === point.label)}>
                <MapPin className="h-3.5 w-3.5" />{point.label}
              </button>)}
              <button type="button" aria-pressed={start?.label === MAP_PICK} aria-expanded={showMap} onClick={() => setShowMap(!showMap)} className={chip(start?.label === MAP_PICK)}>
                <MapIcon className="h-3.5 w-3.5" />{showMap ? 'Ascunde harta' : 'Aleg pe hartă'}
              </button>
            </div>
            {locationError && <p role="alert" className={`text-[12px] ${muted}`}>{locationError}</p>}
            {start?.label === 'Locația mea' && accuracy !== null && <p className={`text-[12px] ${muted}`}>
              Locația mea · precizie {formatAccuracy(accuracy)}.{accuracy > 300 ? ' Locația e aproximativă: dacă pinul nu e unde ești, mută-l pe hartă.' : ''}
            </p>}
            {showMap && <StartPointPicker value={start?.coordinates ?? null} isDrink={isDrink} onPick={pickOnMap} />}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-bold">Cum vă deplasați?</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TRAVEL) as (keyof typeof TRAVEL)[]).map((key) => {
                const Icon = TRAVEL[key].icon;
                const disabled = key === 'car' && carBlocked;
                return <button key={key} type="button" disabled={disabled} aria-pressed={travel === key} onClick={() => { setTravel(key); setDriverAcknowledged(false); }} className={`${chip(travel === key)} disabled:opacity-40`}><Icon className="h-3.5 w-3.5" />{TRAVEL[key].label}</button>;
              })}
            </div>
            {carBlocked && <p className={`text-[12px] ${muted}`}>Cu mașina nu se poate: ești singur și traseul are alcool. Mergi pe jos, cu bicicleta sau ia un taxi.</p>}
            {travel === 'car' && carBlocked && <p role="alert" className="text-[12px] font-semibold">Alege alt mod de deplasare ca să continui.</p>}
            {carNeedsAck && <div role="alert" className={`flex flex-col gap-3 rounded-[6px] border p-3 text-[13px] sm:flex-row sm:items-center sm:justify-between ${isDrink ? 'border-[#F2A33A]' : 'border-[#B3261E]'}`}>
              <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Șoferul nu bea deloc.</strong> În România toleranța la alcool la volan e zero. Stabiliți dinainte cine conduce.</span></p>
              <button type="button" aria-pressed={driverAcknowledged} onClick={() => setDriverAcknowledged(!driverAcknowledged)} className={`btn-press shrink-0 rounded-[4px] border px-3 py-2 text-[12px] font-bold ${driverAcknowledged ? selected : border}`}>{driverAcknowledged ? '✓ Am înțeles' : 'Ok, am înțeles'}</button>
            </div>}
          </fieldset>
        </div>}

        <div className="flex items-center justify-between gap-3 pt-1">
          {step > 0
            ? <button type="button" onClick={() => setStep(step - 1)} className={`btn-press inline-flex items-center gap-1.5 rounded-[4px] border px-4 py-2.5 text-[13px] font-bold ${border}`}><ArrowLeft className="h-4 w-4" />Înapoi</button>
            : <span />}
          <button type="button" onClick={next} disabled={!canContinue} className={`btn-press inline-flex items-center gap-1.5 rounded-[4px] px-5 py-2.5 text-[13px] font-bold disabled:opacity-45 ${primary}`}>
            {step === STEPS.length - 1 ? <><Sparkles className="h-4 w-4" />Creează traseul</> : <>Continuă<ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
      </div>}

      {showingResult && <div className="space-y-4 stagger-fade-in" aria-live="polite">
        <div className={`rounded-[6px] border p-4 flex flex-wrap items-center justify-between gap-3 ${panel}`}>
          <p className="text-[13px]">
            <strong>{chosen.map(labelOf).join(' → ')}</strong>
            <span className={muted}> · {people} {people === 1 ? 'persoană' : 'persoane'}{company ? ` · ${company.toLowerCase()}` : ''} · {departure ? clock(departure) : ''} · {mode.label.toLowerCase()} din {start?.label}</span>
          </p>
          <button type="button" onClick={() => setStep(0)} className={`btn-press rounded-[4px] border px-3 py-2 text-[12px] font-bold ${border}`}>Modifică alegerile</button>
        </div>

        {failure && !tour && <p role="status" className={`rounded-[6px] border p-4 text-[13px] ${panel}`}>{failure}</p>}

        {tour && <>
          <h2 className="font-display text-[26px] sm:text-[30px] leading-tight">Traseul tău</h2>
          {(tour.stops.length < stopCount || droppedCategories.length > 0) && <p role="status" className={`flex items-start gap-2 rounded-[6px] border p-3 text-[13px] ${panel}`}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {tour.stops.length < stopCount && `Am găsit doar ${tour.stops.length === 1 ? 'un local deschis' : `${tour.stops.length} localuri deschise`} pentru alegerile tale, așa că traseul are ${tour.stops.length === 1 ? 'o singură oprire' : `${tour.stops.length} opriri`} în loc de ${stopCount}. `}
              {droppedCategories.length > 0 && `Pentru ${droppedCategories.map((id) => labelOf(id).toLowerCase()).join(', ')} nu am găsit niciun local deschis. `}
              Dacă vrei mai multe opriri, alege și altceva din „Modifică alegerile”.
            </span>
          </p>}
          <ol className="space-y-3">
            {tour.stops.map(({ restaurant, item, category }, index) => {
              const slot = timeline[index];
              const maybeClosed = slot && !isOpenAt(getVenueWeeklyHours(restaurant), slot.arrival);
              return <li key={restaurant.id} className="space-y-2">
                {slot && <p className={`flex items-center gap-1.5 text-[12px] font-semibold ${muted}`}>
                  <mode.icon className="h-3.5 w-3.5" />~{slot.travelMinutes} min {mode.verb} · ajungi pe la {clock(slot.arrival)}
                </p>}
                <div className={`rounded-[6px] border p-4 sm:p-5 space-y-3 ${isDrink ? 'bg-[#17382C] border-[#2D5947]' : 'bg-white border-[#E6DFD5] shadow-sm'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex shrink-0 items-center justify-center w-8 h-8 rounded-full text-[13px] font-bold ${primary}`}>{index + 1}</span>
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-display text-[22px] leading-tight">{restaurant.name}</h3>
                      <p className={`text-[12px] ${muted}`}><MapPin className="inline w-3 h-3 mr-1" />{restaurant.shortNeighborhood ?? restaurant.neighborhood} · Scor Onest <HonestValue score={restaurant.foodQualityScore} /></p>
                    </div>
                  </div>
                  <p className="text-[14px]"><strong>{item.name}</strong> · {item.priceRon} lei{people > 1 ? ` · ${item.priceRon * people} lei pentru toți` : ''}</p>
                  {googleData?.prices[index] && <div className="border rounded-[4px] px-3 py-2 text-[12px] bg-white text-[#1F1F1F]">
                    <span>Interval indicativ per persoană: {googleData.prices[index]!.start ?? '—'}–{googleData.prices[index]!.end ?? '…'} {googleData.prices[index]!.currency}</span>
                    <span className="block text-[12px] font-normal text-[#5E5E5E] whitespace-nowrap">{googleData.prices[index]!.attribution}</span>
                  </div>}
                  <p className={`text-[12px] ${muted}`}>Potrivire pentru {labelOf(category).toLowerCase()}.</p>
                  {maybeClosed && <p className="flex items-center gap-1.5 text-[12px] font-semibold"><AlertTriangle className="h-3.5 w-3.5" />S-ar putea să fie închis la ora sosirii. Verifică programul.</p>}
                  <button type="button" onClick={() => onSelectRestaurant(restaurant)} className={`btn-press inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-2 text-[12px] font-bold ${border}`}>Vezi localul <ArrowRight className="w-3.5 h-3.5" /></button>
                </div>
              </li>;
            })}
          </ol>
          <div className={`rounded-[6px] border p-4 space-y-3 ${panel}`}>
            <p className="text-[14px] font-bold">
              Total estimat: {tour.totalRon} lei / persoană{people > 1 ? ` · ~${tour.totalRon * people} lei pentru ${people}` : ''}
            </p>
            {timeline.length > 0 && <p className={`text-[13px] ${muted}`}>Terminați pe la {clock(timeline[timeline.length - 1].leave)}.</p>}
            {loadingGoogle && <p className={`text-[12px] ${muted}`}>Calculăm drumul și intervalele de preț…</p>}
            {travel === 'walk' && googleData?.route && <div className="border rounded-[4px] px-3 py-2 text-[12px] bg-white text-[#1F1F1F] space-y-1">
              <p>Traseu pe jos: {(googleData.route.distanceMeters / 1000).toFixed(1).replace('.', ',')} km · aproximativ {Math.ceil(googleData.route.durationSeconds / 60)} min de mers</p>
              {googleData.route.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              <span className="block text-[12px] font-normal text-[#5E5E5E] whitespace-nowrap">{googleData.route.attribution}</span>
            </div>}
            <p className={`text-[12px] ${muted}`}>Orele și prețurile sunt orientative. Verifică ruta și programul localurilor înainte de plecare.</p>
            {mapsLink && <a href={mapsLink} target="_blank" rel="noreferrer" className={`btn-press inline-flex items-center gap-2 rounded-[4px] px-4 py-2.5 text-[13px] font-bold ${primary}`}><Navigation className="w-4 h-4" />Deschide traseul în Google Maps</a>}
          </div>
        </>}
      </div>}
    </div>
  );
};
