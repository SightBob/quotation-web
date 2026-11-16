import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const envLocal = readFileSync(".env.local", "utf8");
const ref = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=https:\/\/([a-z]+)\.supabase\.co/)?.[1];
const transport = new StdioClientTransport({ command: "node", args: ["tools/supabase-mcp/index.mjs"], env: { ...process.env, SUPABASE_ACCESS_TOKEN: "", SUPABASE_PROJECT_REF: ref } });
const client = new Client({ name: "policy", version: "1" }, { capabilities: {} });
await client.connect(transport);
const q = `do $$
begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='assets insert for auth') then
    create policy "assets insert for auth" on storage.objects for insert to authenticated with check (bucket_id = 'assets');
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='assets update for auth') then
    create policy "assets update for auth" on storage.objects for update to authenticated using (bucket_id = 'assets');
  end if;
end $$;`;
const res = await client.callTool({ name: "execute_sql", arguments: { query: q } });
console.log(res.isError ? res.content[0].text : "storage policies added");
const pol = await client.callTool({ name: "execute_sql", arguments: { query: "select policyname, cmd, roles from pg_policies where tablename='objects'", read_only: true } });
console.log(pol.content[0].text);
await client.close();
