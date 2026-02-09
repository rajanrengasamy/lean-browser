import { chromium } from 'playwright';

async function autoScroll(page, { maxSteps = 12, stepDelayMs = 250 } = {}) {
  // Minimal lazy-load assist: scroll down in steps.
  for (let i = 0; i < maxSteps; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, Math.max(400, Math.floor(window.innerHeight * 0.9)));
    });
    await page.waitForTimeout(stepDelayMs);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
}

export async function launchBrowser({ headless = true, userAgent = 'lean-browser/0.2 (+https://github.com/)' } = {}) {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ userAgent });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function navigateAndWait(page, url, { timeoutMs = 45000 } = {}) {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

  // Wait a bit for hydration / async content.
  await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});
  await autoScroll(page).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});

  const finalUrl = page.url();
  const title = await page.title().catch(() => undefined);
  const status = resp?.status();

  return { finalUrl, title, status };
}

export async function closeBrowser({ browser, context, page } = {}) {
  await page?.close().catch(() => {});
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}

export async function fetchRenderedHtml(
  url,
  { timeoutMs = 45000, headless = true, userAgent = 'lean-browser/0.2 (+https://github.com/)' } = {},
) {
  const { browser, context, page } = await launchBrowser({ headless, userAgent });

  try {
    const { finalUrl, title, status } = await navigateAndWait(page, url, { timeoutMs });
    const html = await page.content();

    return { html, finalUrl, title, status };
  } finally {
    await closeBrowser({ browser, context, page });
  }
}
