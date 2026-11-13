import Link from 'next/link';
import { buttonClass } from '@/components/owner/ui-classes';

export default function OwnerNotFound() {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="font-display text-[36px] leading-none">Nu am găsit pagina</h1>
      <p className="text-[15px]">Localul nu există sau nu îl administrezi tu.</p>
      <Link href="/owner" className={`${buttonClass('quiet')} w-fit`}>
        Înapoi la localele tale
      </Link>
    </div>
  );
}
