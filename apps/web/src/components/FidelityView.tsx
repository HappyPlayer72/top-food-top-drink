'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Beer,
  Cat,
  Check,
  Coffee,
  Copy,
  Croissant,
  Gift,
  Heart,
  Pizza,
  QrCode,
  ScanLine,
  Soup,
  Sparkles,
  Wine,
  X,
} from 'lucide-react';
import type { LoyaltyIconId, LoyaltyProgram, UserAccount, Vertical } from '../types';
import { fidelityWallet, stampFidelity } from '@/app/actions/loyalty';
import { QrScanPanel } from './QrScanPanel';

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

const DEFAULT_PROGRAMS: LoyaltyProgram[] = [
  {
    id: 'prog-restaurant-nora',
    venueName: 'Restaurant Nora',
    neighborhood: 'Iosefin',
    rewardTitle: 'O ciorbă de burtă din partea casei + smântână',
    stampsRequired: 6,
    iconId: 'soup',
    accentColor: '#B3261E',
    stampsCollected: 4,
    redeemedCount: 1,
    qrSeed: 'TOPFOOD:RESTAURANT-NORA:IOSEFIN:V1',
  },
  {
    id: 'prog-la-focacceria',
    venueName: 'La Focacceria',
    neighborhood: 'Cetate',
    rewardTitle: 'O focaccia artizanală la alegere (cuptor cald)',
    stampsRequired: 8,
    iconId: 'pizza',
    accentColor: '#E0A526',
    stampsCollected: 8,
    redeemedCount: 0,
    qrSeed: 'TOPFOOD:LA-FOCACCERIA:CETATE:V1',
  },
  {
    id: 'prog-scart-loc-lejer',
    venueName: 'Scârț Loc Lejer',
    neighborhood: 'Elisabetin',
    rewardTitle: 'Pahar de vin bănățean sau bere artizanală locală',
    stampsRequired: 5,
    iconId: 'wine',
    accentColor: '#17382C',
    stampsCollected: 2,
    redeemedCount: 2,
    qrSeed: 'TOPFOOD:SCART-LOC-LEJER:ELISABETIN:V1',
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

export function RealQrSvg({
  value,
  fgColor = '#3A2418',
  bgColor = '#FFFFFF',
  className = 'w-28 h-28',
}: {
  value: string;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}) {
  const { size, path } = useMemo(() => {
    const qr = QRCode.create(value || 'TOPFOOD-QR', { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const parts: string[] = [];
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        if (qr.modules.get(r, c)) {
          parts.push(`M${c + 1},${r + 1}h1v1h-1z`);
        }
      }
    }
    return { size: n, path: parts.join('') };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size + 2} ${size + 2}`}
      className={className}
      role="img"
      aria-label={`Cod QR digital pentru ${value}`}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={size + 2} height={size + 2} fill={bgColor} rx={1.2} />
      <path d={path} fill={fgColor} />
    </svg>
  );
}

export function FidelityView(props: FidelityViewProps) {
  if (!props.currentUser) {
    const isDrink = props.vertical === 'drink';
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <button type="button" onClick={props.onBack} className={`inline-flex items-center gap-2 text-sm font-medium ${isDrink ? 'text-[#A8BBAE]' : 'text-[#6E5649]'}`}>
          <ArrowLeft className="w-4 h-4" /> Înapoi la Top
        </button>
        <div className={`mt-8 rounded-2xl border p-6 sm:p-8 ${isDrink ? 'bg-[#143025] border-[#264D3E] text-[#F4EEE2]' : 'bg-white border-[#E8E2D9] text-[#3A2418]'}`}>
          <QrCode className="w-6 h-6 mb-4" />
          <h1 className="font-serif text-3xl font-bold">Cardurile tale de fidelitate</h1>
          <p className="mt-2 max-w-xl text-sm opacity-75">Strânge ștampile la localurile participante și bucură-te de recompense.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { Icon: QrCode, title: 'Cardurile tale', text: 'Le găsești pe toate într-un singur loc.' },
              { Icon: ScanLine, title: 'Strângi ștampile', text: 'Scanezi codul afișat la local.' },
              { Icon: Gift, title: 'Primești recompense', text: 'Completezi cardul și folosești premiul.' },
            ].map(({ Icon, title, text }, index) => (
              <div key={title} className={`rounded-xl border p-4 ${isDrink ? 'border-[#264D3E] bg-[#17382C]' : 'border-[#E8E2D9] bg-[#FAF8F5]'}`}>
                <div aria-hidden="true" className={`relative mb-3 flex h-16 w-20 items-center justify-center rounded-lg ${isDrink ? 'bg-[#F2A33A]/15 text-[#F2A33A]' : 'bg-[#B3261E]/10 text-[#B3261E]'}`}>
                  <span className="absolute left-2 top-1 text-[10px] font-bold opacity-60">0{index + 1}</span>
                  <Icon className="h-8 w-8" strokeWidth={1.5} />
                  <span className="absolute bottom-2 right-2 flex gap-1"><span className="h-1 w-1 rounded-full bg-current opacity-40" /><span className="h-1 w-1 rounded-full bg-current opacity-70" /><span className="h-1 w-1 rounded-full bg-current" /></span>
                </div>
                <h2 className="text-sm font-bold">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed opacity-75">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm opacity-75">Conectează-te sau creează un cont ca să accesezi cardurile tale.</p>
          <button type="button" onClick={props.onRequireLogin} className={`mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold ${isDrink ? 'bg-[#F2A33A] text-[#17382C]' : 'bg-[#B3261E] text-white'}`}>
            Conectează-te / Creează cont
          </button>
        </div>
      </div>
    );
  }
  return <FidelityWallet {...props} />;
}

function FidelityWallet({
  vertical,
  currentUser,
  onBack,
  onRequireLogin,
  useBackend = false,
}: FidelityViewProps) {
  const isDrink = vertical === 'drink';
  const [programs, setPrograms] = useState<LoyaltyProgram[]>(DEFAULT_PROGRAMS);
  const [hydrated, setHydrated] = useState(false);
  const [expandedQrProgramId, setExpandedQrProgramId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [redeemingProgramId, setRedeemingProgramId] = useState<string | null>(null);
  const [justStampedProgramId, setJustStampedProgramId] = useState<string | null>(null);
  const [copiedQrId, setCopiedQrId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);
  const scannerAnchorRef = useRef<HTMLDivElement>(null);

  /** Reîncarcă portofelul din backend; false = backend indisponibil (rămânem pe localStorage). */
  const refreshFromBackend = async (): Promise<boolean> => {
    const res = await fidelityWallet();
    if (res.ok) {
      setPrograms(res.programs);
      return true;
    }
    if (!res.offline) showToast(res.error, true);
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

  /** Succes: dispare după 10 s. Eroare: rămâne până o închide userul (WCAG 2.2.1). */
  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    if (isError) return;
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 10000);
  };

  const triggerStampPop = (programId: string) => {
    setJustStampedProgramId(programId);
    window.setTimeout(() => {
      setJustStampedProgramId((prev) => (prev === programId ? null : prev));
    }, 700);
  };

  const openScanner = () => {
    setExpandedQrProgramId(null);
    setScannerOpen(true);
    requestAnimationFrame(() => {
      scannerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const handleDemoQrScan = async (
    code: string,
  ): Promise<{ ok: boolean; message: string; programId?: string }> => {
    const clean = code.trim().toUpperCase();
    const matched = programs.find(
      (p) => p.qrSeed.toUpperCase() === clean || p.id.toUpperCase() === clean,
    );
    if (!matched) {
      return {
        ok: false,
        message: 'Codul QR nu corespunde niciunui local din portofel.',
      };
    }
    if (matched.stampsCollected >= matched.stampsRequired) {
      return {
        ok: false,
        message: `Cardul la ${matched.venueName} e deja complet! Apasă „Revendică recompensa”.`,
      };
    }
    const nextStamps = matched.stampsCollected + 1;
    setPrograms((prev) =>
      prev.map((prog) =>
        prog.id === matched.id ? { ...prog, stampsCollected: nextStamps } : prog,
      ),
    );
    triggerStampPop(matched.id);
    return {
      ok: true,
      programId: matched.id,
      message:
        nextStamps >= matched.stampsRequired
          ? `Card complet la ${matched.venueName}! Poți revendica recompensa.`
          : `+1 ștampilă la ${matched.venueName} (${nextStamps}/${matched.stampsRequired}).`,
    };
  };

  const handleRedeem = async (id: string) => {
    if (redeemingProgramId) return;
    if (useBackend) {
      if (!currentUser) {
        onRequireLogin?.();
        return;
      }
      const res = await stampFidelity(id);
      if (!res.ok) {
        showToast(res.error, true);
        return;
      }
      setRedeemingProgramId(id);
      showToast(res.message, false);
      window.setTimeout(() => {
        setRedeemingProgramId((prev) => (prev === id ? null : prev));
        void refreshFromBackend();
      }, 850);
      return;
    }

    const target = programs.find((p) => p.id === id);
    if (!target || target.stampsCollected < target.stampsRequired) return;

    setRedeemingProgramId(id);
    window.setTimeout(() => {
      setPrograms((prev) =>
        prev.map((prog) => {
          if (prog.id !== id || prog.stampsCollected < prog.stampsRequired) return prog;
          return {
            ...prog,
            stampsCollected: 0,
            redeemedCount: prog.redeemedCount + 1,
          };
        }),
      );
      setRedeemingProgramId((prev) => (prev === id ? null : prev));
      showToast(`Recompensă revendicată la ${target.venueName}! Cardul a fost resetat.`);
    }, 850);
  };

  const expandedProgram = programs.find((p) => p.id === expandedQrProgramId) ?? null;

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
          Scanează la localurile participante și strânge ștampile pentru recompense.
        </p>
      </div>

      {currentUser && (
        <div ref={scannerAnchorRef}>
          <QrScanPanel
            isDrink={isDrink}
            open={scannerOpen}
            onOpenChange={setScannerOpen}
            onCustomScan={useBackend ? undefined : handleDemoQrScan}
            onResult={(message, isError, programId) => {
              showToast(message, isError);
              if (!isError && programId) triggerStampPop(programId);
              if (useBackend) void refreshFromBackend();
            }}
          />
        </div>
      )}

      {/* Toast Notification — zona live există mereu, se schimbă doar conținutul */}
      <div role={toastIsError ? 'alert' : 'status'} aria-live={toastIsError ? 'assertive' : 'polite'}>
      {toastMessage && (
        <div
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
      </div>

      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-bold">Cardurile mele ({programs.length})</h2>
        {!useBackend && <p className={`text-xs ${mutedText}`}>Ștampilele sunt simulate în modul demo.</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((program) => {
            const isComplete = program.stampsCollected >= program.stampsRequired;
            const isRedeeming = redeemingProgramId === program.id;
            const isJustStamped = justStampedProgramId === program.id;
            return (
              <article
                key={program.id}
                className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-sm transition-all flex flex-col justify-between ${cardSurface} ${
                  isRedeeming
                    ? isDrink
                      ? 'loyalty-reward-celebrate ring-2 ring-[#F2A33A]'
                      : 'loyalty-reward-celebrate ring-2 ring-[#E0A526]'
                    : ''
                }`}
              >
                {isRedeeming && (
                  <>
                    <div
                      aria-hidden="true"
                      className="loyalty-shine-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#E0A526]/25 to-transparent"
                    />
                    <div
                      aria-hidden="true"
                      className="loyalty-sparkle-burst pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md ${
                          isDrink
                            ? 'bg-[#F2A33A] text-[#17382C]'
                            : 'bg-[#E0A526] text-[#3A2418]'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Recompensă revendicată!
                      </span>
                    </div>
                  </>
                )}

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
                      <RealQrSvg
                        value={program.qrSeed}
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
                        const animateStamp =
                          isRedeeming ||
                          (isJustStamped && idx === program.stampsCollected - 1);
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-xl flex items-center justify-center border transition-all duration-300 ${
                              stamped
                                ? 'text-white shadow-sm scale-100 border-transparent'
                                : isDrink
                                  ? 'border-dashed border-[#2C5A48] bg-[#17382C]/60 text-[#5C806E]'
                                  : 'border-dashed border-[#D9D0C3] bg-[#FAF8F5] text-[#C8BEB0]'
                            } ${animateStamp ? 'loyalty-stamp-pop' : ''}`}
                            style={
                              stamped
                                ? {
                                    backgroundColor: program.accentColor,
                                    animationDelay: isRedeeming ? `${idx * 35}ms` : undefined,
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
                      onClick={() => void handleRedeem(program.id)}
                      disabled={isRedeeming}
                      className="btn-press flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-90"
                      style={{ backgroundColor: program.accentColor }}
                    >
                      {isRedeeming ? (
                        <>
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          Se revendică…
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4" />
                          Revendică recompensa
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openScanner}
                      className={`btn-press flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        isDrink
                          ? 'bg-[#17382C] border-[#F2A33A]/50 text-[#F4EEE2] hover:bg-[#1E4738]'
                          : 'bg-[#FAF8F5] border-[#D9D0C3] text-[#3A2418] hover:border-[#3A2418]'
                      }`}
                    >
                      <ScanLine className="w-4 h-4" />
                      Scanează codul QR
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

      {/* Expanded Counter QR Modal */}
      {expandedProgram && (
        <div
          className="modal-backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setExpandedQrProgramId(null)}
        >
          <div
            className={`modal-panel-enter w-full max-w-sm rounded-2xl border p-6 shadow-xl text-center ${cardSurface}`}
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

            <div className="inline-block p-4 rounded-2xl bg-white border border-[#E8E2D9] mb-3 shadow-xs">
              <RealQrSvg
                value={expandedProgram.qrSeed}
                fgColor={expandedProgram.accentColor}
                className="w-52 h-52"
              />
            </div>

            {!useBackend && (
              <div className="mb-3 flex items-center justify-center gap-2">
                <code className={`text-[11px] font-mono px-2 py-1 rounded border ${subtleSurface}`}>
                  {expandedProgram.qrSeed}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(expandedProgram.qrSeed);
                    setCopiedQrId(expandedProgram.id);
                    window.setTimeout(() => setCopiedQrId(null), 2000);
                  }}
                  className={`btn-press inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border ${subtleSurface}`}
                  aria-label="Copiază codul QR"
                >
                  {copiedQrId === expandedProgram.id ? (
                    <>
                      <Check className="w-3 h-3 text-[#2D5130]" />
                      Copiat
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copiază
                    </>
                  )}
                </button>
              </div>
            )}

            <p className="text-sm font-semibold mb-1">
              {expandedProgram.stampsCollected} / {expandedProgram.stampsRequired}{' '}
              ștampile colectate
            </p>
            <p className={`text-xs mb-5 ${mutedText}`}>
              {useBackend
                ? 'Arată acest cod la casă sau scanează codul QR afișat de local pentru o nouă ștampilă.'
                : 'Scanează acest cod QR sau introdu-l în scaner pentru a primi o ștampilă.'}
            </p>

            <div className="flex gap-2">
              {expandedProgram.stampsCollected < expandedProgram.stampsRequired ? (
                <button
                  type="button"
                  onClick={openScanner}
                  className="btn-press flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: expandedProgram.accentColor }}
                >
                  <ScanLine className="w-4 h-4" />
                  Scanează codul QR
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedQrProgramId(null);
                    void handleRedeem(expandedProgram.id);
                  }}
                  className="btn-press flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: expandedProgram.accentColor }}
                >
                  <Gift className="w-4 h-4" />
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
