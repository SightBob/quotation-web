import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

const RETRYABLE = new Set([
  "EAI_AGAIN", // dns server failure
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "57P01", // admin shutdown
  "57P02", // crash shutdown
  "57P03", // cannot connect now
]);

function isRetryable(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return typeof code === "string" && RETRYABLE.has(code);
}

export function getDb() {
  if (db) return db;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  pool = new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 15_000 });

  // the local DNS resolver occasionally fails -> retry once before giving up
  const originalQuery = pool.query.bind(pool);
  pool.query = (async (...args: Parameters<Pool["query"]>) => {
    try {
      return await originalQuery(...args);
    } catch (err) {
      if (!isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, 400));
      return originalQuery(...args);
    }
  }) as Pool["query"];

  db = drizzle(pool, { schema });
  return db;
}

export type Db = ReturnType<typeof getDb>;
