'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HonestValue } from '../BrandPrimitives';
import {
  ArrowRight,
  Compass,
  ExternalLink,
  Eye,
  Footprints,
  Lightbulb,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { Coordinates, Restaurant, Vertical, formatHonest, formatScore } from '../../types';

export interface MysteryDirectionsProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  onSelectRestaurant: (r: Restaurant) => void;
}

type DistanceFilter = 'any' | 'walk-short' | 'walk-medium';

const DISTANCE_OPTIONS: { id: DistanceFilter; label: string; maxMeters: number | null }[] = [
  { id: 'any', label: 'Oricât', maxMeters: null },
  { id: 'walk-short', label: 'Sub 1,2 km', maxMeters: 1200 },
  { id: 'walk-medium', label: 'Sub 2,5 km', maxMeters: 2500 },
];

const STARTING_LANDMARKS: { id: string; label: string; coords: Coordinates }[] = [
  {
    id: 'unirii',
    label: 'Piața Unirii',
    coords: { lat: 45.758, lng: 21.229 },
  },
  {
    id: 'victoriei',
    label: 'Piața Victoriei',
    coords: { lat: 45.7536, lng: 21.2257 },
  },
  {
    id: 'complex',
    label: 'Complexul Studențesc',
    coords: { lat: 45.7478, lng: 21.2412 },
  },
  {
    id: 'iosefin',
    label: 'Piața Maria (Iosefin)',
    coords: { lat: 45.7488, lng: 21.2156 },
  },
  {
    id: 'bastion',
    label: 'Bastionul Theresia',
    coords: { lat: 45.7568, lng: 21.2335 },
  },
];

