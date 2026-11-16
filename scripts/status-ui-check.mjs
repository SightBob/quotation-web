// UI check: buttons per status, confirm dialog, tabs, revision timeline.
import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const envLocal = readFileSync(".env.local", "utf8");
const SUPABASE_URL = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envLocal.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const BASE = "http://localhost:3000";

const token = await (
  await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
).json();

const api = async (path, options = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.access_token}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const payload = (over = {}) => ({
  docDate: "2026-11-16",
  customerName: "บริษัท ทดสอบ UI จำกัด",
  customerAddress: "1/1 ถนนทดสอบ",
  customerTaxId: null,
  poRef: null,
  contactName: "นายทดสอบ",
  contactPosition: "ผู้เสนอราคา",
  validityDays: 50,
  deliveryDays: 50,
  paymentDays: 60,
  vatRate: 7,
  vatInclusive: false,
  finalDiscount: 0,
  remark: null,
  status: "draft",
  items: [
    { description: "สินค้าทดสอบ UI", qty: 2, unit: "ชิ้น", unitPrice: 50000, discount: 0, discountMode: "amount" },
  ],
  ...over,
});

const created = await api("/api/quotations", { method: "POST", body: JSON.stringify(payload()) });
const id = created.body.id;

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// login (cookie session)
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

const buttonsOf = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("header button, .no-print button")]
      .map((b) => b.textContent.trim())
      .filter(Boolean),
  );

// 1) draft
await page.goto(`${BASE}/quotations/${id}`, { waitUntil: "domcontentloaded" });
await wait(2000);
console.log("1) draft ปุ่ม:", JSON.stringify(await buttonsOf()));
await page.screenshot({ path: process.env.TEMP + "\\opencode\\st-draft.png" });

// 2) confirm dialog before sending
page.once("dialog", async (d) => {
  console.log("2) dialog:", d.message().replace(/\n+/g, " | "));
  await d.dismiss();
});
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("ส่งแล้ว"))?.click();
});
await wait(1200);

// 3) send it for real
page.once("dialog", async (d) => {
  console.log("3) dialog:", d.message().replace(/\n+/g, " | "));
  await d.accept();
});
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("ส่งแล้ว"))?.click();
});
await wait(2500);
console.log("4) sent ปุ่ม:", JSON.stringify(await buttonsOf()));
await page.screenshot({ path: process.env.TEMP + "\\opencode\\st-sent.png" });

// 5) tabs
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("ประวัติการเปลี่ยนแปลง"))?.click();
});
await wait(800);
const auditText = await page.evaluate(() => document.querySelector("ol")?.innerText?.replace(/\s+/g, " ").slice(0, 260));
console.log("5) แท็บประวัติการเปลี่ยนแปลง:", auditText);
await page.screenshot({ path: process.env.TEMP + "\\opencode\\st-audit.png" });

// 6) create a revision from the UI
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("สร้างฉบับแก้ไข"))?.click();
});
await page.waitForFunction(() => location.pathname.endsWith("/edit"), { timeout: 20000 }).catch(() => {});
await wait(2000);
console.log("6) หลังสร้างฉบับแก้ไข ->", new URL(page.url()).pathname);
const revNo = await page.evaluate(() => document.querySelector("input")?.value);
console.log("   เลขที่ในฟอร์ม:", revNo);
await page.screenshot({ path: process.env.TEMP + "\\opencode\\st-revision.png" });

await browser.close();

// cleanup
await api(`/api/quotations/${id}`, { method: "DELETE" }).catch(() => undefined);
console.log("cleanup done");
