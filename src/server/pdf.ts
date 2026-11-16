import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter((p): p is string => Boolean(p));

function findChrome(): string {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      `Chrome/Chromium not found. Set CHROME_PATH. Tried: ${CHROME_CANDIDATES.join(", ")}`,
    );
  }
  return found;
}

/** Render a page to an A4 PDF (uses the page's own @page print CSS) */
export async function renderPdf(
  url: string,
  opts: { cookies?: { name: string; value: string }[] } = {},
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    if (opts.cookies?.length) {
      await page.setCookie(
        ...opts.cookies.map((c) => ({
          name: c.name,
          value: c.value,
          url,
        })),
      );
    }
    // "load" not "networkidle0": the dev server keeps an HMR websocket open
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector(".sheet", { timeout: 30_000 });
    await page
      .evaluate(async () => {
        try {
          await document.fonts.ready;
        } catch {
          /* page navigated while waiting for fonts */
        }
      })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}
