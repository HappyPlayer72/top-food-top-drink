/**
 * Contractul dintre backend și apps/web: o funcție per pagină + acțiunile userilor.
 * Re-exportă și serviciile pe care le cheamă direct UI-ul (conturi, owner, admin, fidelitate, localuri noi).
 */
export * from "./pages.ts";
export * from "./actions.ts";
export * from "./community.ts";
export * from "./hours.ts";
export { myQuickVotes } from "./features.ts";
export * as visits from "./visits.ts";
export { completeThemedTour, userBadges } from "./badges.ts";
export { THEMED_TOURS, CATEGORY_BADGE_LEVELS, type CategoryBadge, type BadgeLevel } from "./tours.ts";
export * as antibot from "./antibot.ts";
export * as accounts from "@tftd/accounts";
export * as owner from "@tftd/owner";
export * as moderation from "@tftd/moderation";
export * as monetization from "@tftd/monetization";
export * as loyalty from "@tftd/loyalty";
export { detectPlatform, submitSocialLink, searchPlaces, addFromGoogle, addManually, geocodeAddress, type SocialAnalysis } from "@tftd/ingestion";
export { createDb, ServiceError, type Db } from "@tftd/db";
