'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, Lock, Mail, MapPin, Moon, Sun, User } from 'lucide-react';
import {
  Neighborhood,
  USER_PREFERENCE_OPTIONS,
  UserAccount,
  UserPreferenceKey,
  Vertical,
  formatScore,
} from '../types';
import { NEIGHBORHOODS } from '../data/restaurants';
import { BrandWordmark, CarouStrip, LocalnicBadge } from './BrandPrimitives';

export interface LoginScreenProps {
  vertical: Vertical;
  onVerticalChange: (v: Vertical) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  demoUsers: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onContinueAsGuest: () => void;
}

type AuthMode = 'login' | 'register';

function isAcademicLocalEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith('@e-uvt.ro') || normalized.endsWith('@upt.ro');
}

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? 'Utilizator';
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'Utilizator';
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  vertical,
  onVerticalChange,
  darkMode,
  onToggleDarkMode,
  demoUsers,
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const isDrink = vertical === 'drink';

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'verified-local' | 'tourist'>('tourist');
  const [neighborhood, setNeighborhood] = useState<Neighborhood>('Iosefin');
  const [confirmLocalCheckin, setConfirmLocalCheckin] = useState(false);
  const [gpsVerified, setGpsVerified] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<UserPreferenceKey[]>([]);
  const [preferencesSkipped, setPreferencesSkipped] = useState(false);
  const [showWeightsInfo, setShowWeightsInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePreference = (key: UserPreferenceKey) => {
    setSelectedPreferences((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const emailSuggestsLocal = isAcademicLocalEmail(email);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onContinueAsGuest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinueAsGuest]);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPreferencesSkipped(false);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Introdu o adresă de email validă.');
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.');
      return;
    }

    if (mode === 'register') {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        setError('Introdu numele sau inițialele pe care vrei să le afișăm.');
        return;
      }

      if (
        selectedRole === 'verified-local' &&
        !confirmLocalCheckin &&
        !gpsVerified &&
        !emailSuggestsLocal
      ) {
        setError(
          'Confirmă că locuiești în Timișoara sau confirmă prezența pentru a continua ca localnic.'
        );
        return;
      }

      const isDeclaredLocal = selectedRole === 'verified-local';
      const isVerifiedLocal =
        isDeclaredLocal && (gpsVerified || emailSuggestsLocal);
      const newUser: UserAccount = {
        id: `user-${Date.now()}`,
        name: trimmedName,
        email: trimmedEmail,
        role: isVerifiedLocal ? 'verified-local' : 'tourist',
        neighborhood: isDeclaredLocal ? neighborhood : undefined,
        weightMultiplier: isVerifiedLocal ? 2.0 : 1.0,
        description: isVerifiedLocal
          ? gpsVerified
            ? `Localnic verificat în Timișoara (${neighborhood}) · review-urile tale au pondere 2,0×.`
            : `Localnic verificat UVT/UPT (${neighborhood}) · review-urile tale au pondere 2,0×.`
          : isDeclaredLocal
          ? `Localnic neverificat (${neighborhood}) · pondere 1,0× până la confirmarea prezenței în Timișoara.`
          : 'Cont de vizitator · review-urile tale contribuie la Scorul Turiștilor (1,0×).',
        preferences: selectedPreferences,
      };
      onLoginSuccess(newUser);
      return;
    }

    // Login mode: match demo user by email if present, otherwise create session account
    const matchedDemo = demoUsers.find(
      (u) => u.email?.toLowerCase() === trimmedEmail
    );
    if (matchedDemo) {
      onLoginSuccess(matchedDemo);
      return;
    }

    const sessionUser: UserAccount = {
      id: `user-${trimmedEmail.replace(/[^a-z0-9]/g, '-')}`,
      name: formatNameFromEmail(trimmedEmail),
      email: trimmedEmail,
      role: 'tourist',
      neighborhood: undefined,
      weightMultiplier: 1.0,
      description:
        'Cont de vizitator (1,0×) · verifică prezența prin check-in GPS pentru statut de localnic 2,0×.',
    };
    onLoginSuccess(sessionUser);
  };

  const localWillBeVerified = gpsVerified || emailSuggestsLocal;

  const inputClasses = isDrink
    ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder:text-[#F4EEE2]/40 focus:border-[#F2A33A]'
    : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder:text-[#6E5649]/60 focus:border-[#3A2418]';

  return (
    <div
      className={`min-h-screen overflow-x-clip flex flex-col transition-colors ${
        isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
      }`}
    >
      {/* Top Minimal Masthead */}
      <header
        className={`pt-[env(safe-area-inset-top)] border-b ${
          isDrink
            ? 'bg-[#17382C]/95 border-[#285443]'
            : 'bg-white/95 border-[#E6DFD5]'
        }`}
      >
        <div className="max-w-5xl mx-auto px-2.5 min-[375px]:px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 min-[375px]:gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 min-[375px]:gap-2 sm:gap-3 min-w-0 flex-1 [&>button]:min-h-[44px] [&>button]:max-w-full">
            <BrandWordmark vertical={vertical} onClick={onContinueAsGuest} />
            <button
              type="button"
              onClick={onContinueAsGuest}
              className={`btn-press inline-flex items-center gap-1.5 min-h-[44px] text-[12px] sm:text-[13px] font-semibold px-2 min-[375px]:px-2.5 sm:px-3 py-1.5 rounded-[4px] border shrink-0 whitespace-nowrap ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              <span className="sm:hidden">← Înapoi</span>
              <span className="hidden sm:inline">← Înapoi la clasament</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onVerticalChange(isDrink ? 'food' : 'drink')}
              className={`btn-press min-h-[44px] text-[12px] sm:text-[13px] font-semibold px-2 min-[375px]:px-2.5 sm:px-3 py-1.5 rounded-[4px] border whitespace-nowrap ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              {isDrink ? 'topfood' : 'topdrink'}
            </button>

            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={darkMode ? 'Comută la mod luminos' : 'Comută la mod întunecat'}
              title={darkMode ? 'Mod luminos' : 'Mod întunecat'}
              className={`btn-press w-11 h-11 rounded-full flex items-center justify-center ${
                isDrink
                  ? 'text-[#F4EEE2] hover:bg-[#1E4335]'
                  : 'text-[#3A2418] hover:bg-[#FAF8F5]'
              }`}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-[#E0A526]" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {!isDrink && <CarouStrip height={8} />}

      {/* Main Content */}
      <main className="flex-1 flex items-start lg:items-center py-5 sm:py-10 lg:py-12 px-4 sm:px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 items-start">
          {/* Left Column: Editorial Context & Quick Demo Access */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6">
            <div className="space-y-2 sm:space-y-3">
              <h1 className="font-display text-[32px] sm:text-[42px] lg:text-[46px] leading-[1.02]">
                {isDrink
                  ? 'Unde bei în Timișoara fără să-ți pară rău de notă.'
                  : 'Timișoara pe gustate, nu pe ghicite.'}
              </h1>
              <p
                className={`text-[14px] sm:text-[15px] leading-relaxed ${
                  isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
                }`}
              >
                Autentifică-te pentru a salva localuri și pentru a publica
                note cu pondere transparentă.
              </p>
            </div>

            {/* Mobile Disclosure Trigger for Trust Weights */}
            <div className="lg:hidden">
              <button
                type="button"
                aria-expanded={showWeightsInfo}
                onClick={() => setShowWeightsInfo((prev) => !prev)}
                className={`btn-press w-full min-h-[44px] px-3.5 py-2.5 rounded-[6px] border text-[13px] font-semibold flex items-center justify-between gap-2 ${
                  isDrink
                    ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                    : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                }`}
              >
                <span>De ce notele au ponderi 2,0× și 1,0×?</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    showWeightsInfo ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Trust Weights Explanation */}
            <div
              className={`${showWeightsInfo ? 'block' : 'hidden'} lg:block rounded-[6px] border p-4 space-y-3 ${
                isDrink
                  ? 'bg-[#143025] border-[#285443]'
                  : 'bg-[#FAF8F5] border-[#E6DFD5]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <LocalnicBadge label="Localnic verificat" size="xs" />
                  <p
                    className={`text-[12px] ${
                      isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                    }`}
                  >
                    Adresă <span className="font-semibold">@e-uvt.ro</span>,{' '}
                    <span className="font-semibold">@upt.ro</span> sau cartier
                    confirmat în Timișoara.
                  </p>
                </div>
                <span
                  className={`font-display text-[22px] leading-none shrink-0 tabular-nums ${
                    isDrink ? 'text-[#F2A33A]' : 'text-[#3A2418]'
                  }`}
                >
                  2,0×
                </span>
              </div>

              <div
                className={`pt-3 border-t flex items-start justify-between gap-3 ${
                  isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                }`}
              >
                <div className="space-y-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-[3px] border text-[11px] font-semibold ${
                      isDrink
                        ? 'border-[#2D5947] text-[#F4EEE2]/85 bg-[#122B22]'
                        : 'border-[#D6CFC5] text-[#6E5649] bg-white'
                    }`}
                  >
                    Turist / Vizitator
                  </span>
                  <p
                    className={`text-[12px] ${
                      isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                    }`}
                  >
                    Notele tale apar separat în Scorul Turiștilor și ajută la
                    detectarea capcanelor.
                  </p>
                </div>
                <span
                  className={`font-display text-[22px] leading-none shrink-0 tabular-nums ${
                    isDrink ? 'text-[#F4EEE2]/85' : 'text-[#6E5649]'
                  }`}
                >
                  1,0×
                </span>
              </div>
            </div>

            {/* Quick Demo Accounts */}
            <div className="space-y-2.5">
              <div
                className={`text-[12px] font-semibold ${
                  isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                }`}
              >
                Acces rapid cu un cont demo
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {demoUsers.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => onLoginSuccess(acc)}
                    className={`btn-press w-full min-h-[52px] rounded-[6px] border px-3.5 py-2.5 text-left flex items-center justify-between gap-3 ${
                      isDrink
                        ? 'bg-[#143025] border-[#285443] hover:border-[#F2A33A]'
                        : 'bg-white border-[#E6DFD5] hover:border-[#3A2418]'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[14px]">
                          {acc.name}
                        </span>
                        {acc.role === 'verified-local' ? (
                          <LocalnicBadge
                            label={`Localnic · ${acc.neighborhood ?? 'Timișoara'}`}
                            size="xs"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[3px] border text-[11px] font-semibold ${
                              isDrink
                                ? 'border-[#2D5947] text-[#F4EEE2]/80 bg-[#122B22]'
                                : 'border-[#D6CFC5] text-[#6E5649] bg-[#FAF8F5]'
                            }`}
                          >
                            Turist
                          </span>
                        )}
                      </div>
                      {acc.email && (
                        <div
                          className={`text-[12px] truncate ${
                            isDrink ? 'text-[#F4EEE2]/60' : 'text-[#6E5649]'
                          }`}
                        >
                          {acc.email}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-display text-[18px] tabular-nums ${
                          isDrink ? 'text-[#F2A33A]' : 'text-[#3A2418]'
                        }`}
                      >
                        {formatScore(acc.weightMultiplier)}×
                      </span>
                      <ArrowRight className="w-4 h-4 opacity-70" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Login / Register Form Card */}
          <div className="lg:col-span-7">
            <div
              className={`rounded-[6px] border p-4 sm:p-7 space-y-5 ${
                isDrink
                  ? 'bg-[#143025] border-[#2D5947]'
                  : 'bg-white border-[#3A2418]'
              }`}
            >
              {/* Mode Segmented Control */}
              <div
                role="tablist"
                aria-label="Tip autentificare"
                className={`grid grid-cols-2 p-1 rounded-[4px] border ${
                  isDrink
                    ? 'bg-[#122B22] border-[#285443]'
                    : 'bg-[#FAF8F5] border-[#E6DFD5]'
                }`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => handleModeChange('login')}
                  className={`btn-press min-h-[44px] py-2 text-[13px] rounded-[3px] font-semibold ${
                    mode === 'login'
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] font-bold'
                        : 'bg-[#3A2418] text-white font-bold'
                      : isDrink
                      ? 'text-[#F4EEE2]/75 hover:text-[#F4EEE2]'
                      : 'text-[#6E5649] hover:text-[#3A2418]'
                  }`}
                >
                  Intră în cont
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => handleModeChange('register')}
                  className={`btn-press min-h-[44px] py-2 text-[13px] rounded-[3px] font-semibold ${
                    mode === 'register'
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] font-bold'
                        : 'bg-[#3A2418] text-white font-bold'
                      : isDrink
                      ? 'text-[#F4EEE2]/75 hover:text-[#F4EEE2]'
                      : 'text-[#6E5649] hover:text-[#3A2418]'
                  }`}
                >
                  Cont nou
                </button>
              </div>

              <div className="space-y-1">
                <h2 className="font-display text-[28px] leading-tight">
                  {mode === 'login' ? 'Bine ai revenit' : 'Creează contul tău'}
                </h2>
                <p
                  className={`text-[13px] ${
                    isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                  }`}
                >
                  {mode === 'login'
                    ? 'Folosește adresa de email și parola contului tău.'
                    : 'Alege dacă ești localnic în Timișoara sau vizitator.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-name"
                      className="text-[13px] font-semibold block"
                    >
                      Nume afișat
                    </label>
                    <div className="relative">
                      <User
                        className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                          isDrink ? 'text-[#F4EEE2]/50' : 'text-[#6E5649]'
                        }`}
                      />
                      <input
                        id="auth-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ex: Vlad P."
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'auth-error-msg' : undefined}
                        className={`w-full min-h-[44px] pl-9 pr-3 py-2.5 rounded-[4px] border text-[16px] sm:text-[14px] focus:outline-none ${inputClasses}`}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="auth-email"
                      className="text-[13px] font-semibold"
                    >
                      Email
                    </label>
                    {mode === 'register' && emailSuggestsLocal && (
                      <LocalnicBadge label="Domeniu UVT / UPT (2,0×)" size="xs" />
                    )}
                  </div>
                  <div className="relative">
                    <Mail
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isDrink ? 'text-[#F4EEE2]/50' : 'text-[#6E5649]'
                      }`}
                    />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="andreea@e-uvt.ro"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'auth-error-msg' : undefined}
                      className={`w-full min-h-[44px] pl-9 pr-3 py-2.5 rounded-[4px] border text-[16px] sm:text-[14px] focus:outline-none ${inputClasses}`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-password"
                    className="text-[13px] font-semibold block"
                  >
                    Parolă
                  </label>
                  <div className="relative">
                    <Lock
                      className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isDrink ? 'text-[#F4EEE2]/50' : 'text-[#6E5649]'
                      }`}
                    />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minim 6 caractere"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'auth-error-msg' : undefined}
                      className={`w-full min-h-[44px] pl-9 pr-12 py-2.5 rounded-[4px] border text-[16px] sm:text-[14px] focus:outline-none ${inputClasses}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? 'Ascunde parola' : 'Arată parola'
                      }
                      className={`absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-[3px] ${
                        isDrink
                          ? 'text-[#F4EEE2]/70 hover:text-[#F4EEE2]'
                          : 'text-[#6E5649] hover:text-[#3A2418]'
                      }`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="space-y-3 pt-1">
                    <span className="text-[13px] font-semibold block">
                      Statut în Timișoara
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('verified-local')}
                        className={`btn-press rounded-[4px] border p-3 text-left space-y-1 ${
                          selectedRole === 'verified-local'
                            ? isDrink
                              ? 'border-[#F2A33A] bg-[#1E4335]'
                              : 'border-[#1F4E8C] bg-[#FAF8F5]'
                            : isDrink
                            ? 'border-[#285443] bg-[#122B22]'
                            : 'border-[#E6DFD5] bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <LocalnicBadge label={localWillBeVerified ? 'Localnic verificat' : 'Localnic'} size="xs" />
                          <span className="font-display text-[17px]">
                            {localWillBeVerified ? '2,0×' : '1,0×'}
                          </span>
                        </div>
                        <p
                          className={`text-[12px] ${
                            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                          }`}
                        >
                          {gpsVerified
                            ? 'Prezență confirmată în Timișoara'
                            : emailSuggestsLocal
                            ? 'Verificat automat prin domeniul UVT / UPT'
                            : '2,0× după confirmare în Timișoara sau email UVT/UPT'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('tourist')}
                        className={`btn-press rounded-[4px] border p-3 text-left space-y-1 ${
                          selectedRole === 'tourist'
                            ? isDrink
                              ? 'border-[#F2A33A] bg-[#1E4335]'
                              : 'border-[#3A2418] bg-[#FAF8F5]'
                            : isDrink
                            ? 'border-[#285443] bg-[#122B22]'
                            : 'border-[#E6DFD5] bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[3px] border text-[11px] font-semibold ${
                              isDrink
                                ? 'border-[#2D5947] text-[#F4EEE2]/85 bg-[#122B22]'
                                : 'border-[#D6CFC5] text-[#6E5649] bg-white'
                            }`}
                          >
                            Turist
                          </span>
                          <span className="font-display text-[17px]">1,0×</span>
                        </div>
                        <p
                          className={`text-[12px] ${
                            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                          }`}
                        >
                          Sunt în vizită în oraș
                        </p>
                      </button>
                    </div>

                    {selectedRole === 'verified-local' && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="auth-neighborhood"
                          className="text-[13px] font-semibold flex items-center gap-1.5"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Cartierul tău</span>
                        </label>
                        <select
                          id="auth-neighborhood"
                          value={neighborhood}
                          onChange={(e) =>
                            setNeighborhood(e.target.value as Neighborhood)
                          }
                          className={`w-full min-h-[44px] px-3 py-2.5 rounded-[4px] border text-[16px] sm:text-[14px] focus:outline-none ${inputClasses}`}
                        >
                          {NEIGHBORHOODS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>

                        <div className="space-y-2">
                          <label
                            htmlFor="auth-local-confirm"
                            className={`flex items-start gap-2.5 rounded-[4px] border min-h-[48px] p-3 text-[12px] leading-snug cursor-pointer ${
                              isDrink
                                ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/85'
                                : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
                            }`}
                          >
                            <input
                              id="auth-local-confirm"
                              type="checkbox"
                              checked={confirmLocalCheckin}
                              onChange={(e) => {
                                setConfirmLocalCheckin(e.target.checked);
                                if (e.target.checked && error) setError(null);
                              }}
                              aria-invalid={Boolean(error)}
                              aria-describedby={error ? 'auth-error-msg' : undefined}
                              className="mt-0.5 h-5 w-5 shrink-0 accent-[#B3261E]"
                            />
                            <span>
                              Confirm că locuiesc în Timișoara (fără confirmare vei primi statut neverificat 1,0×)
                            </span>
                          </label>

                          <button
                            type="button"
                            aria-pressed={gpsVerified}
                            onClick={() => {
                              setGpsVerified((prev) => !prev);
                              if (error) setError(null);
                            }}
                            className={`btn-press w-full min-h-[44px] px-3 py-2 rounded-[4px] border text-[12px] font-semibold flex items-center justify-between gap-2 ${
                              gpsVerified
                                ? isDrink
                                  ? 'border-[#F2A33A] bg-[#1E4335] text-[#F4EEE2]'
                                  : 'border-[#1F4E8C] bg-[#1F4E8C]/10 text-[#1F4E8C]'
                                : isDrink
                                ? 'border-[#285443] bg-[#122B22] text-[#F4EEE2]/85 hover:border-[#F2A33A]'
                                : 'border-[#E6DFD5] bg-white text-[#3A2418] hover:border-[#1F4E8C]'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-left">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {gpsVerified
                                  ? 'Prezență confirmată în Timișoara (2,0×)'
                                  : 'Confirmă prezența în Timișoara (pentru 2,0×)'}
                              </span>
                            </span>
                            <span className="font-semibold text-[11px] tabular-nums shrink-0">
                              {gpsVerified ? '2,0× activ' : emailSuggestsLocal ? '2,0× UVT/UPT' : '1,0×'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Multi-select user preferences (appears after typing email) */}
                    {email.trim().length > 0 && !preferencesSkipped && (
                      <div
                        className={`space-y-2 pt-3 border-t ${
                          isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            id="auth-preferences-label"
                            className="text-[13px] font-semibold"
                          >
                            Ce contează pentru tine la un local?
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {selectedPreferences.length > 0 && (
                              <span
                                className={`text-[11px] font-semibold tabular-nums ${
                                  isDrink ? 'text-[#F2A33A]' : 'text-[#6E5649]'
                                }`}
                              >
                                {selectedPreferences.length === 1
                                  ? '1 selectată'
                                  : `${selectedPreferences.length} selectate`}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPreferences([]);
                                setPreferencesSkipped(true);
                              }}
                              className={`btn-press min-h-[32px] px-2.5 py-1 rounded-[4px] border text-[12px] font-semibold ${
                                isDrink
                                  ? 'border-[#2D5947] text-[#F4EEE2]/80 hover:border-[#F2A33A] hover:text-[#F4EEE2]'
                                  : 'border-[#D6CFC5] text-[#6E5649] hover:border-[#3A2418] hover:text-[#3A2418]'
                              }`}
                            >
                              Sari peste
                            </button>
                          </div>
                        </div>
                        <p
                          className={`text-[12px] ${
                            isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                          }`}
                        >
                          Opțional — după review-uri te vom întreba rapid doar despre criteriile alese.
                        </p>
                        <div
                          role="group"
                          aria-labelledby="auth-preferences-label"
                          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                        >
                          {USER_PREFERENCE_OPTIONS.map((opt) => {
                            const isSelected = selectedPreferences.includes(opt.key);
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => togglePreference(opt.key)}
                                className={`btn-press min-h-[44px] px-3 py-2 rounded-[4px] border text-[13px] text-left flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? isDrink
                                      ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C] font-bold'
                                      : 'bg-[#3A2418] border-[#3A2418] text-white font-semibold'
                                    : isDrink
                                    ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/85 hover:border-[#F2A33A] font-medium'
                                    : 'bg-white border-[#E6DFD5] text-[#3A2418] hover:border-[#3A2418] font-medium'
                                }`}
                              >
                                <span className="leading-snug">{opt.label}</span>
                                {isSelected ? (
                                  <span
                                    aria-hidden="true"
                                    className="w-4 h-4 rounded-[3px] border border-current flex items-center justify-center shrink-0"
                                  >
                                    <Check className="w-3 h-3 stroke-[2.75]" />
                                  </span>
                                ) : (
                                  <span
                                    aria-hidden="true"
                                    className={`w-4 h-4 rounded-[3px] border shrink-0 ${
                                      isDrink
                                        ? 'border-[#2D5947]'
                                        : 'border-[#D6CFC5]'
                                    }`}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {email.trim().length > 0 && preferencesSkipped && (
                      <div
                        className={`pt-2 border-t flex items-center justify-between gap-2 text-[12px] ${
                          isDrink
                            ? 'border-[#285443] text-[#F4EEE2]/70'
                            : 'border-[#E6DFD5] text-[#6E5649]'
                        }`}
                      >
                        <span>Preferințe sărite.</span>
                        <button
                          type="button"
                          onClick={() => setPreferencesSkipped(false)}
                          className={`font-semibold underline underline-offset-2 ${
                            isDrink
                              ? 'text-[#F2A33A] hover:opacity-85'
                              : 'text-[#3A2418] hover:opacity-85'
                          }`}
                        >
                          Alege preferințe
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div
                    id="auth-error-msg"
                    role="alert"
                    className={`rounded-[4px] border px-3 py-2 text-[13px] font-semibold ${
                      isDrink
                        ? 'bg-[#B3261E]/20 border-[#B3261E] text-[#F4EEE2]'
                        : 'bg-[#B3261E]/8 border-[#B3261E] text-[#B3261E]'
                    }`}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className={`btn-press w-full min-h-[48px] py-3 px-4 rounded-[4px] text-[15px] sm:text-[14px] font-bold flex items-center justify-center gap-2 ${
                    isDrink
                      ? 'bg-[#F2A33A] text-[#17382C] hover:opacity-95'
                      : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
                  }`}
                >
                  <span>
                    {mode === 'login' ? 'Intră în cont' : 'Creează cont și intră'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div
                className={`pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] ${
                  isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                }`}
              >
                <span
                  className={
                    isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                  }
                >
                  Vrei doar să consulți clasamentul?
                </span>
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className={`btn-press min-h-[44px] inline-flex items-center font-semibold underline underline-offset-4 text-left sm:text-right ${
                    isDrink
                      ? 'text-[#F2A33A] hover:opacity-85'
                      : 'text-[#3A2418] hover:text-[#B3261E]'
                  }`}
                >
                  Explorează fără cont
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginScreen;
