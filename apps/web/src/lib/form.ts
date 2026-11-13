/** Starea întoarsă de Server Actions către formulare (useActionState). */
export type FormState = { error?: string; ok?: boolean; message?: string; values?: Record<string, string>; seq?: number };
export const EMPTY: FormState = {};

/** Câmp text din FormData, fără spații la capete ('' dacă lipsește). */
export const field = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();

/**
 * React 19 golește formularul după orice acțiune, inclusiv după o eroare. Întoarcem valorile trimise
 * (fără parole și câmpurile interne Next) ca formularul să fie recreat cu ele; `seq` schimbă cheia formularului.
 */
export function keep(fd: FormData, state: FormState): FormState {
  const values: Record<string, string> = {};
  for (const [k, v] of fd) if (typeof v === 'string' && !k.startsWith('$') && !/password/i.test(k)) values[k] = v;
  return { ...state, values, seq: Date.now() };
}

/**
 * Pasul 1 al revendicării: cererea creată și numărul public unde ar pleca codul. Codul NU ajunge în browser.
 * `rejectedClaimId`: cererea respinsă pentru prea multe coduri greșite; formularul se întoarce la pasul 1.
 */
export type ClaimState = FormState & { claimId?: string; sendTo?: string | null; rejectedClaimId?: string };
