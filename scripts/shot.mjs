// Screenshot helper: node scripts/shot.mjs <url> <out.png> [width] [height]
import puppeteer from "puppeteer-core";

const [url, out, w = "900", h = "1300"] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 500));
const el = await page.$(".sheet");
if (el && !process.env.FULL) await el.screenshot({ path: out });
else await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved", out);
