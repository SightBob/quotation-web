# ระบบใบเสนอราคา (Quotation)

เว็บออกใบเสนอราคา A4 แนวตั้ง หน้าตาเหมือนเอกสารต้นฉบับ (`example quotation.jpg`)
— พิมพ์และดาวน์โหลด PDF ได้จากหน้าจอเดียวกัน

## Stack

| ส่วน | เทคโนโลยี |
| --- | --- |
| แอป | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| ฐานข้อมูล | Supabase (PostgreSQL) + Drizzle ORM |
| ยืนยันตัวตน | Supabase Auth (อีเมล/รหัสผ่าน) + `src/proxy.ts` |
| ไฟล์รูป | Supabase Storage (bucket `assets`) |
| PDF | print CSS (`@page A4`) + `puppeteer-core` เรียก Chrome ที่ติดตั้งในเครื่อง |
| ฟอนต์ | Sarabun (next/font/google) |

## เงินทั้งหมดเก็บเป็น integer สตางค์ (1 บาท = 100 สตางค์) ไม่ใช้ float

- `src/lib/money.ts` — คำนวณยอด/VAT + `bahtText()` แปลงเป็นตัวอักษรไทย (มี unit test)
- `src/lib/docno.ts` — รันเลขเอกสารจาก pattern (default `QT{YY}{MM}-{SEQ}` → `QT69011-002`)
- `src/lib/form.ts` — zod schema ของฟอร์ม + แปลง state → เอกสาร
- `src/lib/api.ts` — zod schema ของ API (เงินเป็นสตางค์เสมอ)

## ตั้งค่า (ครั้งเดียว)

> **ย้ายไปเปิดที่เครื่องใหม่ / ให้เพื่อนทำต่อ → ดู [SETUP.md](SETUP.md)** (มีขั้นตอนครบ ทั้งกรณีใช้โปรเจกต์ Supabase เดียวกัน และกรณีสร้างโปรเจกต์ใหม่ + ตารางแก้ปัญหาที่พบบ่อย)

```bash
npm install
cp .env.example .env.local     # แล้วใส่ค่าจริง
```

`.env.local` ต้องมี:

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

สร้างตาราง + ข้อมูลตัวอย่าง:

```bash
npm run setup:check           # ตรวจว่า env/DB/ตาราง พร้อมหรือยัง
npm run db:generate     # สร้าง SQL ใน ./drizzle
npm run db:migrate      # apply migration
node scripts/seed-reference.mjs   # ใส่เอกสารตัวอย่าง QT69011-002 (14 รายการ ยอด 19,160.00)
```

หรือวาง `supabase-bootstrap.sql` ใน Supabase SQL Editor แล้วกด Run
(แล้ววาง `supabase-storage.sql` เพิ่มสำหรับ bucket โลโก้/ลายเซ็น)

สร้างผู้ใช้สำหรับเข้าสู่ระบบ:

```bash
node tools/supabase-mcp/create-user.mjs you@example.com "your-password" admin
# หรือ npm run user:add -- you@example.com "your-password" admin
```

