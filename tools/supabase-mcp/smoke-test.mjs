import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const transport = new StdioClientTransport({
  command: "node",
  args: ["tools/supabase-mcp/index.mjs"],
  env: { ...process.env, SUPABASE_ACCESS_TOKEN: "" },
});
const client = new Client({ name: "t", version: "1" }, { capabilities: {} });
await client.connect(transport);
const orgs = await client.callTool({ name: "list_organizations", arguments: {} });
console.log("ORGS:", orgs.content[0].text.slice(0, 600));
const proj = await client.callTool({ name: "list_projects", arguments: {} });
console.log("PROJECTS:", proj.content[0].text.slice(0, 1200));
await client.close();
