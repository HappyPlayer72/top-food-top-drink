/**
 * Test de fum pe DB-ul cu seed: cheamă funcțiile din @tftd/api ca o pagină reală.
 *   npm run seed -- --reset && npx tsx --env-file-if-exists=.env seed/smoke.ts
 */
import { accounts, cityPage, createDb, leaderboardPage, owner, submitVibe, venuePage, weekendEvents, writeReview } from "@tftd/api";

const db = createDb();
const ok = (label: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) process.exitCode = 1;
};

const food = await cityPage(db, { citySlug: "timisoara", vertical: "food" });
ok("cityPage food: 20 locale", food.top.length === 20, `primul: ${food.top[0]?.name} ${food.top[0]?.honestScore}`);
ok("Sponsorizatul e separat de top", food.sponsored.some((s) => s.slug === "bistro-bega"), food.sponsored.map((s) => s.name).join(", "));
ok("capcanele au motive", food.traps.length > 0 && food.traps[0]!.reasons.length > 0, food.traps.map((t) => `${t.name} ${t.index}`).join(", "));
const noTraps = await cityPage(db, { citySlug: "timisoara", vertical: "food", noTraps: true });
ok("filtrul „fără capcane”", !noTraps.top.some((v) => v.trapLevel !== "none"), `${noTraps.top.length} locale`);

const sandu = await venuePage(db, { citySlug: "timisoara", vertical: "food", slug: "ciorba-lui-sandu" });
ok("venuePage: review-uri de la localnici", sandu.reviews.length > 0 && sandu.reviews.every((r) => r.authorType === "local"), `${sandu.reviewCounts.local} localnici, ${sandu.reviewCounts.tourist} turiști`);
ok("venuePage: echipa și blogul", sandu.team.length === 3 && sandu.blog.length === 1, sandu.team.map((t) => `${t.firstName}:${t.mentionsThisMonth}`).join(", "));

const bega = await venuePage(db, { citySlug: "timisoara", vertical: "food", slug: "bistro-bega", reviews: "influencer" });
ok("review-ul influencerului e marcat plătit", bega.reviews.some((r) => r.isPaid), `${bega.reviews.length} review-uri de influenceri`);
ok("Bistro Bega e partener", bega.isPartner);

const depou = await venuePage(db, { citySlug: "timisoara", vertical: "drink", slug: "depoul-de-tramvaie" });
const byTime = (depou.scores as { byTime?: { weekendNight: number; weekday: number } }).byTime;
ok("drink: scor vineri noaptea > în timpul săptămânii", !!byTime && byTime.weekendNight > byTime.weekday, JSON.stringify(byTime));
ok("drink: vibe check", depou.vibe?.level === 5, JSON.stringify(depou.vibe));

const lb = await leaderboardPage(db, { citySlug: "timisoara", vertical: "food" });
ok("leaderboard lunar", !!lb.snapshot && lb.snapshot.entries.length > 0, `${lb.month}: ${lb.snapshot?.entries.map((e) => `${e.rank}.${e.name}`).join(", ")}`);
ok("angajatul lunii", lb.snapshot?.awards.employee?.firstName === "Ioana", JSON.stringify(lb.snapshot?.awards.employee));

const events = await weekendEvents(db, "timisoara");
ok("evenimente în weekend", events.length === 2, events.map((e) => e.title).join(", "));

// Flux complet: cont nou → review → scorul se recalculează
const suffix = Date.now().toString().slice(-6);
const user = await accounts.register(db, { username: `test${suffix}`, displayName: "Test", password: "parola-lunga-1", email: `test${suffix}@exemplu.ro` });
const logged = await accounts.login(db, { login: `test${suffix}`, password: "parola-lunga-1" });
ok("register + login", logged.id === user.id);
const review = await writeReview(db, user.id, { venueId: sandu.venue.id, rating: 9, text: "Ciorba de burtă a fost foarte bună, porție mare și servire rapidă." });
ok("writeReview: analizat și cântărit", review.analyzedAt !== null && review.weight !== null, `limbă ${review.language}, pondere ${review.weight?.toFixed(2)}, fals ${review.fakeProbability}`);
await submitVibe(db, user.id, depou.venue.id, 3);

// Owner-ul nu poate ascunde review-uri, doar răspunde
const ownerUser = await accounts.login(db, { login: "sandu.proprietar", password: "x" }).catch(() => null);
ok("owner fără parolă nu se poate loga", ownerUser === null);
await owner.replyToReview(db, (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.username, "sandu.proprietar") }))!.id, review.id, "Mulțumim, te mai așteptăm!");
const after = await venuePage(db, { citySlug: "timisoara", vertical: "food", slug: "ciorba-lui-sandu", reviews: "all" });
ok("răspunsul owner-ului apare sub review", after.reviews.find((r) => r.id === review.id)?.replies.length === 1);

process.exit();
