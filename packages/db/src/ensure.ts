import { sql } from "drizzle-orm";
import type { Db } from "./client.ts";

const ensuredDbs = new WeakMap<object, Promise<void>>();

/**
 * Asigură idempotent tabelele și coloanele adăugate ulterior schemei inițiale,
 * fără a depinde de rularea manuală a `drizzle-kit push`.
 * Returnează imediat pentru obiecte mock din teste unitare fără `.execute`.
 */
export async function ensureExtendedSchema(db: Db): Promise<void> {
  const exec = (db as unknown as { execute?: (q: ReturnType<typeof sql>) => Promise<unknown> }).execute;
  if (typeof exec !== "function") return;

  const existing = ensuredDbs.get(db as unknown as object);
  if (existing) return existing;

  const promise = (async () => {
    await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS receipt_photo_url text`);
    await db.execute(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS receipt_status text`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS saved_venues (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        venue_slug text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, venue_slug)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS venue_views_daily (
        venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        day date NOT NULL,
        views integer NOT NULL DEFAULT 0,
        PRIMARY KEY (venue_id, day)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS venue_score_snapshots (
        venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        day date NOT NULL,
        score real NOT NULL,
        review_count integer NOT NULL DEFAULT 0,
        PRIMARY KEY (venue_id, day)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moderation_decisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        target_type text NOT NULL,
        target_id text NOT NULL,
        decision text NOT NULL,
        decided_by uuid REFERENCES users(id),
        decided_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  })().catch((err) => {
    ensuredDbs.delete(db as unknown as object);
    throw err;
  });

  ensuredDbs.set(db as unknown as object, promise);
  return promise;
}
