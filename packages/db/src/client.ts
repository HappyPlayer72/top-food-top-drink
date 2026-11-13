import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export type Db = ReturnType<typeof createDb>;

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL lipsește. Copiază .env.example în .env.");
  const client = postgres(url, { max: 10 });
  return drizzle(client, { schema, casing: "snake_case" });
}
