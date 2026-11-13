'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Beer,
  Cat,
  Check,
  Coffee,
  Croissant,
  Gift,
  Heart,
  Pizza,
  QrCode,
  ScanLine,
  Soup,
  Sparkles,
  Store,
  Wine,
  X,
} from 'lucide-react';
import type { LoyaltyIconId, LoyaltyProgram, UserAccount, Vertical } from '../types';
import { createFidelityCard, fidelityWallet, stampFidelity } from '@/app/actions/loyalty';

interface FidelityViewProps {
  vertical: Vertical;
  currentUser: UserAccount | null;
  onBack: () => void;
  onRequireLogin?: () => void;
  /** true = cardurile vin din baza de date (ștampile reale, max una pe zi); altfel localStorage */
  useBackend?: boolean;
}

const STORAGE_KEY = 'topfood-fidelity-programs';

const ICON_OPTIONS: {
  id: LoyaltyIconId;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { id: 'soup', label: 'Oală / Ciorbă', Icon: Soup },
  { id: 'coffee', label: 'Cafea', Icon: Coffee },
  { id: 'croissant', label: 'Patiserie', Icon: Croissant },
  { id: 'pizza', label: 'Pizza', Icon: Pizza },
  { id: 'beer', label: 'Bere', Icon: Beer },
  { id: 'wine', label: 'Vin', Icon: Wine },
  { id: 'heart', label: 'Inimă', Icon: Heart },
  { id: 'cat', label: 'Pisică', Icon: Cat },
];

const ACCENT_SWATCHES: { hex: string; label: string }[] = [
  { hex: '#B3261E', label: 'Roșu Timișoara' },
  { hex: '#E0A526', label: 'Chihlimbar' },
  { hex: '#17382C', label: 'Sticlă' },
  { hex: '#3A2418', label: 'Espresso' },
  { hex: '#B98A5E', label: 'Cupru' },
  { hex: '#7C2D12', label: 'Teracotă' },
];

const STAMP_COUNT_OPTIONS = [5, 6, 8, 10];

const DEFAULT_PROGRAMS: LoyaltyProgram[] = [
  {
    id: 'prog-ciorba-sandu',
    venueName: 'Ciorba lui Sandu',
    neighborhood: 'Iosefin',
    rewardTitle: 'O ciorbă de burtă din partea casei + smântână',
    stampsRequired: 6,
    iconId: 'soup',
    accentColor: '#B3261E',
    stampsCollected: 4,
    redeemedCount: 1,
    qrSeed: 'TOPFOOD:CIORBA-SANDU:IOSEFIN:V1',
  },
  {
    id: 'prog-pizzeria-fabric',
    venueName: 'Pizzeria din Fabric',
    neighborhood: 'Fabric',
    rewardTitle: 'O pizza artizanală la alegere (cuptor pe lemne)',
    stampsRequired: 8,
    iconId: 'pizza',
    accentColor: '#E0A526',
    stampsCollected: 8,
    redeemedCount: 0,
    qrSeed: 'TOPFOOD:PIZZERIA-FABRIC:FABRIC:V1',
  },
  {
    id: 'prog-pivnita-bolta',
    venueName: 'Pivnița cu Boltă',
    neighborhood: 'Cetate',
    rewardTitle: 'Pahar de vin bănățean sau bere artizanală locală',
    stampsRequired: 5,
    iconId: 'wine',
    accentColor: '#17382C',
    stampsCollected: 2,
    redeemedCount: 2,
    qrSeed: 'TOPFOOD:PIVNITA-BOLTA:CETATE:V1',
  },
];

