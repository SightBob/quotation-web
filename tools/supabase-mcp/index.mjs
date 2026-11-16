#!/usr/bin/env node
/**
 * Supabase MCP server for OpenCode (local, stdio).
 *
 * Uses a Supabase Personal Access Token (PAT) -> sees every org/project of the
 * account (unlike the hosted OAuth MCP which is bound to one org session).
 *
 * Token resolution order:
 *   1. env SUPABASE_ACCESS_TOKEN
 *   2. first line of ~/.secrets/supabase-pat  (or %USERPROFILE%\.secrets\supabase-pat)
 *
 * Default project ref: env SUPABASE_PROJECT_REF
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const API = "https://api.supabase.com/v1";

function readToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  const file = join(homedir(), ".secrets", "supabase-pat");
  if (existsSync(file)) return readFileSync(file, "utf8").trim().split(/\r?\n/)[0];
  throw new Error(
    "SUPABASE_ACCESS_TOKEN not set and no ~/.secrets/supabase-pat file. Create a PAT at https://supabase.com/dashboard/account/tokens",
  );
}

const TOKEN = readToken();
const DEFAULT_REF = process.env.SUPABASE_PROJECT_REF || "";

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}: ${text.slice(0, 800)}`);
  }
  return data;
}

const ref = (given) => given || DEFAULT_REF;

const TOOLS = [
  {
    name: "list_organizations",
    description: "List all Supabase organizations the token belongs to.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_projects",
    description: "List all Supabase projects visible to the token.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_project",
    description: "Get one project by ref (or the default project).",
    inputSchema: { type: "object", properties: { ref: { type: "string" } } },
  },
  {
    name: "list_tables",
    description: "List tables of a project with row counts and RLS state.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string" },
        schemas: { type: "array", items: { type: "string" }, default: ["public"] },
      },
    },
  },
  {
    name: "execute_sql",
    description: "Run raw SQL on a project database (DDL/DML). Use apply_migration for schema changes.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string" },
        query: { type: "string" },
        read_only: { type: "boolean", default: false },
      },
      required: ["query"],
    },
  },
  {
    name: "apply_migration",
    description: "Apply a named SQL migration to a project database.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string" },
        name: { type: "string" },
        query: { type: "string" },
        rollback: { type: "string" },
      },
      required: ["name", "query"],
    },
  },
  {
    name: "list_migrations",
    description: "List applied migrations of a project.",
    inputSchema: { type: "object", properties: { ref: { type: "string" } } },
  },
  {
    name: "get_api_keys",
    description: "Get publishable/secret API keys of a project.",
    inputSchema: {
      type: "object",
      properties: { ref: { type: "string" }, reveal: { type: "boolean", default: false } },
    },
  },
  {
    name: "get_advisors",
    description: "Get security/performance/health advisors for a project.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string" },
        type: { type: "string", enum: ["security", "performance", "health"] },
      },
      required: ["type"],
    },
  },
  {
    name: "create_storage_bucket",
    description: "Create a storage bucket (public read by default).",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string" },
        id: { type: "string" },
        name: { type: "string" },
        public: { type: "boolean", default: true },
      },
      required: ["id", "name"],
    },
  },
];

const server = new Server(
  { name: "supabase-local", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    let result;
    switch (name) {
      case "list_organizations":
        result = await api("GET", "/organizations");
        break;
      case "list_projects":
        result = await api("GET", "/projects");
        break;
      case "get_project":
        result = await api("GET", `/projects/${ref(args.ref)}`);
        break;
      case "list_tables": {
        const schemas = args.schemas ?? ["public"];
        const list = schemas.map((s) => `'${s.replace(/'/g, "''")}'`).join(",");
        const rows = await api("POST", `/projects/${ref(args.ref)}/database/query`, {
          query: `select c.relname as table, n.nspname as schema,
             (select count(*) from pg_class c2 where c2.relname = c.relname) is not null as exists,
             c.relrowsecurity as rls_enabled,
             coalesce(c.reltuples::bigint, 0) as approx_rows
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname in (${list}) and c.relkind in ('r','p')
           order by n.nspname, c.relname;`,
          read_only: true,
        });
        result = rows;
        break;
      }
      case "execute_sql":
        result = await api("POST", `/projects/${ref(args.ref)}/database/query`, {
          query: args.query,
          read_only: args.read_only ?? false,
        });
        break;
      case "apply_migration":
        result = await api("POST", `/projects/${ref(args.ref)}/database/migrations`, {
          name: args.name,
          query: args.query,
          rollback: args.rollback,
        });
        break;
      case "list_migrations":
        result = await api("GET", `/projects/${ref(args.ref)}/database/migrations`);
        break;
      case "get_api_keys":
        result = await api("GET", `/projects/${ref(args.ref)}/api-keys?reveal=${args.reveal ? "true" : "false"}`);
        break;
      case "get_advisors":
        result = await api("GET", `/projects/${ref(args.ref)}/advisors/${args.type}`);
        break;
      case "create_storage_bucket": {
        // management API only exposes GET for buckets -> create via SQL
        result = await api("POST", `/projects/${ref(args.ref)}/database/query`, {
          query: `insert into storage.buckets (id, name, public, file_size_limit)
                  values ('${args.id}', '${args.name}', ${args.public ?? true}, 5242880)
                  on conflict (id) do update set public = excluded.public;`,
        });
        break;
      }
      default:
        throw new Error(`unknown tool: ${name}`);
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: String(err?.message ?? err) }],
    };
  }
});

await server.connect(new StdioServerTransport());
