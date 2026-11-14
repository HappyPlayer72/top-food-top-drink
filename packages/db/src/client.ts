import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export type Db = ReturnType<typeof createDb>;

/**
 * Conexiunea la Postgres. Prin pool-uri tip PgBouncer (Neon „-pooler”, Supabase port 6543) prepared
 * statements nu merg, deci le oprim automat; DATABASE_PREPARE=false le oprește explicit.
 * Pe serverless (Vercel), DATABASE_POOL_MAX mic (ex. 3) evită prea multe conexiuni simultane.
 */
export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL lipsește. Copiază .env.example în .env.");
  const pooled = /-pooler\.|pgbouncer=true|:6543\//.test(url);
  const client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    prepare: process.env.DATABASE_PREPARE === "false" ? false : !pooled,
  });
  return drizzle(client, { schema, casing: "snake_case" });
}
