'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { stampFidelity } from '@/app/actions/loyalty';

/** BarcodeDetector nu e încă în tipurile TypeScript din DOM. */
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/**
 * „Scanează codul de la casă”: camera citește QR-ul afișat de local (/owner/…/fidelitate) și pune ștampila.
 * Unde browserul nu are BarcodeDetector (ex. Safari, Firefox), se poate introduce codul de sub QR.
 * Codul are forma `{programId}.{minut}.{semnătură}` și expiră într-un minut.
 */
export function QrScanPanel({ isDrink, onResult }: { isDrink: boolean; onResult: (message: string, isError: boolean) => void }) {
  const ids = { code: useId(), title: useId() };
  const videoRef = useRef<HTMLVideoElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (code: string) => {
    const clean = code.trim();
    const programId = clean.split('.')[0];
    if (!programId || clean.split('.').length !== 3) return onResult('Codul nu pare un cod de fidelitate topfood.', true);
    setBusy(true);
    const r = await stampFidelity(programId, clean);
    setBusy(false);
    onResult(r.ok ? r.message : r.error, !r.ok);
    if (r.ok) close();
  };

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => openRef.current?.focus());
  };

  // Butonul care l-a deschis dispare: focusul trece pe „Închide scanarea”
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Pornește camera și caută QR-uri cât e deschis panoul
  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    const start = async () => {
      if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
        setCameraNote('Browserul tău nu poate citi coduri QR cu camera. Scrie codul de sub QR.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraNote('Îndreaptă camera spre codul QR de la casă.');
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found[0]?.rawValue) {
              stopped = true;
              await submit(found[0].rawValue);
              return;
            }
          } catch {
            // cadrul video nu e gata încă; încercăm din nou
          }
          window.setTimeout(tick, 400);
        };
        void tick();
      } catch {
        setCameraNote('N-am primit acces la cameră. Scrie codul de sub QR.');
      }
    };
    void start();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const t = isDrink
    ? { box: 'bg-[#143025] border-[#264D3E] text-[#F4EEE2]', input: 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2]', primary: 'bg-[#F2A33A] text-[#17382C]', muted: 'text-[#F4EEE2]/75' }
    : { box: 'bg-white border-[#E8E2D9] text-[#3A2418]', input: 'bg-white border-[#D6CFC5] text-[#3A2418]', primary: 'bg-[#3A2418] text-white', muted: 'text-[#6E5649]' };
  const btn = 'btn-press min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[6px] text-[14px] font-bold aria-disabled:opacity-60';

  if (!open) {
    return (
      <button ref={openRef} type="button" onClick={() => setOpen(true)} className={`${btn} ${t.primary} mb-6`}>
        <Camera className="w-4 h-4" aria-hidden="true" /> Scanează codul QR de la casă
      </button>
    );
  }

  return (
    <section aria-labelledby={ids.title} className={`mb-6 rounded-xl border p-4 space-y-3 ${t.box}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 id={ids.title} className="text-[15px] font-bold">Scanează codul de la casă</h3>
        <button ref={closeRef} type="button" onClick={close} aria-label="Închide scanarea" className="btn-press w-11 h-11 inline-flex items-center justify-center rounded-full">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <video ref={videoRef} muted playsInline aria-label="Imaginea de la cameră" className="w-full max-w-sm rounded-[6px] bg-black aspect-square object-cover" />
      <p className={`text-[13px] ${t.muted}`} role="status">{cameraNote ?? 'Pornesc camera…'}</p>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit(manual);
        }}
      >
        <label htmlFor={ids.code} className="text-[13px] font-semibold">Sau scrie codul de sub QR</label>
        <div className="flex gap-2">
          <input id={ids.code} value={manual} onChange={(e) => setManual(e.target.value)} autoComplete="off" spellCheck={false} className={`min-w-0 flex-1 min-h-[44px] px-3 rounded-[6px] border text-[16px] sm:text-[14px] ${t.input}`} />
          <button type="submit" aria-disabled={busy} className={`${btn} ${t.primary}`}>
            {busy ? 'Se verifică…' : 'Pune ștampila'}
          </button>
        </div>
      </form>
    </section>
  );
}
