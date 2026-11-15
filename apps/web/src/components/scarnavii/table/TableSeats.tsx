'use client';

import React, { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MAX_NAME, MAX_PLAYERS } from './tableGames';
import type { TableTheme } from './theme';
import type { TablePlayer } from './useTablePlayers';

interface TableSeatsProps {
  players: TablePlayer[];
  theme: TableTheme;
  min: number;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

export function TableSeats({ players, theme, min, onAdd, onRename, onRemove }: TableSeatsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const full = players.length >= MAX_PLAYERS;
  const missing = min - players.length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || full) return;
    onAdd(draft);
    setDraft('');
    inputRef.current?.focus(); // rămâi în câmp, ca să scrii următorul nume
  };

  return (
    <section aria-label="Cine e la masă?" className="space-y-3">
      <h2 className="font-display text-[24px] leading-none">Cine e la masă?</h2>
      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={inputRef}
          name="jucator"
          autoComplete="off"
          enterKeyHint="done"
          value={draft}
          maxLength={MAX_NAME}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={full ? 'Masa e plină' : 'Numele unui jucător…'}
          aria-label="Numele unui jucător"
          className={`flex-1 min-w-0 h-12 px-3 rounded-[6px] border-2 text-[16px] disabled:opacity-60 ${theme.seat} ${theme.placeholder}`}
        />
        <button type="submit" disabled={!draft.trim() || full} className={`btn-press shrink-0 inline-flex items-center gap-1.5 h-12 px-4 rounded-[6px] text-[16px] font-bold disabled:opacity-50 ${theme.primary}`}>
          <Plus className="w-5 h-5" aria-hidden="true" />
          Adaugă
        </button>
      </form>

      {players.length > 0 && (
        <ul className="flex gap-3 overflow-x-auto snap-x pb-1 -mx-1 px-1">
          {players.map((p) => (
            <li key={p.id} className={`snap-start shrink-0 flex flex-col items-center gap-1 ${editingId === p.id ? 'w-40' : 'w-[76px]'}`}>
              <span aria-hidden="true" className={`w-14 h-14 grid place-items-center rounded-full border-2 font-display text-[26px] ${theme.seat}`}>
                {p.name.charAt(0).toUpperCase()}
              </span>
              {editingId === p.id ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    name="nume"
                    autoComplete="off"
                    defaultValue={p.name}
                    maxLength={MAX_NAME}
                    aria-label={`Numele pentru ${p.name}`}
                    enterKeyHint="done"
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    onBlur={(e) => {
                      onRename(p.id, e.currentTarget.value);
                      setEditingId(null);
                    }}
                    className={`w-[104px] h-11 px-2 rounded-[4px] border text-[16px] ${theme.seat}`}
                  />
                  <button
                    type="button"
                    // fără asta, blur-ul din input închide editarea înainte de click
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setEditingId(null);
                      onRemove(p.id);
                    }}
                    aria-label={`Scoate-l pe ${p.name}`}
                    className={`btn-press w-11 h-11 grid place-items-center rounded-full ${theme.danger}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingId(p.id)}
                  aria-label={`Schimbă numele: ${p.name}`}
                  className="min-h-11 w-full px-1 text-[13px] font-semibold truncate"
                >
                  {p.name}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {missing > 0 && min > 0 && (
        <p className={`text-[14px] ${theme.muted}`}>
          {missing === 1 ? 'Mai trebuie cel puțin încă un jucător.' : `Mai trebuie ${missing} jucători.`}
        </p>
      )}
    </section>
  );
}
