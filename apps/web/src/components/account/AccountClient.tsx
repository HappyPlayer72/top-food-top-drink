'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, LogOut, UserRound, X } from 'lucide-react';
import { loginDemo, logoutUser, toggleSavedVenueAction } from '@/app/actions/user';
import { LocalVerificationPanel } from '@/components/LocalVerificationPanel';
import { PreferencesPanel } from '@/components/PreferencesPanel';
import { ProfileAccountExtras } from '@/components/ProfileAccountExtras';
import { EmptyState } from '@/components/owner/ui';
import { buttonClass } from '@/components/owner/ui-classes';
import type { UserAccount } from '@/types';

/** Aceeași cheie ca TopFoodShell. Pentru userul logat lista vine de pe server (saved_venues); localStorage e doar rezervă. */
const SAVED_KEY = 'topfood-saved-ids';
const DEFAULT_SAVED = ['restaurant-nora'];

export type SavedVenue = { id: string; name: string; neighborhood: string | null; href: string };

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed: unknown = raw === null ? DEFAULT_SAVED : JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : DEFAULT_SAVED;
  } catch {
    return DEFAULT_SAVED;
  }
}

function writeLocal(ids: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // fără localStorage lista se schimbă doar pe pagina curentă
  }
}

/** `serverSlugs` = lista din contul userului (undefined = serverul nu a răspuns → lista din browser). */
export function SavedVenues({ venues, serverSlugs }: { venues: SavedVenue[]; serverSlugs?: string[] }) {
  const [ids, setIds] = useState<string[] | null>(serverSlugs ?? null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (serverSlugs) {
      // Ca în TopFoodShell: serverul e sursa, browserul ține o copie.
      setIds(serverSlugs);
      writeLocal(serverSlugs);
    } else {
      setIds(readLocal());
    }
  }, [serverSlugs]);

  const remove = async (id: string) => {
    const next = (ids ?? []).filter((x) => x !== id);
    setIds(next);
    writeLocal(next);
    setError(null);
    if (!serverSlugs) return;
    const res = await toggleSavedVenueAction(id, false);
    if (res.ok) {
      setIds(res.slugs);
      writeLocal(res.slugs);
    } else if (!res.offline) {
      setError(res.error);
    }
  };

  if (ids === null) return <p className="text-[14px] text-o-muted">Se încarcă lista…</p>;
  const saved = venues.filter((v) => ids.includes(v.id));
  if (!saved.length)
    return (
      <EmptyState title="Niciun local salvat" icon={<Bookmark size={24} aria-hidden="true" />}>
        Apasă pe semnul de carte din pagina unui local ca să îl salvezi aici.
      </EmptyState>
    );
  return (
    <>
    {error && <p role="alert" className="mb-2 text-[13px] text-o-muted">{error}</p>}
    <ul className="divide-y divide-o-line border-y border-o-line">
      {saved.map((v) => (
        <li key={v.id} className="flex items-center gap-2">
          <Link href={v.href} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[4px] py-2.5 hover:bg-o-fg/[0.05]">
            <Bookmark size={17} className="shrink-0 text-o-muted" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-o-fg">{v.name}</span>
              {v.neighborhood && <span className="block truncate text-[13px] text-o-muted">{v.neighborhood}</span>}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void remove(v.id)}
            aria-label={`Șterge ${v.name} din salvate`}
            className="btn-press inline-flex size-11 shrink-0 items-center justify-center rounded-[4px] text-o-muted hover:bg-o-fg/[0.07] hover:text-o-fg"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
    </>
  );
}

/** Preferințele se salvează pe server (`savePreferences`); după salvare reîncărcăm datele paginii. */
export function PreferencesSection({ user }: { user: UserAccount }) {
  const router = useRouter();
  return <PreferencesPanel user={user} dark={false} backendOnline onSaved={() => router.refresh()} />;
}

export function VerificationSection() {
  const router = useRouter();
  return <LocalVerificationPanel vertical="food" onVerified={() => router.refresh()} />;
}

/** Linkurile sociale verificate și invitațiile de angajat (serban), mutate aici din meniul de profil. */
export function SocialAndTeamSection({ user }: { user: UserAccount }) {
  const router = useRouter();
  return (
    <ProfileAccountExtras
      user={user}
      vertical="food"
      showLocalVerification={false}
      onUserUpdated={() => router.refresh()}
    />
  );
}

/** Conturile demo de pe ecranul de login (aceeași listă ca în actions/user.ts). */
const DEMO_ACCOUNTS = [
  { email: 'andreea@e-uvt.ro', name: 'Andreea', note: 'localnic' },
  { email: 'luca@visit.ro', name: 'Luca', note: 'turist' },
];

export function AccountActions({ email }: { email?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isDemo = DEMO_ACCOUNTS.some((a) => a.email === email);

  const switchTo = (target: string) =>
    start(async () => {
      setError(null);
      const res = await loginDemo(target);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  const logout = () =>
    start(async () => {
      await logoutUser();
      router.push('/topfood/timisoara');
      router.refresh();
    });

  return (
    <div className="space-y-5">
      {isDemo && (
        <fieldset className="space-y-2" disabled={pending}>
          <legend className="text-[14px] font-semibold text-o-fg">Cont demo activ</legend>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => {
              const active = a.email === email;
              return (
                <button
                  key={a.email}
                  type="button"
                  aria-pressed={active}
                  onClick={() => !active && switchTo(a.email)}
                  className={`btn-press inline-flex min-h-11 items-center gap-2 rounded-[4px] border px-3.5 text-[14px] font-semibold ${
                    active ? 'border-o-active bg-o-active text-o-active-fg' : 'border-o-line text-o-fg hover:border-o-fg'
                  }`}
                >
                  <UserRound size={16} aria-hidden="true" />
                  {a.name} <span className="font-normal opacity-80">({a.note})</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="text-[14px] text-o-danger">
          {error}
        </p>
      )}
      <button type="button" onClick={logout} disabled={pending} className={buttonClass('quiet')}>
        <LogOut size={16} aria-hidden="true" />
        {pending ? 'Se procesează…' : 'Deconectare'}
      </button>
    </div>
  );
}
