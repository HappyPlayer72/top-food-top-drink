/**
 * Calculul „Turului de gust” (date demo, fără Google). Stă separat de app/actions/taste-tour.ts:
 * un fișier 'use server' are voie să exporte doar funcții async, iar constantele de aici le folosesc și testele.
 */
export type Point = { lat: number; lng: number };

/** Cât de mult mai lung e drumul pe stradă decât linia dreaptă, și viteza de mers. */
export const WALK = { streetFactor: 1.3, kmPerHour: 4.8 } as const;
/** Nivelul de preț (1 = ieftin … 4 = scump) → interval orientativ per persoană, în lei. */
export const PRICE_BANDS: Record<number, [number, number]> = { 1: [20, 40], 2: [40, 70], 3: [70, 120], 4: [120, 200] };

export function haversineM(a: Point, b: Point) {
  const R = 6_371_000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
