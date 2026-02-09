import { chromium, devices } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { shouldBlockRequest, shouldBlockResourceType } from './blocklists.js';
import { validateURL } from './security.js';
import { classifyError, detectAntiBot, BrowserCrashError } from './errors.js';
import { withAutoRetry } from './retry.js';
import { getGlobalPool } from './browser-pool.js';

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

export async function launchBrowser({
  headless = true,
  userAgent = 'lean-browser/0.2 (+https://github.com/)',
  viewport = null,
  device = null,
  mobile = false,
  cookiesFile = null,
  blockAds = false,
  blockResources = [],
  extraHeaders = {},
} = {}) {
  const browser = await chromium.launch({ headless });

  // Prepare context options
  const contextOptions = { userAgent };

  // Handle device emulation
  if (device && devices[device]) {
    Object.assign(contextOptions, devices[device]);
  } else if (mobile) {
    Object.assign(contextOptions, devices['iPhone 13']);
  } else if (viewport) {
    const [width, height] = viewport.split('x').map(Number);
    if (width && height) {
      contextOptions.viewport = { width, height };
    }
  }

  // Add extra headers
  if (Object.keys(extraHeaders).length > 0) {
    contextOptions.extraHTTPHeaders = extraHeaders;
  }

  const context = await browser.newContext(contextOptions);

  // Load cookies if specified
  if (cookiesFile) {
    try {
      const cookiesJson = await readFile(cookiesFile, 'utf-8');
      const cookies = JSON.parse(cookiesJson);
      await context.addCookies(cookies);
    } catch {
      // Ignore if file doesn't exist (first run)
    }
  }

  const page = await context.newPage();

  // Setup request interception for ad blocking and resource blocking
  if (blockAds || blockResources.length > 0) {
    let blockedCount = 0;

    await page.route('**/*', (route) => {
      const request = route.request();
      const url = request.url();
      const resourceType = request.resourceType();

      // Block ads/trackers
      if (blockAds && shouldBlockRequest(url)) {
        blockedCount++;
        return route.abort();
      }

      // Block specific resource types
      if (shouldBlockResourceType(resourceType, blockResources)) {
        blockedCount++;
        return route.abort();
      }

      return route.continue();
    });

    // Store blocked count on page object for reporting
    page._blockedRequestCount = () => blockedCount;
  }

  return { browser, context, page };
}

export async function navigateAndWait(page, url, { timeoutMs = 45000, skipSSRFCheck = false } = {}) {
  // Validate URL for SSRF protection unless explicitly skipped
  if (!skipSSRFCheck) {
    validateURL(url);
  }

  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // Wait a bit for hydration / async content.
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});
    await autoScroll(page).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});

    const finalUrl = page.url();
    const title = await page.title().catch(() => undefined);
    const status = resp?.status();
    const html = await page.content();

    // Detect anti-bot protection
    const antiBotError = detectAntiBot(html, status, url);
    if (antiBotError) {
      throw antiBotError;
    }

    return { finalUrl, title, status };
  } catch (error) {
    // Check if browser crashed
    if (page.isClosed()) {
      throw new BrowserCrashError(url, error);
    }

    // Classify and re-throw with better error context
    throw classifyError(error, url, timeoutMs);
  }
}

export async function closeBrowser({ browser, context, page } = {}) {
  await page?.close().catch(() => {});
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}

async function fetchWithPool(url, { timeoutMs = 45000, cookiesFile = null } = {}) {
  const pool = getGlobalPool();
  const instance = await pool.acquire();

  try {
    const page = instance.page;
    const context = instance.context;

    // Load cookies if specified
    if (cookiesFile) {
      try {
        const cookiesJson = await readFile(cookiesFile, 'utf-8');
        const cookies = JSON.parse(cookiesJson);
        await context.addCookies(cookies);
      } catch {
        // Ignore if file doesn't exist (first run)
      }
    }

    const { finalUrl, title, status } = await navigateAndWait(page, url, { timeoutMs });
    const html = await page.content();

    // Get blocked request count if available
    const blockedCount = page._blockedRequestCount ? page._blockedRequestCount() : 0;

    // Save cookies if file specified
    if (cookiesFile) {
      const cookies = await context.cookies();
      await writeFile(cookiesFile, JSON.stringify(cookies, null, 2));
    }

    return { html, finalUrl, title, status, blockedCount };
  } finally {
    await pool.release(instance);
  }
}

