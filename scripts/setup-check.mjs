// ตรวจความพร้อมของเครื่องก่อนเปิดโปรเจกต์:  npm run setup:check
// อ่าน .env.local, ต่อ DB, เช็คว่า schema มีครบ และหา Chrome สำหรับทำ PDF
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const fail = [];
const warn = [];
const ok = (m) => console.log(`  [ok]   ${m}`);
const bad = (m) => {
  fail.push(m);
  console.log(`  [FAIL] ${m}`);
};
const mid = (m) => {
  warn.push(m);
  console.log(`  [warn] ${m}`);
};

console.log("\n=== ตรวจไฟล์ .env.local ===");
if (!existsSync(".env.local")) {
  bad("ไม่พบ .env.local -> คัดลอกจาก .env.example (cp .env.example .env.local) แล้วแก้ค่า");
} else {
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.trim().startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "DATABASE_URL",
  ];
  for (const key of required) {
    const v = env[key];
    if (!v) bad(`ขาด ${key}`);
    else if (v.includes("<") || v.includes("...")) bad(`${key} ยังเป็นค่าตัวอย่าง (${v})`);
    else ok(`${key} = ${key === "DATABASE_URL" ? v.replace(/:[^:@]+@/, ":***@") : v}`);
  }

  console.log("\n=== ทดสอบการเชื่อมต่อฐานข้อมูล ===");
  if (env.DATABASE_URL && !env.DATABASE_URL.includes("<")) {
    const db = new Client({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: 20_000,
    });
    try {
      await db.connect();
      ok("เชื่อมต่อ PostgreSQL ได้");
      const tables = [
        "quotations",
        "quotation_items",
        "quotation_audit_logs",
        "customers",
        "products",
        "company_settings",
        "doc_counters",
      ];
      const { rows } = await db.query(
        "select table_name from information_schema.tables where table_schema='public' and table_name = any($1::text[])",
        [tables],
      );
      const found = new Set(rows.map((r) => r.table_name));
      const missing = tables.filter((t) => !found.has(t));
      if (missing.length) {
        bad(`ยังไม่มีตาราง: ${missing.join(", ")} -> รัน npm run db:migrate`);
      } else {
        ok(`ครบทั้ง ${tables.length} ตาราง`);
      }
      for (const t of ["quotations", "customers", "products"]) {
        const r = await db.query(`select count(*)::int n from ${t}`);
        console.log(`         ${t}: ${r.rows[0].n} แถว`);
      }
    } catch (e) {
      bad(`ต่อ DB ไม่สำเร็จ: ${e.message}`);
      if (String(e.message).includes("EAI_AGAIN")) {
        mid("DNS ของเครื่องสั่นชั่วคราว -> ลองใหม่อีกครั้ง หรือเปลี่ยน DATABASE_URL ไปใช้โดเมนตรง db.<ref>.supabase.co");
      }
    } finally {
      await db.end().catch(() => {});
    }
  }

  console.log("\n=== ทดสอบ Supabase Auth (URL) ===");
  if (env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL.includes("<")) {
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
        headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) ok("Supabase Auth ตอบกลับปกติ");
      else mid(`Supabase Auth ตอบ ${res.status} (เช็ค URL / key)`);
    } catch (e) {
      mid(`ต่อ Supabase Auth ไม่สำเร็จ: ${e.message}`);
    }
  }
}

console.log("\n=== ตรวจ Google Chrome (สำหรับปุ่ม PDF) ===");
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const chrome = chromeCandidates.find((p) => existsSync(p));
if (chrome) ok(`พบ Chrome: ${chrome}`);
else mid("ไม่พบ Chrome -> ปุ่ม 'ดาวน์โหลด PDF' จะใช้ไม่ได้ (หน้าพิมพ์ยังใช้ได้) หรือใส่ CHROME_PATH ใน .env.local");

console.log("\n=== สรุป ===");
console.log(`  ผ่าน ${fail.length === 0 ? "ทั้งหมด" : "มีบางส่วนต้องแก้"}`);
if (fail.length) {
  console.log("  แก้ตามรายการ [FAIL] แล้วรันซ้ำ:  npm run setup:check");
  process.exitCode = 1;
} else {
  console.log("  เริ่มใช้งานได้:  npm run dev   ->  http://localhost:3000");
}
if (warn.length) console.log(`  มี ${warn.length} ข้อเตือน (ไม่ทำให้ระบบพัง)`);
console.log("");
