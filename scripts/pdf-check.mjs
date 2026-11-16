// PDF check: node scripts/pdf-check.mjs <url> <out.pdf>
import puppeteer from "puppeteer-core";

const [url, out] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.emulateMediaType("print");
const buf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
const { writeFileSync } = await import("node:fs");
writeFileSync(out, buf);
await browser.close();

const text = buf.toString("latin1");
const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`saved ${out} pages=${pages} bytes=${buf.length}`);
