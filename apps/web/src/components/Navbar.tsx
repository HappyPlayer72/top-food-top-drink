'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  ListOrdered,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Sun,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { NavSection, Restaurant, UserAccount, Vertical, formatScore } from '../types';
import { BrandWordmark, CarouMark, CoasterMark, LocalnicBadge } from './BrandPrimitives';

const DEMO_USER_IDS = new Set(['andreea-m', 'luca-t']);

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

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'map', label: 'Hartă' },
  { id: 'monthly', label: 'Luna asta' },
];

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
  const profileWrapperRef = useRef<HTMLDivElement>(null);
  const profileSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inPopover = profileWrapperRef.current?.contains(target) ?? false;
      const inSheet = profileSheetRef.current?.contains(target) ?? false;
      if (!inPopover && !inSheet) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [profileOpen]);

  const handleNavClick = (section: NavSection) => {
    onNavSectionChange(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchVertical = () => {
    onVerticalChange(isDrink ? 'food' : 'drink');
    onNavSectionChange('top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderProfilePanelContent = () => {
    if (!currentUser) return null;
    return (
      <>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="font-bold text-[15px]">{currentUser.name}</div>
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
            className="btn-press w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center -mr-2 -mt-2 sm:-mr-1.5 sm:-mt-1.5 rounded-full opacity-70 hover:opacity-100"
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

        {/* Switch active demo account only when signed into a demo account */}
        {DEMO_USER_IDS.has(currentUser.id) && (
          <div
            className={`pt-2.5 border-t space-y-1.5 ${
              isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-75">
              Cont activ (demo)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {availableUsers
                .filter((acc) => DEMO_USER_IDS.has(acc.id))
                .map((acc) => {
                  const active = acc.id === currentUser.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => onSelectUser(acc.id)}
                      className={`btn-press min-h-[44px] sm:min-h-0 px-2.5 py-2 sm:py-1.5 rounded-[3px] border text-left text-[11px] ${
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
        )}

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
              Apasă pe semnul de carte din pagina unui local ca să îl salvezi
              aici.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {savedRestaurants.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onSelectRestaurant(r);
                  }}
                  className={`w-full min-h-[44px] sm:min-h-0 text-left px-2.5 py-2 sm:py-1.5 rounded-[3px] text-[13px] font-semibold transition-colors ${
                    isDrink
                      ? 'text-[#F4EEE2] hover:bg-[#1E4335]'
                      : 'text-[#3A2418] hover:bg-[#FAF8F5]'
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
            className={`btn-press w-full min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-[4px] border text-[12px] font-semibold ${
              isDrink
                ? 'border-[#2D5947] text-[#F4EEE2]/85 hover:border-[#F2A33A]'
                : 'border-[#D6CFC5] text-[#6E5649] hover:border-[#B3261E] hover:text-[#B3261E]'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Deconectare</span>
          </button>
        </div>
      </>
    );
  };

  const renderBottomNavIcon = (id: NavSection, active: boolean) => {
    const cls = `w-4 h-4 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`;
    if (id === 'top') return <ListOrdered className={cls} />;
    if (id === 'map') return <MapPin className={cls} />;
    return <Trophy className={cls} />;
  };

  return (
    <>
      {/* TOP MASTHEAD HEADER */}
      <header
        className={`sticky top-0 z-40 transition-colors pt-[env(safe-area-inset-top)] ${
          isDrink
            ? 'bg-[#17382C]/95 text-[#F4EEE2] border-b border-[#285443]'
            : 'bg-white/95 text-[#3A2418] border-b border-[#E6DFD5]'
        } backdrop-blur-sm`}
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
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
            {NAV_ITEMS.map((item) => {
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
              onClick={handleSwitchVertical}
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
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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

            {currentUser === null ? (
              <button
                type="button"
                onClick={onOpenLogin}
                className={`btn-press inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-[4px] text-[13px] font-bold whitespace-nowrap shrink-0 ${
                  isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] hover:opacity-95'
                    : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">Cont</span>
                <span className="hidden sm:inline">Intră în cont</span>
              </button>
            ) : (
              <div ref={profileWrapperRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  aria-label="Profilul tău și localuri salvate"
                  aria-expanded={profileOpen}
                  aria-haspopup="dialog"
                  className={`btn-press w-11 h-11 rounded-full flex items-center justify-center relative ${
                    isDrink
                      ? 'text-[#F4EEE2] hover:bg-[#1E4335]'
                      : 'text-[#3A2418] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <User className="w-5 h-5" />
                  {savedRestaurants.length > 0 && (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        isDrink ? 'bg-[#F2A33A]' : 'bg-[#B3261E]'
                      }`}
                    />
                  )}
                </button>

                {/* Desktop & Tablet Popover */}
                {profileOpen && (
                  <div
                    role="dialog"
                    aria-label="Profil și localuri salvate"
                    className={`hidden sm:block popover-enter absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-[6px] border p-4 shadow-lg z-50 space-y-3 ${
                      isDrink
                        ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                        : 'bg-white border-[#3A2418] text-[#3A2418]'
                    }`}
                  >
                    {renderProfilePanelContent()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Profile Bottom Sheet */}
      {profileOpen && currentUser !== null && (
        <div
          className="sm:hidden modal-backdrop-enter fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={() => setProfileOpen(false)}
        >
          <div
            ref={profileSheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Profil și localuri salvate"
            onClick={(e) => e.stopPropagation()}
            className={`drawer-sheet-enter w-full rounded-t-[12px] border-t px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 max-h-[85dvh] overflow-y-auto ${
              isDrink
                ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                : 'bg-white border-[#E6DFD5] text-[#3A2418]'
            }`}
          >
            <div className="w-10 h-1 rounded-full mx-auto bg-current opacity-20 mb-1" />
            {renderProfilePanelContent()}
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR (Phone Navigation: Top | Hartă | Luna asta | topdrink) */}
      <nav
        aria-label="Navigație jos"
        className={`fixed bottom-0 inset-x-0 z-40 md:hidden border-t pb-[env(safe-area-inset-bottom)] ${
          isDrink
            ? 'bg-[#17382C]/95 border-[#285443] text-[#F4EEE2]'
            : 'bg-white/95 border-[#E6DFD5] text-[#3A2418]'
        } backdrop-blur-sm`}
      >
        <div className="grid grid-cols-4 h-14">
          {NAV_ITEMS.map((item) => {
            const active = navSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`btn-press relative flex flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active
                    ? isDrink
                      ? 'font-bold text-[#F2A33A]'
                      : 'font-bold text-[#B3261E]'
                    : isDrink
                    ? 'font-medium text-[#F4EEE2]/70'
                    : 'font-medium text-[#6E5649]'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-0 inset-x-3 h-[2px] rounded-b-full ${
                      isDrink ? 'bg-[#F2A33A]' : 'bg-[#B3261E]'
                    }`}
                  />
                )}
                {renderBottomNavIcon(item.id, active)}
                <span className="leading-none">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleSwitchVertical}
            className={`btn-press flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              isDrink ? 'text-[#F4EEE2]/85' : 'text-[#3A2418]'
            }`}
          >
            {isDrink ? <CarouMark size={16} /> : <CoasterMark size={16} />}
            <span className="leading-none">
              {isDrink ? 'topfood' : 'topdrink'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
