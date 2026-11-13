'use client';

import React, { useState } from 'react';
import { Bookmark, LogIn, LogOut, Moon, Sun, User, X } from 'lucide-react';
import { NavSection, Restaurant, UserAccount, Vertical, formatScore } from '../types';
import { BrandWordmark, LocalnicBadge } from './BrandPrimitives';

export interface NavbarProps {
  vertical: Vertical;
  onVerticalChange: (v: Vertical) => void;
  navSection: NavSection;
  onNavSectionChange: (s: NavSection) => void;
  savedRestaurants: Restaurant[];
  onSelectRestaurant: (r: Restaurant) => void;
  currentUser: UserAccount | null;
  availableUsers: UserAccount[];
  onSelectUser: (userId: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  vertical,
  onVerticalChange,
  navSection,
  onNavSectionChange,
  savedRestaurants,
  onSelectRestaurant,
  currentUser,
  availableUsers,
  onSelectUser,
  onOpenLogin,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  const isDrink = vertical === 'drink';
  const [profileOpen, setProfileOpen] = useState(false);

  const handleNavClick = (section: NavSection) => {
    onNavSectionChange(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* TOP MASTHEAD HEADER */}
      <header
        className={`sticky top-0 z-40 transition-colors ${
          isDrink
            ? 'bg-[#17382C]/95 text-[#F4EEE2] border-b border-[#285443]'
            : 'bg-white/95 text-[#3A2418] border-b border-[#E6DFD5]'
        } backdrop-blur-sm`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <BrandWordmark
            vertical={vertical}
            onClick={() => handleNavClick('top')}
          />

          {/* Desktop Inline Navigation */}
          <nav
            aria-label="Navigație principală"
            className="hidden md:flex items-center gap-6"
          >
            {(
              [
                { id: 'top', label: 'Top' },
                { id: 'map', label: 'Hartă' },
                { id: 'monthly', label: 'Luna asta' },
              ] as const
            ).map((item) => {
              const active = navSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`btn-press text-[14px] py-1 border-b-2 ${
                    active
                      ? isDrink
                        ? 'font-bold text-[#F2A33A] border-[#F2A33A]'
                        : 'font-bold text-[#3A2418] border-[#B3261E]'
                      : isDrink
                      ? 'font-normal text-[#F4EEE2]/75 border-transparent hover:text-[#F4EEE2]'
                      : 'font-normal text-[#6E5649] border-transparent hover:text-[#3A2418]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <span
              className={`h-4 w-px ${
                isDrink ? 'bg-[#285443]' : 'bg-[#E6DFD5]'
              }`}
            />

            <button
              type="button"
              onClick={() => {
                onVerticalChange(isDrink ? 'food' : 'drink');
                onNavSectionChange('top');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`btn-press text-[14px] font-semibold px-3 py-1.5 rounded-[4px] border ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              {isDrink ? 'topfood' : 'topdrink'}
            </button>
          </nav>

          {/* Right Controls: Dark Mode + Profile / Saved Spots Icon */}
          <div className="flex items-center gap-1.5">
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

            {currentUser === null ? (
              <button
                type="button"
                onClick={onOpenLogin}
                className={`btn-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-bold ${
                  isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] hover:opacity-95'
                    : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Intră în cont</span>
              </button>
            ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-label="Profilul tău și localuri salvate"
                className={`btn-press w-9 h-9 rounded-full flex items-center justify-center relative ${
                  isDrink
                    ? 'text-[#F4EEE2] hover:bg-[#1E4335]'
                    : 'text-[#3A2418] hover:bg-[#FAF8F5]'
                }`}
              >
                <User className="w-5 h-5" />
                {savedRestaurants.length > 0 && (
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                      isDrink ? 'bg-[#F2A33A]' : 'bg-[#B3261E]'
                    }`}
                  />
                )}
              </button>

            {profileOpen && (
              <div
                className={`popover-enter absolute right-0 mt-2 w-72 rounded-[6px] border p-4 shadow-lg z-50 space-y-3 ${
                  isDrink
                    ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                    : 'bg-white border-[#3A2418] text-[#3A2418]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-bold text-[15px]">
                      {currentUser.name}
                    </div>
                    {currentUser.role === 'verified-local' ? (
                      <LocalnicBadge
                        label={`Localnic din ${currentUser.neighborhood ?? 'Timișoara'}`}
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
                        Turist / Vizitator
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    aria-label="Închide profil"
                    className="btn-press opacity-70 hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p
                  className={`text-[12px] ${
                    isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                  }`}
                >
                  {currentUser.description}
                </p>

                {/* Switch active account to verify account-driven review role */}
                <div
                  className={`pt-2.5 border-t space-y-1.5 ${
                    isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                  }`}
                >
                  <div className="text-[11px] font-semibold opacity-75">
                    Cont activ
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableUsers.map((acc) => {
                      const active = acc.id === currentUser.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => onSelectUser(acc.id)}
                          className={`btn-press px-2 py-1.5 rounded-[3px] border text-left text-[11px] ${
                            active
                              ? isDrink
                                ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A] font-bold'
                                : 'bg-[#3A2418] text-white border-[#3A2418] font-bold'
                              : isDrink
                              ? 'border-[#285443] text-[#F4EEE2]/80 hover:border-[#F2A33A]/60'
                              : 'border-[#E6DFD5] text-[#6E5649] hover:border-[#3A2418]'
                          }`}
                        >
                          <div className="truncate">{acc.name}</div>
                          <div className="opacity-80">
                            {acc.role === 'verified-local'
                              ? `Localnic (${formatScore(acc.weightMultiplier)}×)`
                              : `Turist (${formatScore(acc.weightMultiplier)}×)`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className={`pt-2.5 border-t space-y-2 ${
                    isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Localuri salvate ({savedRestaurants.length})</span>
                  </div>
                  {savedRestaurants.length === 0 ? (
                    <p
                      className={`text-[12px] ${
                        isDrink ? 'text-[#F4EEE2]/60' : 'text-[#6E5649]'
                      }`}
                    >
                      Apasă pe semnul de carte din pagina unui local ca să îl
                      salvezi aici.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {savedRestaurants.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            onSelectRestaurant(r);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-[3px] text-[13px] font-semibold transition-colors ${
                            isDrink
                              ? 'hover:bg-[#1E4335]'
                              : 'hover:bg-[#FAF8F5]'
                          }`}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={`pt-2.5 border-t ${
                    isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    className={`btn-press w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[4px] border text-[12px] font-semibold ${
                      isDrink
                        ? 'border-[#2D5947] text-[#F4EEE2]/85 hover:border-[#F2A33A]'
                        : 'border-[#D6CFC5] text-[#6E5649] hover:border-[#B3261E] hover:text-[#B3261E]'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Deconectare</span>
                  </button>
                </div>
              </div>
            )}
            </div>
            )}
          </div>
        </div>
      </header>

      {/* BOTTOM NAVIGATION BAR (Matches Page 3: Top | Hartă | Luna asta | topdrink) */}
      <nav
        aria-label="Navigație jos"
        className={`fixed bottom-0 inset-x-0 z-40 md:hidden border-t ${
          isDrink
            ? 'bg-[#17382C] border-[#285443] text-[#F4EEE2]'
            : 'bg-white border-[#E6DFD5] text-[#3A2418]'
        }`}
      >
        <div className="grid grid-cols-4 h-13">
          {(
            [
              { id: 'top', label: 'Top' },
              { id: 'map', label: 'Hartă' },
              { id: 'monthly', label: 'Luna asta' },
            ] as const
          ).map((item) => {
            const active = navSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`btn-press text-[13px] flex items-center justify-center ${
                  active
                    ? isDrink
                      ? 'font-bold text-[#F2A33A]'
                      : 'font-bold text-[#3A2418]'
                    : isDrink
                    ? 'text-[#F4EEE2]/70'
                    : 'text-[#6E5649]'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onVerticalChange(isDrink ? 'food' : 'drink');
              onNavSectionChange('top');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`btn-press text-[13px] font-semibold flex items-center justify-center ${
              isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
            }`}
          >
            {isDrink ? 'topfood' : 'topdrink'}
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
