/**
 * Contractul dintre backend și apps/web: o funcție per pagină + acțiunile userilor.
 * Re-exportă și serviciile pe care le cheamă direct UI-ul (conturi, owner, admin, fidelitate, localuri noi).
 */
export * from "./pages.ts";
export * from "./actions.ts";
export * from "./community.ts";
export * from "./hours.ts";
export { myQuickVotes } from "./features.ts";
export * as accounts from "@tftd/accounts";
export * as owner from "@tftd/owner";
export * as moderation from "@tftd/moderation";
export * as monetization from "@tftd/monetization";
export * as loyalty from "@tftd/loyalty";
export { submitSocialLink, searchPlaces, addFromGoogle, addManually } from "@tftd/ingestion";
export { createDb, ServiceError, type Db } from "@tftd/db";
