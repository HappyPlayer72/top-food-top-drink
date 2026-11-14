/**
 * Integrare PostgreSQL pe o bază de TEST separată (cu migrări + seed), niciodată pe cea de dezvoltare.
 *   TEST_DATABASE_URL=postgresql://…/topfood_test npx vitest run packages/api/src/features.db.test.ts
 * Fiecare test rulează într-o tranzacție anulată la final, deci baza rămâne neschimbată.
 */
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, partnerships, reviewAnswers, reviews, users, venueManagers, venueQuickVotes, venues, type Db } from "@tftd/db";
import { MIN_ANSWERS } from "@tftd/scoring/features";
import { accounts, myQuickVotes, owner, submitQuickVote, thematicTops, venuePage, writeReview } from "./index.ts";

const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : (null as unknown as Db);
afterAll(async () => {
  await (db as unknown as { $client?: { end: () => Promise<void> } })?.$client?.end();
});

class Rollback extends Error {}
async function inTx(fn: (tx: Db) => Promise<void>) {
  await expect(
    db.transaction(async (tx) => {
      await fn(tx as unknown as Db);
      throw new Rollback();
    }),
  ).rejects.toBeInstanceOf(Rollback);
}

let n = 0;
const newUser = (tx: Db, interests: string[] = []) =>
  accounts.register(tx, { username: `test_feat_${Date.now()}_${n++}`, displayName: "Test", email: `t${Date.now()}_${n++}@test.ro`, password: "parola-de-test", interests });

async function venue(tx: Db, slug: string) {
  const [v] = await tx.select().from(venues).where(eq(venues.slug, slug));
  return v!;
}

const text = "Am fost aici cu prietenii, mâncarea a fost bună și servirea rapidă.";

