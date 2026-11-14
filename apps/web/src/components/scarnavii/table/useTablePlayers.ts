'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_PLAYERS, cleanName, parseStoredPlayers, withMyName } from './tableGames';

export interface TablePlayer {
  id: string;
  name: string;
}

const STORAGE_KEY = 'tftd:table-players:v1';

/** Jucătorii mesei: doar numele se salvează în browser; id-urile sunt ale sesiunii. `myName` (cel logat) intră primul. */
export function useTablePlayers(myName?: string | null) {
  const [players, setPlayers] = useState<TablePlayer[]>([]);
  const [ready, setReady] = useState(false);
  const counter = useRef(0);
  const makeId = useCallback(() => `seat-${(counter.current += 1)}`, []);

  // Citim după montare, ca HTML-ul de pe server să fie identic cu prima randare.
  useEffect(() => {
    let names: string[] = [];
    try {
      names = parseStoredPlayers(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // fără storage, jocul merge fără salvare
    }
    setPlayers(names.map((name) => ({ id: makeId(), name })));
    setReady(true);
  }, [makeId]);

  // Scriem doar după citire, altfel lista goală inițială ar șterge numele salvate.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(players.map((p) => p.name)));
    } catch {
      // fără storage, jocul merge fără salvare
    }
  }, [players, ready]);

  // După citire (și la logare), numele tău e primul la masă dacă nu e deja.
  useEffect(() => {
    if (!ready || !myName) return;
    setPlayers((prev) => {
      const base = prev.map((p) => p.name);
      const names = withMyName(base, myName);
      return names === base ? prev : [{ id: makeId(), name: names[0] }, ...prev].slice(0, MAX_PLAYERS);
    });
  }, [ready, myName, makeId]);

  const rename = useCallback((id: string, name: string) => {
    const clean = cleanName(name);
    if (clean) setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: clean } : p))); // gol → rămâne numele vechi
  }, []);

  const add = useCallback(
    (name: string) => {
      const clean = cleanName(name);
      if (clean) setPlayers((prev) => (prev.length >= MAX_PLAYERS ? prev : [...prev, { id: makeId(), name: clean }]));
    },
    [makeId],
  );

  const remove = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { players, rename, add, remove, ready };
}
