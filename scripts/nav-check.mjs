import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import puppeteer from "puppeteer-core";
const BASE = "http://localhost:3000";
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 800, deviceScaleFactor: 1.25 });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="email"]');
await wait(2000);
await page.type('input[type="email"]', TEST_EMAIL);
await page.type('input[type="password"]', TEST_PASSWORD);
await Promise.all([page.waitForNavigation({waitUntil:"domcontentloaded"}).catch(()=>{}), page.click('button[type="submit"]')]);
await wait(1500);
// nav visible on /customers ?
await page.goto(`${BASE}/customers`, { waitUntil: "domcontentloaded" });
await wait(1800);
const nav = await page.evaluate(() => {
  const n = document.querySelector("nav");
  return n ? { links: [...n.querySelectorAll("a")].map(a => a.textContent.trim()), buttons: [...n.querySelectorAll("button")].map(b => b.textContent.trim()) } : null;
});
console.log("nav on /customers:", JSON.stringify(nav));
await page.screenshot({ path: process.env.TEMP + "\\opencode\\nav-customers.png" });
// nav hidden on /login ?
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await wait(800);
console.log("nav on /login:", await page.evaluate(() => Boolean(document.querySelector("nav"))));
// print output must not include the nav
await page.goto(`${BASE}/quotations`, { waitUntil: "domcontentloaded" });
await wait(800);
await page.emulateMediaType("print");
await wait(500);
const navInPrint = await page.evaluate(() => {
  const n = document.querySelector("nav");
  return n ? getComputedStyle(n).display : "none";
});
console.log("nav display in print media:", navInPrint);
console.log("page errors:", errs.length ? errs : "none");
await browser.close();