## คำสั่ง

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | เปิด dev server (http://localhost:3000) |
| `npm run setup:check` | ตรวจความพร้อม: .env.local / ต่อ DB / ตาราง / Chrome |
| `npm test` | unit test (money / bahtText / docno / form schema) |
| `npm run build` | production build |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run user:add -- <email> <password> [role]` | สร้างผู้ใช้เข้าระบบ |
| `node scripts/api-check.mjs` | ทดสอบ CRUD API ทั้งชุด |
| `node scripts/ui-flow.mjs` | ทดสอบ UI: login → สร้างใบเสนอราคา → ตรวจเอกสาร |
| `node scripts/acceptance.mjs` | ทดสอบ PDF หลายหน้า / ลากสลับรายการ / อัปโหลดโลโก้ |

## เส้นทาง (routes)

| เส้นทาง | หน้าที่ |
| --- | --- |
| `/` | รายการใบเสนอราคา (ค้นหา/กรองสถานะ) |
| `/products` | จัดการรายการสินค้า (CRUD: เพิ่ม/แก้ไข/ลบ/ค้นหา) |
| `/customers` | จัดการลูกค้า (CRUD: เพิ่ม/แก้ไข/ลบ/ค้นหา) |
| `/quotations/new` | ฟอร์ม split-view (ซ้ายฟอร์ม / ขวา preview สด) |
| `/quotations/[id]` | เปิดเอกสาร + แท็บเอกสาร/ประวัติ/ฉบับแก้ไข + ปุ่มตามสถานะ |
| `/quotations/[id]/edit` | แก้ไขเอกสาร (เฉพาะร่าง) |
| `/quotations/[id]/print` | เอกสารเต็มหน้าสำหรับพิมพ์ (PDF route ใช้หน้านี้) |
| `/settings` | ตั้งค่าบริษัท + อัปโหลดโลโก้/ลายเซ็น |
| `/login` | เข้าสู่ระบบ |
| `/api/quotations` | GET รายการ (`?allRevisions=1` = ทุกฉบับ) / POST สร้าง |
| `/api/quotations/[id]` | GET / PATCH (`action: content|status|note`) / DELETE / POST(duplicate) |
| `/api/quotations/[id]/revision` | POST สร้างฉบับแก้ไข |
| `/api/quotations/[id]/audit` | GET audit log + รายการฉบับแก้ไข |
| `/api/quotations/[id]/pdf` | ดาวน์โหลด PDF (A4) |
| `/api/products` `/api/products/[id]` | CRUD รายการสินค้า |
| `/api/customers` `/api/customers/[id]` | CRUD ลูกค้า (ลบไม่ได้ถ้าถูกอ้างอิงในเอกสาร → 409) |
| `/api/customers` `/api/settings` | ลูกค้า / ตั้งค่าบริษัท |

## สถานะเอกสาร + Revision + Audit log

สถานะ: `draft` → `sent` → `approved | rejected | expired | superseded` (ย้อนสถานะไม่ได้ ตาราง transition อยู่ที่ `src/lib/status.ts`)

| สถานะ | แก้เนื้อหา | ทำได้ |
| --- | --- | --- |
| ร่าง | ได้ | แก้ไข / ส่งแล้ว / ลบ |
| ส่งแล้ว | ไม่ได้ (409) | สร้างฉบับแก้ไข / อนุมัติ / ปฏิเสธ / พิมพ์ / คัดลอก |
| อนุมัติ / ปฏิเสธ / หมดอายุ / ถูกแทนที่ | ไม่ได้ (409) | พิมพ์ / คัดลอก |

- บังคับที่ server ทุก API (content แก้ตรง ๆ ไม่ได้, ลบไม่ได้, ย้อนสถานะไม่ได้ → 409 พร้อมข้อความไทย)
- สร้างฉบับแก้ไข: เลขต่อท้าย `-R1`, `-R2` … เก็บ `parent_id` / `revision_no` — พอฉบับใหม่ถูกส่ง ฉบับก่อนหน้าเป็น `superseded` ใน transaction เดียว
- ใบ `sent` ที่เลย `doc_date + validity_days` เปลี่ยนเป็น `expired` อัตโนมัติ (ตรวจตอนอ่าน)
- บันทึกภายใน (internal note) แก้ได้ทุกสถานะ ไม่แสดงบนเอกสาร
- ทุกการเปลี่ยนแปลงเขียน `quotation_audit_logs` (ใคร/ทำอะไร/เมื่อไหร่/ค่าก่อน-หลัง) ใน transaction เดียวกับการบันทึกหลัก
- หน้าเอกสารมีแท็บ: เอกสาร / ประวัติการเปลี่ยนแปลง / ฉบับแก้ไข (timeline คลิกเปิดฉบับเก่าได้)
- หน้ารายการแสดงเฉพาะฉบับล่าสุดเป็นค่าเริ่มต้น ติ๊ก "แสดงทุกฉบับ" เพื่อดูทั้งหมด

## MCP server (Supabase สำหรับ OpenCode)

`tools/supabase-mcp/index.mjs` — MCP stdio server เรียก Supabase Management API ด้วย PAT
(เห็นทุก org/project ของบัญชี ต่างจาก MCP ทางการที่ผูก org เดียว)

```bash
# token อยู่ที่ ~/.secrets/supabase-pat (หรือ env SUPABASE_ACCESS_TOKEN)
node tools/supabase-mcp/index.mjs
```

ลงทะเบียนใน `~/.config/opencode/opencode.json`:

```json
"supabase-local": {
  "type": "local",
  "command": ["node", "<path>/tools/supabase-mcp/index.mjs"],
  "environment": { "SUPABASE_PROJECT_REF": "<project-ref>" },
  "enabled": true
}
```

เครื่องมือ: `list_organizations`, `list_projects`, `get_project`, `list_tables`,
`execute_sql`, `apply_migration`, `list_migrations`, `get_api_keys`, `get_advisors`,
`create_storage_bucket`

## ข้อควรรู้

- ตารางสินค้า/รายการเก็บ snapshot ของข้อมูลลูกค้าและราคา ณ วันที่ออกเอกสาร เอกสารเก่าจะไม่เปลี่ยนตาม master data
- เลขเอกสารรันจากตาราง `doc_counters` (แยกนับต่อ ปี+เดือน) ใน transaction เดียวกับที่บันทึกเอกสาร
- ลบเป็น soft delete (`deleted_at`)
- PDF ใช้ Chrome ที่ติดตั้งในเครื่อง (กำหนด path ได้ด้วย env `CHROME_PATH`)
- บทบาท: `staff` ใช้งานได้ทั่วไป, `admin` (ตั้งใน Supabase Dashboard → app_metadata.role) ปรับสิทธิ์ได้
