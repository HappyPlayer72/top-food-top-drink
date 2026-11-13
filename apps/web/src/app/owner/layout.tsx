import type { Metadata } from 'next';
import Link from 'next/link';
import { CarouMark, CoasterMark } from '@/components/BrandPrimitives';
import { buttonClass } from '@/components/owner/ui-classes';
import { getUserId } from '@/lib/server/session';
import { logoutAction } from './auth-actions';

export const metadata: Metadata = {
  title: 'Pentru proprietari — topfood/timișoara',
  robots: { index: false },
};

const linkClass = 'inline-flex min-h-11 items-center whitespace-nowrap rounded-[4px] px-2 text-[14px] font-semibold hover:underline sm:px-3';

/** Antetul urmează verticala localului deschis (CSS :has, vezi `.owner-shell` în globals.css): food = Carou pe alb, drink = suport de bere pe Sticlă. */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserId();
  return (
    <div className="owner-shell min-h-screen">
      <a href="#continut" className={`${buttonClass()} sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50`}>
        Sari la conținut
      </a>
      <header className="border-b border-o-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/owner" aria-label="Pentru proprietari, înapoi la localele tale" className="inline-flex min-h-11 items-center rounded-[4px]">
            <span className="owner-food-only inline-flex items-center gap-2.5">
              <CarouMark size={28} />
              <span className="text-[22px] leading-none sm:text-[26px]">
                <span className="font-display">topfood</span>
                <span className="font-display-light">/proprietari</span>
              </span>
            </span>
            <span className="owner-drink-only items-center gap-2.5">
              <CoasterMark size={28} />
              <span className="text-[22px] leading-none sm:text-[26px]">
                <span className="font-display">topdrink</span>
                <span className="font-display-light">/proprietari</span>
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/topfood/timisoara" className={`owner-food-only ${linkClass}`}>
              Vezi topul
            </Link>
            <Link href="/topdrink/timisoara" className={`owner-drink-only ${linkClass}`}>
              Vezi topul
            </Link>
            {userId ? (
              <form action={logoutAction}>
                <button type="submit" aria-label="Ieși din cont" className={`${buttonClass('quiet')} px-3 text-[14px]`}>
                  <span>
                    Ieși<span className="hidden sm:inline"> din cont</span>
                  </span>
                </button>
              </form>
            ) : null}
          </nav>
        </div>
      </header>
      <main id="continut" className="mx-auto max-w-5xl px-4 py-8 pb-24">{children}</main>
    </div>
  );
}
