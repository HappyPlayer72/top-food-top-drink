'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUp, MapPin, ShieldCheck } from 'lucide-react';
import { NavSection, Vertical } from '../types';
import { BrandWordmark, CarouMark, CoasterMark } from './BrandPrimitives';

export interface FooterProps {
  vertical?: Vertical;
  onVerticalChange?: (v: Vertical) => void;
  onNavigateSection?: (section: NavSection) => void;
  onSelectCategory?: (category: string) => void;
  onOpenLogin?: () => void;
  isLoggedIn?: boolean;
  /** Reserve space above the fixed mobile bottom navigation bar in TopFoodShell. */
  hasBottomNav?: boolean;
}

const EXPLORE_ITEMS: { section: NavSection; label: string; foodHref: string; drinkHref: string }[] = [
  { section: 'top', label: 'Top localuri', foodHref: '/topfood/timisoara', drinkHref: '/topdrink/timisoara' },
  { section: 'map', label: 'Hartă Timișoara', foodHref: '/harta', drinkHref: '/harta' },
  { section: 'monthly', label: 'Topul lunii', foodHref: '/topfood/timisoara/top-luna', drinkHref: '/topdrink/timisoara/top-luna' },
  { section: 'scarnavii', label: 'Scârnăvii', foodHref: '/scarnavii', drinkHref: '/scarnavii' },
  { section: 'fidelitate', label: 'Carduri fidelitate', foodHref: '/fidelitate', drinkHref: '/fidelitate' },
];

const CATEGORIES_BY_VERTICAL: Record<Vertical, { slug: string; label: string }[]> = {
  food: [
    { slug: 'romanesc', label: 'Românesc' },
    { slug: 'pizza', label: 'Pizza' },
    { slug: 'bistro', label: 'Bistro' },
    { slug: 'burger', label: 'Burger' },
    { slug: 'street-food', label: 'Street food' },
    { slug: 'patiserie', label: 'Patiserie' },
  ],
  drink: [
    { slug: 'pub', label: 'Pub-uri' },
    { slug: 'cocktail-bar', label: 'Cocktail bar' },
    { slug: 'terasa', label: 'Terase' },
    { slug: 'muzica-live', label: 'Muzică live' },
    { slug: 'club', label: 'Cluburi' },
    { slug: 'cafenea-de-seara', label: 'Cafenea de seară' },
  ],
};

