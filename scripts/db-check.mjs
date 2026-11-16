import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
const url = readFileSync(".env.local", "utf8").match(/DATABASE_URL=(.*)/)[1].trim();
const db = drizzle(new Pool({ connectionString: url }));
const rows = await db.execute(sql`insert into doc_counters (prefix, last_seq) values (${"QT69011"}, 1) on conflict (prefix) do update set last_seq = doc_counters.last_seq + 1, updated_at = now() returning last_seq`);
console.log("typeof:", Array.isArray(rows) ? "array" : typeof rows);
console.log("raw:", JSON.stringify(rows));
await db.transaction(async (tx) => {
  const r = await tx.execute(sql`insert into doc_counters (prefix, last_seq) values (${"QT69011"}, 1) on conflict (prefix) do update set last_seq = doc_counters.last_seq + 1, updated_at = now() returning last_seq`);
  console.log("in tx raw:", JSON.stringify(r));
});
process.exit(0);
