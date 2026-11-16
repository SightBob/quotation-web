// Create a dev user directly in auth.users (for testing the login flow).
// usage: node tools/supabase-mcp/create-dev-user.mjs <email> <password> [role]
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const [email, password, role = "admin"] = process.argv.slice(2);
if (!email || !password) throw new Error("usage: create-dev-user.mjs <email> <password> [role]");

const envLocal = readFileSync(".env.local", "utf8");
const projectRef = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=https:\/\/([a-z]+)\.supabase\.co/)?.[1];
const transport = new StdioClientTransport({
  command: "node",
  args: ["tools/supabase-mcp/index.mjs"],
  env: { ...process.env, SUPABASE_ACCESS_TOKEN: "", SUPABASE_PROJECT_REF: projectRef },
});
const client = new Client({ name: "auth-setup", version: "1" }, { capabilities: {} });
await client.connect(transport);

const query = `
do $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = '${email}';

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
            '${email}', crypt('${password}', gen_salt('bf')), now(), now(), now(),
            '{"provider":"email","providers":["email"],"role":"${role}"}'::jsonb, '{}'::jsonb);
  end if;

  if not exists (select 1 from auth.identities where user_id = v_id and provider = 'email') then
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_id, v_id, '${email}', jsonb_build_object('sub', v_id, 'email', '${email}', 'email_verified', true),
            'email', now(), now(), now());
  end if;
end $$;
`;

const res = await client.callTool({
  name: "execute_sql",
  arguments: { query, read_only: false },
});
console.log(res.isError ? res.content[0].text : "user created");
await client.close();
