import { readFileSync, writeFileSync } from "node:fs";
const token = readFileSync(process.env.USERPROFILE + "/.secrets/supabase-pat", "utf8").trim();
const r = await fetch("https://api.supabase.com/v1/projects/tbrhdoszdltepmogxarv/api-keys?reveal=true", { headers: { Authorization: `Bearer ${token}` } });
const keys = await r.json();
const secret = keys.find(k => k.type === "secret")?.api_key ?? keys.find(k => k.id === "service_role")?.api_key;
writeFileSync(process.env.USERPROFILE + "/.secrets/supabase-service-role", secret);
console.log("service key saved:", secret.slice(0, 16) + "...");
