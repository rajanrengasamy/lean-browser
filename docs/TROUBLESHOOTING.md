# Troubleshooting Guide

This guide covers common issues, error messages, and debugging strategies for lean-browser.

## Table of Contents

- [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
- [Common Issues](#common-issues)
  - [Cloudflare Blocking](#cloudflare-blocking)
  - [Timeouts](#timeouts)
  - [Out of Memory](#out-of-memory)
  - [Missing Elements](#missing-elements)
  - [Anti-Bot Detection](#anti-bot-detection)
  - [Empty or Truncated Output](#empty-or-truncated-output)
  - [Session Issues](#session-issues)
- [Error Messages](#error-messages)
- [Debug Mode](#debug-mode)
- [Performance Tuning](#performance-tuning)
- [Getting Help](#getting-help)

## Quick Diagnostic Checklist

Before diving into specific issues, run through this checklist:

```bash
# 1. Check Node.js version (requires 18+)
node --version

# 2. Check Playwright installation
npx playwright --version

# 3. Check Chromium browser is installed
ls ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
# macOS: ls ~/Library/Caches/ms-playwright/chromium-*/chrome-mac/Chromium.app

# 4. Test with a simple URL
lean-browser https://example.com --mode text --tokens 500

# 5. Test in headed mode (see what the browser sees)
lean-browser https://example.com --headed --mode text

# 6. Check for network connectivity
curl -I https://example.com
```

If all these pass, continue to specific issues below.

## Common Issues

### Cloudflare Blocking

**Symptoms**:

- 403 Forbidden errors
- Captcha pages instead of content
- "Access Denied" messages
- Output contains "Checking your browser" text

**How to Detect**:

```bash
# Check if you're getting a Cloudflare challenge
lean-browser https://yoursite.com --mode text | grep -i "cloudflare\|challenge\|captcha"
```

**Solutions**:

1. **Use a custom User-Agent** (programmatic only):

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';

const fetched = await fetchRenderedHtml('https://protected-site.com', {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
});
```

2. **Add delays to appear more human-like**:

```javascript
import { launchBrowser, navigateAndWait } from 'lean-browser/src/browser.js';

const { browser, context, page } = await launchBrowser({ headless: false });
await page.waitForTimeout(2000); // Random delay
await navigateAndWait(page, url);
```

3. **Use residential proxies** (advanced):

```javascript
const { browser, context, page } = await chromium.launch({
  proxy: {
    server: 'http://your-proxy:8080',
    username: 'user',
    password: 'pass',
  },
});
```

4. **For MCP usage**, consider using alternative tools for heavily protected sites.

**Prevention**:

- Avoid rapid-fire requests to the same domain
- Add random delays between requests
- Use the default user-agent (identifies as lean-browser)
- Consider contacting site owner for API access

### Timeouts

**Symptoms**:

- `TimeoutError: page.goto: Timeout 45000ms exceeded`
- `Navigation timeout of 45000ms exceeded`
- Process hangs indefinitely

**Common Causes**:

1. Slow websites or slow network
2. Pages with infinite loading spinners
3. Pages requiring authentication
4. Broken JavaScript on the page

**Solutions**:

1. **Increase timeout**:

```bash
# CLI
lean-browser https://slow-site.com --timeout 90000  # 90 seconds

# Programmatic
const fetched = await fetchRenderedHtml(url, { timeoutMs: 90000 });
```

2. **Check if site is actually loading** (headed mode):

```bash
lean-browser https://slow-site.com --headed
```

3. **For infinite spinners**, adjust wait strategy:

```javascript
// Modify src/browser.js navigateAndWait() to use domcontentloaded only
const resp = await page.goto(url, {
  waitUntil: 'domcontentloaded', // Don't wait for networkidle
  timeout: timeoutMs,
});

// Skip networkidle wait
// Comment out: await page.waitForLoadState('networkidle', ...)
```

4. **Set environment variable for global timeout**:

```bash
export LEAN_BROWSER_TIMEOUT=90000
lean-browser https://slow-site.com
```

**Debug timeout issues**:

```bash
# Enable Playwright debug logs
DEBUG=pw:api lean-browser https://slow-site.com

# See what resources are still loading
DEBUG=pw:protocol lean-browser https://slow-site.com 2>&1 | grep -i "Network.request"
```

### Out of Memory

**Symptoms**:

- `JavaScript heap out of memory`
- Process killed by OS
- Slow performance and eventual crash

**Common Causes**:

1. Very large pages (e.g., long Reddit threads, infinite scroll)
2. Memory leaks in browser instances
3. Too many concurrent sessions
4. Large token budgets causing huge JSON objects

**Solutions**:

1. **Increase Node.js heap size**:

```bash
node --max-old-space-size=4096 ./node_modules/.bin/lean-browser https://huge-page.com
```

2. **Reduce token budget**:

```bash
# Instead of unlimited tokens
lean-browser https://huge-page.com --tokens 2000
```

3. **Close sessions after use**:

```bash
# Always close sessions
SESSION=$(lean-browser session start --url https://example.com | jq -r .sessionId)
# ... do work ...
lean-browser session close --session $SESSION  # Don't forget this!
```

4. **Implement browser pooling** (programmatic):

```javascript
import { launchBrowser, closeBrowser } from 'lean-browser/src/browser.js';

const pool = [];
const MAX_BROWSERS = 5;

async function getBrowser() {
  if (pool.length > 0) {
    return pool.pop();
  }
  if (pool.length + activeBrowsers < MAX_BROWSERS) {
    return await launchBrowser();
  }
  throw new Error('Browser pool exhausted');
}

function releaseBrowser(browser) {
  pool.push(browser);
}

// Clean up pool periodically
setInterval(() => {
  if (pool.length > 2) {
    const excess = pool.splice(2);
    excess.forEach((b) => closeBrowser(b));
  }
}, 60000);
```

5. **Disable auto-scroll for memory-intensive pages**:

```javascript
// Modify src/browser.js to skip autoScroll
// Comment out: await autoScroll(page).catch(() => {});
```

**Monitor memory usage**:

```bash
# Run with heap snapshot
node --heap-prof ./node_modules/.bin/lean-browser https://example.com

# Use htop/Activity Monitor to watch process
watch -n 1 "ps aux | grep lean-browser"
```

### Missing Elements

**Symptoms**:

- `ElementNotFoundError: Element "e1" not found`
- Interactive mode shows fewer elements than expected
- Forms or buttons not appearing in element list

**Common Causes**:

1. Elements are hidden (CSS `display:none`, `visibility:hidden`)
2. Elements rendered after JavaScript execution
3. Elements inside iframes (not supported)
4. Elements filtered out by noise detection
5. Element limit reached (default: 60 elements)

**Debug Steps**:

1. **View the page in headed mode**:

```bash
lean-browser https://yoursite.com --headed --mode interactive
```

2. **Check element visibility**:

```javascript
// In headed mode, open DevTools and check if element is visible
await page.evaluate(() => {
  const el = document.querySelector('#your-selector');
  const style = window.getComputedStyle(el);
  console.log('Display:', style.display);
  console.log('Visibility:', style.visibility);
  console.log('Hidden attr:', el.hidden);
});
```

3. **Increase element limit** (programmatic):

```javascript
import { extractInteractiveElements } from 'lean-browser/src/extractor.js';

const elements = extractInteractiveElements(dom, { limit: 100 }); // Increase from 60
```

4. **Check if element is in an iframe**:

```javascript
// lean-browser doesn't extract iframe content by default
// You'll need to handle iframes manually
const frames = await page.frames();
for (const frame of frames) {
  const content = await frame.content();
  // Process frame content separately
}
```

5. **Wait for dynamic content**:

```bash
# Add wait action before snapshot
lean-browser action https://example.com \
  --actions "wait:3000" \
  --snapshot
```

**Modify extraction filters**:

```javascript
// src/extractor.js - Comment out aggressive filtering
function isHiddenLike(el) {
  const type = (el.getAttribute?.('type') ?? '').toLowerCase();
  if (type === 'hidden') return true;
  // Comment out style checks if too aggressive:
  // const style = (el.getAttribute?.('style') ?? '').toLowerCase();
  // if (style.includes('display:none') || ...) return true;
  return false;
}
```

### Anti-Bot Detection

**Symptoms**:

- reCAPTCHA challenges
- "Please verify you are human"
- Different content in headed vs headless mode
- Blocked by bot detection services (PerimeterX, DataDome)

**Detection Tests**:

```bash
# Compare headless vs headed
lean-browser https://site.com --mode text > headless.txt
lean-browser https://site.com --mode text --headed > headed.txt
diff headless.txt headed.txt
```

**Solutions**:

1. **Use headed mode**:

```bash
lean-browser https://protected-site.com --headed
```

2. **Stealth mode** (programmatic - requires playwright-extra):

```bash
npm install playwright-extra puppeteer-extra-plugin-stealth
```

```javascript
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
```

3. **Mimic human behavior**:

```javascript
// Random mouse movements
await page.mouse.move(100, 100);
await page.mouse.move(200, 200, { steps: 10 });

// Random delays
await page.waitForTimeout(Math.random() * 2000 + 1000);

// Scroll naturally
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => window.scrollBy(0, Math.random() * 300 + 100));
  await page.waitForTimeout(Math.random() * 500 + 200);
}
```

4. **Disable automation flags**:

```javascript
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 ...',
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  hasTouch: false,
  isMobile: false,
  locale: 'en-US',
  timezoneId: 'America/New_York',
  permissions: ['geolocation'],
  geolocation: { latitude: 40.7128, longitude: -74.006 },
});
```

**Prevention**:

- Use lean-browser for public content only
- For protected content, use official APIs
- Add delays between requests
- Rotate user agents and proxies

### Empty or Truncated Output

**Symptoms**:

- Empty article text
- `(untitled)` in output
- `truncated: true` with very little content
- Output is just `# (untitled)\n\nSource: ...`

**Common Causes**:

1. Page is actually empty or sparse (e.g., search results page)
2. Content is in non-standard format (not article-like)
3. JavaScript-rendered content not loaded
4. Token budget too small
5. Readability failed to extract content

**Solutions**:

1. **Check raw HTML**:

```bash
# See what the browser actually sees
lean-browser https://yoursite.com --headed

# Or save HTML to file (programmatic)
const { html } = await fetchRenderedHtml(url);
require('fs').writeFileSync('page.html', html);
```

2. **Increase token budget**:

```bash
lean-browser https://yoursite.com --tokens 5000
```

3. **Try JSON mode** (shows more structure):

```bash
lean-browser https://yoursite.com --mode json
```

4. **Wait longer for JavaScript**:

```javascript
// Modify src/browser.js navigateAndWait()
await page.waitForLoadState('networkidle', { timeout: 30000 }); // Increase from 15s
await page.waitForTimeout(5000); // Add extra delay
```

5. **Disable Readability** (use raw text):

```javascript
// src/extractor.js - modify extractArticleFromDom()
export function extractArticleFromDom(dom) {
  const doc = dom.window.document;
  pruneDocument(doc);

  // Skip Readability, use raw body text
  const fallbackText = normalizeWhitespace(doc.body?.textContent ?? '');
  return {
    title: normalizeWhitespace(doc.title ?? ''),
    byline: null,
    excerpt: safeTruncate(fallbackText, 280),
    text: fallbackText,
  };
}
```

6. **Check if content is in shadow DOM**:

```javascript
// Shadow DOM content is not accessible via regular DOM methods
await page.evaluate(() => {
  const host = document.querySelector('#shadow-host');
  const shadowRoot = host.shadowRoot;
  return shadowRoot.innerHTML;
});
```

### Session Issues

**Symptoms**:

- `Session "abc123" not found or expired`
- Session works initially but fails after a few minutes
- Multiple sessions interfering with each other

**Common Causes**:

1. Session expired (10-minute TTL)
2. Session ID typo
3. Server restarted (in-memory sessions lost)
4. Race condition with cleanup

**Solutions**:

1. **Check session list**:

```bash
# List all active sessions
lean-browser session list
```

2. **Increase session TTL** (programmatic):

```javascript
// src/session-manager.js
const SESSION_TTL_MS = 30 * 60 * 1000; // Increase to 30 minutes
```

3. **Keep session alive**:

```bash
# Refresh session activity
lean-browser session snapshot --session $SESSION
```

4. **Use session immediately after creation**:

```bash
# Don't delay between creation and use
SESSION=$(lean-browser session start --url https://example.com | jq -r .sessionId)
lean-browser session exec --session $SESSION --action "click:e1"  # Immediate use
```

5. **Implement persistent sessions** (Redis/database):

```javascript
import { Redis } from 'ioredis';
const redis = new Redis();

export async function createSession(url, options) {
  const id = randomUUID().slice(0, 8);
  const session = { /* ... */ };
  await redis.setex(`session:${id}`, 1800, JSON.stringify(session));
  return { sessionId: id };
}

export function getSession(sessionId) {
  const data = await redis.get(`session:${sessionId}`);
  if (!data) throw new Error('Session not found');
  return JSON.parse(data);
}
```

## Error Messages

### `ElementNotFoundError`

**Full message**: `Element "e1" not found (Available: e2, e3, e4)`

**Meaning**: The element ID you're trying to interact with doesn't exist in the current page state.

**Solutions**:

1. Run interactive mode first to see available elements
2. Check if element ID is correct
3. Verify page navigation succeeded before action
4. Element may have changed after page navigation

```bash
# Get current element list
lean-browser https://yoursite.com --mode interactive | jq '.elements[].id'
```

### `ActionTimeoutError`

**Full message**: `Action timed out after 10000ms: click`

**Meaning**: The action couldn't complete within the timeout period.

**Solutions**:

1. Increase action timeout (programmatic only):

```javascript
const executor = new ActionExecutor(page, elementMap, {
  defaultTimeoutMs: 30000, // Increase from 10s
});
```

2. Check if element is actually clickable in headed mode
3. Element may be overlapped by another element

### `ValidationError`

**Full message**: `Invalid action spec (missing ":"): "clicke1"`

**Meaning**: Action syntax is incorrect.

**Solution**: Fix action syntax:

```bash
# Wrong
--actions "clicke1"

# Correct
--actions "click:e1"
```

### `TimeoutError: page.goto`

**Full message**: `TimeoutError: page.goto: Timeout 45000ms exceeded`

**Meaning**: Page failed to load within timeout.

**Solutions**: See [Timeouts](#timeouts) section above.

## Debug Mode

### Enable Headed Browser

See what the browser is actually doing:

```bash
lean-browser https://example.com --headed
```

The browser window will open and you can watch the automation in real-time.

### Playwright Debug Logs

```bash
# API-level logs
DEBUG=pw:api lean-browser https://example.com

# Protocol-level logs (very verbose)
DEBUG=pw:protocol lean-browser https://example.com

# Browser console logs
DEBUG=pw:browser lean-browser https://example.com
```

### Interactive Debugging

Pause execution and debug with DevTools:

```javascript
import { launchBrowser, navigateAndWait } from 'lean-browser/src/browser.js';

const { browser, context, page } = await launchBrowser({ headless: false });
await navigateAndWait(page, url);

// Pause and open DevTools
await page.pause();

// Or set a debugger breakpoint
debugger; // Use node --inspect-brk
```

### Save Screenshots

```javascript
await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
```

### Inspect Element Map

```bash
# See what elements were extracted
lean-browser https://example.com --mode interactive | jq '.elements[]'
```

### Custom Logging

```javascript
// Add to src/browser.js
console.log('Navigating to:', url);
console.log('Final URL:', page.url());
console.log('Page title:', await page.title());
```

## Performance Tuning

### Slow Page Loads

1. **Disable auto-scroll** (saves ~3-5 seconds):

```javascript
// src/browser.js navigateAndWait()
// Comment out: await autoScroll(page).catch(() => {});
```

2. **Reduce network idle timeout**:

```javascript
// src/browser.js navigateAndWait()
await page.waitForLoadState('networkidle', { timeout: 5000 }); // Reduce from 15s
```

3. **Block unnecessary resources**:

```javascript
await page.route('**/*', (route) => {
  const url = route.request().url();
  if (url.includes('analytics') || url.includes('.jpg') || url.includes('.png')) {
    route.abort();
  } else {
    route.continue();
  }
});
```

### High Memory Usage

See [Out of Memory](#out-of-memory) section above.

### Token Budget Not Respected

1. **Check token estimation**:

```javascript
import { estimateTokens } from 'lean-browser/src/tokenizer.js';

const text = 'Your content...';
const tokens = await estimateTokens(text);
console.log('Estimated tokens:', tokens);
```

2. **Verify truncation is working**:

```bash
lean-browser https://long-article.com --tokens 500 | jq '.truncated'
# Should output: true
```

3. **Check JSON overhead**:

```javascript
// JSON structure adds overhead
const overhead = await estimateTokens(JSON.stringify({ url: '', status: null }));
console.log('Overhead tokens:', overhead); // ~20-50 tokens
```

## Getting Help

### Before Asking for Help

1. Run the diagnostic checklist above
2. Test with a simple URL (https://example.com)
3. Check if issue is site-specific or general
4. Collect error messages and logs
5. Note your environment (OS, Node.js version, lean-browser version)

### GitHub Issues

Include in your issue:

````
**Environment:**
- OS: macOS 14.2 / Ubuntu 22.04 / Windows 11
- Node.js: v20.10.0
- lean-browser: v0.2.0
- Playwright: v1.50.0

**Command/Code:**
```bash
lean-browser https://example.com --mode text --tokens 500
````

**Expected behavior:**
Clean article text

**Actual behavior:**
Empty output with (untitled)

**Logs:**

```
[paste error message or debug logs here]
```

**URL (if public):**
https://example.com

```

### Community Support

- GitHub Discussions: Ask questions and share tips
- GitHub Issues: Report bugs and request features
- Stack Overflow: Tag with `lean-browser` and `playwright`

### Debugging Tips

1. **Isolate the issue**: Does it happen with all URLs or just one?
2. **Simplify**: Remove unnecessary options and test basic case
3. **Compare**: Test with similar tools (Playwright directly, Puppeteer)
4. **Read the code**: lean-browser is small and readable
5. **Contribute**: Fix the issue and submit a PR!

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design and components
- [API Reference](./API.md) - Programmatic usage
- [Performance Guide](./PERFORMANCE.md) - Optimization strategies
- [README](../README.md) - Getting started guide
```