const ARRIVAL_THRESHOLD_M = 45;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function haversineMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeBearingDeg(from: Coordinates, to: Coordinates): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function bearingToRomanianDirection(deg: number): {
  short: string;
  full: string;
} {
  const dirs = [
    { short: 'N', full: 'Nord' },
    { short: 'NE', full: 'Nord-Est' },
    { short: 'E', full: 'Est' },
    { short: 'SE', full: 'Sud-Est' },
    { short: 'S', full: 'Sud' },
    { short: 'SV', full: 'Sud-Vest' },
    { short: 'V', full: 'Vest' },
    { short: 'NV', full: 'Nord-Vest' },
  ];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export const MysteryDirections: React.FC<MysteryDirectionsProps> = ({
  vertical,
  restaurants,
  onSelectRestaurant,
}) => {
  const isDrink = vertical === 'drink';

  const [noTrapsOnly, setNoTrapsOnly] = useState(true);
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('any');
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('unirii');
  const [currentCoords, setCurrentCoords] = useState<Coordinates>(
    STARTING_LANDMARKS[0].coords
  );
  const [initialDistanceM, setInitialDistanceM] = useState<number | null>(null);

  const [targetVenue, setTargetVenue] = useState<Restaurant | null>(null);
  const [isArrived, setIsArrived] = useState(false);
  const [unlockedClues, setUnlockedClues] = useState<number>(0);

  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const originCoords = useMemo(() => {
    if (gpsActive) return currentCoords;
    return (
      STARTING_LANDMARKS.find((l) => l.id === selectedLandmarkId)?.coords ??
      STARTING_LANDMARKS[0].coords
    );
  }, [gpsActive, currentCoords, selectedLandmarkId]);

  const pool = useMemo(() => {
    const trapFiltered = noTrapsOnly
      ? restaurants.filter((r) => r.touristTrapIndex <= 25)
      : restaurants;
    const basePool = trapFiltered.length > 0 ? trapFiltered : restaurants;

    const maxM =
      DISTANCE_OPTIONS.find((d) => d.id === distanceFilter)?.maxMeters ?? null;
    if (maxM === null) return basePool;

    const withinRange = basePool.filter(
      (r) => haversineMeters(originCoords, r.coordinates) <= maxM
    );
    return withinRange.length > 0 ? withinRange : basePool;
  }, [restaurants, noTrapsOnly, distanceFilter, originCoords]);

  const stopGps = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsActive(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const startMystery = () => {
    if (pool.length === 0) return;
    const candidates =
      pool.length > 1 && targetVenue
        ? pool.filter((r) => r.id !== targetVenue.id)
        : pool;
    const picked =
      candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];

    const startLandmark =
      STARTING_LANDMARKS.find((l) => l.id === selectedLandmarkId) ??
      STARTING_LANDMARKS[0];
    const startPos = gpsActive ? currentCoords : startLandmark.coords;

    if (!gpsActive) {
      setCurrentCoords(startPos);
    }
    setTargetVenue(picked);
    setIsArrived(false);
    setUnlockedClues(0);
    setInitialDistanceM(
      Math.max(100, haversineMeters(startPos, picked.coordinates))
    );
  };

  const handleEnableGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Browserul nu suportă localizare GPS.');
      return;
    }
    setGpsError(null);
    setGpsActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: Coordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentCoords(next);
        if (targetVenue) {
          const dist = haversineMeters(next, targetVenue.coordinates);
          if (dist <= ARRIVAL_THRESHOLD_M) {
            setIsArrived(true);
          }
        }
      },
      () => {
        setGpsError(
          'Nu am putut obține poziția GPS. Poți folosi un punct de plecare din Timișoara.'
        );
        stopGps();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const handleSelectLandmark = (id: string) => {
    stopGps();
    setGpsError(null);
    setSelectedLandmarkId(id);
    const lm = STARTING_LANDMARKS.find((l) => l.id === id);
    if (lm) {
      setCurrentCoords(lm.coords);
      if (targetVenue) {
        setInitialDistanceM(
          Math.max(100, haversineMeters(lm.coords, targetVenue.coordinates))
        );
      }
    }
  };

  const handleSimulateStep = () => {
    if (!targetVenue || isArrived) return;
    stopGps();
    const dist = haversineMeters(currentCoords, targetVenue.coordinates);
    if (dist <= 130) {
      setCurrentCoords(targetVenue.coordinates);
      setIsArrived(true);
      return;
    }
    // Move ~30% closer each tap
    const ratio = 0.32;
    const next: Coordinates = {
      lat:
        currentCoords.lat +
        (targetVenue.coordinates.lat - currentCoords.lat) * ratio,
      lng:
        currentCoords.lng +
        (targetVenue.coordinates.lng - currentCoords.lng) * ratio,
    };
    setCurrentCoords(next);
    if (haversineMeters(next, targetVenue.coordinates) <= ARRIVAL_THRESHOLD_M) {
      setIsArrived(true);
    }
  };

  const distanceM = targetVenue
    ? haversineMeters(currentCoords, targetVenue.coordinates)
    : 0;
  const bearingDeg = targetVenue
    ? computeBearingDeg(currentCoords, targetVenue.coordinates)
    : 0;
  const dirInfo = bearingToRomanianDirection(bearingDeg);
  const walkMinutes = Math.max(1, Math.round(distanceM / 78));
  const progressPct =
    targetVenue && initialDistanceM
      ? Math.min(
          100,
          Math.max(
            5,
            Math.round(((initialDistanceM - distanceM) / initialDistanceM) * 100)
          )
        )
      : 10;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Compass
            className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}
          />
          <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">
            Destinație secretă — doar pe indicații
          </h1>
        </div>
        <p
          className={`text-[13px] sm:text-[14px] ${
            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
          }`}
        >
          Alegem un local la întâmplare, dar nu îți spunem numele lui. Primești
          doar direcția și distanța — îl descoperi abia când ajungi la ușă.
        </p>
      </div>

      {/* Controls before or during route */}
      <div
        className={`rounded-[6px] border p-4 space-y-3 ${
          isDrink
            ? 'bg-[#143025] border-[#285443]'
            : 'bg-[#FAF8F5] border-[#E6DFD5]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
            Punct de plecare
          </span>
          <button
            type="button"
            onClick={gpsActive ? stopGps : handleEnableGps}
            className={`btn-press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-[12px] font-semibold ${
              gpsActive
                ? isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                  : 'bg-[#B3261E] text-white border-[#B3261E]'
                : isDrink
                ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
            }`}
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>{gpsActive ? 'GPS live activ' : 'Folosește GPS live'}</span>
          </button>
        </div>

        {!gpsActive && (
          <div className="flex flex-wrap gap-1.5">
            {STARTING_LANDMARKS.map((lm) => {
              const active = selectedLandmarkId === lm.id;
              return (
                <button
                  key={lm.id}
                  type="button"
                  onClick={() => handleSelectLandmark(lm.id)}
                  className={`btn-press px-2.5 py-1 rounded-[4px] text-[12px] font-semibold border ${
                    active
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'border-[#2D5947] text-[#F4EEE2]/80'
                      : 'border-[#D6CFC5] text-[#3A2418]'
                  }`}
                >
                  {lm.label}
                </button>
              );
            })}
          </div>
        )}

        {gpsError && (
          <p className="text-[12px] text-[#B3261E] font-medium">{gpsError}</p>
        )}

        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">
            Distanță maximă
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DISTANCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDistanceFilter(opt.id)}
                className={`btn-press px-2.5 py-1 rounded-[4px] text-[12px] font-semibold border ${
                  distanceFilter === opt.id
                    ? isDrink
                      ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                      : 'bg-[#3A2418] text-white border-[#3A2418]'
                    : isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2]/80'
                    : 'border-[#D6CFC5] text-[#3A2418]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noTrapsOnly}
              onChange={(e) => setNoTrapsOnly(e.target.checked)}
              className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'}
            />
            <span>Evită capcanele turistice</span>
          </label>

          <button
            type="button"
            onClick={startMystery}
            disabled={pool.length === 0}
            className={`btn-press inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] font-bold text-[14px] ${
              isDrink
                ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>
              {targetVenue ? 'Altă destinație secretă' : 'Pornește spre necunoscut'}
            </span>
          </button>
        </div>
      </div>

      {/* Active Navigation (Hidden Name) */}
      {targetVenue && !isArrived && (
        <div
          className={`rounded-[6px] border p-5 sm:p-6 space-y-5 stagger-fade-in ${
            isDrink
              ? 'bg-[#17382C] border-[#F2A33A]/50'
              : 'bg-white border-[#3A2418]/25 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wider ${
                isDrink
                  ? 'bg-[#F2A33A]/20 text-[#F2A33A]'
                  : 'bg-[#B3261E]/10 text-[#B3261E]'
              }`}
            >
              Local secret · Nume ascuns
            </span>
            <span className="text-[12px] font-semibold opacity-75">
              ~{walkMinutes} min pe jos
            </span>
          </div>

          {/* Compass & Distance */}
          <div className="flex flex-col sm:flex-row items-center gap-5 py-2">
            <div
              className={`w-24 h-24 rounded-full border-2 flex items-center justify-center relative shrink-0 ${
                isDrink
                  ? 'border-[#F2A33A] bg-[#143025]'
                  : 'border-[#B3261E] bg-[#FAF8F5]'
              }`}
              aria-label={`Direcția ${dirInfo.full}, ${Math.round(bearingDeg)} grade`}
            >
              <span className="absolute top-1.5 text-[10px] font-bold opacity-55">
                N
              </span>
              <div
                className="transition-transform duration-500 ease-out"
                style={{ transform: `rotate(${bearingDeg}deg)` }}
              >
                <Navigation
                  className={`w-9 h-9 ${
                    isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                  }`}
                />
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <div className="font-display text-[36px] sm:text-[42px] leading-none">
                {formatDistance(distanceM)}
              </div>
              <div className="text-[15px] font-semibold">
                Mergi spre{' '}
                <span
                  className={isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}
                >
                  {dirInfo.full} ({dirInfo.short})
                </span>
              </div>
              <p
                className={`text-[13px] ${
                  isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                }`}
              >
                Indicație zonă: în direcția{' '}
                <strong>{targetVenue.neighborhood}</strong> · Buget estimat{' '}
                <strong>{targetVenue.priceTier}</strong>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold opacity-70">
              <span>Progres traseu</span>
              <span>{progressPct}%</span>
            </div>
            <div
              className={`h-2 rounded-full overflow-hidden ${
                isDrink ? 'bg-[#143025]' : 'bg-[#F2EFE9]'
              }`}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  isDrink ? 'bg-[#F2A33A]' : 'bg-[#B3261E]'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Progressive Clues */}
          {unlockedClues > 0 && (
            <div
              className={`rounded-[4px] border p-3.5 space-y-1.5 text-[13px] ${
                isDrink
                  ? 'bg-[#143025] border-[#285443]'
                  : 'bg-[#FAF8F5] border-[#E6DFD5]'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                Indicii deblocate ({unlockedClues}/3)
              </div>
              {unlockedClues >= 1 && (
                <div>
                  <strong>1. Zonă & buget:</strong> {targetVenue.neighborhood} ·
                  ~{targetVenue.avgMealPriceRon} lei ({targetVenue.priceTier})
                </div>
              )}
              {unlockedClues >= 2 && (
                <div>
                  <strong>2. Specific & scor:</strong> {targetVenue.cuisine} ·
                  Scor Onest{' '}
                  <span className="tabular-nums">
                    <HonestValue score={targetVenue.foodQualityScore} />
                  </span>
                </div>
              )}
              {unlockedClues >= 3 && (
                <div>
                  <strong>3. Atmosferă:</strong> {targetVenue.editorialHeadline}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsArrived(true)}
              className={`btn-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] text-[13px] font-bold ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Am ajuns! Dezvăluie localul</span>
            </button>

            <button
              type="button"
              disabled={unlockedClues >= 3}
              onClick={() => setUnlockedClues((c) => Math.min(3, c + 1))}
              className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[4px] border text-[13px] font-semibold disabled:opacity-45 ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>
                {unlockedClues >= 3
                  ? 'Toate indiciile deblocate (3/3)'
                  : `Deblochează un indiciu (${unlockedClues}/3)`}
              </span>
            </button>

            {!gpsActive && (
              <button
                type="button"
                onClick={handleSimulateStep}
                className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[4px] border text-[13px] font-semibold ${
                  isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                    : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Mergi mai aproape (test)</span>
              </button>
            )}

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${targetVenue.coordinates.lat},${targetVenue.coordinates.lng}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[4px] border text-[13px] font-semibold ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2]/85 hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#6E5649] hover:text-[#3A2418]'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Doar coordonate pe Maps</span>
            </a>
          </div>
        </div>
      )}

      {/* Reveal Card */}
      {targetVenue && isArrived && (
        <div
          className={`rounded-[6px] border p-5 sm:p-6 space-y-4 stagger-fade-in ${
            isDrink
              ? 'bg-[#17382C] border-[#F2A33A]'
              : 'bg-white border-[#B3261E] shadow-sm'
          }`}
        >
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wide ${
              isDrink
                ? 'bg-[#F2A33A] text-[#17382C]'
                : 'bg-[#B3261E] text-white'
            }`}
          >
            Ai ajuns la destinație!
          </span>

          <div className="space-y-1">
            <h3 className="font-display text-[30px] sm:text-[36px] leading-tight">
              {targetVenue.name}
            </h3>
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] ${
                isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {targetVenue.address}
              </span>
              <span>· {targetVenue.cuisine}</span>
              <span>
                · Scor Onest <HonestValue score={targetVenue.foodQualityScore} />
              </span>
            </div>
          </div>

          <p className="text-[14px]">{targetVenue.editorialHeadline}</p>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onSelectRestaurant(targetVenue)}
              className={`btn-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] text-[13px] font-bold ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] text-white'
              }`}
            >
              <span>Deschide fișa localului</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={startMystery}
              className={`btn-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] border text-[13px] font-semibold ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Altă aventură</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
