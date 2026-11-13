/** Starea întoarsă de Server Actions către formulare (useActionState). */
export type FormState = { error?: string; ok?: boolean; message?: string };
export const EMPTY: FormState = {};

/** Câmp text din FormData, fără spații la capete ('' dacă lipsește). */
export const field = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();

/** Pasul 1 al revendicării: cererea creată și numărul public unde ar pleca codul. Codul NU ajunge în browser. */
export type ClaimState = FormState & { claimId?: string; sendTo?: string | null };
