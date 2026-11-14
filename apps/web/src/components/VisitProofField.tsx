'use client';
/**
 * „Dovedește vizita” în formularul de review: check-in GPS la local sau poza bonului.
 * Review-ul cu vizita dovedită cântărește ×1,3 (docs/ARHITECTURA.md → Scoring).
 * Starea (check-in făcut, poza aleasă) o ține formularul, ca s-o trimită după publicarea review-ului.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, MapPin, Receipt, X } from 'lucide-react';
import { checkInAtVenue } from '@/app/actions/visits';

export type VisitProofState = { checkedIn: boolean; receipt: Blob | null };
export const EMPTY_VISIT_PROOF: VisitProofState = { checkedIn: false, receipt: null };

const MAX_SIDE = 1600;
const MAX_BYTES = 2_000_000;

/** Micșorează poza în browser (JPEG, max 1600 px), ca bonul să rămână lizibil dar sub 2 MB. */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error('Poza e prea mare chiar și micșorată.');
}

function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Telefonul nu ne poate da locația.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? 'Ai refuzat accesul la locație. Poți atașa în schimb poza bonului.'
              : 'Nu am putut afla locația. Încearcă din nou sau atașează bonul.'
          )
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  });
}

export function VisitProofField({
  venueId,
  value,
  onChange,
  isDrink,
}: {
  venueId: string;
  value: VisitProofState;
  onChange: (next: VisitProofState) => void;
  isDrink: boolean;
}) {
  const [busy, setBusy] = useState<'gps' | 'receipt' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const ids = useId();

  useEffect(() => {
    if (!value.receipt) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value.receipt);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value.receipt]);

  useEffect(() => {
    if (!value.checkedIn && !value.receipt) {
      setMessage(null);
      setError(null);
    }
  }, [value.checkedIn, value.receipt]);

  const handleCheckIn = async () => {
    setBusy('gps');
    setError(null);
    try {
      let res = await checkInAtVenue(venueId);
      if (!res.ok && 'needLocation' in res) res = await checkInAtVenue(venueId, await currentPosition());
      if (res.ok) {
        onChange({ checkedIn: true, receipt: null });
        setMessage(res.message);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in-ul nu a mers.');
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Alege o poză (JPEG, PNG sau WebP).');
      return;
    }
    setBusy('receipt');
    try {
      onChange({ checkedIn: false, receipt: await shrinkImage(file) });
      setMessage('Bonul se trimite la verificare odată cu review-ul. Îl vede doar un admin și se șterge după verificare.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nu am putut citi poza.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const chip = (active: boolean) =>
    `btn-press min-h-[44px] px-3 py-2 rounded-[4px] border text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-60 ${
      active
        ? isDrink
          ? 'bg-[#1E4335] border-[#A7F3D0]/60 text-[#A7F3D0]'
          : 'bg-[#ECF7F0] border-[#1E6B43]/40 text-[#1E6B43]'
        : isDrink
        ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
        : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
    }`;
  const muted = isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]';

  return (
    <fieldset className="space-y-2" aria-describedby={`${ids}-help`}>
      <legend className="text-[13px] font-semibold">
        Dovedește vizita <span className={`font-normal ${muted}`}>(opțional, review-ul contează ×1,3)</span>
      </legend>
      <p id={`${ids}-help`} className={`text-[12px] ${muted}`}>
        Check-in când ești la local (păstrăm doar ziua, nu locația) sau poza bonului.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleCheckIn} disabled={busy !== null || value.checkedIn} className={chip(value.checkedIn)}>
          {value.checkedIn ? <Check className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
          {busy === 'gps' ? 'Caut locația…' : value.checkedIn ? 'Check-in făcut azi' : 'Sunt aici acum'}
        </button>

        {!value.checkedIn && (
          <>
            <input
              ref={fileRef}
              id={`${ids}-receipt`}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <label htmlFor={`${ids}-receipt`} className={`${chip(!!value.receipt)} cursor-pointer`} aria-disabled={busy !== null}>
              {value.receipt ? <Check className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
              {busy === 'receipt' ? 'Pregătesc poza…' : value.receipt ? 'Bon atașat' : 'Atașează bonul'}
            </label>
          </>
        )}
      </div>

      {preview && (
        <div className="flex items-center gap-3">
          {/* Previzualizare locală (blob:), nu pleacă nicăieri până la publicare */}
          <img src={preview} alt="Poza bonului atașată" className="h-16 w-16 rounded-[4px] border object-cover" />
          <button
            type="button"
            onClick={() => onChange({ checkedIn: false, receipt: null })}
            className={`btn-press min-h-[44px] px-2 inline-flex items-center gap-1 text-[13px] font-semibold underline ${muted}`}
          >
            <X className="w-4 h-4" /> Scoate bonul
          </button>
        </div>
      )}

      <p role="status" aria-live="polite" className={`text-[12px] ${error ? 'font-semibold ' + (isDrink ? 'text-[#FFB4AB]' : 'text-[#9E1F18]') : muted}`}>
        {error ?? message ?? ''}
      </p>
    </fieldset>
  );
}
