/** „1 review”, „5 review-uri”, „20 de review-uri”: de la 20 în sus (ultimele două cifre 00 sau ≥ 20) se pune „de”. */
export function cate(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const de = n >= 20 && (n % 100 === 0 || n % 100 >= 20);
  return `${n} ${de ? 'de ' : ''}${many}`;
}
