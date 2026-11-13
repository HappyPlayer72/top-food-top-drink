import Link from 'next/link';

export default function OwnerNotFound() {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="font-display text-[36px] leading-none">Nu am găsit pagina</h1>
      <p className="text-[15px]">Localul nu există sau nu îl administrezi tu.</p>
      <Link href="/owner" className="inline-flex min-h-11 w-fit items-center rounded-[4px] border border-hairline px-4 font-semibold hover:border-cafea">
        Înapoi la localele tale
      </Link>
    </div>
  );
}
