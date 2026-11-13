'use client';

import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, MapPin, Moon, Sun, User } from 'lucide-react';
import { Neighborhood, UserAccount, Vertical, formatScore } from '../types';
import { BrandWordmark, CarouStrip, LocalnicBadge } from './BrandPrimitives';

const TIMISOARA_NEIGHBORHOODS: Neighborhood[] = [
  'Iosefin',
  'Cetate / Piața Unirii',
  'Fabric',
  'Elisabetin',
  'Complexul Studențesc',
  'Piața Victoriei',
  'Piața Libertății',
  'Bastion',
];

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
  const [selectedRole, setSelectedRole] = useState<'verified-local' | 'tourist'>('verified-local');
  const [neighborhood, setNeighborhood] = useState<Neighborhood>('Iosefin');
  const [error, setError] = useState<string | null>(null);

  const emailSuggestsLocal = isAcademicLocalEmail(email);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
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

      const isLocal = selectedRole === 'verified-local' || emailSuggestsLocal;
      const newUser: UserAccount = {
        id: `user-${Date.now()}`,
        name: trimmedName,
        email: trimmedEmail,
        role: isLocal ? 'verified-local' : 'tourist',
        neighborhood: isLocal ? neighborhood : undefined,
        weightMultiplier: isLocal ? 2.0 : 1.0,
        description: isLocal
          ? `Cont verificat ${neighborhood} · review-urile tale au pondere 2,0×.`
          : 'Cont de vizitator · review-urile tale contribuie la Scorul Turiștilor (1,0×).',
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

    const isLocal = emailSuggestsLocal;
    const sessionUser: UserAccount = {
      id: `user-${trimmedEmail.replace(/[^a-z0-9]/g, '-')}`,
      name: formatNameFromEmail(trimmedEmail),
      email: trimmedEmail,
      role: isLocal ? 'verified-local' : 'tourist',
      neighborhood: isLocal ? 'Timișoara' : undefined,
      weightMultiplier: isLocal ? 2.0 : 1.0,
      description: isLocal
        ? 'Cont universitar verificat Timișoara · review-urile tale au pondere 2,0×.'
        : 'Cont de vizitator · review-urile tale contribuie la Scorul Turiștilor (1,0×).',
    };
    onLoginSuccess(sessionUser);
  };

  const inputClasses = isDrink
    ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] placeholder:text-[#F4EEE2]/40 focus:border-[#F2A33A]'
    : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder:text-[#6E5649]/60 focus:border-[#3A2418]';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
      }`}
    >
      {/* Top Minimal Masthead */}
      <header
        className={`border-b ${
          isDrink
            ? 'bg-[#17382C]/95 border-[#285443]'
            : 'bg-white/95 border-[#E6DFD5]'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <BrandWordmark vertical={vertical} />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onVerticalChange(isDrink ? 'food' : 'drink')}
              className={`btn-press text-[13px] font-semibold px-3 py-1.5 rounded-[4px] border ${
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
              className={`btn-press w-9 h-9 rounded-full flex items-center justify-center ${
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
      <main className="flex-1 flex items-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Editorial Context & Quick Demo Access */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <h1 className="font-display text-[38px] sm:text-[46px] leading-[1.02]">
                {isDrink
                  ? 'Unde ies timișorenii, fără capcane.'
                  : 'Unde mănâncă timișorenii, nu turiștii.'}
              </h1>
              <p
                className={`text-[15px] leading-relaxed ${
                  isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
                }`}
              >
                Autentifică-te pentru a salva localuri și pentru a publica
                note cu pondere transparentă.
              </p>
            </div>

            {/* Trust Weights Explanation */}
            <div
              className={`rounded-[6px] border p-4 space-y-3 ${
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
                    Adresă <code className="font-semibold">@e-uvt.ro</code>,{' '}
                    <code className="font-semibold">@upt.ro</code> sau cartier
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
                    className={`btn-press w-full rounded-[6px] border px-3.5 py-2.5 text-left flex items-center justify-between gap-3 ${
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
              className={`rounded-[6px] border p-5 sm:p-7 space-y-5 ${
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
                  className={`btn-press py-2 text-[13px] rounded-[3px] font-semibold ${
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
                  className={`btn-press py-2 text-[13px] rounded-[3px] font-semibold ${
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
                        className={`w-full pl-9 pr-3 py-2.5 rounded-[4px] border text-[14px] focus:outline-none ${inputClasses}`}
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
                    {emailSuggestsLocal && (
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
                      className={`w-full pl-9 pr-3 py-2.5 rounded-[4px] border text-[14px] focus:outline-none ${inputClasses}`}
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
                      className={`w-full pl-9 pr-10 py-2.5 rounded-[4px] border text-[14px] focus:outline-none ${inputClasses}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? 'Ascunde parola' : 'Arată parola'
                      }
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-[3px] ${
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
                          <LocalnicBadge label="Localnic" size="xs" />
                          <span className="font-display text-[17px]">2,0×</span>
                        </div>
                        <p
                          className={`text-[12px] ${
                            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                          }`}
                        >
                          Locuiesc sau studiez aici
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
                          className={`w-full px-3 py-2.5 rounded-[4px] border text-[14px] focus:outline-none ${inputClasses}`}
                        >
                          {TIMISOARA_NEIGHBORHOODS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div
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
                  className={`btn-press w-full py-3 px-4 rounded-[4px] text-[14px] font-bold flex items-center justify-center gap-2 ${
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
                  className={`btn-press font-semibold underline underline-offset-4 text-left sm:text-right ${
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
