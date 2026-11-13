'use client';

/** Erorile neprevăzute din /owner (ex. o acțiune pe ceva șters între timp): mesaj în română, nu pagina generică. */
export default function OwnerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="font-display text-[36px] leading-none">Ceva n-a mers</h1>
      <p className="text-[15px]">
        Poate că elementul a fost deja modificat sau șters, ori sesiunea a expirat. Încearcă din nou.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="min-h-11 rounded-[4px] bg-carou px-4 font-semibold text-white">
          Încearcă din nou
        </button>
        <a href="/owner" className="inline-flex min-h-11 items-center rounded-[4px] border border-hairline px-4 font-semibold hover:border-cafea">
          Înapoi la localele tale
        </a>
      </div>
    </div>
  );
}
