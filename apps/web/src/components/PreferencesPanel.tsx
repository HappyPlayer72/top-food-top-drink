'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { INTERESTS, type Interest } from '@tftd/scoring/features';
import { savePreferences } from '@/app/actions/user';
import type { UserAccount } from '../types';

/** Alegerea preferințelor: aceeași listă la înregistrare și în profil. Nimic obligatoriu. */
export function InterestPicker({
  selected,
  onToggle,
  dark,
  labelledBy,
  twoColumns = false,
}: {
  selected: readonly Interest[];
  onToggle: (k: Interest) => void;
  dark: boolean;
  labelledBy: string;
  /** Pe ecranul de înregistrare e loc de două coloane; în panoul de profil (îngust), una. */
  twoColumns?: boolean;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className={`grid grid-cols-1 gap-2 ${twoColumns ? 'sm:grid-cols-2' : ''}`}>
      {INTERESTS.map((opt) => {
        const on = selected.includes(opt.key);
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(opt.key)}
            className={`btn-press min-h-[44px] px-3 py-2 rounded-[4px] border text-left flex items-start justify-between gap-2 ${
              on
                ? dark
                  ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] border-[#3A2418] text-white'
                : dark
                  ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'bg-white border-[#E6DFD5] text-[#3A2418] hover:border-[#3A2418]'
            }`}
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-snug">{opt.label}</span>
              <span className={`block text-[11px] leading-snug ${on ? 'opacity-85' : dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>{opt.hint}</span>
            </span>
            <span aria-hidden="true" className="w-4 h-4 mt-0.5 rounded-[3px] border border-current flex items-center justify-center shrink-0">
              {on && <Check className="w-3 h-3 stroke-[2.75]" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** „Preferințele mele” din panoul de profil: se salvează pe server și schimbă întrebările și ordinea topurilor. */
export function PreferencesPanel({ user, dark, backendOnline, onSaved }: { user: UserAccount; dark: boolean; backendOnline: boolean; onSaved: (u: UserAccount) => void }) {
  const [selected, setSelected] = useState<Interest[]>(user.interests ?? []);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const toggle = (k: Interest) => setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      if (!backendOnline) {
        onSaved({ ...user, interests: selected });
        setStatus({ ok: true, text: 'Preferințe salvate.' });
        return;
      }
      const res = await savePreferences(selected);
      if (res.ok) {
        onSaved(res.user);
        setStatus({ ok: true, text: 'Preferințe salvate.' });
      } else setStatus({ ok: false, text: res.error });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="prefs-title" className={`space-y-2.5 pt-3 border-t ${dark ? 'border-[#285443]' : 'border-[#E6DFD5]'}`}>
      <div>
        <h3 id="prefs-title" className="text-[14px] font-bold">
          Preferințele mele
        </h3>
        <p className={`text-[12px] leading-snug ${dark ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>
          Opțional. Alegem după ele întrebările din review și ordinea topurilor; toate topurile rămân disponibile.
        </p>
      </div>
      <InterestPicker selected={selected} onToggle={toggle} dark={dark} labelledBy="prefs-title" />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`btn-press min-h-[44px] px-4 rounded-[4px] text-[14px] font-bold disabled:opacity-60 ${dark ? 'bg-[#F2A33A] text-[#17382C]' : 'bg-[#B3261E] text-white'}`}
        >
          {saving ? 'Se salvează…' : 'Salvează preferințele'}
        </button>
        {status && (
          <p role="status" className={`text-[13px] font-semibold ${status.ok ? '' : dark ? 'text-[#FFB4AB]' : 'text-[#9E1F18]'}`}>
            {status.text}
          </p>
        )}
      </div>
    </section>
  );
}
