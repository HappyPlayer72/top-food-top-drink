import type { Metadata } from 'next';
import Link from 'next/link';
import { CarouMark } from '@/components/BrandPrimitives';
import { getUserId } from '@/lib/server/session';
import { logoutAction } from './auth-actions';

export const metadata: Metadata = {
  title: 'Pentru proprietari — topfood/timișoara',
  robots: { index: false },
};

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserId();
  return (
    <div className="min-h-screen bg-white text-cafea">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/owner" className="inline-flex min-h-11 items-center gap-2.5 rounded-[4px]">
            <CarouMark size={24} />
            <span className="leading-none text-[22px]">
              <span className="font-display">topfood</span>
              <span className="font-display-light">/proprietari</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-[14px]">
            <Link href="/topfood/timisoara" className="inline-flex min-h-11 items-center rounded-[4px] px-3 hover:underline">
              Vezi topul
            </Link>
            {userId ? (
              <form action={logoutAction}>
                <button type="submit" className="min-h-11 rounded-[4px] border border-hairline px-3 font-semibold hover:border-cafea">
                  Ieși din cont
                </button>
              </form>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 pb-24">{children}</main>
    </div>
  );
}
