/**
 * Test de fum pe baza cu date reale: cheamă funcțiile din @tftd/api ca o pagină reală,
 * logat pe conturile de test (test.user, test.owner, test.admin), nu cu useri generați.
 *
 *   npm run seed && npx tsx --env-file-if-exists=.env seed/smoke.ts
 *
 * Tot ce scrie testul (review-uri, voturi, ștampile, revendicări, locale adăugate) rulează într-o tranzacție
 * care la final se anulează: baza rămâne exact cum era.
 */
import { sql } from "drizzle-orm";
import {
  accounts, addManually, cityPage, createDb, loyalty, moderation, owner, searchPlaces, ServiceError, submitSocialLinkNow, submitVibe, toggleHelpful,
  venuePage, writeReview,
} from "@tftd/api";
import { socialSubmissions, type Db } from "@tftd/db";

const TEST = {
  user: { login: "test.user", password: "TestUser2026!" },
  owner: { login: "test.owner", password: "TestOwner2026!" },
  admin: { login: "test.admin", password: "TestAdmin2026!" },
};

const root = createDb();
const ok = (label: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "OK  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) process.exitCode = 1;
};
const fails = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);
const countRows = async (db: Db) =>
  ((await db.execute(sql`select
      (select count(*) from reviews)::int as reviews,
      (select count(*) from users)::int as users,
      (select count(*) from venues)::int as venues,
      (select count(*) from owner_claims)::int as claims,
      (select count(*) from loyalty_programs)::int as programs`)) as unknown as [Record<string, number>])[0];

const before = await countRows(root);
class Rollback extends Error {}

