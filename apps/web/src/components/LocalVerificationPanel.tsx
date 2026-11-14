'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Mail } from 'lucide-react';
import { checkInHere, confirmEmailVerification, localStatus, startEmailVerification } from '@/app/actions/local';
import type { Vertical } from '../types';

/**
 * „Devino localnic verificat” în panoul de profil (doar pentru userii care nu sunt încă localnici).
 * Accesibilitate: butoanele nu se dezactivează sub focus (aria-disabled), zona de mesaje există mereu.
 */
export function LocalVerificationPanel({ vertical }: { vertical: Vertical }) {
  const isDrink = vertical === 'drink';
  const router = useRouter();
  const ids = { email: useId(), code: useId() };
  const codeRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ days: number; needed: number } | null>(null);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);

  useEffect(() => {
    void localStatus().then((r) => {
      if (r.ok) setProgress({ days: r.days, needed: r.needed });
    });
  }, []);

  const done = (text: string) => {
    setMsg({ text, error: false });
    router.refresh();
  };

  const checkIn = () => {
    if (busy) return;
    if (!('geolocation' in navigator)) return setMsg({ text: 'Browserul tău nu poate da locația.', error: true });
    setBusy(true);
    setMsg({ text: 'Caut locația…', error: false });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await checkInHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBusy(false);
        if (!r.ok) return setMsg({ text: r.error, error: true });
        setProgress({ days: r.days, needed: r.needed });
        if (r.becameLocal) done(r.message);
        else setMsg({ text: r.message, error: false });
      },
      () => {
        setBusy(false);
        setMsg({ text: 'N-am primit acces la locație. Poți folosi emailul universitar.', error: true });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const r = await startEmailVerification(email);
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.error, error: true });
    setVerificationId(r.verificationId);
    setMsg({ text: r.message, error: false });
    requestAnimationFrame(() => codeRef.current?.focus());
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !verificationId) return;
    setBusy(true);
    const r = await confirmEmailVerification(verificationId, code);
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.error, error: true });
    done(r.message);
  };

  const t = isDrink
    ? { muted: 'text-[#F4EEE2]/75', border: 'border-[#285443]', input: 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2]', primary: 'bg-[#F2A33A] text-[#17382C]', quiet: 'border-[#285443]', error: 'text-[#FF7A70]' }
    : { muted: 'text-[#6E5649]', border: 'border-[#E6DFD5]', input: 'bg-white border-[#D6CFC5] text-[#3A2418]', primary: 'bg-[#1F4E8C] text-white', quiet: 'border-[#D6CFC5]', error: 'text-[#B3261E]' };
  const btn = 'btn-press min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[4px] text-[13px] font-bold aria-disabled:opacity-60';

  return (
    <section aria-labelledby="localnic-titlu" className={`pt-3 mt-1 border-t ${t.border} space-y-2.5`}>
      <h3 id="localnic-titlu" className="text-[13px] font-bold">Devino localnic verificat (2,0×)</h3>
      <p className={`text-[12px] ${t.muted}`}>
        Check-in în Timișoara în {progress?.needed ?? 5} zile diferite din 30, sau emailul de la facultate.
        {progress ? ` Ai ${progress.days} din ${progress.needed} zile.` : ''} Păstrăm doar ziua, nu locul exact.
      </p>
      <button type="button" onClick={checkIn} aria-disabled={busy} className={`${btn} w-full ${t.primary}`}>
        <MapPin className="w-4 h-4" aria-hidden="true" /> Fac check-in acum
      </button>

      {!verificationId ? (
        <form onSubmit={sendCode} className="flex flex-col gap-1.5">
          <label htmlFor={ids.email} className="text-[12px] font-semibold">Email de la facultate</label>
          <div className="flex gap-1.5">
            <input id={ids.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nume@e-uvt.ro" autoComplete="email" className={`min-w-0 flex-1 min-h-[44px] px-3 rounded-[4px] border text-[16px] sm:text-[13px] ${t.input}`} />
            <button type="submit" aria-disabled={busy} className={`${btn} border ${t.quiet}`}>
              <Mail className="w-4 h-4" aria-hidden="true" /> Trimite cod
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={confirm} className="flex flex-col gap-1.5">
          <label htmlFor={ids.code} className="text-[12px] font-semibold">Codul primit</label>
          <div className="flex gap-1.5">
            <input id={ids.code} ref={codeRef} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} className={`min-w-0 flex-1 min-h-[44px] px-3 rounded-[4px] border text-[16px] sm:text-[13px] ${t.input}`} />
            <button type="submit" aria-disabled={busy} className={`${btn} ${t.primary}`}>Confirmă</button>
          </div>
        </form>
      )}

      <div role="status" aria-live="polite">{msg && !msg.error ? <p className="text-[12px] font-semibold">{msg.text}</p> : null}</div>
      <div role="alert">{msg?.error ? <p className={`text-[12px] font-semibold ${t.error}`}>{msg.text}</p> : null}</div>
    </section>
  );
}