function scrollPageToTop() {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export const Footer: React.FC<FooterProps> = ({
  vertical = 'food',
  onVerticalChange,
  onNavigateSection,
  onSelectCategory,
  onOpenLogin,
  isLoggedIn = false,
  hasBottomNav = false,
}) => {
  const isDrink = vertical === 'drink';
  const basePath = isDrink ? '/topdrink/timisoara' : '/topfood/timisoara';
  const categories = CATEGORIES_BY_VERTICAL[vertical];

  const linkClass = `inline-flex items-center min-h-[44px] sm:min-h-0 py-2 sm:py-1 text-[13px] transition-colors ${
    isDrink
      ? 'text-[#F4EEE2]/80 hover:text-[#F2A33A]'
      : 'text-[#6E5649] hover:text-[#B3261E]'
  }`;

  const headingClass = `text-[11px] font-bold uppercase tracking-[0.08em] mb-3 ${
    isDrink ? 'text-[#F4EEE2]/65' : 'text-[#3A2418]/75'
  }`;

  return (
    <footer
      role="contentinfo"
      className={`border-t transition-colors ${
        isDrink
          ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
          : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
      } ${
        hasBottomNav
          ? 'pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-8'
          : 'pb-8'
      }`}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-10">
        {/* Main multi-column footer grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 pb-8">
          {/* Col 1: Brand, mission & vertical switch */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-3.5">
            {onNavigateSection ? (
              <BrandWordmark
                vertical={vertical}
                compact
                onClick={() => {
                  onNavigateSection('top');
                  scrollPageToTop();
                }}
              />
            ) : (
              <Link href={basePath} className="inline-flex items-center">
                <BrandWordmark vertical={vertical} compact />
              </Link>
            )}

            <p
              className={`text-[13px] leading-relaxed max-w-sm ${
                isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
              }`}
            >
              Timișoara pe gustate, nu pe ghicite. Scor Onest calculat din voturile localnicilor, separat de turiști și fără influență plătită.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1 text-[12px] font-medium ${
                  isDrink
                    ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2]/85'
                    : 'bg-white border-[#D6CFC5] text-[#3A2418]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Timișoara, România
              </span>

              {onVerticalChange ? (
                <button
                  type="button"
                  onClick={() => {
                    onVerticalChange(isDrink ? 'food' : 'drink');
                    scrollPageToTop();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-[4px] border min-h-[44px] px-3 py-2 text-[12px] font-semibold transition-colors ${
                    isDrink
                      ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                      : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                  }`}
                >
                  {isDrink ? <CarouMark size={14} /> : <CoasterMark size={14} />}
                  <span>Vezi {isDrink ? 'topfood' : 'topdrink'}</span>
                </button>
              ) : (
                <Link
                  href={isDrink ? '/topfood/timisoara' : '/topdrink/timisoara'}
                  className={`inline-flex items-center gap-1.5 rounded-[4px] border min-h-[44px] px-3 py-2 text-[12px] font-semibold transition-colors ${
                    isDrink
                      ? 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]'
                      : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]'
                  }`}
                >
                  {isDrink ? <CarouMark size={14} /> : <CoasterMark size={14} />}
                  <span>Vezi {isDrink ? 'topfood' : 'topdrink'}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Col 2: Navigation / Explore */}
          <nav aria-label="Secțiuni platformă" className="lg:col-span-3">
            <h2 className={headingClass}>Explorați</h2>
            <ul className="space-y-1">
              {EXPLORE_ITEMS.map((item) => (
                <li key={item.section}>
                  {onNavigateSection ? (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateSection(item.section);
                        scrollPageToTop();
                      }}
                      className={linkClass}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      href={isDrink ? item.drinkHref : item.foodHref}
                      className={linkClass}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link href="/topdrink/timisoara/weekend" className={linkClass}>
                  Evenimente weekend
                </Link>
              </li>
            </ul>
          </nav>

          {/* Col 3: Popular Categories */}
          <nav aria-label="Categorii populare" className="lg:col-span-2">
            <h2 className={headingClass}>Categorii</h2>
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  {onSelectCategory ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCategory(cat.slug);
                        scrollPageToTop();
                      }}
                      className={linkClass}
                    >
                      {cat.label}
                    </button>
                  ) : (
                    <Link
                      href={`${basePath}/categorie/${cat.slug}`}
                      className={linkClass}
                    >
                      {cat.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Col 4: Community, Partners & Integrity */}
          <div className="lg:col-span-3 space-y-4">
            <nav aria-label="Comunitate și parteneri">
              <h2 className={headingClass}>Comunitate & Parteneri</h2>
              <ul className="space-y-1">
                <li>
                  {onOpenLogin && !isLoggedIn ? (
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className={linkClass}
                    >
                      Intră în cont
                    </button>
                  ) : (
                    <Link href="/cont" className={linkClass}>
                      Contul meu
                    </Link>
                  )}
                </li>
                <li>
                  <Link href="/owner" className={linkClass}>
                    Pentru localuri (Owner)
                  </Link>
                </li>
              </ul>
            </nav>

            <div
              className={`rounded-[4px] border p-3 space-y-1.5 text-[12px] ${
                isDrink
                  ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2]/80'
                  : 'bg-white border-[#E6DFD5] text-[#6E5649]'
              }`}
            >
              <div
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
                }`}
              >
                <ShieldCheck
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isDrink ? 'text-[#F2A33A]' : 'text-[#1E6B43]'
                  }`}
                  aria-hidden="true"
                />
                <span>Regula Scorului Onest</span>
              </div>
              <p className="leading-snug">
                Localnicii cântăresc ×2. Sponsorizările sunt marcate clar și nu modifică niciodată locul în top.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom legal & utility bar */}
        <div
          className={`border-t pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] ${
            isDrink
              ? 'border-[#285443] text-[#F4EEE2]/65'
              : 'border-[#E6DFD5] text-[#6E5649]'
          }`}
        >
          <p>
            © 2026 topfood/timișoara &amp; topdrink/timișoara · Ghid local independent pentru Timișoara.
          </p>

          <button
            type="button"
            onClick={scrollPageToTop}
            className={`self-start sm:self-auto inline-flex items-center gap-1.5 rounded-[4px] border min-h-[44px] px-3 py-2 text-[12px] font-semibold transition-colors ${
              isDrink
                ? 'border-[#2D5947] text-[#F4EEE2]/85 hover:border-[#F2A33A] hover:text-[#F2A33A]'
                : 'border-[#D6CFC5] bg-white text-[#3A2418] hover:border-[#3A2418]'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Înapoi sus</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
