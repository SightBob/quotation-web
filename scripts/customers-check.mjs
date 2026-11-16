// Customers CRUD: API + UI + protection against deleting a customer in use.
import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const envLocal = readFileSync(".env.local", "utf8");
const SUPABASE_URL = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envLocal.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const BASE = "http://localhost:3000";

const token = (
  await (
    await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
  ).json()
).access_token;

const api = async (path, options = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

// 1) list
const list = await api("/api/customers");
console.log("1) GET /api/customers ->", list.status, list.body.length, "รายการ");

// 2) create
const created = await api("/api/customers", {
  method: "POST",
  body: JSON.stringify({
    name: "บริษัท ทดสอบ ลูกค้า จำกัด",
    nameEn: "Test Customer Co., Ltd.",
    address: "123/45 ถนนทดสอบ ต.บ้านสวน อ.บางปะอิน จ.ประจวบคีรีขันธ์ 44160",
    taxId: "0105559000123",
    branch: "สำนักงานใหญ่",
  }),
});
console.log("2) POST ->", created.status, created.body.name, "| tax:", created.body.taxId);

// 3) update
const patched = await api(`/api/customers/${created.body.id}`, {
  method: "PATCH",
  body: JSON.stringify({
    name: "บริษัท ทดสอบ ลูกค้า (แก้ไข)",
    address: "แก้ไขที่อยู่แล้ว",
    taxId: "0105559000999",
  }),
});
console.log("3) PATCH ->", patched.status, patched.body.name, "|", patched.body.address);

// 4) validation
const invalid = await api("/api/customers", {
  method: "POST",
  body: JSON.stringify({ name: "", address: "" }),
});
console.log("4) POST ผิด ->", invalid.status, JSON.stringify(invalid.body).slice(0, 80));

// 5) delete a customer that is used by a quotation -> 409
const usedCustomer = list.body.find((c) => c.id > 0);
const withDoc = await api("/api/quotations");
let usedId = null;
if (withDoc.body.length) {
  const doc = await api(`/api/quotations/${withDoc.body[0].id}`);
  usedId = doc.body.quotation.customerId;
}
if (usedId) {
  const blocked = await api(`/api/customers/${usedId}`, { method: "DELETE" });
  console.log("5) ลบลูกค้าที่ถูกใช้ในเอกสาร ->", blocked.status, blocked.body.message);
} else {
  console.log("5) ข้าม (ไม่มีเอกสารอ้างอิงลูกค้า)");
}

// 6) delete the test customer
const deleted = await api(`/api/customers/${created.body.id}`, { method: "DELETE" });
console.log("6) DELETE ->", deleted.status, JSON.stringify(deleted.body));

// 7) UI
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="email"]');
await wait(2000);
await page.type('input[type="email"]', TEST_EMAIL);
await page.type('input[type="password"]', TEST_PASSWORD);
await Promise.all([
  page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await wait(1500);

await page.goto(`${BASE}/customers`, { waitUntil: "domcontentloaded" });
await wait(2000);
const initialRows = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
console.log("7) หน้า /customers ->", initialRows, "แถว");

// add through the form
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("เพิ่มลูกค้า"))?.click();
});
await wait(500);
await page.evaluate(() => {
  const set = (el, v) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const s = Object.getOwnPropertyDescriptor(proto, "value").set;
    s.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const fields = [...document.querySelectorAll("input, textarea")];
  const empty = fields.filter((f) => f.placeholder === "" && f.tagName === "INPUT");
  set(empty[0], "ลูกค้าจากหน้าจัดการ");
  set(document.querySelector("textarea"), "ที่อยู่ทดสอบ");
});
await wait(400);
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "บันทึก")?.click();
});
await wait(1800);
const added = await page.evaluate(() =>
  [...document.querySelectorAll("tbody tr")].some((r) => r.innerText.includes("ลูกค้าจากหน้าจัดการ")),
);
console.log("8) UI เพิ่มลูกค้า ->", added ? "แถวใหม่ขึ้น ✓" : "ไม่เจอแถว ✗");
await page.screenshot({ path: process.env.TEMP + "\\opencode\\customers.png" });

// search
await page.evaluate(() => {
  const el = [...document.querySelectorAll("input")].find((i) => i.placeholder.includes("ค้นหาลูกค้า"));
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  s.call(el, "ลูกค้าจากหน้าจัดการ");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await wait(1200);
const found = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
console.log("9) ค้นหา ->", found, "แถว");

// cleanup through the UI (delete button)
page.once("dialog", async (d) => await d.accept());
await page.evaluate(() => {
  [...document.querySelectorAll("tbody tr button")].find((b) => b.textContent.trim() === "ลบ")?.click();
});
await wait(1500);
const left = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
console.log("10) ลบผ่าน UI ->", left, "แถวเหลือ");

await browser.close();