describe.skipIf(!url)("integrare PostgreSQL (bază de test)", () => {
  it("preferințe: salvate la înregistrare, schimbate din profil, valori invalide respinse", () =>
    inTx(async (tx) => {
      const u = await newUser(tx, ["accesibilitate", "lucru"]);
      expect(u.interests).toEqual(["accesibilitate", "lucru"]);
      expect(await accounts.setInterests(tx, u.id, ["iesiri"])).toEqual(["iesiri"]);
      expect(await accounts.setInterests(tx, u.id, [])).toEqual([]);
      await expect(accounts.setInterests(tx, u.id, ["dizabilitate"])).rejects.toThrow(/nu sunt valide/);
      const [row] = await tx.select({ interests: users.interests }).from(users).where(eq(users.id, u.id));
      expect(row!.interests).toEqual([]);
    }));

  it("review: răspunsurile se salvează împreună cu review-ul; o cheie invalidă nu salvează nimic", () =>
    inTx(async (tx) => {
      const u = await newUser(tx);
      const v = await venue(tx, "restaurant-nora");
      const r = await writeReview(tx, u.id, { venueId: v.id, rating: 8, text, answers: { intrare_fara_trepte: "yes", wifi: "not_observed" } });
      const saved = await tx.select().from(reviewAnswers).where(eq(reviewAnswers.reviewId, r.id));
      expect(Object.fromEntries(saved.map((a) => [a.questionKey, a.answer]))).toEqual({ intrare_fara_trepte: "yes", wifi: "not_observed" });

      const u2 = await newUser(tx);
      await expect(writeReview(tx, u2.id, { venueId: v.id, rating: 8, text, answers: { siguranta_garantata: "yes" } })).rejects.toThrow(/nu sunt valide/);
      await expect(writeReview(tx, u2.id, { venueId: v.id, rating: 8, text, answers: { wifi: "poate" } })).rejects.toThrow(/nu sunt valide/);
      expect(await tx.select().from(reviews).where(eq(reviews.authorId, u2.id))).toEqual([]);
    }));

  it("procente: prag, „Nu am observat” ignorat, review-urile ascunse excluse, fallback și contradicție cu owner-ul", () =>
    inTx(async (tx) => {
      const v = await venue(tx, "sabres-restaurant"); // fără date demo
      const page = () => venuePage(tx, { citySlug: v.citySlug, vertical: v.vertical, slug: v.slug }).then((p) => p.features.flatMap((t) => t.items));
      const entry = async () => (await page()).find((i) => i.key === "intrare_fara_trepte")!;

      expect((await entry()).state).toBe("unknown");
      const managerId = (await newUser(tx)).id;
      await tx.insert(venueManagers).values({ venueId: v.id, userId: managerId, role: "owner" });
      await owner.setFacilities(tx, managerId, v.id, { intrare_fara_trepte: "yes" });
      expect(await entry()).toMatchObject({ state: "owner", text: "Declarat de local: Da" });

      const ids: string[] = [];
      for (let i = 0; i < MIN_ANSWERS; i++) {
        const u = await newUser(tx);
        ids.push((await writeReview(tx, u.id, { venueId: v.id, rating: 6, text, answers: { intrare_fara_trepte: "no" } })).id);
      }
      const u = await newUser(tx);
      await writeReview(tx, u.id, { venueId: v.id, rating: 6, text, answers: { intrare_fara_trepte: "not_observed" } });
      expect(await entry()).toMatchObject({ state: "conflict", percent: 0, ownerText: "Declarat de local: Da" });

      await tx.update(reviews).set({ status: "hidden" }).where(eq(reviews.id, ids[0]!));
      expect((await entry()).state).toBe("owner");
    }));

  it("facilități: doar managerii localului; „liniștea” nu se declară; Nespecificat șterge declarația", () =>
    inTx(async (tx) => {
      const v = await venue(tx, "sabres-restaurant");
      const m = { userId: (await newUser(tx)).id };
      await tx.insert(venueManagers).values({ venueId: v.id, userId: m.userId, role: "manager" });
      const stranger = await newUser(tx);
      await expect(owner.setFacilities(tx, stranger.id, v.id, { wifi: "yes" })).rejects.toThrow(/Nu administrezi/);
      await expect(owner.facilitiesForOwner(tx, stranger.id, v.id)).rejects.toThrow(/Nu administrezi/);
      await owner.setFacilities(tx, m!.userId, v.id, { wifi: "yes", prize: "no" });
      expect(Object.fromEntries(await owner.facilitiesForOwner(tx, m!.userId, v.id))).toEqual({ wifi: "yes", prize: "no" });
      await expect(owner.setFacilities(tx, m!.userId, v.id, { liniste: "yes" })).rejects.toThrow(/doar facilitățile/);
      await owner.setFacilities(tx, m!.userId, v.id, { prize: "unspecified" });
      expect(Object.fromEntries(await owner.facilitiesForOwner(tx, m!.userId, v.id))).toEqual({ wifi: "yes" });
    }));

  it("topuri tematice: un parteneriat plătit nu schimbă ordinea", () =>
    inTx(async (tx) => {
      const order = async () =>
        (await thematicTops(tx, { citySlug: "timisoara", vertical: "food" })).map((t) => [t.theme, t.community.map((c) => c.slug), t.declared.map((d) => d.slug)]);
      const before = await order();
      // Seed-ul demo: Verde pe Farfurie conduce la accesibilitate; Bistro Bega (sponsorizat) stă la „Declarat de local”.
      const access = before.find(([t]) => t === "accesibilitate")!;
      expect((access[1] as string[])[0]).toBe("biofresh-timisoara");
      expect(access[1]).not.toContain("vinto-gastro-wine-bar");
      expect(access[2]).toContain("vinto-gastro-wine-bar");
      const allFood = await tx.select({ id: venues.id }).from(venues).where(eq(venues.vertical, "food"));
      const now = new Date();
      await tx.insert(partnerships).values(
        allFood.map((v) => ({ venueId: v.id, plan: "highlight" as const, startsAt: new Date(now.getTime() - 86_400_000), endsAt: new Date(now.getTime() + 30 * 86_400_000), paymentStatus: "paid" as const })),
      );
      expect(await order()).toEqual(before);
    }));

  it("voturi rapide: un vot per user și tip (se schimbă), validate, agregate de la prag, fără efect asupra ordinii", () =>
    inTx(async (tx) => {
      const v = await venue(tx, "sabres-restaurant");
      const u = await newUser(tx);
      await submitQuickVote(tx, u.id, v.id, "safety", 2);
      await submitQuickVote(tx, u.id, v.id, "safety", 4);
      await submitQuickVote(tx, u.id, v.id, "noise", 1);
      expect(await tx.select().from(venueQuickVotes).where(eq(venueQuickVotes.userId, u.id))).toHaveLength(2);
      expect((await myQuickVotes(tx, u.id))[v.id]).toEqual({ safety: 4, noise: 1 });

      await expect(submitQuickVote(tx, u.id, v.id, "noise", 5)).rejects.toThrow(/de la 1 la 4/);
      await expect(submitQuickVote(tx, u.id, v.id, "safety", 0)).rejects.toThrow(/de la 1 la 5/);
      await expect(submitQuickVote(tx, u.id, v.id, "pret", 3)).rejects.toThrow(/necunoscut/);

      const page = () => venuePage(tx, { citySlug: v.citySlug, vertical: v.vertical, slug: v.slug }).then((p) => p.quick);
      expect((await page()).safety).toBeNull();
      const before = (await thematicTops(tx, { citySlug: "timisoara", vertical: "food" })).map((t) => t.community.map((c) => c.slug));
      for (let i = 0; i < 5; i++) await submitQuickVote(tx, (await newUser(tx)).id, v.id, "safety", 1);
      expect((await page()).safety).toEqual({ average: 1.5, votes: 6 });
      const after = (await thematicTops(tx, { citySlug: "timisoara", vertical: "food" })).map((t) => t.community.map((c) => c.slug));
      expect(after).toEqual(before);
    }));
});
