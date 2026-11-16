// Remaining acceptance checks: multi-page PDF, drag reorder, logo upload.
import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// login
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
console.log("1) logged in:", new URL(page.url()).pathname);

// ---- A) multi page: create a quotation with 40 items, check the PDF ----
const created = await page.evaluate(async (base) => {
  const items = Array.from({ length: 40 }, (_, i) => ({
    description: `รายการทดสอบหลายหน้า ลำดับที่ ${i + 1}`,
    qty: i + 1,
    unit: "ชิ้น",
    unitPrice: 10000 + i * 250,
    discount: 0,
    discountMode: "amount",
  }));
  const res = await fetch(`${base}/api/quotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      docDate: new Date().toISOString().slice(0, 10),
      customerName: "บริษัท ทดสอบแบ่งหน้า จำกัด",
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
      items,
    }),
  });
  return { status: res.status, body: await res.json() };
}, BASE);
console.log("2) create 40 items ->", created.status, created.body.docNo);

const pdfB64 = await page.evaluate(async (base, id) => {
  const res = await fetch(`${base}/api/quotations/${id}/pdf`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s);
}, BASE, created.body.id);
const pdfBuf = Buffer.from(pdfB64, "base64");
writeFileSync(process.env.TEMP + "\\opencode\\multipage.pdf", pdfBuf);
const pdfText = pdfBuf.toString("latin1");
const counts = [...pdfText.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
console.log("3) pdf pages:", counts.length ? Math.max(...counts) : "?", "size:", pdfBuf.length);

// ---- B) drag reorder in the form ----
await page.goto(`${BASE}/quotations/new`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("input[list='customer-list']");
await wait(2500);
const before = await page.evaluate(() =>
  [...document.querySelectorAll(".doc-items tbody tr .td-desc")].map((e) => e.textContent.trim()),
);
const handle = await page.$("button[aria-label='ลากเพื่อสลับลำดับ']");
const box = await handle.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2, box.y + 120, { steps: 25 });
await page.mouse.up();
await wait(800);
const after = await page.evaluate(() =>
  [...document.querySelectorAll(".doc-items tbody tr .td-desc")].map((e) => e.textContent.trim()),
);
console.log("4) order before:", JSON.stringify(before.slice(0, 3)));
console.log("   order after :", JSON.stringify(after.slice(0, 3)), "| changed:", before[0] !== after[0]);

// ---- C) logo upload ----
await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
await wait(1500);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
writeFileSync(`${process.env.TEMP}\\opencode\\logo.png`, png);
const fileInput = await page.$('input[type="file"]');
await fileInput.uploadFile(`${process.env.TEMP}\\opencode\\logo.png`);
await wait(2000);
const uploadMsg = await page.evaluate(() =>
  [...document.querySelectorAll("span")].map((e) => e.textContent).find((t) => t?.startsWith("บันทึกแล้ว:")) ?? null,
);
console.log("5) logo upload:", uploadMsg ?? "no message");

await browser.close();
