/**
 * Test de fum pe DB-ul cu seed: cheamă funcțiile din @tftd/api ca o pagină reală.
 *   npm run seed -- --reset && npx tsx --env-file-if-exists=.env seed/smoke.ts
 */
import { eq } from "drizzle-orm";
import {
  accounts, addManually, cityPage, createDb, leaderboardPage, loyalty, moderation, owner, searchPlaces, submitVibe, toggleHelpful, topReviewers, venuePage,
  weekendEvents, writeReview,
} from "@tftd/api";
import { users as usersTable } from "@tftd/db";

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

// ---------- Prezentare, aspecte, program ----------
ok("meniu „ce să comanzi”", after.menu.length === 3 && after.menu[0]!.mustOrder, after.menu.map((m) => `${m.name} ${m.priceLei} lei`).join(", "));
ok("note pe aspecte adunate", Object.keys(after.aspectScores).length > 0, JSON.stringify(after.aspectScores));
ok("program și „deschis acum”", !!after.venue.hoursText && after.venue.openLabel !== null, `${after.venue.openLabel}; ${after.venue.hoursText}`);
ok("review-urile au voturi „util”", after.reviews.some((r) => r.helpfulCount > 0));

// ---------- Voturi „util” și top recenzenți ----------
const other = after.reviews.find((r) => r.id !== review.id && r.author?.username)!;
const otherId = (await db.query.reviews.findFirst({ where: (r, { eq }) => eq(r.id, other.id) }))!.id;
const v1 = await toggleHelpful(db, user.id, otherId);
const v2 = await toggleHelpful(db, user.id, otherId);
ok("votul „util” se poate pune și retrage", v1.voted && !v2.voted && v1.helpfulCount === v2.helpfulCount + 1);
const reviewers = await topReviewers(db, "timisoara");
ok("top recenzenți", reviewers.length > 0, reviewers.slice(0, 3).map((r) => `${r.displayName} (${r.helpfulVotes})`).join(", "));

// ---------- Fidelitate: QR rotativ, o ștampilă pe zi ----------
const sanduOwner = (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.username, "sandu.proprietar") }))!;
const program = after.loyalty!;
ok("localul are card de fidelitate", program.stampsRequired === 6 && !("stampSecret" in program), program.rewardTitle);
const { code } = await loyalty.currentStampCode(db, sanduOwner.id, program.id);
const stamp1 = await loyalty.scanCode(db, user.id, code);
ok("scanare QR → +1 ștampilă", stamp1.action === "stamped" && stamp1.card.stamps === 1, stamp1.message);
const again = await loyalty.scanCode(db, user.id, code).catch((e: Error) => e.message);
ok("a doua ștampilă în aceeași zi e refuzată", typeof again === "string", String(again));
const old = await loyalty.scanCode(db, user.id, code, new Date(Date.now() + 5 * 60_000)).catch((e: Error) => e.message);
ok("un cod de acum 5 minute nu mai merge", typeof old === "string" && old.includes("expirat"), String(old));
const notOwner = await loyalty.currentStampCode(db, user.id, program.id).catch((e: Error) => e.message);
ok("doar owner-ul poate genera codul", typeof notOwner === "string");
const personal = await loyalty.createPersonalCard(db, user.id, { name: "Cafeneaua din colț", rewardTitle: "O cafea gratis", stampsRequired: 5, icon: "coffee" });
await loyalty.addPersonalStamp(db, user.id, personal.cardId);
const wallet = await loyalty.myCards(db, user.id);
ok("portofelul are cardul localului și pe cel personal", wallet.length === 2, wallet.map((c) => `${c.venueName} ${c.stamps}/${c.stampsRequired}`).join(", "));

// ---------- Căutare și localuri adăugate de useri ----------
const found = await searchPlaces(db, { citySlug: "timisoara", vertical: "food", query: "ciorba" });
ok("căutarea găsește localul la noi", found.onPlatform.some((v) => v.slug === "ciorba-lui-sandu"), `internet căutat: ${found.internetSearched}`);
const dup = await addManually(db, user.id, { citySlug: "timisoara", vertical: "food", name: "Restaurant Ciorba lui Sandu", address: "Str. Exemplu, Iosefin", lat: 45.74891, lng: 21.20872 });
ok("un duplicat nu se adaugă de două ori", dup.outcome === "already-exists");
const added = await addManually(db, user.id, { citySlug: "timisoara", vertical: "food", name: `Bistro Test ${suffix}`, address: "Str. Test 1, Fratelia", lat: 45.731, lng: 21.219, categories: ["bistro"] });
ok("local nou adăugat de mână → în așteptare", added.outcome === "pending-review");
const hiddenFromCity = await cityPage(db, { citySlug: "timisoara", vertical: "food", limit: 50 });
ok("localul în așteptare nu apare în top", !hiddenFromCity.top.some((v) => v.id === added.venueId));
await db.update(usersTable).set({ roles: ["user", "admin"] }).where(eq(usersTable.id, sanduOwner.id));
const q = await moderation.queue(db, sanduOwner.id);
const report = q.reports.find((r) => r.targetId === added.venueId)!;
await moderation.resolveReport(db, sanduOwner.id, report.id, "accept", "Verificat pe stradă");
const approved = await db.query.venues.findFirst({ where: (v, { eq }) => eq(v.id, added.venueId) });
ok("adminul aprobă → localul devine activ", approved?.status === "active");
const claim = await accounts.startClaim(db, user.id, added.venueId, "phone_code");
await accounts.confirmClaim(db, user.id, claim.claimId, { code: claim.code! });
ok("cine l-a adăugat îl poate revendica (owner)", (await db.query.venueManagers.findFirst({ where: (m, { eq }) => eq(m.venueId, added.venueId) }))?.role === "owner");
await db.update(usersTable).set({ roles: ["user", "local", "owner"] }).where(eq(usersTable.id, sanduOwner.id));

process.exit();
