import type { Metadata } from 'next';
import { TopFoodShell } from '@/components/TopFoodShell';

export const metadata: Metadata = {
  title: 'topfood/timișoara — Unde mănâncă timișorenii, nu turiștii',
  description:
    'Clasamentul onest al restaurantelor din Timișoara, bazat pe votul localnicilor și detectorul de capcane turistice.',
};

export default function TopFoodTimisoaraPage() {
  return <TopFoodShell initialVertical="food" />;
}
