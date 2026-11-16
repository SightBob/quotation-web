// Verify the Buddhist-calendar date field end to end.
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

await page.goto(`${BASE}/quotations/new`, { waitUntil: "domcontentloaded" });
await wait(2500);

// 1) the field shows พ.ศ.
const shown = await page.evaluate(() => {
  const el = document.querySelector('input[placeholder="วว/ดด/ปป"]');
  return el?.value ?? "not found";
});
console.log("1) date field value:", shown, "/", /^\d{2}\/\d{2}\/25\d{2}$/.test(shown) ? "พ.ศ. ✓" : "ไม่ใช่ พ.ศ. ✗");

// 2) type a พ.ศ. date -> preview must follow
await page.evaluate(() => {
  const el = document.querySelector('input[placeholder="วว/ดด/ปป"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, "05/01/2570");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await wait(700);
const previewDate = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".doc-info-centered")].find((e) =>
    e.textContent.includes("วันที่"),
  );
  return el?.textContent?.replace(/\s+/g, " ").trim();
});
console.log("2) preview date:", previewDate);

// 3) save -> document number follows the พ.ศ. year, date stored as พ.ศ.
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((e) => e.textContent.trim() === "บันทึก")?.click();
});
await page.waitForFunction(() => location.pathname !== "/quotations/new", { timeout: 20000 }).catch(() => {});
await wait(1200);
console.log("3) saved at:", new URL(page.url()).pathname);
const saved = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".doc-info-centered")].find((e) =>
    e.textContent.includes("วันที่"),
  );
  const docNo = document.querySelector(".doc-info-centered")?.textContent?.replace(/\s+/g, " ").trim();
  return { date: el?.textContent?.replace(/\s+/g, " ").trim(), docNo };
});
console.log("4) saved doc:", JSON.stringify(saved));

await page.screenshot({ path: process.env.TEMP + "\\opencode\\ui-thaic.png" });
await browser.close();
