'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Dices,
  Flame,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Vertical } from '../../types';

export interface TableDaresMinigameProps {
  vertical: Vertical;
}

type DareIntensity = 'all' | 'chill' | 'spicy' | 'chaos';
type DareTier = Exclude<DareIntensity, 'all'>;

interface TableDare {
  id: string;
  tier: DareTier;
  vertical: 'both' | Vertical;
  title: string;
  rule: string;
}

interface TablePlayer {
  id: string;
  name: string;
  points: number;
  passes: number;
}

const DEFAULT_TABLE_PLAYERS: TablePlayer[] = [
  { id: 'tp-1', name: 'Andreea', points: 0, passes: 0 },
  { id: 'tp-2', name: 'Radu', points: 0, passes: 0 },
  { id: 'tp-3', name: 'Elena', points: 0, passes: 0 },
];

const TABLE_DARES: TableDare[] = [
  {
    id: 'd-1',
    tier: 'chill',
    vertical: 'both',
    title: 'Turnul Telefoanelor',
    rule: 'Toată lumea pune telefonul cu ecranul în jos pe mijlocul mesei 15 minute. Cine atinge primul telefonul plătește o rundă de apă sau cafea.',
  },
  {
    id: 'd-2',
    tier: 'chill',
    vertical: 'food',
    title: 'Compliment pentru Bucătărie',
    rule: 'Când vine ospătarul, transmite-i un compliment sincer și specific despre cel mai bun preparat de pe masă.',
  },
  {
    id: 'd-3',
    tier: 'chill',
    vertical: 'drink',
    title: 'Compliment la Bar',
    rule: 'Întreabă barmanul care este băutura lui preferată de făcut în tura de azi și notează recomandarea pentru următoarea rundă.',
  },
  {
    id: 'd-4',
    tier: 'spicy',
    vertical: 'food',
    title: 'Comandă pe Nevăzute',
    rule: 'Persoana din dreapta ta îți alege următorul fel de mâncare sau desert din meniu (în același buget).',
  },
  {
    id: 'd-5',
    tier: 'spicy',
    vertical: 'drink',
    title: 'Alegerea Barmanului',
    rule: 'La următoarea comandă nu te uiți în meniu — îi spui doar „ceva acrișor” sau „ceva amărui” și bei ce aduce.',
  },
  {
    id: 'd-6',
    tier: 'spicy',
    vertical: 'food',
    title: 'Schimb de Farfurii',
    rule: 'Faci schimb de farfurie pentru două guri cu persoana de vizavi și dai o notă de la 1 la 10 în fața mesei.',
  },
  {
    id: 'd-7',
    tier: 'spicy',
    vertical: 'drink',
    title: 'Schimb de Pahare (Degustare)',
    rule: 'Descrii gustul băuturii vecinului din stânga ca un somelier profesionist, folosind minimum trei arome imaginare.',
  },
  {
    id: 'd-8',
    tier: 'chill',
    vertical: 'both',
    title: 'Oracolul Notei de Plată',
    rule: 'Fiecare estimează în gând totalul notei. Cel mai îndepărtat de suma reală la final strânge paharele spre marginea mesei.',
  },
  {
    id: 'd-9',
    tier: 'spicy',
    vertical: 'both',
    title: 'Interdicția Cuvântului „Bun”',
    rule: 'Timp de 10 minute nu ai voie să spui cuvântul „bun” sau „fain”. Dacă scapi, adaugi +5 lei la bacșiș.',
  },
  {
    id: 'd-10',
    tier: 'chaos',
    vertical: 'food',
    title: 'Mână Stângă / Mână Opusă',
    rule: 'Mănânci următoarele 5 minute exclusiv cu mâna nedominantă. Fără trișat!',
  },
  {
    id: 'd-11',
    tier: 'chaos',
    vertical: 'drink',
    title: 'Toastul Improvizat',
    rule: 'Ridici paharul și ții un toast de 15 secunde pentru un motiv complet absurd ales de persoana din fața ta.',
  },
  {
    id: 'd-12',
    tier: 'chaos',
    vertical: 'both',
    title: 'Regizorul Mesei',
    rule: 'Faci o poză de grup cu toată masa folosind doar unghiul de jos (stil selfie cu hamsterul) înainte să vină comanda.',
  },
  {
    id: 'd-13',
    tier: 'chill',
    vertical: 'food',
    title: 'Detectivul de Ingrediente',
    rule: 'Cu ochii închiși, guști o îmbucătură aleasă de cineva de la masă și încerci să ghicești 3 ingrediente.',
  },
  {
    id: 'd-14',
    tier: 'spicy',
    vertical: 'both',
    title: 'Recenzie Live în 2 Fraze',
    rule: 'Rostești cu voce tare o mini-recenzie de localnic pentru locul în care sunteți — ca și cum ar fi pentru radio.',
  },
  {
    id: 'd-15',
    tier: 'chaos',
    vertical: 'food',
    title: 'Veto pe Sosuri',
    rule: 'Restul mesei decide dacă ai voie să folosești sosuri la porția curentă sau trebuie să o mănânci simplă timp de 5 minute.',
  },
  {
    id: 'd-16',
    tier: 'chaos',
    vertical: 'drink',
    title: 'Runda de Apă Obligatorie',
    rule: 'Toată masa bea un pahar întreg de apă înainte de următoarea comandă — hidratare de localnic responsabil!',
  },
  {
    id: 'd-17',
    tier: 'chill',
    vertical: 'both',
    title: 'Schimb de Locuri',
    rule: 'Schimbi locul la masă cu persoana care a vorbit cel mai puțin în ultimele 10 minute.',
  },
  {
    id: 'd-18',
    tier: 'spicy',
    vertical: 'both',
    title: 'Secretul Cartonașului',
    rule: 'Spui care a fost cea mai mare capcană turistică în care ai mâncat sau băut vreodată și cât a costat.',
  },
  {
    id: 'd-19',
    tier: 'chaos',
    vertical: 'both',
    title: 'Dublu sau Nimic la Bacșiș',
    rule: 'La următoarea rundă de „Cine plătește”, alegi o persoană care pornește cu șansă dublă — sau preiei tu provocarea următoare.',
  },
  {
    id: 'd-20',
    tier: 'chill',
    vertical: 'drink',
    title: 'Povestea Primului Local',
    rule: 'Povestești în 30 de secunde prima seară memorabilă pe care ai avut-o într-un bar din Timișoara.',
  },
];

