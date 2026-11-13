'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Dices,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { ScarnaviiActivity, Vertical } from '../types';

export interface ScarnaviiViewProps {
  vertical: Vertical;
  onBack: () => void;
}

const STORAGE_KEY = 'topfood-scarnavii-activities';

const CATEGORY_PRESETS = ['Spontan', 'Seară', 'Mâncare', 'Băutură', 'Mișcare'] as const;

export const ScarnaviiView: React.FC<ScarnaviiViewProps> = ({
  vertical,
  onBack,
}) => {
  const isDrink = vertical === 'drink';

  // Intentionally starts empty — activities can be populated later or added manually to test.
  const [activities, setActivities] = useState<ScarnaviiActivity[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Spontan');
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>('all');
  const [avoidRepeats, setAvoidRepeats] = useState<boolean>(true);
  const [usedIds, setUsedIds] = useState<string[]>([]);

  const [isRolling, setIsRolling] = useState(false);
  const [rollingPreview, setRollingPreview] = useState<ScarnaviiActivity | null>(
    null
  );
  const [pickedActivity, setPickedActivity] =
    useState<ScarnaviiActivity | null>(null);
  const [rollCount, setRollCount] = useState(0);

  const rollIntervalRef = useRef<number | null>(null);
  const rollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setActivities(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch {
      // ignore storage errors
    }
  }, [activities]);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) window.clearInterval(rollIntervalRef.current);
      if (rollTimeoutRef.current) window.clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  const filteredPool = useMemo(() => {
    const byCategory =
      selectedCategoryFilter === 'all'
        ? activities
        : activities.filter((a) => a.category === selectedCategoryFilter);
    if (!avoidRepeats) return byCategory;
    const unused = byCategory.filter((a) => !usedIds.includes(a.id));
    return unused.length > 0 ? unused : byCategory;
  }, [activities, selectedCategoryFilter, avoidRepeats, usedIds]);

  const handleRoll = () => {
    if (isRolling || filteredPool.length === 0) return;

    const pool = filteredPool;
    const candidates =
      pool.length > 1 && pickedActivity
        ? pool.filter((a) => a.id !== pickedActivity.id)
        : pool;

    const finalPick =
      candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];

    setIsRolling(true);
    let step = 0;

    if (rollIntervalRef.current) window.clearInterval(rollIntervalRef.current);
    if (rollTimeoutRef.current) window.clearTimeout(rollTimeoutRef.current);

    rollIntervalRef.current = window.setInterval(() => {
      step += 1;
      const preview = pool[step % pool.length];
      setRollingPreview(preview);
    }, 65);

    rollTimeoutRef.current = window.setTimeout(() => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      setIsRolling(false);
      setRollingPreview(null);
      setPickedActivity(finalPick);
      setRollCount((c) => c + 1);

      if (avoidRepeats) {
        setUsedIds((prev) => {
          const allInCategory =
            selectedCategoryFilter === 'all'
              ? activities
              : activities.filter((a) => a.category === selectedCategoryFilter);
          const next = prev.includes(finalPick.id)
            ? prev
            : [...prev, finalPick.id];
          return next.length >= allInCategory.length ? [finalPick.id] : next;
        });
      }
    }, 420);
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const item: ScarnaviiActivity = {
      id: `scarn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      category: newCategory,
    };
    setActivities((prev) => [item, ...prev]);
    setNewTitle('');
  };

  const handleRemoveActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    setUsedIds((prev) => prev.filter((u) => u !== id));
    if (pickedActivity?.id === id) {
      setPickedActivity(null);
    }
  };

  const handleResetRound = () => {
    setUsedIds([]);
    setPickedActivity(null);
    setRollCount(0);
  };

  const displayedCard = isRolling ? rollingPreview : pickedActivity;

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [activities]);

  return (
    <div
      className={`min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-24 ${
        isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Top breadcrumb back row */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Înapoi"
            className={`btn-press w-11 h-11 sm:w-9 sm:h-9 rounded-[4px] border flex items-center justify-center ${
              isDrink
                ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                : 'border-[#E6DFD5] text-[#3A2418] hover:border-[#3A2418]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className={`text-[14px] ${
              isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
            }`}
          >
            {isDrink ? 'topdrink' : 'topfood'}/timisoara/
            <strong
              className={`font-semibold ${
                isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
              }`}
            >
              scârnăvii
            </strong>
          </span>
        </div>

        {/* Hero Title */}
        <section className="space-y-2">
          <h1 className="font-display text-[38px] sm:text-[48px] leading-[0.94]">
            Scârnăvii
          </h1>
          <p
            className={`text-[14px] sm:text-[15px] max-w-xl ${
              isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
            }`}
          >
            Randomizer de activități și idei spontane pentru când nu știi ce să
            faci prin oraș.
          </p>
        </section>

        {/* Category Filter Pills (shown when there are categorized items) */}
        {availableCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`btn-press px-3 py-1.5 rounded-[4px] text-[13px] font-semibold border ${
                selectedCategoryFilter === 'all'
                  ? isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                    : 'bg-[#3A2418] text-white border-[#3A2418]'
                  : isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]/60'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              Toate ({activities.length})
            </button>
            {availableCategories.map((cat) => {
              const active = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`btn-press px-3 py-1.5 rounded-[4px] text-[13px] font-semibold border ${
                    active
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]/60'
                      : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* RANDOMIZER STAGE CARD */}
        <section
          aria-label="Zona de tragere la sorți"
          className={`rounded-[6px] border p-6 sm:p-8 text-center space-y-5 ${
            isDrink
              ? 'bg-[#143025] border-[#285443]'
              : 'bg-[#FAF8F5] border-[#E6DFD5]'
          }`}
        >
          {activities.length === 0 ? (
            <div className="py-4 space-y-3">
              <div
                className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center border ${
                  isDrink
                    ? 'bg-[#17382C] border-[#2D5947] text-[#F2A33A]'
                    : 'bg-white border-[#E6DFD5] text-[#B3261E]'
                }`}
              >
                <Dices className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-[26px] sm:text-[30px] leading-tight">
                  Încă nu sunt activități în listă
                </h2>
                <p
                  className={`text-[13px] sm:text-[14px] max-w-md mx-auto ${
                    isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                  }`}
                >
                  Lista de activități urmează să fie adăugată. Dacă vrei să
                  testezi randomizerul acum, adaugă câteva idei mai jos.
                </p>
              </div>
            </div>
          ) : displayedCard ? (
            <div
              key={`${displayedCard.id}-${rollCount}-${isRolling ? 'r' : 's'}`}
              className="py-3 space-y-2.5 stagger-fade-in"
            >
              {displayedCard.category && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-[11px] font-bold uppercase tracking-wide ${
                    isDrink
                      ? 'bg-[#F2A33A]/20 text-[#F2A33A]'
                      : 'bg-[#B3261E]/10 text-[#B3261E]'
                  }`}
                >
                  {displayedCard.category}
                </span>
              )}
              <div className="font-display text-[32px] sm:text-[42px] leading-[0.98] break-words">
                {displayedCard.title}
              </div>
              {!isRolling && (
                <p
                  className={`text-[12px] ${
                    isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                  }`}
                >
                  Extragerea #{rollCount} din {activities.length}{' '}
                  {activities.length === 1 ? 'activitate' : 'activități'}
                </p>
              )}
            </div>
          ) : (
            <div className="py-4 space-y-2">
              <div
                className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center border ${
                  isDrink
                    ? 'bg-[#17382C] border-[#2D5947] text-[#F2A33A]'
                    : 'bg-white border-[#E6DFD5] text-[#B3261E]'
                }`}
              >
                <Dices className="w-6 h-6" />
              </div>
              <h2 className="font-display text-[26px] sm:text-[30px] leading-tight">
                {filteredPool.length}{' '}
                {filteredPool.length === 1
                  ? 'activitate pregătită'
                  : 'activități pregătite'}
              </h2>
              <p
                className={`text-[13px] ${
                  isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                }`}
              >
                Apasă butonul de mai jos ca să tragi la sorți ce facem azi.
              </p>
            </div>
          )}

          {/* Primary Roll CTA */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleRoll}
              disabled={isRolling || filteredPool.length === 0}
              className={`btn-press inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[4px] font-bold text-[15px] disabled:opacity-45 disabled:cursor-not-allowed ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] hover:brightness-105'
                  : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
              }`}
            >
              <Shuffle className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
              <span>
                {isRolling
                  ? 'Se alege...'
                  : pickedActivity
                  ? 'Trage altă scârnăvie'
                  : 'Trage la sorți'}
              </span>
            </button>

            {activities.length > 1 && usedIds.length > 0 && (
              <button
                type="button"
                onClick={handleResetRound}
                className={`btn-press inline-flex items-center gap-1.5 px-4 py-3.5 rounded-[4px] border text-[13px] font-semibold ${
                  isDrink
                    ? 'border-[#2D5947] text-[#F4EEE2]/85 hover:border-[#F2A33A]'
                    : 'border-[#D6CFC5] text-[#6E5649] hover:border-[#3A2418] hover:text-[#3A2418]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetează tura</span>
              </button>
            )}
          </div>

          {activities.length > 1 && (
            <label
              className={`inline-flex items-center gap-2 text-[12px] cursor-pointer select-none ${
                isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
              }`}
            >
              <input
                type="checkbox"
                checked={avoidRepeats}
                onChange={(e) => setAvoidRepeats(e.target.checked)}
                className={isDrink ? 'accent-[#F2A33A]' : 'accent-[#B3261E]'}
              />
              <span>Fără repetări până se termină lista</span>
            </label>
          )}
        </section>

        {/* ACTIVITY POOL & ADD FORM */}
        <section
          aria-label="Lista de activități"
          className={`pt-4 border-t space-y-4 ${
            isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[24px] sm:text-[28px] leading-none">
              Activități în tragere ({activities.length})
            </h2>
            {activities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActivities([]);
                  setPickedActivity(null);
                  setUsedIds([]);
                }}
                className={`btn-press text-[12px] font-semibold underline underline-offset-4 ${
                  isDrink
                    ? 'text-[#F4EEE2]/65 hover:text-[#F2A33A]'
                    : 'text-[#6E5649] hover:text-[#B3261E]'
                }`}
              >
                Golește lista
              </button>
            )}
          </div>

          {/* Add activity form */}
          <form onSubmit={handleAddActivity} className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Adaugă o activitate (opțional, pentru test)..."
                aria-label="Adaugă o activitate"
                className={`flex-1 px-3.5 py-2.5 rounded-[4px] border text-[14px] focus:outline-none ${
                  isDrink
                    ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder-[#F4EEE2]/45 focus:border-[#F2A33A]'
                    : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder-[#8C7B70] focus:border-[#3A2418]'
                }`}
              />
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className={`btn-press inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[4px] text-[13px] font-bold shrink-0 disabled:opacity-45 ${
                  isDrink
                    ? 'bg-[#1E4335] border border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                    : 'bg-[#3A2418] text-white hover:opacity-90'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Adaugă</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORY_PRESETS.map((cat) => {
                const active = newCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`btn-press px-2.5 py-1 rounded-[3px] text-[11px] font-semibold border ${
                      active
                        ? isDrink
                          ? 'bg-[#F2A33A]/20 border-[#F2A33A] text-[#F2A33A]'
                          : 'bg-[#B3261E]/10 border-[#B3261E] text-[#B3261E]'
                        : isDrink
                        ? 'border-[#285443] text-[#F4EEE2]/65'
                        : 'border-[#E6DFD5] text-[#6E5649]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </form>

          {activities.length === 0 ? (
            <div
              className={`rounded-[4px] border border-dashed p-5 text-center text-[13px] ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2]/60'
                  : 'border-[#D6CFC5] text-[#6E5649]'
              }`}
            >
              Loc rezervat pentru activitățile de Scârnăvii.
            </div>
          ) : (
            <div
              className={`divide-y border rounded-[4px] ${
                isDrink
                  ? 'divide-[#285443] border-[#285443] bg-[#143025]'
                  : 'divide-[#E6DFD5] border-[#E6DFD5] bg-white'
              }`}
            >
              {activities.map((item) => {
                const isUsed = avoidRepeats && usedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span
                        className={`text-[14px] font-semibold truncate ${
                          isUsed ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.category && (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-[3px] shrink-0 ${
                            isDrink
                              ? 'bg-[#1E4335] text-[#F4EEE2]/75'
                              : 'bg-[#FAF8F5] text-[#6E5649] border border-[#E6DFD5]'
                          }`}
                        >
                          {item.category}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveActivity(item.id)}
                      aria-label={`Șterge ${item.title}`}
                      className={`btn-press p-1.5 rounded-[3px] shrink-0 opacity-65 hover:opacity-100 ${
                        isDrink ? 'hover:bg-[#1E4335]' : 'hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ScarnaviiView;
