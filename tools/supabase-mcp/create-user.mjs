// สร้างผู้ใช้เข้าระบบผ่าน Supabase Auth Admin API (ต้องใช้ service-role key)
// usage: node tools/supabase-mcp/create-user.mjs <email> <password> [role]
//   role: admin (ค่าเริ่มต้น) | staff
// ต้องมี service-role key อย่างใดอย่างหนึ่ง:
//   1) .env.local  ->  SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
//   2) environment  ->  SUPABASE_SERVICE_ROLE_KEY=... (หรือ SUPABASE_ACCESS_TOKEN)
//   3) ไฟล์ลับในเครื่อง  ->  ~/.secrets/supabase-service-role
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const [email, password, role = "admin"] = process.argv.slice(2);
if (!email || !password) {
  throw new Error("usage: create-user.mjs <email> <password> [admin|staff]");
}

function envFromFile() {
  if (!existsSync(".env.local")) return {};
  const out = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const fileEnv = envFromFile();
const projectUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;

const secretFile = join(homedir(), ".secrets", "supabase-service-role");
const secret =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  fileEnv.SUPABASE_SERVICE_ROLE_KEY ??
  (existsSync(secretFile) ? readFileSync(secretFile, "utf8").trim() : undefined);

if (!projectUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL not found (.env.local)");
if (!secret) {
  throw new Error(
    "service-role key not found -> ใส่ SUPABASE_SERVICE_ROLE_KEY ใน .env.local " +
      "(Supabase -> Project Settings -> API -> Secret key / service_role)",
  );
}

const res = await fetch(`${projectUrl}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
    app_metadata: { role, provider: "email", providers: ["email"] },
  }),
});
const body = await res.json();
console.log(res.status, JSON.stringify(body).slice(0, 400));
if (!res.ok) process.exitCode = 1;
else console.log(`สร้างผู้ใช้ ${email} (role: ${role}) เรียบร้อย`);
