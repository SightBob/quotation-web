// Apply schema + seed to the project through the local Supabase MCP server.
// usage: node tools/supabase-mcp/apply-bootstrap.mjs
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// project ref from .env.local (NEXT_PUBLIC_SUPABASE_URL -> ref)
const envLocal = readFileSync(".env.local", "utf8");
const projectRef = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=https:\/\/([a-z]+)\.supabase\.co/)?.[1];
if (!projectRef) throw new Error("project ref not found in .env.local");

const transport = new StdioClientTransport({
  command: "node",
  args: ["tools/supabase-mcp/index.mjs"],
  env: { ...process.env, SUPABASE_ACCESS_TOKEN: "", SUPABASE_PROJECT_REF: projectRef },
});
const client = new Client({ name: "bootstrap", version: "1" }, { capabilities: {} });
await client.connect(transport);

const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  if (res.isError) throw new Error(res.content[0].text);
  return res.content[0].text;
};

const strip = (p) => readFileSync(p, "utf8").replace(/^--> statement-breakpoint\s*$/gm, "");

// 1) schema (only if not applied yet)
const tables = JSON.parse(await call("list_tables", { schemas: ["public"] }));
const hasSchema = tables.some((t) => t.table === "quotations");
if (hasSchema) {
  console.log("schema already applied, skipping");
} else {
  console.log("migration init_schema ...");
  await call("apply_migration", { name: "init_schema", query: strip("drizzle/0000_init.sql") });
  await new Promise((r) => setTimeout(r, 1200)); // migration versions are second-resolution
}

// 2) seed data
console.log("seeding ...");
await call("execute_sql", { query: readFileSync("supabase-seed.sql", "utf8") });

// 3) storage bucket + public read policy
console.log("storage bucket ...");
try {
  console.log(await call("create_storage_bucket", { id: "assets", name: "assets", public: true }));
} catch (e) {
  console.log("bucket:", String(e.message).slice(0, 120));
}
await call("execute_sql", {
  query: `do $$ begin
    if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'assets public read') then
      create policy "assets public read" on storage.objects for select using (bucket_id = 'assets');
    end if;
  end $$;`,
});

console.log("tables:");
console.log(await call("list_tables", { schemas: ["public"] }));

await client.close();
