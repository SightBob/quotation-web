// Products CRUD: API + UI + integration with the quotation form.
import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
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

// 1) API: list
const list = await page.evaluate(async (base) => {
  const r = await fetch(`${base}/api/products`);
  return { status: r.status, rows: await r.json() };
}, BASE);
console.log("1) GET /api/products ->", list.status, list.rows.length, "rows");

// 2) API: create
const created = await page.evaluate(async (base) => {
  const r = await fetch(`${base}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "ทดสอบ API Product", unit: "ชิ้น", unitPrice: 123450 }),
  });
  return { status: r.status, body: await r.json() };
}, BASE);
console.log("2) POST ->", created.status, created.body.description, created.body.unitPrice);

// 3) API: update
const patched = await page.evaluate(async (base, id) => {
  const r = await fetch(`${base}/api/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "ทดสอบ API Product (แก้ไข)", unit: "กล่อง", unitPrice: 99000 }),
  });
  return { status: r.status, body: await r.json() };
}, BASE, created.body.id);
console.log("3) PATCH ->", patched.status, patched.body.description, patched.body.unitPrice, patched.body.unit);

// 4) API: validation
const invalid = await page.evaluate(async (base) => {
  const r = await fetch(`${base}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "", unitPrice: -5 }),
  });
  return { status: r.status, body: await r.json() };
}, BASE);
console.log("4) POST ผิด ->", invalid.status, JSON.stringify(invalid.body).slice(0, 90));

// 5) UI: products page, add a row through the form
await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
await wait(2000);
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.includes("เพิ่มสินค้า"))?.click();
});
await wait(500);
await page.evaluate(() => {
  const set = (el, v) => {
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    s.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const inputs = [...document.querySelectorAll("input")];
  set(inputs.find((i) => i.placeholder === ""), "สินค้าจากหน้าจัดการ");
  set(inputs.find((i) => i.placeholder === "ชิ้น"), "ถุง");
  set(inputs.find((i) => i.placeholder === "0.00"), "777.25");
});
await wait(400);
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "บันทึก")?.click();
});
await wait(1800);
const rows = await page.evaluate(() =>
  [...document.querySelectorAll("tbody tr")].map((r) => r.innerText.replace(/\s+/g, " ").trim()),
);
console.log("5) UI เพิ่มแล้ว:", rows.find((r) => r.includes("สินค้าจากหน้าจัดการ")) ?? "ไม่เจอแถว");

// 6) UI: search
await page.evaluate(() => {
  const el = [...document.querySelectorAll("input")].find((i) => i.placeholder.includes("ค้นหารายการสินค้า"));
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  s.call(el, "สินค้าจากหน้าจัดการ");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await wait(1200);
const found = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
console.log("6) ค้นหา 'สินค้าจากหน้าจัดการ' ->", found, "แถว");

await page.screenshot({ path: process.env.TEMP + "\\opencode\\products.png" });

// 7) quotation form: product datalist comes from the DB + autofill price
await page.goto(`${BASE}/quotations/new`, { waitUntil: "domcontentloaded" });
await wait(2500);
const options = await page.evaluate(() =>
  [...document.querySelectorAll("#product-list option")].map((o) => o.value).slice(0, 5),
);
console.log("7) datelist สินค้าจาก DB:", JSON.stringify(options));

await page.evaluate(() => {
  const el = document.querySelector("input[list='product-list']");
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  s.call(el, "สินค้าจากหน้าจัดการ");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await wait(900);
const filled = await page.evaluate(() => {
  const row = document.querySelector(".doc-items tbody tr");
  const price = document.querySelector("input[inputmode='decimal']");
  return { docRow: row?.innerText.replace(/\s+/g, " ").trim(), priceInput: price?.value };
});
console.log("8) เลือกสินค้าแล้วราคาถูกเติม:", JSON.stringify(filled));

// 9) cleanup: delete what we created
const cleanup = await page.evaluate(async (base) => {
  const rows = await (await fetch(`${base}/api/products`)).json();
  const targets = rows.filter((r) => r.description.includes("ทดสอบ API Product") || r.description.includes("สินค้าจากหน้าจัดการ"));
  for (const t of targets) {
    await fetch(`${base}/api/products/${t.id}`, { method: "DELETE" });
  }
  return targets.length;
}, BASE);
console.log("9) ลบข้อมูลทดสอบ:", cleanup, "รายการ");

await browser.close();
