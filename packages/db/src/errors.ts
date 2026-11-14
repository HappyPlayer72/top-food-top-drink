/** Eroare de business cu mesaj pentru utilizator (în română) și un cod stabil pentru frontend. */
export class ServiceError extends Error {
  constructor(
    public readonly code: "not_found" | "forbidden" | "invalid" | "conflict" | "unauthorized" | "rate_limited",
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const notFound = (what: string) => new ServiceError("not_found", `${what} nu există.`);
export const forbidden = (msg = "Nu ai voie să faci asta.") => new ServiceError("forbidden", msg);
export const invalid = (msg: string) => new ServiceError("invalid", msg);
export const rateLimited = (msg = "Prea multe cereri. Încearcă din nou mai târziu.") => new ServiceError("rate_limited", msg);
