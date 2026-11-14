import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDb, reports, reviewSubmissions, reviews, users, venues, type Db } from "@tftd/db";
import { resolveReport } from "@tftd/moderation";
import { BOT_SIGNALS } from "@tftd/review-analysis";
import { refreshAfterModeration, writeReview } from "./actions.ts";
import { clientFingerprint, issueReviewFormToken, readReviewFormToken } from "./antibot.ts";

process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-1234";

describe("tokenul formularului", () => {
  const t0 = new Date("2026-11-14T12:00:00Z");
  const at = (s: number) => new Date(t0.getTime() + s * 1000);

  it("dă timpul de completare doar pentru același user și local, cât nu a expirat", () => {
    const token = issueReviewFormToken("u1", "v1", t0);
    expect(readReviewFormToken(token, "u1", "v1", at(42))).toBe(42_000);
    expect(readReviewFormToken(token, "u2", "v1", at(42))).toBeNull();
    expect(readReviewFormToken(token, "u1", "v2", at(42))).toBeNull();
    expect(readReviewFormToken(token, "u1", "v1", at(7 * 3600))).toBeNull();
    expect(readReviewFormToken(`${t0.getTime() - 60_000}.${token.split(".")[1]}`, "u1", "v1", at(42))).toBeNull(); // oră falsificată
    expect(readReviewFormToken(undefined, "u1", "v1", at(42))).toBeNull();
  });

  it("amprenta dispozitivului nu conține IP-ul", () => {
    const h = clientFingerprint("86.120.10.5", "Mozilla/5.0");
    expect(h).toHaveLength(22);
    expect(h).not.toContain("86.120");
    expect(clientFingerprint("86.120.10.5", "Mozilla/5.0")).toBe(h);
    expect(clientFingerprint("86.120.10.6", "Mozilla/5.0")).not.toBe(h);
  });
});

/** Pe baza locală (după `npm run seed`), într-o tranzacție anulată la final. */
describe.skipIf(!process.env.DATABASE_URL)("poarta și filtrul anti-bot (pe baza de date)", () => {
  class Rollback extends Error {}
  async function inTx(fn: (db: Db) => Promise<void>) {
    await createDb()
      .transaction(async (tx) => {
        await fn(tx as unknown as Db);
        throw new Rollback();
      })
      .catch((e) => {
        if (!(e instanceof Rollback)) throw e;
      });
  }

  const TEXT = "Am luat ciorbă de perișoare și papanași, porții mari, servirea rapidă. Revin cu prietenii.";
  const now = new Date();
  const ago = (s: number) => new Date(now.getTime() - s * 1000);
  const client = (userId: string, venueId: string, openedSecondsAgo: number, extra: object = {}) => ({
    formToken: issueReviewFormToken(userId, venueId, ago(openedSecondsAgo)),
    clientHash: "device-a",
    ...extra,
  });

  async function setup(db: Db) {
    const vs = await db.select({ id: venues.id }).from(venues).where(eq(venues.vertical, "food")).limit(6);
    if (vs.length < 6) throw new Error("Rulează întâi `npm run seed`.");
    const mk = async (name: string, ageSec: number, roles: ("user" | "admin")[] = ["user"]) =>
      (await db.insert(users).values({ username: `${name}${Math.random().toString(36).slice(2, 8)}`, displayName: name, roles, createdAt: ago(ageSec) }).returning())[0]!;
    return { venues: vs.map((v) => v.id), mk };
  }

  it("blochează câmpul capcană, tokenul lipsă și formularul trimis instant; un om trece", async () => {
    await inTx(async (db) => {
      const { venues: [v], mk } = await setup(db);
      const u = await mk("om", 60 * 86_400);
      const input = { venueId: v!, rating: 8, text: TEXT };
      await expect(writeReview(db, u.id, input, now, client(u.id, v!, 60, { honeypot: "http://spam" }))).rejects.toMatchObject({ code: "invalid" });
      await expect(writeReview(db, u.id, input, now, { formToken: undefined, clientHash: null })).rejects.toMatchObject({ code: "invalid" });
      await expect(writeReview(db, u.id, input, now, client(u.id, v!, 1))).rejects.toMatchObject({ code: "invalid" });

      const ok = await writeReview(db, u.id, input, now, client(u.id, v!, 90));
      expect(ok.status).toBe("published");
      expect(ok.fakeSignals.filter((f) => (BOT_SIGNALS as readonly string[]).includes(f))).toEqual([]); // doar „newAccount” (primul review)
      const [sub] = await db.select().from(reviewSubmissions).where(eq(reviewSubmissions.reviewId, ok.id));
      expect(sub).toMatchObject({ clientHash: "device-a", fillMs: 90_000 });
    });
  });

  it("limitează conturile noi la 3 review-uri în prima zi", async () => {
    await inTx(async (db) => {
      const { venues: vs, mk } = await setup(db);
      const u = await mk("nou", 2 * 3600);
      for (let i = 0; i < 3; i++) {
        await writeReview(db, u.id, { venueId: vs[i]!, rating: 8, text: `${TEXT} Vizita ${i}.` }, ago(3600 - i * 1500), client(u.id, vs[i]!, 3700 - i * 1500));
      }
      await expect(writeReview(db, u.id, { venueId: vs[3]!, rating: 8, text: TEXT }, now, client(u.id, vs[3]!, 120))).rejects.toThrow(/prima zi/);
    });
  });

  it("un bot evident e reținut, apare în /admin, nu contează; „Păstrează” îl publică", async () => {
    await inTx(async (db) => {
      const { venues: [v], mk } = await setup(db);
      const bot = await mk("bot", 40);
      const admin = await mk("admin", 400 * 86_400, ["user", "admin"]);
      const spam = "Cel mai bun local din oraș!!!!!!! Reduceri la www.oferte-bune.xyz";
      const r = await writeReview(db, bot.id, { venueId: v!, rating: 10, text: spam }, now, client(bot.id, v!, 3.5));
      expect(r.status).toBe("flagged");
      expect(r.fakeSignals).toEqual(expect.arrayContaining(["tooFast", "spamContent", "freshAccount"]));

      const [report] = await db.select().from(reports).where(and(eq(reports.targetType, "review"), eq(reports.targetId, r.id)));
      expect(report).toMatchObject({ status: "open", reportedBy: null });
      expect(report!.reason).toMatch(/anti-bot/);

      await resolveReport(db, admin.id, report!.id, "keep", "e om, doar entuziast");
      await refreshAfterModeration(db, r.id);
      const [after] = await db.select().from(reviews).where(eq(reviews.id, r.id));
      expect(after).toMatchObject({ status: "published", botCleared: true });
      expect(after!.fakeSignals).not.toContain("spamContent"); // reanalizat fără semnalele de bot
    });
  });

  it("3 conturi de pe același dispozitiv la același local: al treilea are sharedDevice", async () => {
    await inTx(async (db) => {
      const { venues: [v], mk } = await setup(db);
      const accounts = [await mk("a", 30 * 86_400), await mk("b", 30 * 86_400), await mk("c", 30 * 86_400)];
      const results = [];
      for (const [i, u] of accounts.entries()) {
        results.push(await writeReview(db, u.id, { venueId: v!, rating: 10, text: `${TEXT} Varianta ${"xyz"[i]} a experienței.` }, now, client(u.id, v!, 60)));
      }
      expect(results[1]!.fakeSignals).not.toContain("sharedDevice");
      expect(results[2]!.fakeSignals).toContain("sharedDevice");
    });
  });
});
