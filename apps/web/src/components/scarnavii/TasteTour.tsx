'use client';

import { HonestValue } from '../BrandPrimitives';
import React, { useEffect, useState } from 'react';
import { ArrowRight, MapPin, Navigation, Sparkles } from 'lucide-react';
import { Coordinates, Restaurant, Vertical, formatScore } from '../../types';
import { generateTasteTour, parseTasteRequest, TASTE_CATEGORIES } from './tasteTourLogic';
import { getTasteTourGoogleData } from '../../app/actions/taste-tour';

interface TasteTourProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurant: Restaurant) => void;
}

const LANDMARKS: { label: string; coordinates: Coordinates }[] = [
  { label: 'Piața Unirii', coordinates: { lat: 45.758, lng: 21.229 } },
  { label: 'Piața Victoriei', coordinates: { lat: 45.7536, lng: 21.2257 } },
  { label: 'Complexul Studențesc', coordinates: { lat: 45.7478, lng: 21.2412 } },
  { label: 'Piața Maria (Iosefin)', coordinates: { lat: 45.7488, lng: 21.2156 } },
];

export const TasteTour: React.FC<TasteTourProps> = ({ vertical, restaurants, onSelectRestaurant }) => {
  const isDrink = vertical === 'drink';
  const [request, setRequest] = useState('');
  const [budget, setBudget] = useState('100');
  const [stopCount, setStopCount] = useState<2 | 3>(2);
  const [landmark, setLandmark] = useState(0);
  const [parsed, setParsed] = useState<ReturnType<typeof parseTasteRequest> | null>(null);
  const [tour, setTour] = useState<ReturnType<typeof generateTasteTour>>(null);
  const [attempted, setAttempted] = useState(false);
  const [googleData, setGoogleData] = useState<Awaited<ReturnType<typeof getTasteTourGoogleData>> | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    if (!tour) { setGoogleData(null); setLoadingGoogle(false); return; }
    let active = true;
    setGoogleData(null);
    setLoadingGoogle(true);
    void getTasteTourGoogleData({
      origin: LANDMARKS[landmark].coordinates,
      stops: tour.stops.map(({ restaurant }) => ({ ...restaurant.coordinates, venueId: restaurant.venueId })),
    }).then((data) => { if (active) setGoogleData(data); })
      .catch(() => { if (active) setGoogleData(null); })
      .finally(() => { if (active) setLoadingGoogle(false); });
    return () => { active = false; };
  }, [tour, landmark]);

  const panel = isDrink ? 'bg-[#143025] border-[#285443]' : 'bg-[#FAF8F5] border-[#E6DFD5]';
  const input = isDrink ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]' : 'bg-white border-[#D6CFC5] text-[#3A2418]';
  const primary = isDrink ? 'bg-[#F2A33A] text-[#17382C]' : 'bg-[#B3261E] text-white';
  const muted = isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]';
  const selected = isDrink ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]' : 'bg-[#3A2418] border-[#3A2418] text-white';
  const border = isDrink ? 'border-[#2D5947]' : 'border-[#D6CFC5]';

  const interpret = () => {
    setParsed(parseTasteRequest(request));
    setTour(null);
    setAttempted(false);
  };

  const createTour = () => {
    if (!parsed || !parsed.categories.length || !Number.isFinite(Number(budget)) || Number(budget) <= 0) return;
    setTour(generateTasteTour({
      restaurants,
      categories: parsed.categories,
      excluded: parsed.excluded,
      budgetRon: Number(budget),
      stopCount,
      start: LANDMARKS[landmark].coordinates,
    }));
    setAttempted(true);
  };

  const mapsLink = tour && (() => {
    const points = tour.stops.map(({ restaurant }) => `${restaurant.coordinates.lat},${restaurant.coordinates.lng}`);
    const start = LANDMARKS[landmark].coordinates;
    const params = new URLSearchParams({ api: '1', origin: `${start.lat},${start.lng}`, destination: points[points.length - 1], travelmode: 'walking' });
    if (points.length > 1) params.set('waypoints', points.slice(0, -1).join('|'));
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  })();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`} />
          <h2 className="font-display text-[24px] sm:text-[28px] leading-tight">Tasting Tour</h2>
        </div>
        <p className={`text-[13px] sm:text-[14px] ${muted}`}>Spune-ne ce ai poftă să încerci și descoperă orașul cu un traseu prin localuri.</p>
      </div>

      <div className={`rounded-[6px] border p-4 sm:p-5 space-y-4 ${panel}`}>
        <div className="space-y-1.5">
          <label htmlFor="taste-request" className="block text-[13px] font-bold">De ce ți-e poftă?</label>
          <textarea id="taste-request" maxLength={300} rows={3} value={request}
            onChange={(event) => { setRequest(event.target.value); setParsed(null); setTour(null); setAttempted(false); }}
            placeholder="De exemplu: pizza și apoi o bere"
            className={`w-full rounded-[4px] border px-3 py-2 text-[14px] ${input}`} />
          <p className={`text-[12px] ${muted}`}>Scrie pe scurt; apoi poți corecta categoriile pe care le-am recunoscut.</p>
        </div>
        {!parsed && <button type="button" onClick={interpret} disabled={!request.trim()} className={`btn-press rounded-[4px] px-4 py-2.5 text-[13px] font-bold disabled:opacity-45 ${primary}`}>Continuă <ArrowRight className="inline w-4 h-4 ml-1" /></button>}

        {parsed && <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-bold">Ce vrei să găsești?</legend>
            <p className={`text-[12px] ${muted}`}>
              {parsed.needsClarification ? 'Verifică ce am înțeles și alege categoriile dorite.' : 'Confirmă sau modifică alegerile recunoscute.'}
            </p>
            {parsed.needsClarification && <p className={`text-[12px] ${muted}`}>Nu putem verifica alergii, ingrediente sau alte restricții alimentare. Confirmă aceste detalii direct cu localul.</p>}
            <div className="flex flex-wrap gap-2">
              {TASTE_CATEGORIES.map((category) => {
                const active = parsed.categories.includes(category.id);
                return <button key={category.id} type="button" aria-pressed={active} onClick={() => {
                  setParsed({ ...parsed, categories: active ? parsed.categories.filter((id) => id !== category.id) : [...parsed.categories, category.id], excluded: parsed.excluded.filter((id) => id !== category.id) });
                  setTour(null); setAttempted(false);
                }} className={`btn-press rounded-[4px] border px-3 py-2 text-[12px] font-semibold ${active ? selected : border}`}>{category.label}</button>;
              })}
            </div>
            {parsed.excluded.length > 0 && <p className={`text-[12px] ${muted}`}>Am exclus: {parsed.excluded.map((id) => TASTE_CATEGORIES.find((category) => category.id === id)?.label ?? id).join(', ')}. Apasă pe o categorie dacă vrei totuși să o incluzi.</p>}
            {parsed.categories.length > stopCount && <p className={`text-[12px] ${muted}`}>Alege cel mult câte o categorie pentru fiecare oprire.</p>}
          </fieldset>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="taste-budget" className="block text-[13px] font-bold">Buget maxim / persoană (lei)</label>
              <input id="taste-budget" type="number" min="1" step="1" value={budget} onChange={(event) => { setBudget(event.target.value); setTour(null); setAttempted(false); }} className={`w-full rounded-[4px] border px-3 py-2 text-[14px] ${input}`} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="taste-start" className="block text-[13px] font-bold">De unde pleci?</label>
              <select id="taste-start" value={landmark} onChange={(event) => { setLandmark(Number(event.target.value)); setTour(null); setAttempted(false); }} className={`w-full rounded-[4px] border px-3 py-2 text-[14px] ${input}`}>
                {LANDMARKS.map((point, index) => <option value={index} key={point.label}>{point.label}</option>)}
              </select>
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-bold">Câte opriri ai timp să faci?</legend>
            <div className="flex gap-2">{([2, 3] as const).map((count) => <button type="button" key={count} aria-pressed={stopCount === count} onClick={() => { setStopCount(count); setTour(null); setAttempted(false); }} className={`btn-press rounded-[4px] border px-4 py-2 text-[13px] font-semibold ${stopCount === count ? selected : border}`}>{count} localuri</button>)}</div>
          </fieldset>
          <button type="button" onClick={createTour} disabled={!parsed.categories.length || parsed.categories.length > stopCount || !budget || !Number.isFinite(Number(budget)) || Number(budget) <= 0} className={`btn-press rounded-[4px] px-5 py-2.5 text-[13px] font-bold disabled:opacity-45 ${primary}`}><Sparkles className="inline w-4 h-4 mr-1.5" />Creează traseul</button>
        </div>}
      </div>

      {attempted && !tour && <p role="status" className={`rounded-[6px] border p-4 text-[13px] ${panel}`}>Nu am găsit suficiente localuri pentru aceste alegeri și buget. Încearcă alte categorii, un buget mai mare sau mai puține opriri.</p>}
      {tour && <div className="space-y-4 stagger-fade-in" aria-live="polite">
        <div>
          <h3 className="font-display text-[24px]">Traseul tău</h3>
          <p className={`text-[13px] ${muted}`}>Plecare: {LANDMARKS[landmark].label} · {tour.approximateDistanceKm.toFixed(1).replace('.', ',')} km în linie dreaptă, orientativ</p>
        </div>
        <div className="space-y-3">
          {tour.stops.map(({ restaurant, item, category }, index) => <div key={restaurant.id} className={`rounded-[6px] border p-4 sm:p-5 space-y-3 ${isDrink ? 'bg-[#17382C] border-[#2D5947]' : 'bg-white border-[#E6DFD5] shadow-sm'}`}>
            <div className="flex items-start gap-3">
              <span className={`flex shrink-0 items-center justify-center w-8 h-8 rounded-full text-[13px] font-bold ${primary}`}>{index + 1}</span>
              <div className="min-w-0 space-y-1">
                <h4 className="font-display text-[22px] leading-tight">{restaurant.name}</h4>
                <p className={`text-[12px] ${muted}`}><MapPin className="inline w-3 h-3 mr-1" />{restaurant.shortNeighborhood ?? restaurant.neighborhood} · Scor Onest <HonestValue score={restaurant.foodQualityScore} /></p>
              </div>
            </div>
            <p className="text-[14px]"><strong>{item.name}</strong> · {item.priceRon} lei</p>
            {googleData?.prices[index] && <div className="border rounded-[4px] px-3 py-2 text-[12px] bg-white text-[#1F1F1F]">
              <span>Interval indicativ per persoană: {googleData.prices[index]!.start ?? '—'}–{googleData.prices[index]!.end ?? '…'} {googleData.prices[index]!.currency}</span>
              <span className="block text-[12px] font-normal text-[#5E5E5E] whitespace-nowrap">{googleData.prices[index]!.attribution}</span>
            </div>}
            <p className={`text-[12px] ${muted}`}>Potrivire pentru {TASTE_CATEGORIES.find((entry) => entry.id === category)?.label.toLowerCase() ?? category}.</p>
            <button type="button" onClick={() => onSelectRestaurant(restaurant)} className={`btn-press inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-2 text-[12px] font-bold ${border}`}>Vezi localul <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>)}
        </div>
        <div className={`rounded-[6px] border p-4 space-y-3 ${panel}`}>
          <p className="text-[14px] font-bold">Total estimat: {tour.totalRon} lei / persoană</p>
          {loadingGoogle && <p className={`text-[12px] ${muted}`}>Calculăm distanța pe jos și intervalele de preț…</p>}
          {googleData?.route && <div className="border rounded-[4px] px-3 py-2 text-[12px] bg-white text-[#1F1F1F] space-y-1">
            <p>Traseu pe jos: {(googleData.route.distanceMeters / 1000).toFixed(1).replace('.', ',')} km · aproximativ {Math.ceil(googleData.route.durationSeconds / 60)} min de mers</p>
            {googleData.route.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            <span className="block text-[12px] font-normal text-[#5E5E5E] whitespace-nowrap">{googleData.route.attribution}</span>
          </div>}
          <p className={`text-[12px] ${muted}`}>Prețurile sunt orientative și se pot schimba. Ordinea traseului este estimată; verifică ruta și programul localurilor înainte de plecare.</p>
          {mapsLink && <a href={mapsLink} target="_blank" rel="noreferrer" className={`btn-press inline-flex items-center gap-2 rounded-[4px] px-4 py-2.5 text-[13px] font-bold ${primary}`}><Navigation className="w-4 h-4" />Deschide traseul în Google Maps</a>}
        </div>
      </div>}
    </div>
  );
};
