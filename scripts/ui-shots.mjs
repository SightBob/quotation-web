import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import puppeteer from "puppeteer-core";
const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.25 });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="email"]');
await wait(2000);
await page.type('input[type="email"]', TEST_EMAIL);
await page.type('input[type="password"]', TEST_PASSWORD);
await Promise.all([page.waitForNavigation({waitUntil:"domcontentloaded"}).catch(()=>{}), page.click('button[type="submit"]')]);
await wait(1500);
await page.goto(`${BASE}/quotations/new`, { waitUntil: "domcontentloaded" });
await wait(3000);
await page.screenshot({ path: process.env.TEMP + "\\opencode\\ui-split.png" });
// zoom readout + fit scale
const zoom = await page.evaluate(() => {
  const el = [...document.querySelectorAll("span")].find(e => /%$/.test(e.textContent?.trim() ?? ""));
  return el?.textContent?.trim();
});
console.log("split zoom:", zoom);
// switch to full-screen preview
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find(e => e.textContent.trim() === "เต็มจอ")?.click();
});
await wait(1500);
await page.screenshot({ path: process.env.TEMP + "\\opencode\\ui-full.png" });
// 100% zoom
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find(e => e.textContent.trim() === "100%")?.click();
});
await wait(1200);
const zoom2 = await page.evaluate(() => {
  const el = [...document.querySelectorAll("span")].find(e => /%$/.test(e.textContent?.trim() ?? ""));
  return el?.textContent?.trim();
});
console.log("full-screen zoom after 100%:", zoom2);
await page.screenshot({ path: process.env.TEMP + "\\opencode\\ui-100.png" });
// print emulation
await page.emulateMediaType("print");
await wait(800);
await page.screenshot({ path: process.env.TEMP + "\\opencode\\ui-print.png", fullPage: true });
await browser.close();
console.log("shots saved");
