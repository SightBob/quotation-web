# คู่มือส่งมอบโปรเจกต์ให้เพื่อน (เริ่มใช้งานได้โดยไม่มีปัญหา)

คู่มือนี้เขียนสำหรับ "คนที่ได้รับโปรเจกต์นี้ไปแก้ต่อ" — ทำตามทีละขั้น ถ้าติดอะไร
ให้ดูหัวข้อ [แก้ปัญหาที่พบบ่อย](#แก้ปัญหาที่พบบ่อย) ท้ายไฟล์

---

## 0. ส่งมอบให้เพื่อน (ฝั่งเจ้าของ — ทำตามลำดับนี้ 4 ข้อ)

1. **โค้ด** — repo อยู่ที่ `github.com/SightBob/quotation-web` (private)
   → Settings → Collaborators → Add people → เชิญเพื่อน (ส่งลิงก์ invite)
   หรือส่งไฟล์ zip (ไม่รวม `node_modules`, `.next`, `.env.local`)

2. **ฐานข้อมูล** — เลือก 1 อย่าง
   - **แชร์โปรเจกต์เดิม** (แนะนำ ข้อมูลเดียวกัน): Supabase Dashboard → Organization →
     Members → Invite member (อีเมลเพื่อน) แล้วให้เพื่อนตั้ง DB password ของตัวเอง
   - **แยกโปรเจกต์** (ข้อมูลแยก): ให้เพื่อนสร้างใหม่ตามหัวข้อ 3 กรณี B

3. **ส่งค่า `.env.local`** — ส่งให้เพื่อนทางช่องทางที่ปลอดภัย (เช่น 1Password /
   Google Drive ส่วนตัว / ส่งในแชทส่วนตัว) **อย่าส่งใน repo**
   เนื้อหาที่ต้องส่ง:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   DATABASE_URL=postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

   (ถ้าใช้โปรเจกต์เดียวกัน ให้เพื่อนตั้ง DB password ใหม่เองแล้วใส่ค่านั้นแทน —
   ทำให้แต่ละคนมีรหัสผ่านของตัวเอง ไม่ต้องแชร์รหัสกัน)

4. **บัญชีเข้าใช้งาน** — ให้เพื่อนสร้างเองที่ Supabase → Authentication → Users →
   Add user (หัวข้อ 4) หรือรัน `npm run user:add -- <email> <password> admin`

> หลังจากนั้นเพื่อนทำตามหัวข้อ 1 → 5 ได้เลย

---

## 0. สรุปสั้น ๆ (ข้อมูลที่ต้องขอจากเจ้าของโปรเจกต์)

| ต้องการ | ที่ไหน | หมายเหตุ |
| --- | --- | --- |
| โค้ดโปรเจกต์ | GitHub (private repo) | หรือ zip ไฟล์ (ดูหัวข้อ 1) |
| Supabase project ref | เช่น `tbrhdoszdltepmogxarv` | ถ้าใช้โปรเจกต์เดียวกัน |
| รหัสผ่านฐานข้อมูล (DB password) | Supabase → Settings → Database | ใช้ต่อใน `DATABASE_URL` |
| Publishable key | Supabase → Settings → API | `sb_publishable_...` |
| Service-role key (ถ้าจะสร้างผู้ใช้เอง) | Supabase → Settings → API → Secret key | ไม่ commit ขึ้น git |
| บัญชีเข้าใช้งาน | email + password | สร้างเองได้ (หัวข้อ 4) |

> **สำคัญ:** ไม่มีไฟล์ไหนในโปรเจกต์เก็บรหัสจริง — `.env.local` ถูก `.gitignore` ไว้
> ทุกคนต้องสร้าง `.env.local` ของตัวเอง ถ้าใครเจอไฟล์นี้ใน git → ถือว่ารหัสหลุด
> ให้ไปเปลี่ยนรหัสทันที

---

## 1. เอาโค้ดมายังไง

### วิธีที่ 1: Git (แนะนำ)

```bash
git clone <url ของ repo>
cd Quotation
```

### วิธีที่ 2: ไฟล์ zip

คัดลอกทั้งโฟลเดอร์ (ยกเว้น `node_modules`, `.next`, `.env.local`) แล้วแตกไฟล์

```bash
npm install
```

> ต้องใช้ **Node.js 20 ขึ้นไป** (`node -v`)
> ต้องใช้ **npm 10 ขึ้นไป** (มากับ Node 20/22)

---

## 2. ตั้งค่า .env.local

```bash
cp .env.example .env.local      # macOS / Linux / Git Bash
Copy-Item .env.example .env.local   # PowerShell
```

แก้ค่าใน `.env.local` (ชื่อตัวแปรต้องตรงตามนี้ทุกตัว):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

- `DATABASE_URL` ดูได้ที่ **Supabase → Project Settings → Database → Connection string → URI**
  (แนะนำแบบ **Session pooler**, port `5432`; Transaction pooler port `6543` ก็ใช้ได้)
- รหัสผ่านใน URL คือ **รหัสผ่านของโปรเจกต์** ไม่ใช่ Personal Access Token
- ถ้าขีดพิมพ์/สัญลักษณ์เฉพาะของ `:` หรือ `@` ในรหัสผ่าน ให้ URL-encode ก่อน

---

## 3. เตรียมฐานข้อมูล

### กรณี A — ใช้โปรเจกต์ Supabase เดียวกับเจ้าของ (เร็วที่สุด แนะนำ)

เจ้าของต้องเชิญคุณเข้าโปรเจกต์ก่อน:

1. เจ้าของ: Supabase Dashboard → Organization → **Members** → Invite member (อีเมลคุณ)
2. คุณ: รับอีเมลเชิญ → เข้า Dashboard ได้
3. คุณ: ที่หน้า Database สร้าง **database password ใหม่ของคุณ** แล้วเอาไปใส่ใน `.env.local`
4. รันคำสั่งด้านล่าง (จะไม่ทำอะไรกับข้อมูลเดิม เพราะ migration ถูก apply ไว้แล้ว)

```bash
npm run db:migrate     # apply migration ที่ยังไม่ถูก apply (ปลอดภัยถ้าเคย apply แล้ว)
npm run setup:check    # ตรวจว่า env/DB/ตาราง พร้อมหรือยัง
```

> การใช้โปรเจกต์เดียวกัน = เห็นข้อมูลเอกสารเดียวกันทั้งทีม
> ถ้าไม่อยากให้แตะข้อมูลจริง ให้ใช้กรณี B

### กรณี B — เพื่อนสร้างโปรเจกต์ Supabase ใหม่ (ข้อมูลแยกกัน)

1. เพื่อนสร้างโปรเจกต์ใหม่ที่ <https://supabase.com/dashboard>
2. ตั้ง database password, จด **project ref** ไว้
3. ใส่ค่าใน `.env.local` (หัวข้อ 2)
4. สร้าง schema 2 วิธี เลือกอย่างใดอย่างหนึ่ง

   **วิธีที่ 1 (แนะนำ — ใช้ migration ตัวเดียวกับ production)**

   ```bash
   npm run db:migrate
   ```

   **วิธีที่ 2 — SQL Editor**

   Supabase Dashboard → SQL Editor → New query → วางเนื้อหาไฟล์ `supabase-bootstrap.sql`
   → Run (ไฟล์นี้มี schema + ข้อมูลตั้งต้น + storage bucket ครบ)

5. สร้าง bucket/policy สำหรับโลโก้และลายเซ็น

   วางเนื้อหาไฟล์ `supabase-storage.sql` ใน Supabase SQL Editor → Run
   (รันซ้ำได้ ไม่พัง)

6. (ทางเลือก) ใส่ข้อมูลตัวอย่าง สินค้า 14 รายการ + ลูกค้า 3 รายการ + เอกสารตัวอย่าง

   ```bash
   node scripts/seed-reference.mjs
   ```

---

## 4. สร้างบัญชีเข้าใช้งาน

วิธีที่ 1 — ผ่าน Supabase Dashboard (ไม่ต้องใช้ key ลับ)

1. Supabase → Authentication → **Users** → Add user → Email + Password
2. กด Confirm email ให้เรียบร้อย

วิธีที่ 2 — ผ่านสคริปต์ (ตั้ง role ให้ด้วย)

```bash
# ใส่ SUPABASE_SERVICE_ROLE_KEY ใน .env.local ก่อน
node tools/supabase-mcp/create-user.mjs you@example.com "your-password" admin
```

> สคริปต์ทดสอบใน `scripts/*.mjs` จะล็อกอินด้วยบัญชีที่ตั้งไว้ใน `.env.local`:
> ```
> TEST_EMAIL=you@example.com
> TEST_PASSWORD=your-password
> ```
> (ถ้าไม่ใส่ จะใช้ค่าเริ่มต้น `admin@quotation.local` / `Quotation#2026`)

---

## 5. เริ่มใช้งาน

```bash
npm run setup:check   # ควรขึ้น "ผ่านทั้งหมด"
npm run dev           # http://localhost:3000
```

คำสั่งอื่นที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | build + โหลดแบบ production |
| `npm test` | unit test (เงิน/bahtText/เลขเอกสาร/schema ฟอร์ม) |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run db:generate` | สร้าง migration ใหม่หลังแก้ `src/lib/db/schema.ts` |
| `npm run db:migrate` | apply migration |
| `npm run user:add -- email pw admin` | สร้างผู้ใช้ |

---

## 6. ปุ่ม "ดาวน์โหลด PDF" (ต้องมี Google Chrome)

ระบบสร้าง PDF ด้วย Chrome ที่ติดตั้งในเครื่อง (`puppeteer-core`)

- ถ้าติดตั้ง Chrome ไว้ตามปกติ → ใช้ได้เลย ระบบจะเดาที่อยู่ให้
- ถ้าไม่มี / อยู่ผิดที่ → ใส่ใน `.env.local`

  ```env
  # Windows
  CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
  # macOS
  CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
  # Linux
  CHROME_PATH=/usr/bin/google-chrome
  ```

- ถ้าไม่มี Chrome: **หน้าพิมพ์ยังใช้ได้** (Ctrl+P → Save as PDF) แต่ปุ่มดาวน์โหลดจะ error

---

## 7. แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing` | ยังไม่ได้สร้าง `.env.local` หรือชื่อตัวแปรพิมพ์ผิด (ต้องเป็น `PUBLISHABLE_KEY` ไม่ใช่ `ANON_KEY`) |
| เด้งกลับหน้า `/login` ตลอด | session ไม่ถูกต้อง → ล้าง cookie ของ `localhost` แล้วล็อกอินใหม่ |
| `login failed` / `Invalid login credentials` | ยังไม่ได้สร้าง user ใน Supabase Auth หรือยังไม่ confirm email |
| `getaddrinfo EAI_AGAIN ...pooler.supabase.com` | DNS ของเครื่องสั่นชั่วคราว → ลองใหม่ หรือเปลี่ยน `DATABASE_URL` ไปใช้โดเมนตรง `db.<ref>.supabase.co:5432` (แต่ต้องเปิด direct connection ใน Supabase) |
| `relation "quotations" does not exist` | ยังไม่ได้ apply schema → `npm run db:migrate` |
| หน้าจอ error น้ำเต้มจอตอนเข้าเว็บ | ดู log ของ dev server (`npm run dev` ในเทอร์มินัล) มักเป็น error ต่อ DB ข้างบน |
| ภาษาไทยใน PDF เป็นกล่องสี่เหลี่ยม | Chrome ที่ใช้ยังไม่ได้ cache ฟอนต์ Sarabun → ปิด/เปิด Chrome ใหม่ หรือรัน `npm run dev` ใหม่ |
| โลโ้/ลายเซ็นไม่ขึ้น | ยังไม่ได้สร้าง storage bucket `assets` → รัน `supabase-storage.sql` ใน SQL Editor แล้วอัปโหลดใหม่ที่หน้า `/settings` |
| ลืมรหัสผ่าน DB | Supabase → Settings → Database → Reset password แล้วแก้ใน `.env.local` |

---

## 8. กฎการทำงานร่วมกับเจ้าของโปรเจกต์

1. **อย่า commit `.env.local`** (อยู่ใน `.gitignore` แล้ว) และอย่าส่ง key ทางแชท/อีเมล
2. **แก้ schema ต้องมี migration** — แก้ `src/lib/db/schema.ts` → `npm run db:generate` →
   commit ไฟล์ใน `drizzle/` → บอกเจ้าของให้รัน `npm run db:migrate`
3. **commit แยก feature** เพื่อให้ merge ง่าย
4. **รหัสผ่านจริงของผู้ใช้** (`admin@quotation.local` / `Quotation#2026` ในระบบทดสอบ)
   ต้องเปลี่ยนก่อนขึ้นใช้งานจริง
5. สคริปต์ทดสอบลบข้อมูลทดสอบเองหลังรันเสร็จ: `node scripts/cleanup-test-data.mjs`

---

## 9. โครงสร้างโปรเจกต์แบบย่อ

```
src/
  app/                  หน้าและ API routes (Next.js App Router)
  components/
    doc/                ตัวเอกสาร A4 (QuotationDoc) + CSS สำหรับพิมพ์
    form/               ฟอร์มสร้าง/แก้ไข + preview
    quotation/          ปุ่มตามสถานะ, แท็บประวัติ, badge
    products/ customers/  หน้า CRUD ข้อมูลหลัก
  lib/
    money.ts            เงินเป็น integer สตางค์ + bahtText
    status.ts           state machine ของสถานะเอกสาร
    docno.ts            เลขเอกสาร QT{YY}{MM}-{SEQ}
    db/                 Drizzle schema + queries
drizzle/                migration files
scripts/                สคริปต์ทดสอบ/ตรวจระบบ
supabase-bootstrap.sql  schema + seed + storage (สำหรับโปรเจกต์ใหม่)
example quotation.jpg   ตัวอย่างที่ออกแบบตาม
```
