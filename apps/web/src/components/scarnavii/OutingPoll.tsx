'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, MapPin, Search, Share2, Users } from 'lucide-react';
import { createOutingPoll, getOutingPoll, voteOutingPoll } from '../../app/actions/outing-poll';
import { Restaurant, Vertical } from '../../types';
import { getVenueMenu } from '../../data/venueExtras';

interface OutingPollProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  pollId?: string;
  onSelectRestaurant: (restaurant: Restaurant) => void;
}

type Poll = { venueIds: string[]; counts: Record<string, number>; myVote: string | null };

export function OutingPoll({ vertical, restaurants, pollId, onSelectRestaurant }: OutingPollProps) {
  const isDrink = vertical === 'drink';
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [token, setToken] = useState(pollId ?? '');
  const [poll, setPoll] = useState<Poll | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const panel = isDrink ? 'bg-[#143025] border-[#285443]' : 'bg-[#FAF8F5] border-[#E6DFD5]';
  const muted = isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]';
  const primary = isDrink ? 'bg-[#F2A33A] text-[#17382C]' : 'bg-[#B3261E] text-white';
  const outline = isDrink ? 'border-[#2D5947] text-[#F4EEE2]' : 'border-[#D6CFC5] text-[#3A2418]';

  useEffect(() => {
    if (!token) return;
    setUrl(`${window.location.origin}/unde-iesim/${token}`);
    let active = true;
    setBusy(true);
    async function refresh(initial = false) {
      try {
        const result = await getOutingPoll(token);
        if (!active) return;
        if (result.ok) { setPoll(result); setError(''); }
        else if (initial) setError(result.error);
      } catch {
        if (active && initial) setError('Nu am putut încărca sondajul. Reîncarcă pagina și încearcă din nou.');
      } finally {
        if (active && initial) setBusy(false);
      }
    }
    void refresh(true);
    const timer = window.setInterval(() => void refresh(), 10000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ro');
    return restaurants.filter((r) => !q || `${r.name} ${r.neighborhood} ${r.cuisine}`.toLocaleLowerCase('ro').includes(q));
  }, [restaurants, query]);
  const choices = poll?.venueIds.map((id) => restaurants.find((r) => r.slug === id)).filter((r): r is Restaurant => Boolean(r)) ?? [];
  const total = poll ? Object.values(poll.counts).reduce((sum, count) => sum + count, 0) : 0;

  async function create() {
    setBusy(true); setError('');
    try {
      const result = await createOutingPoll(selected);
      if (result.ok) setToken(result.token);
      else setError(result.error);
    } catch { setError('Nu am putut crea sondajul. Verifică dacă baza de date este configurată și încearcă din nou.'); }
    finally { setBusy(false); }
  }

  async function vote(slug: string) {
    setBusy(true); setError('');
    try {
      const result = await voteOutingPoll(token, slug);
      if (result.ok) setPoll(result);
      else setError(result.error);
    } catch { setError('Nu am putut salva votul. Încearcă din nou.'); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError('Nu am putut copia linkul. Îl poți selecta și copia manual.'); }
  }

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-display text-[24px] sm:text-[28px] leading-tight">Unde ieșim?</h2>
        <p className={`text-sm ${muted}`}>Alege câteva localuri, trimite linkul găștii și decideți împreună. Oricine poate vota, fără cont.</p>
      </header>

      {error && <p role="alert" className={`rounded-[6px] border p-3 text-sm ${panel}`}>{error}</p>}

      {!token && <div className="space-y-4">
        <div className={`rounded-[6px] border p-4 space-y-3 ${panel}`}>
          <div className="flex justify-between gap-2 items-baseline">
            <h3 className="font-bold">Alege 2–4 localuri</h3>
            <span className={`text-xs ${muted}`}>{selected.length}/4 alese</span>
          </div>
          <label className="block">
            <span className="sr-only">Caută un local</span>
            <span className="relative block"><Search className={`absolute left-3 top-3 w-4 h-4 ${muted}`} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Caută după nume, cartier sau specific" className={`w-full rounded-[4px] border pl-9 pr-3 py-2.5 text-sm bg-transparent ${outline}`} />
            </span>
          </label>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filtered.map((restaurant) => {
              const checked = selected.includes(restaurant.slug);
              return <label key={restaurant.slug} className={`flex items-center gap-3 rounded-[4px] border p-3 cursor-pointer ${outline}`}>
                <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 4} onChange={() => setSelected((prev) => checked ? prev.filter((id) => id !== restaurant.slug) : [...prev, restaurant.slug])} className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'} />
                <span className="min-w-0"><span className="block font-semibold text-sm">{restaurant.name}</span><span className={`block text-xs ${muted}`}>{restaurant.neighborhood} · {restaurant.cuisine}</span></span>
              </label>;
            })}
            {filtered.length === 0 && <p className={`text-sm ${muted}`}>Nu am găsit localuri pentru căutarea ta.</p>}
          </div>
          <button type="button" onClick={create} disabled={busy || selected.length < 2} className={`btn-press px-4 py-2.5 rounded-[4px] font-bold text-sm disabled:opacity-45 ${primary}`}>
            {busy ? 'Se creează…' : 'Creează sondajul'}
          </button>
        </div>
      </div>}

      {token && <>
        <div className={`rounded-[6px] border p-4 space-y-3 ${panel}`}>
          <div className="flex items-center gap-2 font-bold"><Share2 className="w-4 h-4" /> Trimite linkul prietenilor</div>
          <p className={`text-sm ${muted}`}>Fiecare poate vota și vedea rezultatele, fără să-și facă un cont.</p>
          <div className="flex gap-2"><input aria-label="Link către sondaj" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className={`min-w-0 flex-1 rounded-[4px] border bg-transparent px-3 py-2 text-sm ${outline}`} />
            <button type="button" onClick={copyLink} className={`btn-press inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] font-bold text-sm ${primary}`}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copiat' : 'Copiază'}</button></div>
        </div>
        {busy && !poll && <p className={muted}>Se încarcă sondajul…</p>}
        {poll && <div className="space-y-3">
          <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-lg">Alege unde vrei să mergeți</h3><span className={`inline-flex items-center gap-1 text-xs ${muted}`}><Users className="w-4 h-4" />{total} {total === 1 ? 'vot' : 'voturi'}</span></div>
          {choices.length !== poll.venueIds.length && <p className={`text-sm ${muted}`}>Unele localuri din sondaj nu sunt disponibile momentan.</p>}
          {choices.map((restaurant) => {
            const votes = poll.counts[restaurant.slug] ?? 0;
            const localReview = restaurant.reviews.find((review) => review.authorRole === 'verified-local' && review.text.trim());
            const menu = getVenueMenu(restaurant).flatMap((category) => category.items).slice(0, 3);
            const dishes = menu.length ? menu : restaurant.whatToOrder.slice(0, 3);
            return <article key={restaurant.slug} className={`rounded-[6px] border p-4 space-y-3 ${panel}`}>
              <div><h4 className="font-bold text-lg">{restaurant.name}</h4><p className={`text-xs ${muted}`}><MapPin className="inline w-3 h-3" /> {restaurant.neighborhood} · {restaurant.cuisine} · {restaurant.priceRangeLabel || restaurant.priceTier}</p></div>
              {dishes.length > 0 && <div><p className="text-xs font-bold uppercase tracking-wide">Din meniu</p><p className={`text-sm mt-1 ${muted}`}>{dishes.map((dish) => `${dish.name}${dish.priceRon > 0 ? ` · ${dish.priceRon} lei` : ''}`).join(' / ')}</p></div>}
              <div><p className="text-xs font-bold uppercase tracking-wide">Ce spun localnicii</p><p className={`text-sm mt-1 ${muted}`}>{localReview ? `„${localReview.text}” — ${localReview.authorName}` : 'Nu avem încă o recenzie de la un localnic verificat.'}</p></div>
              <p className={`text-xs ${muted}`}>{restaurant.address}{restaurant.hours ? ` · ${restaurant.hours}` : ''}</p>
              <div className="flex flex-wrap gap-2 items-center"><button type="button" onClick={() => vote(restaurant.slug)} disabled={busy} aria-pressed={poll.myVote === restaurant.slug} className={`btn-press px-4 py-2 rounded-[4px] font-bold text-sm disabled:opacity-45 ${poll.myVote === restaurant.slug ? primary : `border ${outline}`}`}>{poll.myVote === restaurant.slug ? '✓ Votul tău' : 'Votează'}</button><span className={`text-sm ${muted}`}>{votes} {votes === 1 ? 'vot' : 'voturi'}</span><button type="button" onClick={() => onSelectRestaurant(restaurant)} className={`ml-auto text-sm font-bold underline underline-offset-2 ${muted}`}>Vezi localul</button></div>
            </article>;
          })}
          <p className={`text-xs ${muted}`}>Poți schimba votul alegând alt local. Votul este asociat acestui browser.</p>
        </div>}
      </>}
    </section>
  );
}