await root
  .transaction(async (tx) => {
    const db = tx as unknown as Db;

    // ---------- Conturile de test ----------
    const user = await accounts.login(db, TEST.user).catch(() => null);
    const ownerUser = await accounts.login(db, TEST.owner).catch(() => null);
    const admin = await accounts.login(db, TEST.admin).catch(() => null);
    ok("conturile de test intră cu parola lor", !!user && !!ownerUser && !!admin, "rulează „npm run seed” dacă lipsesc");
    if (!user || !ownerUser || !admin) throw new Rollback();
    ok("o parolă greșită nu intră", (await accounts.login(db, { login: "test.user", password: "gresit" }).catch(() => null)) === null);

    // ---------- Pagina orașului: doar locale reale, cele fără review-uri la final ----------
    const food = await cityPage(db, { citySlug: "timisoara", vertical: "food", limit: 50 });
    ok("cityPage food: localurile reale apar și fără review-uri", food.top.length >= 20, `${food.top.length} locale, ${food.reviewCount} review-uri`);
    const scored = food.top.filter((v) => v.honestScore != null);
    ok("localurile cu scor sunt înaintea celor fără", food.top.findIndex((v) => v.honestScore == null) === -1 || food.top.slice(food.top.findIndex((v) => v.honestScore == null)).every((v) => v.honestScore == null), `${scored.length} cu scor`);

    // ---------- test.owner: pornește fără local, își alege unul și îl revendică (ca în /owner) ----------
    ok("test.owner pornește fără local", (await owner.managedVenues(db, ownerUser.id)).length === 0);
    const owned = await owner.ownedVenueIds(db);
    const pick = food.top.find((v) => !owned.has(v.id))!;
    const ownClaim = await accounts.startClaim(db, ownerUser.id, pick.id, "phone_code");
    await accounts.confirmClaim(db, ownerUser.id, ownClaim.claimId, { code: ownClaim.code! });
    const mine = await owner.managedVenues(db, ownerUser.id);
    ok("test.owner și-a ales și revendicat localul", mine.some((v) => v.id === pick.id && v.role === "owner"), pick.name);
    ok("localul revendicat nu mai apare ca liber", (await owner.ownedVenueIds(db)).has(pick.id));
    const ownVenue = mine[0]!;
    const ownPage = await venuePage(db, { citySlug: "timisoara", vertical: ownVenue.vertical, slug: ownVenue.slug });

    // ---------- test.user scrie un review → scorul se calculează din el ----------
    const review = await writeReview(db, user.id, { venueId: ownPage.venue.id, rating: 9, text: "Am fost aseară: servire rapidă, prețuri corecte și o atmosferă liniștită." });
    ok("writeReview: analizat și cântărit", review.analyzedAt !== null && review.weight !== null, `limbă ${review.language}, pondere ${review.weight?.toFixed(2)}`);
    const afterReview = await venuePage(db, { citySlug: "timisoara", vertical: ownVenue.vertical, slug: ownVenue.slug, reviews: "all" });
    ok("localul are scor după primul review", afterReview.scores.honest != null, `Scor Onest ${afterReview.scores.honest}`);
    const unscored = (await cityPage(db, { citySlug: "timisoara", vertical: "food", limit: 50 })).top.find((v) => v.id !== ownPage.venue.id && v.honestScore == null);
    ok("un local fără review-uri nu primește scor inventat după recalculare", !!unscored || scored.length >= 20, unscored?.name ?? "toate au review-uri");
    const bar = (await cityPage(db, { citySlug: "timisoara", vertical: "drink" })).top[0]!;
    await submitVibe(db, user.id, bar.id, 3);
    const barPage = await venuePage(db, { citySlug: "timisoara", vertical: "drink", slug: bar.slug });
    ok("„cât e de plin acum” vine din raportarea userului", barPage.vibe?.level === 3, JSON.stringify(barPage.vibe));

    // ---------- Owner-ul răspunde, raportează, nu poate ascunde (regula 2) ----------
    await owner.replyToReview(db, ownerUser.id, review.id, "Mulțumim, te mai așteptăm!");
    const withReply = await venuePage(db, { citySlug: "timisoara", vertical: ownVenue.vertical, slug: ownVenue.slug, reviews: "all" });
    ok("răspunsul owner-ului apare sub review", withReply.reviews.find((r) => r.id === review.id)?.replies.length === 1);
    const reportDenied = await fails(owner.reportReview(db, user.id, review.id, "Review fals, scris de un concurent."));
    ok("raportare: un user care nu e manager primește forbidden", reportDenied instanceof ServiceError && reportDenied.code === "forbidden");
    await owner.reportReview(db, ownerUser.id, review.id, "Review fals, scris de un concurent.");
    const reportTwice = await fails(owner.reportReview(db, ownerUser.id, review.id, "Încă o dată, același motiv."));
    ok("raportare: a doua oară conflict", reportTwice instanceof ServiceError && reportTwice.code === "conflict", String((reportTwice as Error | null)?.message));
    const reported = await db.query.reviews.findFirst({ where: (r, { eq }) => eq(r.id, review.id) });
    ok("raportarea nu ascunde review-ul", reported?.status === "published", reported?.status);

    // ---------- Echipa și blogul ----------
    await owner.inviteEmployee(db, ownerUser.id, ownPage.venue.id, { firstName: "Test", role: "ospătar", userId: user.id });
    const team = await owner.employeesForOwner(db, ownerUser.id, ownPage.venue.id);
    ok("owner: echipa include invitația neacceptată", team.some((e) => e.userId === user.id && !e.accepted));
    ok("test.user vede invitația", (await owner.pendingInvites(db, user.id)).some((i) => i.venueName === ownVenue.name));
    const denied = await fails(owner.employeesForOwner(db, user.id, ownPage.venue.id));
    ok("alt user nu vede echipa localului", denied instanceof ServiceError && denied.code === "forbidden");
    const invited = team.find((e) => e.userId === user.id)!;
    await owner.removeEmployee(db, ownerUser.id, invited.id);
    const reAccept = await fails(owner.respondToInvite(db, user.id, invited.id, true));
    ok("angajatul scos nu se poate readăuga singur", reAccept instanceof ServiceError);
    const scheduled = await owner.createPost(db, ownerUser.id, ownPage.venue.id, { type: "offer", title: "Ofertă de mâine", body: "Test programat.", publishAt: new Date(Date.now() + 86_400_000) });
    const publicBlog = (await venuePage(db, { citySlug: "timisoara", vertical: ownVenue.vertical, slug: ownVenue.slug })).blog;
    ok("postarea programată nu e publică încă", !publicBlog.some((p) => p.id === scheduled.id));

    // ---------- Voturi „util”: test.admin scrie, test.user votează ----------
    const adminReview = await writeReview(db, admin.id, { venueId: ownPage.venue.id, rating: 8, text: "Cafeaua e bună, locul e curat și personalul e amabil cu toată lumea." });
    const v1 = await toggleHelpful(db, user.id, adminReview.id);
    const v2 = await toggleHelpful(db, user.id, adminReview.id);
    ok("votul „util” se poate pune și retrage", v1.voted && !v2.voted && v1.helpfulCount === v2.helpfulCount + 1);

    // ---------- Fidelitate: owner-ul creează programul, userul scanează ----------
    const program = await loyalty.createVenueProgram(db, ownerUser.id, ownPage.venue.id, { rewardTitle: "A cincea cafea e gratis", stampsRequired: 5, icon: "coffee" });
    const { code } = await loyalty.currentStampCode(db, ownerUser.id, program.id);
    const stamp1 = await loyalty.scanCode(db, user.id, code);
    ok("scanare QR → +1 ștampilă", stamp1.action === "stamped" && stamp1.card.stamps === 1, stamp1.message);
    ok("a doua ștampilă în aceeași zi e refuzată", typeof (await loyalty.scanCode(db, user.id, code).catch((e: Error) => e.message)) === "string");
    const old = await loyalty.scanCode(db, user.id, code, new Date(Date.now() + 5 * 60_000)).catch((e: Error) => e.message);
    ok("un cod de acum 5 minute nu mai merge", typeof old === "string" && old.includes("expirat"), String(old));
    ok("doar owner-ul generează codul", typeof (await loyalty.currentStampCode(db, user.id, program.id).catch((e: Error) => e.message)) === "string");
    const personal = await loyalty.createPersonalCard(db, user.id, { name: "Cafeneaua din colț", rewardTitle: "O cafea gratis", stampsRequired: 5, icon: "coffee" });
    await loyalty.addPersonalStamp(db, user.id, personal.cardId);
    ok("portofelul are cardul localului și pe cel personal", (await loyalty.myCards(db, user.id)).length === 2);

    // ---------- Revendicare: limite de încercări și un singur owner ----------
    const others = food.top.filter((v) => v.id !== ownPage.venue.id);
    const [claimVenueA, claimVenueB] = [others[0]!, others[1]!];
    const claim1 = await accounts.startClaim(db, user.id, claimVenueA.id, "phone_code");
    const wrong = claim1.code === "000000" ? "000001" : "000000";
    let last: unknown = null;
    for (let i = 0; i < 5; i++) last = await fails(accounts.confirmClaim(db, user.id, claim1.claimId, { code: wrong }));
    ok("revendicare: 5 coduri greșite → blocat", last instanceof ServiceError && /Prea multe încercări/.test(last.message), String((last as Error | null)?.message));
    const sixth = await fails(accounts.confirmClaim(db, user.id, claim1.claimId, { code: claim1.code! }));
    ok("revendicare: a 6-a încercare nu reușește nici cu codul corect", sixth instanceof ServiceError);
    const claimB = await accounts.startClaim(db, admin.id, claimVenueB.id, "phone_code");
    const claimC = await accounts.startClaim(db, user.id, claimVenueB.id, "phone_code");
    await accounts.confirmClaim(db, admin.id, claimB.claimId, { code: claimB.code! });
    const second = await fails(accounts.confirmClaim(db, user.id, claimC.claimId, { code: claimC.code! }));
    ok("revendicare: al doilea nu mai poate deveni owner", second instanceof ServiceError && second.code === "forbidden");

    // ---------- Căutare, local adăugat de user, aprobat de admin ----------
    const found = await searchPlaces(db, { citySlug: "timisoara", vertical: "food", query: food.top[0]!.name.split(" ")[0]! });
    ok("căutarea găsește localul la noi", found.onPlatform.length > 0, `internet căutat: ${found.internetSearched}`);
    const added = await addManually(db, user.id, { citySlug: "timisoara", vertical: "food", name: `Bistro Test ${Date.now()}`, address: "Str. Test 1, Fratelia", lat: 45.731, lng: 21.219, categories: ["bistro"] });
    ok("local nou adăugat de mână → în așteptare", added.outcome === "pending-review");
    ok("localul în așteptare nu apare în listă", !(await cityPage(db, { citySlug: "timisoara", vertical: "food", limit: 100 })).top.some((v) => v.id === added.venueId));
    const report = (await moderation.queue(db, admin.id)).reports.find((r) => r.targetId === added.venueId)!;
    await moderation.resolveReport(db, admin.id, report.id, "accept", "Verificat pe stradă");
    ok("test.admin aprobă → localul devine activ", (await db.query.venues.findFirst({ where: (v, { eq }) => eq(v.id, added.venueId) }))?.status === "active");
    const userDenied = await fails(moderation.queue(db, user.id));
    ok("test.user nu vede coada de moderare", userDenied instanceof ServiceError);

    // ---------- Link social care a eșuat o dată se poate retrimite (cere internet) ----------
    const retryUrl = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
    await db.insert(socialSubmissions).values({ venueId: ownPage.venue.id, platform: "youtube", url: retryUrl, status: "failed" });
    const retried = await submitSocialLinkNow(db, { venueId: ownPage.venue.id, url: retryUrl, userId: user.id }).catch((e: Error) => ({ status: `eroare: ${e.message}` }));
    ok("linkul eșuat se poate retrimite", retried.status === "processed", retried.status);

    throw new Rollback();
  })
  .catch((e: unknown) => {
    if (!(e instanceof Rollback)) throw e;
  });

const after = await countRows(root);
ok("baza a rămas neschimbată după test", JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));
// Închide conexiunile înainte de ieșire (altfel Node pe Windows se oprește cu o eroare libuv)
await (root as unknown as { $client: { end: () => Promise<void> } }).$client.end();
