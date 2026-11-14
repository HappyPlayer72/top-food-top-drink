'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Dices,
  ListOrdered,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  QrCode,
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
  onToggleSave?: (id: string) => void;
  onSelectRestaurant: (r: Restaurant) => void;
  currentUser: UserAccount | null;
  availableUsers: UserAccount[];
  onSelectUser: (userId: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  /** Conținut extra în panoul de profil (ex. „Devino localnic verificat”, cu backend pornit) */
  profileExtra?: React.ReactNode;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'map', label: 'Hartă' },
  { id: 'monthly', label: 'Luna asta' },
  { id: 'scarnavii', label: 'Scârnăvii' },
  { id: 'fidelitate', label: 'Fidelitate' },
];

export const Navbar: React.FC<NavbarProps> = ({
  vertical,
  onVerticalChange,
  navSection,
  onNavSectionChange,
  savedRestaurants,
  onToggleSave,
  onSelectRestaurant,
  currentUser,
  availableUsers,
  onSelectUser,
  onOpenLogin,
  onLogout,
  profileExtra,
  darkMode,
  onToggleDarkMode,
}) => {
  const isDrink = vertical === 'drink';
  const [profileOpen, setProfileOpen] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  const profileWrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const profileSheetRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasProfileOpenRef = useRef(false);
  const restoreFocusOnCloseRef = useRef(true);
  const dragStartYRef = useRef<number | null>(null);

  const closePanel = (restoreFocus = true) => {
    restoreFocusOnCloseRef.current = restoreFocus;
    setDragOffsetY(0);
    setIsDraggingSheet(false);
    setProfileOpen(false);
  };

  useEffect(() => {
    if (!profileOpen) {
      if (wasProfileOpenRef.current && restoreFocusOnCloseRef.current) {
        const target = previousFocusRef.current ?? triggerButtonRef.current;
        if (target && target.isConnected) {
          window.requestAnimationFrame(() => target.focus());
        }
      }
      wasProfileOpenRef.current = false;
      restoreFocusOnCloseRef.current = true;
      return;
    }

    wasProfileOpenRef.current = true;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    restoreFocusOnCloseRef.current = true;

    const getActiveDialog = (): HTMLElement | null => {
      if (
        profileSheetRef.current &&
        profileSheetRef.current.offsetParent !== null
      ) {
        return profileSheetRef.current;
      }
      if (popoverRef.current && popoverRef.current.offsetParent !== null) {
        return popoverRef.current;
      }
      return null;
    };

    const getFocusables = (container: HTMLElement): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

    const rafId = window.requestAnimationFrame(() => {
      const dialog = getActiveDialog();
      if (!dialog) return;
      const focusables = getFocusables(dialog);
      (focusables[0] ?? dialog).focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel(true);
        return;
      }

      if (e.key === 'Tab') {
        const dialog = getActiveDialog();
        if (!dialog) return;
        const focusables = getFocusables(dialog);
        if (focusables.length === 0) {
          e.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || !dialog.contains(active) || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!active || !dialog.contains(active) || active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inPopover = profileWrapperRef.current?.contains(target) ?? false;
      const inSheet = profileSheetRef.current?.contains(target) ?? false;
      if (!inPopover && !inSheet) {
        closePanel(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [profileOpen]);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    dragStartYRef.current = e.touches[0].clientY;
    setIsDraggingSheet(true);
    setDragOffsetY(0);
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null || e.touches.length !== 1) return;
    const delta = Math.max(0, e.touches[0].clientY - dragStartYRef.current);
    setDragOffsetY(delta);
  };

  const handleSheetTouchEnd = () => {
    if (dragStartYRef.current === null) return;
    dragStartYRef.current = null;
    setIsDraggingSheet(false);
    if (dragOffsetY > 72) {
      closePanel(true);
    } else {
      setDragOffsetY(0);
    }
  };

  const handleNavClick = (section: NavSection) => {
    onNavSectionChange(section);
  };

  const handleSwitchVertical = () => {
    onVerticalChange(isDrink ? 'food' : 'drink');
    if (navSection !== 'top') {
      onNavSectionChange('top');
    }
  };

  const renderSavedVenuesSection = () => (
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
            isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
          }`}
        >
          Apasă pe semnul de carte din pagina unui local ca să îl salvezi aici.
        </p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {savedRestaurants.map((r) => (
            <div
              key={r.id}
              className={`flex items-center justify-between gap-1 rounded-[3px] transition-colors ${
                isDrink ? 'hover:bg-[#1E4335]' : 'hover:bg-[#FAF8F5]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  closePanel(false);
                  onSelectRestaurant(r);
                }}
                className={`flex-1 min-w-0 min-h-[44px] sm:min-h-[36px] text-left px-2.5 py-2 sm:py-1.5 text-[13px] font-semibold truncate ${
                  isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
                }`}
              >
                <span className="truncate block">{r.name}</span>
                <span
                  className={`block text-[11px] font-normal truncate ${
                    isDrink ? 'text-[#F4EEE2]/65' : 'text-[#6E5649]'
                  }`}
                >
                  {r.neighborhood}
                </span>
              </button>
              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(r.id)}
                  aria-label={`Șterge ${r.name} din salvate`}
                  title="Șterge din salvate"
                  className={`btn-press w-11 h-11 sm:w-8 sm:h-8 shrink-0 rounded-[3px] flex items-center justify-center opacity-75 hover:opacity-100 ${
                    isDrink
                      ? 'text-[#F4EEE2] hover:bg-[#122B22]'
                      : 'text-[#6E5649] hover:text-[#B3261E]'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfilePanelContent = () => {
    if (!currentUser) {
      return (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="font-bold text-[15px]">Localuri salvate</div>
              <p
                className={`text-[12px] ${
                  isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                }`}
              >
                Păstrezi lista ta de localuri chiar și fără cont.
              </p>
            </div>
            <button
              type="button"
              onClick={() => closePanel(true)}
              aria-label="Închide lista salvată"
              className="btn-press w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center -mr-2 -mt-2 sm:-mr-1.5 sm:-mt-1.5 rounded-full opacity-80 hover:opacity-100 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {renderSavedVenuesSection()}

          <div
            className={`pt-2.5 border-t ${
              isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                closePanel(false);
                onOpenLogin();
              }}
              className={`btn-press w-full min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[4px] text-[13px] font-bold ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] hover:opacity-95'
                  : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Intră în cont</span>
            </button>
          </div>
        </>
      );
    }

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
            onClick={() => closePanel(true)}
            aria-label="Închide profil"
            className="btn-press w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center -mr-2 -mt-2 sm:-mr-1.5 sm:-mt-1.5 rounded-full opacity-80 hover:opacity-100 shrink-0"
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

        {profileExtra}

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

        {renderSavedVenuesSection()}

        <div
          className={`pt-2.5 border-t ${
            isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              closePanel(false);
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
    if (id === 'scarnavii') return <Dices className={cls} />;
    if (id === 'fidelitate') return <QrCode className={cls} />;
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
        <div className="max-w-5xl mx-auto px-2.5 min-[375px]:px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 min-[375px]:gap-2 sm:gap-4">
          {/* Brand Wordmark */}
          <div className="min-w-0 flex-1 md:flex-none flex items-center [&>button]:min-h-[44px] [&>button]:max-w-full">
            <BrandWordmark
              vertical={vertical}
              onClick={() => handleNavClick('top')}
            />
          </div>

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
                  className={`btn-press min-h-[44px] inline-flex items-center text-[14px] py-1 border-b-2 ${
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
              className={`btn-press min-h-[44px] inline-flex items-center text-[14px] font-semibold px-3 py-1.5 rounded-[4px] border ${
                isDrink
                  ? 'border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              {isDrink ? 'topfood' : 'topdrink'}
            </button>
          </nav>

          {/* Right Controls: Dark Mode + Saved/Profile Icon + Optional Login */}
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

            <div ref={profileWrapperRef} className="relative">
              <button
                ref={triggerButtonRef}
                type="button"
                onClick={() =>
                  profileOpen ? closePanel(true) : setProfileOpen(true)
                }
                aria-label={
                  currentUser
                    ? 'Profilul tău și localuri salvate'
                    : savedRestaurants.length > 0
                    ? `Localuri salvate (${savedRestaurants.length})`
                    : 'Localuri salvate'
                }
                aria-expanded={profileOpen}
                aria-haspopup="dialog"
                className={`btn-press w-11 h-11 rounded-full flex items-center justify-center relative ${
                  isDrink
                    ? 'text-[#F4EEE2] hover:bg-[#1E4335]'
                    : 'text-[#3A2418] hover:bg-[#FAF8F5]'
                }`}
              >
                {currentUser ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
                {savedRestaurants.length > 0 && (
                  <span
                    className={`absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold leading-none flex items-center justify-center tabular-nums ${
                      isDrink
                        ? 'bg-[#F2A33A] text-[#17382C]'
                        : 'bg-[#B3261E] text-white'
                    }`}
                  >
                    {savedRestaurants.length}
                  </span>
                )}
              </button>

              {/* Desktop & Tablet Popover */}
              {profileOpen && (
                <div
                  ref={popoverRef}
                  tabIndex={-1}
                  role="dialog"
                  aria-label={
                    currentUser
                      ? 'Profil și localuri salvate'
                      : 'Localuri salvate'
                  }
                  className={`hidden sm:block popover-enter absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-[6px] border p-4 shadow-lg z-50 space-y-3 focus:outline-none ${
                    isDrink
                      ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                      : 'bg-white border-[#3A2418] text-[#3A2418]'
                  }`}
                >
                  {renderProfilePanelContent()}
                </div>
              )}
            </div>

            {currentUser === null && (
              <button
                type="button"
                onClick={onOpenLogin}
                className={`btn-press inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 min-[375px]:px-3 py-2 rounded-[4px] text-[13px] font-bold whitespace-nowrap shrink-0 ${
                  isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] hover:opacity-95'
                    : 'bg-[#B3261E] text-white hover:bg-[#9E1F18]'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0 hidden min-[375px]:block" />
                <span className="sm:hidden">Cont</span>
                <span className="hidden sm:inline">Intră în cont</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Profile / Saved Venues Bottom Sheet */}
      {profileOpen && (
        <div
          className="sm:hidden modal-backdrop-enter fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={() => closePanel(true)}
        >
          <div
            ref={profileSheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={
              currentUser ? 'Profil și localuri salvate' : 'Localuri salvate'
            }
            onClick={(e) => e.stopPropagation()}
            style={{
              transform:
                dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
              transition: isDraggingSheet ? 'none' : 'transform 180ms ease-out',
            }}
            className={`drawer-sheet-enter w-full rounded-t-[12px] border-t px-4 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 max-h-[85dvh] overflow-y-auto focus:outline-none ${
              isDrink
                ? 'bg-[#17382C] border-[#2D5947] text-[#F4EEE2]'
                : 'bg-white border-[#E6DFD5] text-[#3A2418]'
            }`}
          >
            <div
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
              onTouchCancel={handleSheetTouchEnd}
              aria-hidden="true"
              className="py-2.5 -mx-4 px-4 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            >
              <div className="w-10 h-1 rounded-full bg-current opacity-25" />
            </div>
            {renderProfilePanelContent()}
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR (Phone Navigation: Top | Hartă | Luna asta | Scârnăvii | Fidelitate | topdrink) */}
      <nav
        aria-label="Navigație jos"
        className={`fixed bottom-0 inset-x-0 z-40 md:hidden border-t overflow-x-hidden pb-[env(safe-area-inset-bottom)] ${
          isDrink
            ? 'bg-[#17382C]/95 border-[#285443] text-[#F4EEE2]'
            : 'bg-white/95 border-[#E6DFD5] text-[#3A2418]'
        } backdrop-blur-sm`}
      >
        <div className="grid grid-cols-6 w-full max-w-full h-14 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            const active = navSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`btn-press relative min-w-0 w-full px-0.5 overflow-hidden flex flex-col items-center justify-center gap-0.5 text-[10px] min-[375px]:text-[11px] ${
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
                    className={`absolute top-0 inset-x-2 h-[2px] rounded-b-full ${
                      isDrink ? 'bg-[#F2A33A]' : 'bg-[#B3261E]'
                    }`}
                  />
                )}
                {renderBottomNavIcon(item.id, active)}
                <span className="leading-none max-w-full truncate">
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleSwitchVertical}
            className={`btn-press min-w-0 w-full px-0.5 overflow-hidden flex flex-col items-center justify-center gap-0.5 text-[10px] min-[375px]:text-[11px] font-semibold ${
              isDrink ? 'text-[#F4EEE2]/85' : 'text-[#3A2418]'
            }`}
          >
            {isDrink ? <CarouMark size={16} /> : <CoasterMark size={16} />}
            <span className="leading-none max-w-full truncate">
              {isDrink ? 'topfood' : 'topdrink'}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
