import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/sitecraft";

if (!process.env.DATABASE_URL) {
  console.warn("[@workspace/db] WARNING: DATABASE_URL not set — initialized in fallback mode");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
