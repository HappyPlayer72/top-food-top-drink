'use client';

import { buttonClass } from '@/components/owner/ui-classes';

/** Erorile neprevăzute din /owner (ex. o acțiune pe ceva șters între timp): mesaj în română, nu pagina generică. */
export default function OwnerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="font-display text-[36px] leading-none">Ceva n-a mers</h1>
      <p className="text-[15px]">
        Poate că elementul a fost deja modificat sau șters, ori sesiunea a expirat. Încearcă din nou.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className={buttonClass()}>
          Încearcă din nou
        </button>
        <a href="/owner" className={buttonClass('quiet')}>
          Înapoi la localele tale
        </a>
      </div>
    </div>
  );
}
