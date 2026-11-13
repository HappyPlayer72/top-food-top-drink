/**
 * Test de fum pe DB-ul cu seed: cheamă funcțiile din @tftd/api ca o pagină reală.
 *   npm run seed -- --reset && npx tsx --env-file-if-exists=.env seed/smoke.ts
 */
import { accounts, cityPage, createDb, leaderboardPage, owner, ServiceError, submitSocialLinkNow, submitVibe, venuePage, weekendEvents, writeReview } from "@tftd/api";
import { socialSubmissions } from "@tftd/db";

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

process.exit();
