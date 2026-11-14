import { describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { createDb, users, venues, type Db } from "@tftd/db";
import { completeThemedTour, userBadges } from "./badges.ts";
import { checkInAtVenue } from "./visits.ts";

/** Pe baza locală (după `npm run seed` + `npm run db:migrate`), într-o tranzacție anulată. Fără DATABASE_URL e sărit. */
describe.skipIf(!process.env.DATABASE_URL)("ștampila turului tematic (pe baza de date)", () => {
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
  async function setup(db: Db) {
    const stops = await db.select({ id: venues.id }).from(venues).where(inArray(venues.slug, ["darc-pe-mal", "aethernativ-cafe", "beraria-700"]));
    if (stops.length !== 3) throw new Error("Rulează întâi `npm run seed`.");
    const [user] = await db.insert(users).values({ username: `tur${Date.now()}`, displayName: "Test Tur" }).returning();
    return { ids: stops.map((s) => s.id), userId: user!.id };
  }

  it("refuză fără check-in la fiecare oprire și acordă o singură dată cu toate", async () => {
    await inTx(async (db) => {
      const { ids, userId } = await setup(db);
      const now = new Date();
      await checkInAtVenue(db, userId, ids[0]!, { simulate: true }, now);
      await checkInAtVenue(db, userId, ids[1]!, { simulate: true }, now);
      await expect(completeThemedTour(db, userId, "bere-pe-bega", ids, now)).rejects.toMatchObject({ code: "invalid" });
      expect((await userBadges(db, userId)).tourBadges).toEqual([]);

      await checkInAtVenue(db, userId, ids[2]!, { simulate: true }, now);
      expect(await completeThemedTour(db, userId, "bere-pe-bega", ids, now)).toMatchObject({ awarded: true });
      expect(await completeThemedTour(db, userId, "bere-pe-bega", ids, now)).toMatchObject({ awarded: false });
      expect((await userBadges(db, userId)).tourBadges.map((b) => b.slug)).toEqual(["bere-pe-bega"]);
    });
  });

  it("refuză tururile construite de user, opririle repetate și check-in-urile vechi", async () => {
    await inTx(async (db) => {
      const { ids, userId } = await setup(db);
      const now = new Date();
      for (const id of ids) await checkInAtVenue(db, userId, id, { simulate: true }, new Date(now.getTime() - 3 * 86_400_000));
      await expect(completeThemedTour(db, userId, "turul-meu", ids, now)).rejects.toMatchObject({ code: "invalid" });
      await expect(completeThemedTour(db, userId, "bere-pe-bega", [ids[0]!, ids[0]!, ids[1]!], now)).rejects.toMatchObject({ code: "invalid" });
      await expect(completeThemedTour(db, userId, "bere-pe-bega", ids, now)).rejects.toThrow(/check-in/);
    });
  });

  it("refuză localurile din afara temei, chiar cu check-in la toate", async () => {
    await inTx(async (db) => {
      const { userId } = await setup(db);
      const food = await db.select({ id: venues.id }).from(venues).where(inArray(venues.slug, ["casa-bunicii", "restaurant-nora", "little-hanoi"]));
      const now = new Date();
      for (const { id } of food) await checkInAtVenue(db, userId, id, { simulate: true }, now);
      await expect(completeThemedTour(db, userId, "bere-pe-bega", food.map((v) => v.id), now)).rejects.toThrow(/nu se potrivesc/);
      expect(await completeThemedTour(db, userId, "turul-ciorbelor", food.map((v) => v.id), now)).toMatchObject({ awarded: true });
    });
  });
});
