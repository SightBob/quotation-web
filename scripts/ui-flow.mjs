// UI regression: login -> create a quotation in the form -> verify the saved document.
import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) login
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

// 2) open the form and change the customer + first price
await page.goto(`${BASE}/quotations/new`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("input[list='customer-list']");
await wait(2000);

await page.evaluate(() => {
  const setValue = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  setValue(document.querySelector("input[list='customer-list']"), "บริษัท ทดสอบ จำกัด");
  const price = document.querySelector("input[inputmode='decimal']");
  setValue(price, "1,250.50");
});
await wait(600);

// 3) save
await page.evaluate(() => {
  [...document.querySelectorAll("button")]
    .find((e) => e.textContent.trim() === "บันทึก")
    ?.click();
});
await page.waitForFunction(() => location.pathname !== "/quotations/new", { timeout: 20000 }).catch(() => {});
await wait(800);
console.log("2) after save:", new URL(page.url()).pathname);

// 4) verify the saved document
const info = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".doc-items tbody tr")]
    .map((r) => r.innerText.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return {
    rows: rows.slice(0, 3),
    totals: [...document.querySelectorAll(".doc-sum-value")].map((e) => e.textContent.trim()),
    baht: document.querySelector(".doc-baht")?.textContent?.trim(),
    docNo: document.querySelector(".doc-info-centered")?.innerText?.replace(/\s+/g, " ").trim(),
  };
});
console.log("3) saved doc:", JSON.stringify(info));

// 5) settings page
await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
await wait(500);
const settingsOk = await page.$("input[value='55 Inter Supply Co., Ltd.']");
console.log("4) settings page loads:", Boolean(settingsOk));

await browser.close();
