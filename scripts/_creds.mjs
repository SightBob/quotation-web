// บัญชีสำหรับสคริปต์ทดสอบ (scripts/*.mjs)
// ปรับได้ผ่าน .env.local หรือ environment variable ตอนรัน:
//   TEST_EMAIL=friend@example.com TEST_PASSWORD='...' node scripts/ui-flow.mjs
import { readFileSync, existsSync } from "node:fs";

function fromEnvFile() {
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

const fileEnv = fromEnvFile();

export const TEST_EMAIL =
  process.env.TEST_EMAIL ?? fileEnv.TEST_EMAIL ?? "admin@quotation.local";
export const TEST_PASSWORD =
  process.env.TEST_PASSWORD ?? fileEnv.TEST_PASSWORD ?? "Quotation#2026";
