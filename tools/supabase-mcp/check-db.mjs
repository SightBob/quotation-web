import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const envLocal = readFileSync(".env.local", "utf8");
const projectRef = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=https:\/\/([a-z]+)\.supabase\.co/)?.[1];
const transport = new StdioClientTransport({ command: "node", args: ["tools/supabase-mcp/index.mjs"], env: { ...process.env, SUPABASE_ACCESS_TOKEN: "", SUPABASE_PROJECT_REF: projectRef } });
const client = new Client({ name: "check", version: "1" }, { capabilities: {} });
await client.connect(transport);
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw new Error(r.content[0].text);
  return r.content[0].text;
};
console.log("bucket:", await call("create_storage_bucket", { id: "assets", name: "assets", public: true }));
console.log("counts:", await call("execute_sql", { query: `select (select count(*) from company_settings) as settings, (select count(*) from customers) as customers, (select count(*) from products) as products, (select count(*) from storage.buckets where id='assets') as bucket, (select count(*) from pg_policies where policyname='assets public read') as policy`, read_only: true }));
console.log("settings:", await call("execute_sql", { query: "select id, name_en, tax_id, doc_no_pattern, vat_rate from company_settings", read_only: true }));
await client.close();