function renderLoyaltyIcon(
  iconId: LoyaltyIconId,
  className = 'w-5 h-5',
  strokeWidth = 2,
) {
  const entry = ICON_OPTIONS.find((item) => item.id === iconId) ?? ICON_OPTIONS[0];
  const IconComp = entry.Icon;
  return <IconComp className={className} strokeWidth={strokeWidth} />;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildQrMatrix(seed: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );

  const drawFinder = (startR: number, startC: number) => {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const rr = startR + r;
        const cc = startC + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          grid[rr][cc] = false;
        } else {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[rr][cc] = isBorder || isCenter;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i <= size - 9; i += 1) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  let state = hashString(seed || 'TOPFOOD-QR');
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (reserved[r][c]) continue;
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      grid[r][c] = ((state >>> 0) % 100) < 48;
    }
  }

  return grid;
}

function DeterministicQrSvg({
  seed,
  fgColor = '#3A2418',
  bgColor = '#FFFFFF',
  className = 'w-28 h-28',
}: {
  seed: string;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}) {
  const matrix = useMemo(() => buildQrMatrix(seed), [seed]);
  const size = matrix.length;

  return (
    <svg
      viewBox={`0 0 ${size + 2} ${size + 2}`}
      className={className}
      role="img"
      aria-label={`Cod QR digital pentru ${seed}`}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={size + 2} height={size + 2} fill={bgColor} rx={1.2} />
      {matrix.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c + 1}
              y={r + 1}
              width={1}
              height={1}
              fill={fgColor}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function FidelityView({
  vertical,
  currentUser,
  onBack,
  onRequireLogin,
  useBackend = false,
}: FidelityViewProps) {
  const isDrink = vertical === 'drink';
  const [activeTab, setActiveTab] = useState<'cards' | 'vendor'>('cards');
  const [programs, setPrograms] = useState<LoyaltyProgram[]>(DEFAULT_PROGRAMS);
  const [hydrated, setHydrated] = useState(false);
  const [expandedQrProgramId, setExpandedQrProgramId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Vendor signup form state
  const [venueName, setVenueName] = useState('');
  const [neighborhood, setNeighborhood] = useState('Cetate');
  const [rewardTitle, setRewardTitle] = useState('');
  const [stampsRequired, setStampsRequired] = useState<number>(6);
  const [selectedIcon, setSelectedIcon] = useState<LoyaltyIconId>('cat');
  const [accentColor, setAccentColor] = useState<string>(isDrink ? '#17382C' : '#B3261E');
  const [formError, setFormError] = useState<string | null>(null);

  /** Reîncarcă portofelul din backend; false = backend indisponibil (rămânem pe localStorage). */
  const refreshFromBackend = async (): Promise<boolean> => {
    const res = await fidelityWallet();
    if (res.ok) {
      setPrograms(res.programs);
      return true;
    }
    if (!res.offline) setToastMessage(res.error);
    return false;
  };

  useEffect(() => {
    if (useBackend) {
      void refreshFromBackend().then((ok) => {
        if (ok) setHydrated(true);
      });
      return;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LoyaltyProgram[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPrograms(parsed);
        }
      }
    } catch {
      // Fallback to seed programs
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || useBackend) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
    } catch {
      // Ignore storage quota errors
    }
  }, [programs, hydrated]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  /** Ștampilă / premiu pe backend (același apel: cardul plin + scanare = premiul). */
  const stampOnBackend = async (id: string) => {
    if (!currentUser) {
      onRequireLogin?.();
      return;
    }
    const res = await stampFidelity(id);
    showToast(res.ok ? res.message : res.error);
    await refreshFromBackend();
  };

  const handleScanStamp = (id: string) => {
    if (useBackend) {
      void stampOnBackend(id);
      return;
    }
    setPrograms((prev) =>
      prev.map((prog) => {
        if (prog.id !== id) return prog;
        if (prog.stampsCollected >= prog.stampsRequired) return prog;
        const nextStamps = prog.stampsCollected + 1;
        showToast(
          nextStamps >= prog.stampsRequired
            ? `Card complet la ${prog.venueName}! Poți revendica recompensa.`
            : `+1 ștampilă la ${prog.venueName} (${nextStamps}/${prog.stampsRequired}).`,
        );
        return { ...prog, stampsCollected: nextStamps };
      }),
    );
  };

  const handleRedeem = (id: string) => {
    if (useBackend) {
      void stampOnBackend(id);
      return;
    }
    setPrograms((prev) =>
      prev.map((prog) => {
        if (prog.id !== id || prog.stampsCollected < prog.stampsRequired) return prog;
        showToast(`Recompensă revendicată la ${prog.venueName}! Cardul a fost resetat.`);
        return {
          ...prog,
          stampsCollected: 0,
          redeemedCount: prog.redeemedCount + 1,
        };
      }),
    );
  };

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = venueName.trim();
    const cleanNeighborhood = neighborhood.trim() || 'Timișoara';
    const cleanReward = rewardTitle.trim();

    if (!cleanName) {
      setFormError('Scrie numele localului pentru a genera cardul digital.');
      return;
    }
    if (!cleanReward) {
      setFormError('Specifică ce recompensă primește clientul la completarea cardului.');
      return;
    }

    setFormError(null);
    if (useBackend) {
      if (!currentUser) {
        onRequireLogin?.();
        return;
      }
      void createFidelityCard({ name: cleanName, rewardTitle: cleanReward, stampsRequired, icon: selectedIcon, accentColor }).then(
        async (res) => {
          if (!res.ok) {
            setFormError(res.error);
            return;
          }
          await refreshFromBackend();
          setVenueName('');
          setRewardTitle('');
          setActiveTab('cards');
          showToast(res.message);
        },
      );
      return;
    }
    const slug = cleanName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);

    const newProgram: LoyaltyProgram = {
      id: `vendor-${Date.now()}`,
      venueName: cleanName,
      neighborhood: cleanNeighborhood,
      rewardTitle: cleanReward,
      stampsRequired,
      iconId: selectedIcon,
      accentColor,
      stampsCollected: 1,
      redeemedCount: 0,
      qrSeed: `TOPFOOD:${slug || 'LOCAL'}:${Date.now().toString(36).toUpperCase()}`,
      isCustomVendor: true,
    };

    setPrograms((prev) => [newProgram, ...prev]);
    setVenueName('');
    setRewardTitle('');
    setActiveTab('cards');
    showToast(`Localul „${cleanName}” a fost înscris! Cardul digital cu cod QR este activ.`);
  };

  const expandedProgram = programs.find((p) => p.id === expandedQrProgramId) ?? null;

  const previewSeed = useMemo(() => {
    const clean = (venueName.trim() || 'LOCALUL-TAU')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-');
    return `TOPFOOD:${clean}:${selectedIcon.toUpperCase()}:${stampsRequired}`;
  }, [venueName, selectedIcon, stampsRequired]);

  const cardSurface = isDrink
    ? 'bg-[#143025] border-[#264D3E] text-[#F4EEE2]'
    : 'bg-white border-[#E8E2D9] text-[#3A2418]';

  const subtleSurface = isDrink
    ? 'bg-[#17382C] border-[#264D3E]'
    : 'bg-[#FAF8F5] border-[#E8E2D9]';

  const mutedText = isDrink ? 'text-[#A8BBAE]' : 'text-[#6E5649]';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 stagger-fade-in">
      {/* Top back bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className={`btn-press inline-flex items-center gap-2 text-sm font-medium transition-colors ${
            isDrink
              ? 'text-[#A8BBAE] hover:text-[#F4EEE2]'
              : 'text-[#6E5649] hover:text-[#3A2418]'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi la Top
        </button>

        {currentUser ? (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${
              isDrink
                ? 'bg-[#143025] border-[#264D3E] text-[#F4EEE2]'
                : 'bg-white border-[#E8E2D9] text-[#3A2418]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#E0A526]" />
            <span>Portofel activ: {currentUser.name}</span>
          </div>
        ) : (
          onRequireLogin && (
            <button
              type="button"
              onClick={onRequireLogin}
              className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                isDrink
                  ? 'bg-[#143025] border-[#264D3E] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'bg-white border-[#E8E2D9] text-[#3A2418] hover:border-[#B3261E]'
              }`}
            >
              Conectează-te pentru sincronizare
            </button>
          )
        )}
      </div>

      {/* Hero / Editorial Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
              isDrink
                ? 'bg-[#F2A33A]/15 text-[#F2A33A] border border-[#F2A33A]/30'
                : 'bg-[#B3261E]/10 text-[#B3261E] border border-[#B3261E]/25'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Fără carton și ștampile pierdute
          </span>
        </div>

        <h1
          className={`font-serif text-3xl sm:text-4xl font-bold tracking-tight ${
            isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
          }`}
        >
          Card de fidelitate digital
        </h1>
        <p className={`mt-2 max-w-2xl text-sm sm:text-base leading-relaxed ${mutedText}`}>
          În loc de cartoane mototolite prin portofel, fiecare local din Timișoara își
          poate genera propriul cod QR și o pictogramă simpatică pe post de ștampilă.
          Scanezi la casă și strângi recompense.
        </p>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-sm ${
            isDrink
              ? 'bg-[#143025] border-[#F2A33A]/50 text-[#F4EEE2]'
              : 'bg-[#FFFDF8] border-[#E0A526] text-[#3A2418]'
          }`}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E0A526] shrink-0" />
            {toastMessage}
          </span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="opacity-70 hover:opacity-100"
            aria-label="Închide notificarea"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Segmented Switch: Cardurile mele / Înscriere local */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div
          className={`inline-flex p-1 rounded-xl border ${
            isDrink
              ? 'bg-[#143025] border-[#264D3E]'
              : 'bg-[#F2EFE9] border-[#E8E2D9]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`btn-press inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'cards'
                ? isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] shadow-sm'
                  : 'bg-[#3A2418] text-white shadow-sm'
                : mutedText
            }`}
          >
            <QrCode className="w-4 h-4" />
            Cardurile mele ({programs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vendor')}
            className={`btn-press inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'vendor'
                ? isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] shadow-sm'
                  : 'bg-[#B3261E] text-white shadow-sm'
                : mutedText
            }`}
          >
            <Store className="w-4 h-4" />
            Înscriere local (Vendor)
          </button>
        </div>

        {activeTab === 'cards' && (
          <p className={`text-xs ${mutedText}`}>
            Apasă <strong>+1 ștampilă</strong> pentru a simula scanarea QR la tejghea.
          </p>
        )}
      </div>

      {/* TAB 1: CUSTOMER LOYALTY CARDS */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((program) => {
            const isComplete = program.stampsCollected >= program.stampsRequired;
            return (
              <article
                key={program.id}
                className={`rounded-2xl border p-5 sm:p-6 shadow-sm transition-all flex flex-col justify-between ${cardSurface}`}
              >
                <div>
                  {/* Card Header + Mini QR */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: program.accentColor }}
                        >
                          {renderLoyaltyIcon(program.iconId, 'w-4 h-4', 2.2)}
                        </span>
                        <h2 className="font-serif text-xl font-bold truncate">
                          {program.venueName}
                        </h2>
                        {program.isCustomVendor && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#E0A526]/20 text-[#E0A526] border border-[#E0A526]/40">
                            Nou înscris
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${mutedText}`}>
                        Cartier {program.neighborhood}
                        {program.redeemedCount > 0 &&
                          ` • ${program.redeemedCount}x recompensat`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedQrProgramId(program.id)}
                      title="Mărește codul QR pentru scanare la casă"
                      className={`btn-press shrink-0 p-1.5 rounded-xl border transition-transform hover:scale-105 ${
                        isDrink
                          ? 'bg-white border-[#F2A33A]/40'
                          : 'bg-white border-[#E8E2D9]'
                      }`}
                    >
                      <DeterministicQrSvg
                        seed={program.qrSeed}
                        fgColor={program.accentColor}
                        className="w-16 h-16"
                      />
                    </button>
                  </div>

                  {/* Reward Pill */}
                  <div
                    className={`rounded-xl border px-3.5 py-2.5 mb-5 flex items-center gap-2.5 text-sm ${subtleSurface}`}
                  >
                    <Gift
                      className="w-4 h-4 shrink-0"
                      style={{ color: program.accentColor }}
                    />
                    <span className="font-medium leading-snug">
                      {program.rewardTitle}
                    </span>
                  </div>

                  {/* Stamp Slots Grid (Cute vendor icon stamps instead of paper punches) */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between text-xs font-semibold mb-2.5">
                      <span className={mutedText}>Ștampile digitale</span>
                      <span
                        className="font-mono"
                        style={{
                          color: isComplete ? '#E0A526' : undefined,
                        }}
                      >
                        {program.stampsCollected} / {program.stampsRequired}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2.5">
                      {Array.from({ length: program.stampsRequired }).map((_, idx) => {
                        const stamped = idx < program.stampsCollected;
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-xl flex items-center justify-center border transition-all duration-300 ${
                              stamped
                                ? 'text-white shadow-sm scale-100 border-transparent'
                                : isDrink
                                  ? 'border-dashed border-[#2C5A48] bg-[#17382C]/60 text-[#5C806E]'
                                  : 'border-dashed border-[#D9D0C3] bg-[#FAF8F5] text-[#C8BEB0]'
                            }`}
                            style={
                              stamped
                                ? {
                                    backgroundColor: program.accentColor,
                                  }
                                : undefined
                            }
                            aria-label={
                              stamped
                                ? `Ștampilă ${idx + 1} completă`
                                : `Ștampilă ${idx + 1} goală`
                            }
                          >
                            {stamped ? (
                              renderLoyaltyIcon(program.iconId, 'w-5 h-5', 2.2)
                            ) : (
                              <span className="text-[11px] font-mono font-semibold">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-2.5">
                  {isComplete ? (
                    <button
                      type="button"
                      onClick={() => handleRedeem(program.id)}
                      className="btn-press flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95"
                      style={{ backgroundColor: program.accentColor }}
                    >
                      <Gift className="w-4 h-4" />
                      Revendică recompensa
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleScanStamp(program.id)}
                      className={`btn-press flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        isDrink
                          ? 'bg-[#17382C] border-[#F2A33A]/50 text-[#F4EEE2] hover:bg-[#1E4738]'
                          : 'bg-[#FAF8F5] border-[#D9D0C3] text-[#3A2418] hover:border-[#3A2418]'
                      }`}
                    >
                      <ScanLine className="w-4 h-4" />
                      Scanează la casă (+1 ștampilă)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedQrProgramId(program.id)}
                    className={`btn-press inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                      isDrink
                        ? 'border-[#264D3E] text-[#A8BBAE] hover:text-[#F4EEE2]'
                        : 'border-[#E8E2D9] text-[#6E5649] hover:text-[#3A2418]'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    Cod QR
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* TAB 2: VENDOR SIGN-UP */}
      {activeTab === 'vendor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column */}
          <form
            onSubmit={handleCreateProgram}
            className={`lg:col-span-7 rounded-2xl border p-6 sm:p-7 shadow-sm space-y-6 ${cardSurface}`}
          >
            <div>
              <h2 className="font-serif text-2xl font-bold">
                Înscrie-ți localul în program
              </h2>
              <p className={`text-sm mt-1 ${mutedText}`}>
                Configurează cardul în 30 de secunde. Primești un cod QR de afișat la
                tejghea și pictograma ta simpatică de ștampilă.
              </p>
            </div>

            {formError && (
              <div className="rounded-xl bg-[#B3261E]/10 border border-[#B3261E]/30 px-4 py-3 text-sm font-medium text-[#B3261E]">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                  Numele localului *
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="ex. Brutăria din Elisabetin"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${
                    isDrink
                      ? 'bg-[#17382C] border-[#264D3E] text-[#F4EEE2] placeholder:text-[#6E8B7A] focus:border-[#F2A33A]'
                      : 'bg-[#FAF8F5] border-[#E8E2D9] text-[#3A2418] placeholder:text-[#A39384] focus:border-[#B3261E]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                  Cartier
                </label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${
                    isDrink
                      ? 'bg-[#17382C] border-[#264D3E] text-[#F4EEE2] focus:border-[#F2A33A]'
                      : 'bg-[#FAF8F5] border-[#E8E2D9] text-[#3A2418] focus:border-[#B3261E]'
                  }`}
                >
                  <option value="Cetate">Cetate</option>
                  <option value="Iosefin">Iosefin</option>
                  <option value="Fabric">Fabric</option>
                  <option value="Elisabetin">Elisabetin</option>
                  <option value="Complex Studențesc">Complex Studențesc</option>
                  <option value="Dacia / Circumvalațiunii">Dacia / Circumvalațiunii</option>
                  <option value="Mehala">Mehala</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                Recompensa la completarea cardului *
              </label>
              <input
                type="text"
                value={rewardTitle}
                onChange={(e) => setRewardTitle(e.target.value)}
                placeholder="ex. O cafea de specialitate + croissant cu unt din partea casei"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors ${
                  isDrink
                    ? 'bg-[#17382C] border-[#264D3E] text-[#F4EEE2] placeholder:text-[#6E8B7A] focus:border-[#F2A33A]'
                    : 'bg-[#FAF8F5] border-[#E8E2D9] text-[#3A2418] placeholder:text-[#A39384] focus:border-[#B3261E]'
                }`}
              />
            </div>

            {/* Stamp count selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                Număr de ștampile necesare
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {STAMP_COUNT_OPTIONS.map((count) => {
                  const selected = stampsRequired === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setStampsRequired(count)}
                      className={`btn-press py-2.5 rounded-xl border text-sm font-bold transition-all ${
                        selected
                          ? 'text-white border-transparent shadow-sm'
                          : isDrink
                            ? 'bg-[#17382C] border-[#264D3E] text-[#A8BBAE] hover:text-[#F4EEE2]'
                            : 'bg-[#FAF8F5] border-[#E8E2D9] text-[#6E5649] hover:text-[#3A2418]'
                      }`}
                      style={selected ? { backgroundColor: accentColor } : undefined}
                    >
                      {count} ștampile
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cute Icon Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                Alege pictograma ștampilei (simbolul localului)
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {ICON_OPTIONS.map(({ id, label, Icon }) => {
                  const active = selectedIcon === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedIcon(id)}
                      title={label}
                      className={`btn-press flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border transition-all ${
                        active
                          ? 'text-white border-transparent shadow-sm scale-105'
                          : isDrink
                            ? 'bg-[#17382C] border-[#264D3E] text-[#A8BBAE] hover:text-[#F4EEE2]'
                            : 'bg-[#FAF8F5] border-[#E8E2D9] text-[#6E5649] hover:text-[#3A2418]'
                      }`}
                      style={active ? { backgroundColor: accentColor } : undefined}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} />
                      <span className="text-[10px] font-medium truncate max-w-full px-0.5">
                        {label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color Swatches */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                Culoarea ștampilei și a codului QR
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {ACCENT_SWATCHES.map((swatch) => {
                  const active = accentColor === swatch.hex;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setAccentColor(swatch.hex)}
                      className={`btn-press inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                        active
                          ? isDrink
                            ? 'border-[#F2A33A] bg-[#17382C] text-[#F4EEE2]'
                            : 'border-[#3A2418] bg-[#FAF8F5] text-[#3A2418]'
                          : isDrink
                            ? 'border-[#264D3E] text-[#A8BBAE]'
                            : 'border-[#E8E2D9] text-[#6E5649]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      {swatch.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn-press w-full py-3.5 rounded-xl font-bold text-sm sm:text-base text-white shadow-sm transition-opacity hover:opacity-95 flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              <QrCode className="w-4 h-4" />
              Generează cardul digital și codul QR
            </button>
          </form>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${cardSurface}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                  Previzualizare card &amp; QR la tejghea
                </span>
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Live
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      {renderLoyaltyIcon(selectedIcon, 'w-4 h-4', 2.2)}
                    </span>
                    <h3 className="font-serif text-lg font-bold truncate">
                      {venueName.trim() || 'Localul tău aici'}
                    </h3>
                  </div>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    Cartier {neighborhood} • 2 / {stampsRequired} ștampile
                  </p>
                </div>

                <div className="p-1.5 rounded-xl bg-white border border-[#E8E2D9] shrink-0">
                  <DeterministicQrSvg
                    seed={previewSeed}
                    fgColor={accentColor}
                    className="w-20 h-20"
                  />
                </div>
              </div>

              <div
                className={`rounded-xl border px-3 py-2 mb-4 flex items-center gap-2 text-xs ${subtleSurface}`}
              >
                <Gift className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                <span className="font-medium">
                  {rewardTitle.trim() ||
                    'Recompensa aleasă de tine apare aici pentru clienți'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: stampsRequired }).map((_, idx) => {
                  const stamped = idx < 2;
                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded-xl flex items-center justify-center border ${
                        stamped
                          ? 'text-white border-transparent'
                          : isDrink
                            ? 'border-dashed border-[#2C5A48] bg-[#17382C]/60 text-[#5C806E]'
                            : 'border-dashed border-[#D9D0C3] bg-[#FAF8F5] text-[#C8BEB0]'
                      }`}
                      style={stamped ? { backgroundColor: accentColor } : undefined}
                    >
                      {stamped ? (
                        renderLoyaltyIcon(selectedIcon, 'w-4 h-4', 2.2)
                      ) : (
                        <span className="text-[10px] font-mono">{idx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-2xl border p-4 text-xs leading-relaxed ${subtleSurface} ${mutedText}`}>
              <strong className={isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'}>
                Cum funcționează la casă?
              </strong>{' '}
              Pui codul QR generat pe un mic stand lângă espressor sau casă. Clientul
              îl scanează din tab-ul <em>Cardurile mele</em> și primește instant
              pictograma aleasă de tine în loc de o ștampilă pe carton.
            </div>
          </div>
        </div>
      )}

      {/* Expanded Counter QR Modal */}
      {expandedProgram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setExpandedQrProgramId(null)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-xl text-center ${cardSurface}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: expandedProgram.accentColor }}
                >
                  {renderLoyaltyIcon(expandedProgram.iconId, 'w-4 h-4', 2.2)}
                </span>
                <span className="font-serif font-bold text-lg">
                  {expandedProgram.venueName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpandedQrProgramId(null)}
                className={`p-1 rounded-lg ${mutedText} hover:opacity-100`}
                aria-label="Închide fereastra QR"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="inline-block p-4 rounded-2xl bg-white border border-[#E8E2D9] mb-4 shadow-xs">
              <DeterministicQrSvg
                seed={expandedProgram.qrSeed}
                fgColor={expandedProgram.accentColor}
                className="w-52 h-52"
              />
            </div>

            <p className="text-sm font-semibold mb-1">
              {expandedProgram.stampsCollected} / {expandedProgram.stampsRequired}{' '}
              ștampile colectate
            </p>
            <p className={`text-xs mb-5 ${mutedText}`}>
              Arată acest cod la casă sau scanează-l pentru o nouă ștampilă.
            </p>

            <div className="flex gap-2">
              {expandedProgram.stampsCollected < expandedProgram.stampsRequired ? (
                <button
                  type="button"
                  onClick={() => handleScanStamp(expandedProgram.id)}
                  className="btn-press flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: expandedProgram.accentColor }}
                >
                  +1 ștampilă acum
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleRedeem(expandedProgram.id);
                    setExpandedQrProgramId(null);
                  }}
                  className="btn-press flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: expandedProgram.accentColor }}
                >
                  Revendică recompensa
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
