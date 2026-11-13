'use client';

import React, { useId, useState } from 'react';
import { Globe, Plus } from 'lucide-react';
import { addVenueFromInternet, addVenueManually, searchVenues, type InternetResult } from '@/app/actions/venues';
import { TIMISOARA_NEIGHBORHOOD_ZONES } from '../data/timisoaraGeo';
import type { Vertical } from '../types';

/**
 * Apare sub „Niciun local nu corespunde căutării”: caută și pe internet, sau adaugă localul.
 * Folosit doar cu backend pornit (EditorialListView îl afișează când primește `canAddVenues`).
 */
export function AddVenuePanel({ vertical, query, onRequireLogin }: { vertical: Vertical; query: string; onRequireLogin?: () => void }) {
  const isDrink = vertical === 'drink';
  const ids = { name: useId(), address: useId(), hood: useId() };
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [results, setResults] = useState<InternetResult[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(query);
  const [address, setAddress] = useState('');
  const [hood, setHood] = useState(TIMISOARA_NEIGHBORHOOD_ZONES[0]?.name ?? 'Cetate');

  const run = async (fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fn();
      if (res.ok) setMessage({ text: res.message ?? '', error: false });
      else {
        setMessage({ text: res.error, error: true });
        if (/Intră în cont/.test(res.error)) onRequireLogin?.();
      }
      return res.ok;
    } finally {
      setBusy(false);
    }
  };

  const searchInternet = async () => {
    setBusy(true);
    setMessage(null);
    const res = await searchVenues(vertical, query);
    setBusy(false);
    if (!res.ok) return setMessage({ text: res.error, error: true });
    if (!res.internetSearched) {
      setResults([]);
      return setMessage({ text: 'Căutarea pe internet nu e activă încă (lipsește cheia Google). Poți adăuga localul mai jos.', error: false });
    }
    setResults(res.fromInternet);
    if (!res.fromInternet.length) setMessage({ text: 'Nici pe internet n-am găsit. Adaugă-l tu mai jos.', error: false });
  };

  const tone = isDrink
    ? { text: 'text-[#F4EEE2]', muted: 'text-[#F4EEE2]/75', border: 'border-[#285443]', input: 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2]', primary: 'bg-[#F2A33A] text-[#17382C]', quiet: 'border-[#285443] text-[#F4EEE2]' }
    : { text: 'text-[#3A2418]', muted: 'text-[#6E5649]', border: 'border-[#E6DFD5]', input: 'bg-white border-[#D6CFC5] text-[#3A2418]', primary: 'bg-[#3A2418] text-white', quiet: 'border-[#D6CFC5] text-[#3A2418]' };
  const btn = 'btn-press min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-[13px] font-semibold disabled:opacity-60';

  return (
    <section aria-label="Adaugă un local care lipsește" className={`pt-4 mt-2 border-t ${tone.border} space-y-3`}>
      <p className={`text-[13px] ${tone.muted}`}>Știi un loc bun care lipsește?</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={searchInternet} disabled={busy || query.trim().length < 2} className={`${btn} border ${tone.quiet}`}>
          <Globe className="w-4 h-4" aria-hidden="true" /> Caută „{query.trim()}” și pe internet
        </button>
        <button type="button" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm} className={`${btn} border ${tone.quiet}`}>
          <Plus className="w-4 h-4" aria-hidden="true" /> Adaugă localul
        </button>
      </div>

      {results && results.length > 0 && (
        <ul className="space-y-2" aria-label="Rezultate de pe internet">
          {results.map((r) => (
            <li key={r.placeId} className={`flex flex-wrap items-center justify-between gap-2 rounded-[4px] border ${tone.border} p-3`}>
              <span className={`text-[14px] ${tone.text}`}>
                <strong>{r.name}</strong>
                {r.address ? <span className={`block text-[12px] ${tone.muted}`}>{r.address}</span> : null}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => addVenueFromInternet(vertical, r.placeId))}
                className={`${btn} ${tone.primary}`}
              >
                Adaugă pe topfood
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => addVenueManually({ vertical, name, address, neighborhood: hood }));
            if (ok) setShowForm(false);
          }}
        >
          <div className="space-y-1">
            <label htmlFor={ids.name} className={`text-[13px] font-semibold ${tone.text}`}>Numele localului</label>
            <input id={ids.name} required value={name} onChange={(e) => setName(e.target.value)} className={`w-full min-h-[44px] px-3 rounded-[4px] border text-[16px] sm:text-[14px] ${tone.input}`} />
          </div>
          <div className="space-y-1">
            <label htmlFor={ids.address} className={`text-[13px] font-semibold ${tone.text}`}>Strada și numărul</label>
            <input id={ids.address} required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ex. Str. Alba Iulia 4" className={`w-full min-h-[44px] px-3 rounded-[4px] border text-[16px] sm:text-[14px] ${tone.input}`} />
          </div>
          <div className="space-y-1">
            <label htmlFor={ids.hood} className={`text-[13px] font-semibold ${tone.text}`}>Cartierul</label>
            <select id={ids.hood} value={hood} onChange={(e) => setHood(e.target.value)} className={`w-full min-h-[44px] px-3 rounded-[4px] border text-[16px] sm:text-[14px] ${tone.input}`}>
              {TIMISOARA_NEIGHBORHOOD_ZONES.map((z) => (
                <option key={z.id} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={busy} aria-busy={busy} className={`${btn} ${tone.primary}`}>
              Trimite localul
            </button>
          </div>
        </form>
      )}

      {message && (
        <p role={message.error ? 'alert' : 'status'} className={`text-[13px] font-semibold ${message.error ? 'text-[#B3261E]' : tone.text}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
