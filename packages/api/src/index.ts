/**
 * Contractul dintre backend și apps/web: o funcție per pagină + acțiunile userilor.
 * Re-exportă și serviciile pe care le cheamă direct UI-ul (conturi, owner, admin, linkuri sociale).
 */
export * from "./pages.ts";
export * from "./actions.ts";
export * as accounts from "@tftd/accounts";
export * as owner from "@tftd/owner";
export * as moderation from "@tftd/moderation";
export * as monetization from "@tftd/monetization";
export { submitSocialLink } from "@tftd/ingestion";
export { createDb, ServiceError, type Db } from "@tftd/db";
