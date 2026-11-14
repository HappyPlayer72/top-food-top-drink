/**
 * Test de fum pe DB-ul cu seed: cheamă funcțiile din @tftd/api ca o pagină reală.
 *   npm run seed -- --reset && npx tsx --env-file-if-exists=.env seed/smoke.ts
 */
import { eq } from "drizzle-orm";
import {
  accounts, addManually, cityPage, createDb, leaderboardPage, loyalty, moderation, owner, searchPlaces, ServiceError, submitSocialLinkNow, submitVibe, toggleHelpful, topReviewers, venuePage,
  weekendEvents, writeReview,
} from "@tftd/api";
import { socialSubmissions, users as usersTable } from "@tftd/db";

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

// Dashboard-ul owner-ului: citirile de care are nevoie /owner
const sanduOwnerId = await owner.userIdByUsername(db, "sandu.proprietar");
ok("userIdByUsername", !!sanduOwnerId && (await owner.userIdByUsername(db, "nu-exista-deloc")) === null);
const mine = await owner.managedVenues(db, sanduOwnerId!);
ok("owner: localele mele", mine.some((v) => v.slug === "ciorba-lui-sandu" && v.role === "owner"), mine.map((v) => `${v.slug}:${v.role}`).join(", "));
await owner.inviteEmployee(db, sanduOwnerId!, sandu.venue.id, { firstName: "Test", role: "ospătar", userId: user.id });
const team = await owner.employeesForOwner(db, sanduOwnerId!, sandu.venue.id);
ok("owner: echipa include invitația neacceptată", team.length === 4 && team.some((e) => e.userId === user.id && !e.accepted), team.map((e) => `${e.firstName}:${e.accepted}`).join(", "));
const invites = await owner.pendingInvites(db, user.id);
ok("angajat: vede invitația", invites.some((i) => i.venueName === "Ciorba lui Sandu" && i.role === "ospătar"), JSON.stringify(invites));
const tomorrow = new Date(Date.now() + 86_400_000);
const scheduled = await owner.createPost(db, sanduOwnerId!, sandu.venue.id, { type: "offer", title: "Ofertă de mâine", body: "Ciorbă la jumătate de preț.", publishAt: tomorrow });
const ownerPosts = await owner.postsForOwner(db, sanduOwnerId!, sandu.venue.id);
const publicBlog = (await venuePage(db, { citySlug: "timisoara", vertical: "food", slug: "ciorba-lui-sandu" })).blog;
ok("postarea programată: la owner da, public nu", ownerPosts.find((p) => p.id === scheduled.id)?.scheduled === true && !publicBlog.some((p) => p.id === scheduled.id));
const denied = await owner.employeesForOwner(db, user.id, sandu.venue.id).then(() => null, (e: unknown) => e);
ok("alt user nu vede echipa altui local", denied instanceof ServiceError && denied.code === "forbidden");

// Raportarea review-urilor: doar managerul localului, o singură dată cât raportul e deschis, fără să ascundă review-ul
const fails = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);
const reportDenied = await fails(owner.reportReview(db, user.id, review.id, "Review fals, scris de un concurent."));
ok("raportare: un user care nu e manager primește forbidden", reportDenied instanceof ServiceError && reportDenied.code === "forbidden", String((reportDenied as Error | null)?.message));
await owner.reportReview(db, sanduOwnerId!, review.id, "Review fals, scris de un concurent.");
const reportTwice = await fails(owner.reportReview(db, sanduOwnerId!, review.id, "Încă o dată, același motiv."));
ok(
  "raportare: managerul raportează o dată, a doua oară conflict",
  reportTwice instanceof ServiceError && reportTwice.code === "conflict" && reportTwice.message === "Ai raportat deja acest review. Decide un admin.",
  String((reportTwice as Error | null)?.message),
);
const reported = await db.query.reviews.findFirst({ where: (r, { eq }) => eq(r.id, review.id) });
ok("raportarea nu ascunde review-ul (regula 2)", reported?.status === "published", reported?.status);

// Revendicare: limită de încercări, limită de cereri, un singur owner per local
const claimUser = async (name: string) => accounts.register(db, { username: `${name}${suffix}`, displayName: name, password: "parola-lunga-1", email: `${name}${suffix}@exemplu.ro` });
const isOwnerOf = async (userId: string, venueId: string) =>
  !!(await db.query.venueManagers.findFirst({ where: (m, { and, eq }) => and(eq(m.userId, userId), eq(m.venueId, venueId), eq(m.role, "owner")) }));
