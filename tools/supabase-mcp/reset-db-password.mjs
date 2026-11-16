import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const token = readFileSync(process.env.USERPROFILE + "/.secrets/supabase-pat", "utf8").trim();
const ref = "tbrhdoszdltepmogxarv";

// url-safe password (no chars that need escaping in a connection string)
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const pw = Array.from(randomBytes(24)).map((b) => alphabet[b % alphabet.length]).join("");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/password`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ password: pw }),
});
console.log("reset status:", res.status, (await res.text()).slice(0, 200));

const url = `postgresql://postgres.${ref}:${pw}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;
const envPath = ".env.local";
const env = readFileSync(envPath, "utf8");
writeFileSync(envPath, `${env.trim()}\nDATABASE_URL=${url}\n`);
writeFileSync(process.env.USERPROFILE + "/.secrets/supabase-db-password", pw, { mode: 0o600 });
console.log("DATABASE_URL written");
