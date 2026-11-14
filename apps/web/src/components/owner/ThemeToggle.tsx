'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Mod luminos / întunecat pe /owner. Aceeași cheie și clasă `dark` pe <html> ca pe paginile publice (TopFoodShell). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('topfood-dark-mode') === 'true';
      setDark(saved);
      document.documentElement.classList.toggle('dark', saved);
    } catch {
      // fără localStorage rămâne modul luminos
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('topfood-dark-mode', String(next));
    } catch {
      // preferința nu se salvează, dar comutarea merge pe pagina curentă
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Comută la mod luminos' : 'Comută la mod întunecat'}
      title={dark ? 'Mod luminos' : 'Mod întunecat'}
      className="btn-press inline-flex h-11 w-11 items-center justify-center rounded-full text-o-fg hover:bg-o-fg/[0.07]"
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
