import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { checkins, createDb, reviews, users, venues, visitProofs, type Db } from "@tftd/db";
import { writeReview } from "./actions.ts";
import { checkInAtVenue, decideReceipt, detectImageType, receiptImage, receiptQueue, submitReceipt } from "./visits.ts";

const JPEG = (seed: number) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, seed, 1, 2, 3, 4, 5]);

describe("detectImageType", () => {
  it("recunoaște pozele după octeți, nu după extensie", () => {
    expect(detectImageType(JPEG(1))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(detectImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

/**
 * Cap-coadă pe baza locală (după `npm run seed`). Totul rulează într-o tranzacție anulată la final,
 * deci nu lasă date în urmă. Fără DATABASE_URL testul e sărit.
 */
describe.skipIf(!process.env.DATABASE_URL)("vizită verificată (pe baza de date)", () => {
  class Rollback extends Error {}
  async function inTx(fn: (db: Db) => Promise<void>) {
    const db = createDb();
    await db
      .transaction(async (tx) => {
        await fn(tx as unknown as Db);
        throw new Rollback();
      })
      .catch((e) => {
        if (!(e instanceof Rollback)) throw e;
      });
  }

  async function setup(db: Db) {
    const [venue] = await db
      .select({ id: venues.id, lat: sql<number>`ST_Y(${venues.location})`, lng: sql<number>`ST_X(${venues.location})` })
      .from(venues)
      .where(eq(venues.slug, "restaurant-nora"));
    if (!venue) throw new Error("Rulează întâi `npm run seed`.");
    const [user] = await db.insert(users).values({ username: `vizita${Date.now()}`, displayName: "Test Vizită" }).returning();
    const [admin] = await db.insert(users).values({ username: `admin${Date.now()}`, displayName: "Admin", roles: ["user", "admin"] }).returning();
    return { venue, user: user!, admin: admin! };
  }
  const TEXT = "Ciorba de burtă a fost fierbinte și acră cum trebuie, porție mare.";

  it("GPS: la peste 100 m refuză, la local verifică review-ul de azi și nu salvează coordonatele", async () => {
    await inTx(async (db) => {
      const { venue, user } = await setup(db);
      const now = new Date();
      const review = await writeReview(db, user.id, { venueId: venue.id, rating: 9, text: TEXT }, now);
      expect(review.verifiedVisit).toBe(false);

      // ~1 km la nord
      await expect(checkInAtVenue(db, user.id, venue.id, { lat: venue.lat + 0.009, lng: venue.lng }, now)).rejects.toMatchObject({ code: "invalid" });

      const r = await checkInAtVenue(db, user.id, venue.id, { lat: venue.lat + 0.0002, lng: venue.lng }, now);
      expect(r.distanceM).toBeLessThan(40);
      expect(r.upgradedReviewId).toBe(review.id);

      const [after] = await db.select().from(reviews).where(eq(reviews.id, review.id));
      expect(after).toMatchObject({ verifiedVisit: true, verifiedVia: "gps" });
      const rows = await db.select().from(checkins).where(eq(checkins.userId, user.id));
      expect(rows).toHaveLength(1);
      expect(Object.keys(rows[0]!).sort()).toEqual(["citySlug", "day", "id", "userId", "venueId"]); // regula 7: fără coordonate
    });
  });

  it("GPS înainte de review: review-ul se publică direct verificat", async () => {
    await inTx(async (db) => {
      const { venue, user } = await setup(db);
      await checkInAtVenue(db, user.id, venue.id, { simulate: true });
      const review = await writeReview(db, user.id, { venueId: venue.id, rating: 8, text: TEXT });
      expect(review).toMatchObject({ verifiedVisit: true, verifiedVia: "gps" });
    });
  });

  it("bon: ajunge la admin, aprobarea dă ×1,3 și șterge poza; același bon nu merge de două ori", async () => {
    await inTx(async (db) => {
      const { venue, user, admin } = await setup(db);
      const review = await writeReview(db, user.id, { venueId: venue.id, rating: 9, text: TEXT });
      const weightBefore = review.weight!;

      await expect(submitReceipt(db, admin.id, review.id, JPEG(7))).rejects.toMatchObject({ code: "forbidden" });
      await expect(submitReceipt(db, user.id, review.id, new TextEncoder().encode("nu e poza"))).rejects.toMatchObject({ code: "invalid" });

      const proof = await submitReceipt(db, user.id, review.id, JPEG(7));
      expect(proof.status).toBe("pending");
      await expect(submitReceipt(db, user.id, review.id, JPEG(8))).rejects.toMatchObject({ code: "conflict" });
      await expect(receiptQueue(db, user.id)).rejects.toMatchObject({ code: "forbidden" });

      const queue = await receiptQueue(db, admin.id);
      expect(queue.find((q) => q.id === proof.id)?.review.text).toBe(TEXT);
      expect((await receiptImage(db, admin.id, proof.id)).type).toBe("image/jpeg");

      await decideReceipt(db, admin.id, proof.id, true, "Bon din ziua vizitei");
      const [after] = await db.select().from(reviews).where(eq(reviews.id, review.id));
      expect(after).toMatchObject({ verifiedVisit: true, verifiedVia: "receipt" });
      expect(after!.weight!).toBeCloseTo(weightBefore * 1.3, 5);
      const [stored] = await db.select().from(visitProofs).where(eq(visitProofs.id, proof.id));
      expect(stored).toMatchObject({ status: "verified", image: null, decidedBy: admin.id });
      await expect(receiptImage(db, admin.id, proof.id)).rejects.toMatchObject({ code: "not_found" });
      await expect(decideReceipt(db, admin.id, proof.id, false)).rejects.toMatchObject({ code: "invalid" });

      // Alt user încearcă același bon pe alt review
      const [other] = await db.insert(users).values({ username: `alt${Date.now()}`, displayName: "Alt" }).returning();
      const otherReview = await writeReview(db, other!.id, { venueId: venue.id, rating: 10, text: TEXT });
      await expect(submitReceipt(db, other!.id, otherReview.id, JPEG(7))).rejects.toMatchObject({ code: "conflict" });
    });
  });

  it("bon respins: review-ul rămâne neverificat, poza se șterge", async () => {
    await inTx(async (db) => {
      const { venue, user, admin } = await setup(db);
      const review = await writeReview(db, user.id, { venueId: venue.id, rating: 9, text: TEXT });
      const proof = await submitReceipt(db, user.id, review.id, JPEG(9));
      await decideReceipt(db, admin.id, proof.id, false, "Bonul e de la alt local");
      const [after] = await db.select().from(reviews).where(eq(reviews.id, review.id));
      expect(after).toMatchObject({ verifiedVisit: false, verifiedVia: null });
      const [stored] = await db.select().from(visitProofs).where(eq(visitProofs.id, proof.id));
      expect(stored).toMatchObject({ status: "rejected", image: null, decision: "Bonul e de la alt local" });
    });
  });
});