const claimerA = await claimUser("claima");
const claim1 = await accounts.startClaim(db, claimerA.id, depou.venue.id, "phone_code");
const wrong = claim1.code === "000000" ? "000001" : "000000";
const wrongErrors: unknown[] = [];
for (let i = 0; i < 5; i++) wrongErrors.push(await fails(accounts.confirmClaim(db, claimerA.id, claim1.claimId, { code: wrong })));
const last = wrongErrors[4];
ok("revendicare: 5 coduri greșite → mesaj de prea multe încercări", last instanceof ServiceError && last.message === "Prea multe încercări greșite. Cere un cod nou peste 24 de ore.", String((last as Error | null)?.message));
const rejectedClaim = await db.query.ownerClaims.findFirst({ where: (c, { eq }) => eq(c.id, claim1.claimId) });
ok("revendicare: cererea e respinsă după 5 încercări", rejectedClaim?.status === "rejected" && rejectedClaim.attempts === 5, `${rejectedClaim?.status}, ${rejectedClaim?.attempts} încercări`);
const sixth = await fails(accounts.confirmClaim(db, claimerA.id, claim1.claimId, { code: claim1.code! }));
ok("revendicare: a 6-a încercare, chiar cu codul corect, nu reușește", sixth instanceof ServiceError && !(await isOwnerOf(claimerA.id, depou.venue.id)), String((sixth as Error | null)?.message));
await accounts.startClaim(db, claimerA.id, depou.venue.id, "phone_code");
await accounts.startClaim(db, claimerA.id, depou.venue.id, "phone_code");
const fourth = await fails(accounts.startClaim(db, claimerA.id, depou.venue.id, "phone_code"));
ok("revendicare: a 4-a cerere în 24 de ore e refuzată", fourth instanceof ServiceError && fourth.code === "invalid", String((fourth as Error | null)?.message));

const claimerB = await claimUser("claimb");
const claimerC = await claimUser("claimc");
const claimB = await accounts.startClaim(db, claimerB.id, bega.venue.id, "phone_code");
const claimC = await accounts.startClaim(db, claimerC.id, bega.venue.id, "phone_code");
await accounts.confirmClaim(db, claimerB.id, claimB.claimId, { code: claimB.code! });
const second = await fails(accounts.confirmClaim(db, claimerC.id, claimC.claimId, { code: claimC.code! }));
ok("revendicare: primul devine owner", await isOwnerOf(claimerB.id, bega.venue.id));
ok(
  "revendicare: al doilea primește forbidden și nu devine owner",
  second instanceof ServiceError && second.code === "forbidden" && !(await isOwnerOf(claimerC.id, bega.venue.id)),
  String((second as Error | null)?.message),
);
const secondClaim = await db.query.ownerClaims.findFirst({ where: (c, { eq }) => eq(c.id, claimC.claimId) });
ok("revendicare: cererea celui de-al doilea e respinsă", secondClaim?.status === "rejected", secondClaim?.status);

// Un angajat scos de owner nu se poate readăuga singur acceptând invitația veche
const invited = team.find((e) => e.userId === user.id)!;
await owner.removeEmployee(db, sanduOwnerId!, invited.id);
const reAccept = await owner.respondToInvite(db, user.id, invited.id, true).then(() => null, (e: unknown) => e);
const teamAfter = await owner.employeesForOwner(db, sanduOwnerId!, sandu.venue.id);
ok("angajatul scos nu se poate readăuga singur", reAccept instanceof ServiceError && !teamAfter.some((e) => e.id === invited.id));

// Un link care a eșuat o dată (ex. rețea) se poate trimite din nou
const retryUrl = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
await db.insert(socialSubmissions).values({ venueId: sandu.venue.id, platform: "youtube", url: retryUrl, status: "failed" });
const retried = await submitSocialLinkNow(db, { venueId: sandu.venue.id, url: retryUrl, userId: user.id });
ok("linkul eșuat se poate retrimite", retried.status === "processed", retried.status);
const badVenue = await submitSocialLinkNow(db, { venueId: "00000000-0000-0000-0000-000000000000", url: "https://youtu.be/aqz-KE-bpKQ", userId: null }).then(() => null, (e: unknown) => e);
ok("eroarea de DB nu ajunge la user ca text SQL", !(badVenue instanceof ServiceError) || !/Failed query|insert into/i.test(badVenue.message), String((badVenue as Error | null)?.message).slice(0, 60));

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

// ---------- Conturile demo de pe ecranul de login + fidelitatea în modul demo ----------
const demoPassword = process.env.DEMO_PASSWORD ?? "demo1234";
for (const email of ["andreea@e-uvt.ro", "luca@visit.ro"]) {
  const u = await accounts.login(db, { login: email, password: demoPassword }).catch(() => null);
  ok(`contul demo ${email} intră cu parola demo`, !!u);
}
const programs = await loyalty.cityPrograms(db, "timisoara");
ok("programele de fidelitate din oraș", programs.length >= 2 && programs.every((p) => !("stampSecret" in p)), programs.map((p) => p.venueName).join(", "));
const demoCode = await loyalty.demoStampCode(db, programs.find((p) => p.venueSlug === "pivnita-cu-bolta")!.id);
const demoScan = await loyalty.scanCode(db, user.id, demoCode);
ok("codul demo (ca la tejghea) pune ștampila", demoScan.action === "stamped", demoScan.message);

process.exit();
