import type { Metadata } from 'next';
import { TopFoodShell } from '@/components/TopFoodShell';

export const metadata: Metadata = {
  title: 'topdrink/timișoara — Unde ies timișorenii, fără capcane',
  description:
    'Ghidul onest al barurilor, cafenelelor și cluburilor din Timișoara, cu scoruri ponderate de localnici și detector de capcane turistice.',
};

export default function TopDrinkTimisoaraPage() {
  return <TopFoodShell initialVertical="drink" />;
}