const TIER_LABELS: Record<DareIntensity, string> = {
  all: 'Toate',
  chill: 'Cuminte',
  spicy: 'Condimentat',
  chaos: 'Haotic',
};

function tierBadgeLabel(tier: DareTier): string {
  if (tier === 'chill') return 'Cuminte';
  if (tier === 'spicy') return 'Condimentat';
  return 'Haotic';
}

export const TableDaresMinigame: React.FC<TableDaresMinigameProps> = ({
  vertical,
}) => {
  const isDrink = vertical === 'drink';

  const [intensity, setIntensity] = useState<DareIntensity>('all');
  const [players, setPlayers] = useState<TablePlayer[]>(DEFAULT_TABLE_PLAYERS);
  const [newName, setNewName] = useState('');
  const [usePlayerTracker, setUsePlayerTracker] = useState(true);

  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDare, setCurrentDare] = useState<TableDare | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [roundOutcome, setRoundOutcome] = useState<'done' | 'pass' | null>(null);

  const spinTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const pool = useMemo(() => {
    return TABLE_DARES.filter((d) => {
      const verticalMatch = d.vertical === 'both' || d.vertical === vertical;
      const tierMatch = intensity === 'all' || d.tier === intensity;
      return verticalMatch && tierMatch;
    });
  }, [intensity, vertical]);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || players.length >= 12) return;
    setPlayers((prev) => [
      ...prev,
      {
        id: `tp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: trimmed,
        points: 0,
        passes: 0,
      },
    ]);
    setNewName('');
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlayerId === id) setSelectedPlayerId(null);
  };

  const spinDare = () => {
    if (isSpinning || pool.length === 0) return;
    setIsSpinning(true);
    setRoundOutcome(null);

    const candidates =
      pool.length > 1 && currentDare
        ? pool.filter((d) => d.id !== currentDare.id)
        : pool;
    const pickedDare =
      candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];

    const pickedPlayer =
      usePlayerTracker && players.length > 0
        ? players[Math.floor(Math.random() * players.length)]
        : null;

    if (spinTimeoutRef.current !== null) {
      window.clearTimeout(spinTimeoutRef.current);
    }
    spinTimeoutRef.current = window.setTimeout(() => {
      setCurrentDare(pickedDare);
      setSelectedPlayerId(pickedPlayer?.id ?? null);
      setIsSpinning(false);
    }, 320);
  };

  const markOutcome = (outcome: 'done' | 'pass') => {
    if (!selectedPlayerId || roundOutcome !== null) return;
    setRoundOutcome(outcome);
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== selectedPlayerId) return p;
        return outcome === 'done'
          ? { ...p, points: p.points + 1 }
          : { ...p, passes: p.passes + 1 };
      })
    );
  };

  const resetScores = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, points: 0, passes: 0 })));
    setRoundOutcome(null);
  };

  const assignedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Flame
            className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}
          />
          <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">
            Roata Provocărilor la Masă
          </h1>
        </div>
        <p
          className={`text-[13px] sm:text-[14px] ${
            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
          }`}
        >
          Sunteți deja la masă și așteptați comanda? Alegeți intensitatea și
          trageți o provocare spontană pentru gașcă.
        </p>
      </div>

      {/* Controls */}
      <div
        className={`rounded-[6px] border p-4 space-y-4 ${
          isDrink
            ? 'bg-[#143025] border-[#285443]'
            : 'bg-[#FAF8F5] border-[#E6DFD5]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'chill', 'spicy', 'chaos'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setIntensity(tier)}
                className={`btn-press px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border ${
                  intensity === tier
                    ? isDrink
                      ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                      : 'bg-[#3A2418] text-white border-[#3A2418]'
                    : isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2]/80'
                    : 'border-[#D6CFC5] text-[#3A2418]'
                }`}
              >
                {TIER_LABELS[tier]}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={usePlayerTracker}
              onChange={(e) => setUsePlayerTracker(e.target.checked)}
              className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'}
            />
            <span>Alege și jucătorul + scor</span>
          </label>
        </div>

        {/* Optional Player Tracker */}
        {usePlayerTracker && (
          <div className="space-y-2.5">
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Adaugă nume la masă..."
                aria-label="Adaugă nume la masă"
                className={`flex-1 px-3 py-2 rounded-[4px] border text-[13px] focus:outline-none ${
                  isDrink
                    ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder-[#F4EEE2]/45'
                    : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder-[#8C7B70]'
                }`}
              />
              <button
                type="submit"
                disabled={!newName.trim() || players.length >= 12}
                className={`btn-press inline-flex items-center gap-1 px-3.5 py-2 rounded-[4px] text-[13px] font-bold disabled:opacity-45 ${
                  isDrink
                    ? 'bg-[#1E4335] border border-[#2D5947] text-[#F4EEE2]'
                    : 'bg-[#3A2418] text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {players.map((p) => {
                const isSelected = p.id === selectedPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] border text-[12px] font-semibold ${
                      isSelected
                        ? isDrink
                          ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                          : 'bg-[#B3261E] text-white border-[#B3261E]'
                        : isDrink
                        ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                        : 'bg-white border-[#D6CFC5] text-[#3A2418]'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="tabular-nums opacity-80">
                      {p.points}p
                      {p.passes > 0 ? ` · ${p.passes} pas` : ''}
                    </span>
                    {players.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(p.id)}
                        aria-label={`Elimină ${p.name}`}
                        className="opacity-65 hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={spinDare}
            disabled={isSpinning || pool.length === 0}
            className={`btn-press inline-flex items-center gap-2 px-5 py-3 rounded-[4px] font-bold text-[14px] disabled:opacity-45 ${
              isDrink
                ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
            }`}
          >
            <Dices className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>
              {isSpinning
                ? 'Se trage provocarea...'
                : currentDare
                ? 'Altă provocare'
                : 'Învârte roata provocărilor'}
            </span>
          </button>

          {usePlayerTracker && players.some((p) => p.points > 0 || p.passes > 0) && (
            <button
              type="button"
              onClick={resetScores}
              className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-3 rounded-[4px] border text-[13px] font-semibold ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2]'
                  : 'border-[#D6CFC5] text-[#3A2418]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetează scorul</span>
            </button>
          )}
        </div>
      </div>

      {/* Drawn Dare Card */}
      {currentDare && (
        <div
          className={`rounded-[6px] border p-5 sm:p-6 space-y-4 stagger-fade-in ${
            isDrink
              ? 'bg-[#17382C] border-[#F2A33A]'
              : 'bg-white border-[#B3261E] shadow-sm'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wide ${
                currentDare.tier === 'chaos'
                  ? 'bg-[#B3261E] text-white'
                  : currentDare.tier === 'spicy'
                  ? 'bg-[#E0A526] text-[#3A2418]'
                  : isDrink
                  ? 'bg-[#F2A33A]/20 text-[#F2A33A]'
                  : 'bg-[#F2EFE9] text-[#3A2418]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Nivel: {tierBadgeLabel(currentDare.tier)}</span>
            </span>

            {assignedPlayer && (
              <span className="text-[13px] font-bold">
                Pentru:{' '}
                <span className={isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}>
                  {assignedPlayer.name}
                </span>
              </span>
            )}
          </div>

          <h3 className="font-display text-[28px] sm:text-[32px] leading-tight">
            {currentDare.title}
          </h3>

          <p className="text-[14px] sm:text-[15px] leading-relaxed">
            {currentDare.rule}
          </p>

          {assignedPlayer && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={roundOutcome !== null}
                onClick={() => markOutcome('done')}
                className={`btn-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] text-[13px] font-bold disabled:opacity-50 ${
                  isDrink
                    ? 'bg-[#F2A33A] text-[#17382C]'
                    : 'bg-[#3A2418] text-white'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>+1 Îndeplinit</span>
              </button>
              <button
                type="button"
                disabled={roundOutcome !== null}
                onClick={() => markOutcome('pass')}
                className={`btn-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] border text-[13px] font-semibold disabled:opacity-50 ${
                  isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2]'
                    : 'border-[#D6CFC5] text-[#6E5649]'
                }`}
              >
                <X className="w-4 h-4" />
                <span>Pas / Penalizare</span>
              </button>
              {roundOutcome && (
                <span className="text-[12px] font-semibold opacity-80">
                  {roundOutcome === 'done'
                    ? `Punct acordat lui ${assignedPlayer.name}!`
                    : `${assignedPlayer.name} a dat pas.`}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
