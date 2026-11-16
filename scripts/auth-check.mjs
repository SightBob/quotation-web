// Auth flow check: redirect when logged out, login, then API + pages work.
import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();

// 1) logged out -> redirect to /login
await page.goto(BASE, { waitUntil: "domcontentloaded" });
console.log("1) logged out path:", new URL(page.url()).pathname, "| search:", new URL(page.url()).search);

// 2) API logged out -> 401
const apiStatus = await page.evaluate(async (base) => {
  const r = await fetch(`${base}/api/quotations`);
  return r.status;
}, BASE);
console.log("2) API logged out ->", apiStatus);

// 3) login
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="email"]');
await new Promise((r) => setTimeout(r, 2500)); // wait for React hydration (dev)
await page.type('input[type="email"]', TEST_EMAIL);
await page.type('input[type="password"]', TEST_PASSWORD);
await Promise.all([
  page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await new Promise((r) => setTimeout(r, 1500));
console.log("3) after login path:", new URL(page.url()).pathname);

// 4) API with session
const apiAuth = await page.evaluate(async (base) => {
  const r = await fetch(`${base}/api/quotations`);
  const body = await r.json();
  return { status: r.status, rows: Array.isArray(body) ? body.length : body };
}, BASE);
console.log("4) API logged in ->", JSON.stringify(apiAuth));

// 5) quotation page + pdf
await page.goto(`${BASE}/quotations/4031676d-9c52-4db5-af93-24bb4066b346`, { waitUntil: "domcontentloaded" });
const hasDoc = await page.$(".doc");
console.log("5) quotation page renders document:", Boolean(hasDoc));

const pdf = await page.evaluate(async (base) => {
  const r = await fetch(`${base}/api/quotations/4031676d-9c52-4db5-af93-24bb4066b346/pdf`);
  const b = await r.blob();
  return { status: r.status, type: r.headers.get("content-type"), size: b.size };
}, BASE);
console.log("6) pdf with session ->", JSON.stringify(pdf));

await page.screenshot({ path: process.env.TEMP + "\\opencode\\app-list.png", fullPage: true });
await browser.close();
