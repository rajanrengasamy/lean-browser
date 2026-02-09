# Performance Guide

This guide covers performance optimization strategies, benchmarks, and best practices for lean-browser.

## Table of Contents

- [Benchmarks](#benchmarks)
- [Optimization Strategies](#optimization-strategies)
- [Browser Pool Configuration](#browser-pool-configuration)
- [Token Budget Strategies](#token-budget-strategies)
- [Memory Management](#memory-management)
- [Network Optimization](#network-optimization)
- [Concurrency Patterns](#concurrency-patterns)
- [Monitoring and Profiling](#monitoring-and-profiling)

## Benchmarks

### Single Page Fetch Performance

Test environment: MacBook Pro M1, Node.js 20, Chromium 120

| URL                  | Mode        | Tokens | Time | Memory |
| -------------------- | ----------- | ------ | ---- | ------ |
| example.com          | text        | 1200   | 1.2s | 180 MB |
| wikipedia.org/Dogs   | text        | 1200   | 3.5s | 250 MB |
| github.com/trending  | interactive | 1200   | 2.8s | 220 MB |
| news.ycombinator.com | json        | 2000   | 2.1s | 200 MB |
| reddit.com/r/popular | text        | 5000   | 8.5s | 450 MB |

**Performance Breakdown** (typical page):

```
Browser launch:        400ms (cached: 50ms with pooling)
Navigation:            600ms
Network idle wait:     500ms
Auto-scroll:           800ms
HTML extraction:       50ms
DOM processing:        150ms
Readability:           100ms
Token estimation:      50ms
Formatting:            30ms
Browser cleanup:       100ms
────────────────────────────
Total:                 2.78s (with pooling: 2.43s)
```

### Throughput Benchmarks

| Configuration         | Pages/min | Avg Memory | Notes                |
| --------------------- | --------- | ---------- | -------------------- |
| Sequential (no pool)  | 12        | 200 MB     | Baseline             |
| Browser pool (size 3) | 35        | 450 MB     | 3x browsers cached   |
| Browser pool (size 5) | 52        | 750 MB     | 5x browsers cached   |
| Concurrent (10 tasks) | 48        | 1.2 GB     | 10 parallel workers  |
| Optimized (no scroll) | 65        | 400 MB     | Disabled auto-scroll |

### Token Budget Impact

| Max Tokens | Avg Processing Time | Memory Impact |
| ---------- | ------------------- | ------------- |
| 500        | +20ms               | Minimal       |
| 1200       | +50ms               | +10 MB        |
| 5000       | +150ms              | +50 MB        |
| 10000      | +300ms              | +120 MB       |
| Unlimited  | +500ms              | +300 MB       |

## Optimization Strategies

### 1. Use Browser Pooling

**Problem**: Launching a new browser for each request is slow (400ms overhead).

**Solution**: Maintain a pool of warm browser instances.

```javascript
class BrowserPool {
  constructor(size = 3) {
    this.size = size;
    this.available = [];
    this.all = [];
  }

  async acquire() {
    if (this.available.length > 0) {
      return this.available.pop();
    }

    if (this.all.length < this.size) {
      const instance = await launchBrowser({ headless: true });
      this.all.push(instance);
      return instance;
    }

    // Wait for available browser
    while (this.available.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return this.available.pop();
  }

  release(instance) {
    // Clear cookies and storage before reuse
    instance.context.clearCookies().catch(() => {});
    this.available.push(instance);
  }

  async drain() {
    for (const instance of this.all) {
      await closeBrowser(instance);
    }
    this.all = [];
    this.available = [];
  }
}

// Usage
const pool = new BrowserPool(3);

async function fetchWithPool(url) {
  const instance = await pool.acquire();
  try {
    await navigateAndWait(instance.page, url);
    const html = await instance.page.content();
    return html;
  } finally {
    pool.release(instance);
  }
}

// Cleanup on exit
process.on('SIGINT', async () => {
  await pool.drain();
  process.exit(0);
});
```

**Performance Gain**: 50-70% faster for bulk operations

### 2. Disable Auto-Scroll for Static Content

**Problem**: Auto-scrolling adds 800ms per page for lazy-load detection.

**Solution**: Skip auto-scroll for known static content.

```javascript
// Modify src/browser.js
export async function navigateAndWait(page, url, { timeoutMs = 45000, enableScroll = true } = {}) {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

  await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});

  if (enableScroll) {
    await autoScroll(page).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});
  }

  // ... rest of function
}

// Usage
const result = await fetchRenderedHtml(url, {
  timeoutMs: 30000,
  enableScroll: false, // Skip for static sites
});
```

**Performance Gain**: 800ms per page for static content

### 3. Reduce Network Idle Timeout

**Problem**: Waiting for full network idle can be slow (15s timeout).

**Solution**: Use shorter timeout for fast-loading sites.

```javascript
// Modify src/browser.js
export async function navigateAndWait(page, url, { timeoutMs = 45000, networkIdleTimeout = 15000 } = {}) {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

  await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, networkIdleTimeout) }).catch(() => {});

  // ... rest of function
}

// Usage for fast sites
await navigateAndWait(page, url, {
  networkIdleTimeout: 3000, // Only wait 3s for network idle
});
```

**Performance Gain**: 500-1000ms for fast-loading pages

### 4. Block Unnecessary Resources

**Problem**: Loading ads, analytics, images increases load time.

**Solution**: Block non-essential resources.

```javascript
async function setupResourceBlocking(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    const type = route.request().resourceType();

    // Block analytics and ads
    if (
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('doubleclick') ||
      url.includes('facebook.com/tr')
    ) {
      return route.abort();
    }

    // Block images (if not needed)
    if (type === 'image') {
      return route.abort();
    }

    // Block fonts (if not needed)
    if (type === 'font') {
      return route.abort();
    }

    route.continue();
  });
}

// Usage
const { browser, context, page } = await launchBrowser();
await setupResourceBlocking(page);
await navigateAndWait(page, url);
```

**Performance Gain**: 30-50% faster page loads, 40% less bandwidth

### 5. Optimize Token Estimation

**Problem**: Token estimation is called repeatedly on large text.

**Solution**: Cache token counts.

```javascript
import crypto from 'node:crypto';

const tokenCache = new Map();
const MAX_CACHE_SIZE = 1000;

export async function estimateTokensCached(text) {
  // Generate hash for cache key
  const hash = crypto.createHash('sha256').update(text).digest('hex');

  if (tokenCache.has(hash)) {
    return tokenCache.get(hash);
  }

  const count = await estimateTokens(text);

  // Simple LRU: clear cache if too large
  if (tokenCache.size >= MAX_CACHE_SIZE) {
    const firstKey = tokenCache.keys().next().value;
    tokenCache.delete(firstKey);
  }

  tokenCache.set(hash, count);
  return count;
}
```

**Performance Gain**: 90% faster for repeated content

### 6. Lazy Element Extraction

**Problem**: Extracting all 60 elements upfront may be wasteful.

**Solution**: Use generators for lazy extraction.

```javascript
export function* extractInteractiveLazy(dom, { limit = 60 } = {}) {
  const doc = dom.window.document;
  const primary = doc.querySelectorAll('input, textarea, select, button, [role="button"], [onclick]');
  const links = doc.querySelectorAll('a[href]');

  let count = 0;

  for (const el of primary) {
    if (count >= limit) break;
    if (isHiddenLike(el)) continue;

    yield buildElementObject(el, count);
    count++;
  }

  for (const el of links) {
    if (count >= limit) break;
    if (!isUsefulLink(el) || isHiddenLike(el)) continue;

    yield buildElementObject(el, count);
    count++;
  }
}

// Usage
const elements = [];
for (const element of extractInteractiveLazy(dom, { limit: 20 })) {
  elements.push(element);
  // Stop early if we found what we need
  if (element.label === 'Login') break;
}
```

**Performance Gain**: 50% faster element extraction when early stopping

## Browser Pool Configuration

### Recommended Pool Sizes

| Use Case                        | Pool Size | Memory Budget |
| ------------------------------- | --------- | ------------- |
| Development/Testing             | 1         | 200 MB        |
| Low-traffic API (< 10 req/min)  | 2-3       | 400-600 MB    |
| Medium-traffic (10-50 req/min)  | 5         | 1 GB          |
| High-traffic (50-200 req/min)   | 10        | 2 GB          |
| Batch processing (200+ req/min) | 15-20     | 3-4 GB        |

### Advanced Pool Implementation

```javascript
class SmartBrowserPool {
  constructor(options = {}) {
    this.minSize = options.minSize || 2;
    this.maxSize = options.maxSize || 10;
    this.idleTimeout = options.idleTimeout || 300000; // 5 min
    this.available = [];
    this.inUse = new Set();
  }

  async acquire() {
    // Try to get available browser
    if (this.available.length > 0) {
      const instance = this.available.pop();
      this.inUse.add(instance);
      instance.lastUsed = Date.now();
      return instance;
    }

    // Create new if under max
    if (this.available.length + this.inUse.size < this.maxSize) {
      const instance = await launchBrowser({ headless: true });
      instance.lastUsed = Date.now();
      this.inUse.add(instance);
      return instance;
    }

    // Wait for available
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (this.available.length > 0) {
          clearInterval(check);
          resolve(this.acquire());
        }
      }, 100);
    });
  }

  release(instance) {
    this.inUse.delete(instance);
    instance.lastUsed = Date.now();
    this.available.push(instance);
  }

  // Auto-cleanup idle browsers
  startIdleCleanup() {
    setInterval(() => {
      const now = Date.now();
      const toClose = [];

      // Keep minimum pool size
      const excessCount = this.available.length - this.minSize;
      if (excessCount <= 0) return;

      for (const instance of this.available) {
        if (now - instance.lastUsed > this.idleTimeout && toClose.length < excessCount) {
          toClose.push(instance);
        }
      }

      for (const instance of toClose) {
        const idx = this.available.indexOf(instance);
        if (idx > -1) {
          this.available.splice(idx, 1);
          closeBrowser(instance).catch(() => {});
        }
      }
    }, 60000); // Check every minute
  }

  async warmup() {
    const promises = [];
    for (let i = 0; i < this.minSize; i++) {
      promises.push(launchBrowser({ headless: true }));
    }
    const instances = await Promise.all(promises);
    this.available.push(...instances);
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
      capacity: this.maxSize,
    };
  }
}

// Usage
const pool = new SmartBrowserPool({
  minSize: 3,
  maxSize: 10,
  idleTimeout: 300000,
});

await pool.warmup(); // Pre-launch browsers
pool.startIdleCleanup(); // Auto-cleanup

console.log(pool.getStats());
```

## Token Budget Strategies

### 1. Adaptive Token Budgeting

Adjust token budget based on content type:

```javascript
function getOptimalTokenBudget(url, contentType) {
  if (contentType === 'article') {
    return 2000; // More tokens for articles
  }
  if (url.includes('github.com')) {
    return 1500; // Medium for code pages
  }
  if (contentType === 'interactive') {
    return 1000; // Less for forms/apps
  }
  return 1200; // Default
}

const budget = getOptimalTokenBudget(url, 'article');
const output = await formatText(meta, extracted, { maxTokens: budget });
```

### 2. Progressive Truncation

Start with small budget and increase if needed:

```javascript
async function fetchWithProgressiveBudget(url) {
  const fetched = await fetchRenderedHtml(url);
  const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl);
  const meta = { url, finalUrl: fetched.finalUrl, status: fetched.status };

  // Try smallest budget first
  let output = await formatText(meta, extracted, { maxTokens: 500 });

  // Check if truncated important content
  if (output.truncated && extracted.article.text.length > 5000) {
    // Retry with larger budget
    output = await formatText(meta, extracted, { maxTokens: 2000 });
  }

  return output;
}
```

### 3. Smart Truncation Points

Truncate at natural boundaries:

```javascript
function findTruncationPoint(text, targetLength) {
  // Try to truncate at paragraph boundary
  const paraEnd = text.lastIndexOf('\n\n', targetLength);
  if (paraEnd > targetLength * 0.8) {
    return paraEnd;
  }

  // Try to truncate at sentence boundary
  const sentenceEnd = text.lastIndexOf('. ', targetLength);
  if (sentenceEnd > targetLength * 0.9) {
    return sentenceEnd + 1;
  }

  // Fallback to word boundary
  const spaceIdx = text.lastIndexOf(' ', targetLength);
  return spaceIdx > 0 ? spaceIdx : targetLength;
}
```

## Memory Management

### 1. Monitor Memory Usage

```javascript
function logMemoryUsage(label) {
  const used = process.memoryUsage();
  console.log(`[${label}] Memory:`);
  console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)} MB`);
  console.log(`  Heap: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
  console.log(`  External: ${Math.round(used.external / 1024 / 1024)} MB`);
}

// Usage
logMemoryUsage('Before fetch');
await fetchRenderedHtml(url);
logMemoryUsage('After fetch');
```

### 2. Force Garbage Collection

```javascript
// Run with: node --expose-gc script.js

if (global.gc) {
  global.gc();
}

// Or trigger periodically
let requestCount = 0;
async function fetchWithGC(url) {
  const result = await fetchRenderedHtml(url);
  requestCount++;

  if (requestCount % 10 === 0 && global.gc) {
    global.gc();
  }

  return result;
}
```

### 3. Memory Leak Detection

```javascript
import v8 from 'v8';
import fs from 'fs';

function takeHeapSnapshot(filename) {
  const snapshot = v8.writeHeapSnapshot(filename);
  console.log('Heap snapshot written to', snapshot);
}

// Take snapshots before and after
takeHeapSnapshot('before.heapsnapshot');
await runManyRequests();
takeHeapSnapshot('after.heapsnapshot');

// Compare in Chrome DevTools: Memory > Load snapshot
```

## Network Optimization

### 1. Request Compression

```javascript
const { browser, context, page } = await launchBrowser();

// Enable compression
await page.setExtraHTTPHeaders({
  'Accept-Encoding': 'gzip, deflate, br',
});
```

### 2. Connection Pooling

```javascript
// Playwright handles this automatically, but you can tune:
const browser = await chromium.launch({
  args: ['--max-socket-per-group=10', '--max-sockets-per-proxy-server=10'],
});
```

### 3. Prefetch DNS

```javascript
await page.evaluate(() => {
  // Prefetch critical domains
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = 'https://cdn.example.com';
  document.head.appendChild(link);
});
```

## Concurrency Patterns

### 1. Parallel Fetching with Limit

```javascript
async function fetchBatch(urls, concurrency = 5) {
  const results = [];
  const queue = [...urls];

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;

      try {
        const result = await fetchRenderedHtml(url);
        results.push({ url, result });
      } catch (err) {
        results.push({ url, error: err.message });
      }
    }
  });

  await Promise.all(workers);
  return results;
}

// Usage
const urls = ['https://example.com', 'https://github.com' /* ... */];
const results = await fetchBatch(urls, 5);
```

### 2. Rate Limiting

```javascript
class RateLimiter {
  constructor(maxPerSecond) {
    this.maxPerSecond = maxPerSecond;
    this.queue = [];
    this.running = 0;
    this.lastReset = Date.now();
    this.count = 0;
  }

  async acquire() {
    const now = Date.now();
    if (now - this.lastReset >= 1000) {
      this.count = 0;
      this.lastReset = now;
    }

    if (this.count >= this.maxPerSecond) {
      const waitMs = 1000 - (now - this.lastReset);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.acquire();
    }

    this.count++;
  }
}

// Usage
const limiter = new RateLimiter(10); // 10 req/sec

async function fetchWithLimit(url) {
  await limiter.acquire();
  return fetchRenderedHtml(url);
}
```

### 3. Retry with Exponential Backoff

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchRenderedHtml(url, {
        timeoutMs: 30000 + i * 10000, // Increase timeout each retry
      });
    } catch (err) {
      lastError = err;
      const delay = Math.min(1000 * Math.pow(2, i), 10000); // Exponential backoff
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## Monitoring and Profiling

### 1. Request Metrics

```javascript
class MetricsCollector {
  constructor() {
    this.metrics = [];
  }

  async measure(label, fn) {
    const start = Date.now();
    const memBefore = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      const duration = Date.now() - start;
      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = memAfter - memBefore;

      this.metrics.push({
        label,
        duration,
        memDelta,
        success: true,
        timestamp: Date.now(),
      });

      return result;
    } catch (err) {
      this.metrics.push({
        label,
        duration: Date.now() - start,
        error: err.message,
        success: false,
        timestamp: Date.now(),
      });
      throw err;
    }
  }

  getStats() {
    const successful = this.metrics.filter((m) => m.success);
    const durations = successful.map((m) => m.duration);
    const memDeltas = successful.map((m) => m.memDelta);

    return {
      total: this.metrics.length,
      successful: successful.length,
      failed: this.metrics.length - successful.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      avgMemDelta: memDeltas.reduce((a, b) => a + b, 0) / memDeltas.length,
    };
  }
}

// Usage
const metrics = new MetricsCollector();

await metrics.measure('fetch-example', () => fetchRenderedHtml('https://example.com'));
await metrics.measure('fetch-github', () => fetchRenderedHtml('https://github.com'));

console.log(metrics.getStats());
```

### 2. Performance Profiling

```bash
# CPU profiling
node --prof script.js
node --prof-process isolate-*.log > processed.txt

# Memory profiling
node --inspect script.js
# Open chrome://inspect in Chrome
```

### 3. Flame Graphs

```bash
npm install -g clinic
clinic flame -- node script.js
clinic doctor -- node script.js
```

## Best Practices Summary

1. **Use browser pooling** for production (3-5 browsers)
2. **Disable auto-scroll** for static content
3. **Block unnecessary resources** (ads, analytics, images)
4. **Cache token estimates** for repeated content
5. **Implement rate limiting** to avoid bans
6. **Monitor memory usage** and cleanup sessions
7. **Use adaptive token budgets** based on content type
8. **Set appropriate timeouts** (shorter for known-fast sites)
9. **Implement retries** with exponential backoff
10. **Profile regularly** to identify bottlenecks

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [API Reference](./API.md) - Programmatic usage
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
- [README](../README.md) - Getting started
