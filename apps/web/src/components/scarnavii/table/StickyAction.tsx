import React from 'react';

/** Acțiunea principală a ecranului: pe telefon stă deasupra barei de jos (h-14 + safe area), pe md+ revine în flux. */
export function StickyAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] md:static z-30 flex gap-2 [&>*]:flex-1 md:[&>*]:flex-none [&>*]:min-h-14 [&>*]:text-[16px] [&>*]:font-bold [&>*]:px-6">
      {children}
    </div>
  );
}