export async function fetchRenderedHtml(
  url,
  {
    timeoutMs = 45000,
    headless = true,
    userAgent = 'lean-browser/0.2 (+https://github.com/)',
    viewport = null,
    device = null,
    mobile = false,
    cookiesFile = null,
    blockAds = false,
    blockResources = [],
    extraHeaders = {},
    enableRetry = true,
    onRetry = null,
    usePool = true,
  } = {},
) {
  // Use pool if enabled and no special options are set
  const canUsePool =
    usePool &&
    headless &&
    !viewport &&
    !device &&
    !mobile &&
    !blockAds &&
    blockResources.length === 0 &&
    Object.keys(extraHeaders).length === 0 &&
    userAgent === 'lean-browser/0.2 (+https://github.com/)';

  if (canUsePool) {
    const attemptFetch = async () => fetchWithPool(url, { timeoutMs, cookiesFile });

    if (enableRetry) {
      return withAutoRetry(attemptFetch, { onRetry });
    } else {
      return attemptFetch();
    }
  }

  // Create a function that attempts the fetch
  const attemptFetch = async () => {
    let browser, context, page;

    try {
      const launchResult = await launchBrowser({
        headless,
        userAgent,
        viewport,
        device,
        mobile,
        cookiesFile,
        blockAds,
        blockResources,
        extraHeaders,
      });
      browser = launchResult.browser;
      context = launchResult.context;
      page = launchResult.page;

      // Setup browser crash detection
      browser.on('disconnected', () => {
        if (page && !page.isClosed()) {
          throw new BrowserCrashError(url, new Error('Browser process disconnected'));
        }
      });

      const { finalUrl, title, status } = await navigateAndWait(page, url, { timeoutMs });
      const html = await page.content();

      // Get blocked request count if available
      const blockedCount = page._blockedRequestCount ? page._blockedRequestCount() : 0;

      // Save cookies if file specified
      if (cookiesFile) {
        const cookies = await context.cookies();
        await writeFile(cookiesFile, JSON.stringify(cookies, null, 2));
      }

      return { html, finalUrl, title, status, blockedCount };
    } finally {
      await closeBrowser({ browser, context, page });
    }
  };

  // Execute with or without retry based on enableRetry flag
  if (enableRetry) {
    return withAutoRetry(attemptFetch, { onRetry });
  } else {
    return attemptFetch();
  }
}

export async function takeScreenshot(
  url,
  {
    timeoutMs = 45000,
    headless = true,
    fullPage = false,
    viewport = null,
    device = null,
    mobile = false,
    cookiesFile = null,
    blockAds = false,
    blockResources = [],
    extraHeaders = {},
    enableRetry = true,
    onRetry = null,
  } = {},
) {
  const attemptScreenshot = async () => {
    let browser, context, page;

    try {
      const launchResult = await launchBrowser({
        headless,
        viewport,
        device,
        mobile,
        cookiesFile,
        blockAds,
        blockResources,
        extraHeaders,
      });
      browser = launchResult.browser;
      context = launchResult.context;
      page = launchResult.page;

      const { finalUrl, title, status } = await navigateAndWait(page, url, { timeoutMs });

      // Take screenshot
      const screenshot = await page.screenshot({
        fullPage,
        type: 'png',
      });

      const base64 = screenshot.toString('base64');

      return { screenshot: base64, finalUrl, title, status };
    } finally {
      await closeBrowser({ browser, context, page });
    }
  };

  if (enableRetry) {
    return withAutoRetry(attemptScreenshot, { onRetry });
  } else {
    return attemptScreenshot();
  }
}

export async function getCookies(context) {
  return await context.cookies();
}

export async function setCookies(context, cookies) {
  await context.addCookies(cookies);
}
