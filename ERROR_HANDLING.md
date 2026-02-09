# Error Handling & Retry Logic

This document describes the comprehensive error handling and retry logic implemented in lean-browser.

## Overview

lean-browser now includes robust error handling with automatic retry logic for transient failures, anti-bot detection, and graceful degradation when content extraction fails.

## Error Types

### Custom Error Classes

All errors extend `BrowserError` which includes:

- `code`: Error code (e.g., `E_TIMEOUT`, `E_ANTIBOT`)
- `url`: The URL that failed
- `statusCode`: HTTP status code (when applicable)
- `suggestion`: Helpful suggestion for fixing the error
- `cause`: Original error that triggered this error

### Error Codes

| Code                   | Description                  | Retryable          |
| ---------------------- | ---------------------------- | ------------------ |
| `E_TIMEOUT`            | Navigation timeout           | Yes (3 retries)    |
| `E_NETWORK`            | Network connectivity error   | Yes (2 retries)    |
| `E_DNS`                | DNS resolution failure       | Yes (3 retries)    |
| `E_CONNECTION_REFUSED` | Server refused connection    | Yes (2 retries)    |
| `E_SERVER_ERROR`       | 5xx server error             | Yes (2 retries)    |
| `E_ANTIBOT`            | Anti-bot protection detected | No                 |
| `E_BROWSER_CRASH`      | Browser process crashed      | Yes (auto-restart) |
| `E_EXTRACTION_FAILED`  | Content extraction failed    | No (uses fallback) |
| `E_INVALID_URL`        | Invalid URL format           | No                 |
| `E_UNKNOWN`            | Unknown error                | No                 |

### Specific Error Types

#### TimeoutError

Thrown when page navigation exceeds the timeout limit.

**Example:**

```javascript
TimeoutError: Navigation timeout after 30000ms for https://example.com
Suggestion: Try increasing timeout with --timeout 60000
```

#### NetworkError

Thrown for network connectivity issues.

**Example:**

```javascript
NetworkError: Network error for https://example.com: net::ERR_NETWORK_CHANGED
Suggestion: Check your internet connection and try again
```

#### DNSError

Thrown when domain name cannot be resolved.

**Example:**

```javascript
DNSError: DNS resolution failed for https://invalid-domain.com
Suggestion: Check the domain name and your DNS settings
```

#### ConnectionRefusedError

Thrown when the server refuses the connection.

**Example:**

```javascript
ConnectionRefusedError: Connection refused for http://localhost:9999
Suggestion: The server may be down or the port may be incorrect
```

#### ServerError

Thrown for HTTP 5xx errors.

**Example:**

```javascript
ServerError: Server error 503 for https://example.com
Suggestion: The server is experiencing issues. Try again later.
```

#### AntiBotError

Thrown when anti-bot protection is detected (Cloudflare, reCAPTCHA, 403 Forbidden).

**Detection Types:**

- `cloudflare`: Cloudflare challenge page detected
- `recaptcha`: reCAPTCHA detected on page
- `forbidden`: HTTP 403 response (generic anti-bot)

**Example:**

```javascript
AntiBotError: Anti-bot protection detected on https://example.com (cloudflare)
Suggestion: Cloudflare challenge detected. This site requires browser verification.
```

**Anti-bot Indicators:**

- Cloudflare: `cf-browser-verification`, `challenge-running`, "Checking your browser"
- reCAPTCHA: `g-recaptcha`, `recaptcha` in HTML
- Generic: HTTP 403 status code

#### BrowserCrashError

Thrown when the browser process crashes unexpectedly.

**Example:**

```javascript
BrowserCrashError: Browser crashed while loading https://example.com
Suggestion: Browser process crashed. This may be a system resource issue.
```

#### ExtractionError

Thrown when content extraction from HTML fails.

**Example:**

```javascript
ExtractionError: Content extraction failed for https://example.com: Insufficient content extracted from page
Suggestion: The page structure may be unusual. Check the HTML content.
```

## Retry Logic

### Automatic Retry

The retry logic uses exponential backoff with jitter to prevent thundering herd problems.

**Retry Configuration:**

| Error Type         | Max Retries | Base Delay | Strategy            |
| ------------------ | ----------- | ---------- | ------------------- |
| Timeout            | 3           | 1000ms     | Exponential backoff |
| DNS                | 3           | 2000ms     | Exponential backoff |
| Connection Refused | 2           | 1500ms     | Exponential backoff |
| 5xx Server Error   | 2           | 1000ms     | Exponential backoff |
| Network Error      | 2           | 1000ms     | Exponential backoff |

**Exponential Backoff:**

- Attempt 1: ~1000ms (with ±25% jitter)
- Attempt 2: ~2000ms (with ±25% jitter)
- Attempt 3: ~4000ms (with ±25% jitter)
- Maximum delay: 10000ms

### Usage

#### Automatic Retry (Recommended)

```javascript
import { fetchRenderedHtml } from './src/browser.js';

// Retry is enabled by default
const result = await fetchRenderedHtml('https://example.com', {
  enableRetry: true,
  onRetry: (error, attempt) => {
    console.log(`Retry attempt ${attempt} after ${error.name}`);
  },
});
```

#### Disable Retry

```javascript
const result = await fetchRenderedHtml('https://example.com', {
  enableRetry: false,
});
```

#### Manual Retry with Custom Configuration

```javascript
import { withRetry } from './src/retry.js';

const result = await withRetry(
  async () => {
    // Your operation here
  },
  {
    maxRetries: 5,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    onRetry: (error, attempt) => {
      console.log(`Retry ${attempt}:`, error.message);
    },
  },
);
```

#### Auto Retry (Automatic Configuration)

```javascript
import { withAutoRetry } from './src/retry.js';

// Automatically determines retry strategy based on error type
const result = await withAutoRetry(async () => {
  // Your operation
});
```

## Graceful Degradation

### Content Extraction Fallback

When Readability fails to extract article content, lean-browser falls back to extracting plain body text.

**Example:**

```javascript
import { extractAllFromHtml } from './src/extractor.js';

// Enable fallback (default)
const result = extractAllFromHtml(html, url, { enableFallback: true });

if (result.article.fallback) {
  console.log('Used fallback extraction');
}
```

**Fallback Behavior:**

1. Attempt Readability extraction
2. If Readability fails or returns null:
   - Extract plain text from `<body>`
   - Check if content length > 10 characters
   - If sufficient, return with `fallback: true` flag
3. If insufficient content:
   - Throw `ExtractionError` with helpful message

### Browser Crash Recovery

Browser crashes are automatically detected and trigger a retry with a fresh browser instance.

**Detection:**

- Browser "disconnected" event
- Page "closed" event
- "Target closed" error

**Recovery:**

1. Detect browser crash
2. Clean up crashed browser resources
3. Launch new browser instance
4. Retry navigation

## CLI Error Output

The CLI provides helpful error messages with suggestions:

```bash
$ lean-browser https://invalid-domain.com

Error [E_DNS]: DNS resolution failed for https://invalid-domain.com
URL: https://invalid-domain.com
Suggestion: Check the domain name and your DNS settings
```

**With Retry:**

```bash
$ lean-browser https://slow-site.com

[lean-browser] TimeoutError occurred. Retrying (attempt 1)...
[lean-browser] TimeoutError occurred. Retrying (attempt 2)...
Success!
```

## Best Practices

### 1. Always Enable Retry for Production

```javascript
const result = await fetchRenderedHtml(url, {
  enableRetry: true,
  onRetry: (error, attempt) => {
    logger.warn(`Retry ${attempt} for ${url}:`, error.message);
  },
});
```

### 2. Handle Anti-Bot Errors Gracefully

```javascript
try {
  const result = await fetchRenderedHtml(url);
} catch (error) {
  if (error.code === 'E_ANTIBOT') {
    console.log('Site has anti-bot protection:', error.detectionType);
    // Maybe try with different user agent or headless mode disabled
  }
}
```

### 3. Increase Timeout for Slow Sites

```javascript
const result = await fetchRenderedHtml(url, {
  timeoutMs: 90000, // 90 seconds
  enableRetry: true,
});
```

### 4. Use Fallback Extraction

```javascript
const { article } = extractAllFromHtml(html, url, {
  enableFallback: true,
});

if (article.fallback) {
  // Content may be less structured
  // Handle accordingly
}
```

### 5. Log Retry Attempts

```javascript
let retryCount = 0;
const result = await fetchRenderedHtml(url, {
  enableRetry: true,
  onRetry: (error, attempt) => {
    retryCount++;
    metrics.recordRetry(url, error.code, attempt);
  },
});
```

## Testing

### Unit Tests

- `test/unit/errors.test.js` - Error classification and detection
- `test/unit/retry.test.js` - Retry logic and backoff

### Integration Tests

- `test/integration/error-handling.test.js` - End-to-end error scenarios

**Run Tests:**

```bash
npm test                    # All tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
```

## Error Recovery Flowchart

```
Request → Navigate
    ↓
  Error?
    ↓ Yes
  Classify Error
    ↓
  Retryable?
    ↓ Yes
  Wait (exponential backoff)
    ↓
  Retry Count < Max?
    ↓ Yes
  Navigate (retry)
    ↓
  Success? → Return Result
    ↓ No
  Throw Last Error
    ↓
  Error Handler
    ↓
  Format Error
    ↓
  Return to User
```

## Anti-Bot Detection Algorithm

```
1. Check HTML content (case-insensitive)
2. If contains Cloudflare indicators:
   - "cf-browser-verification"
   - "challenge-running"
   - "__cf_chl_jschl_tk__"
   → Return AntiBotError(type="cloudflare")

3. If contains reCAPTCHA indicators:
   - "g-recaptcha"
   - "recaptcha"
   → Return AntiBotError(type="recaptcha")

4. If HTTP status = 403:
   → Return AntiBotError(type="forbidden")

5. Otherwise:
   → Return null (no anti-bot detected)
```

## Future Improvements

- [ ] Add CAPTCHA solving integration (optional)
- [ ] Support for more anti-bot services (DataDome, PerimeterX)
- [ ] Configurable retry strategies per error type
- [ ] Circuit breaker pattern for repeated failures
- [ ] Distributed tracing for retry chains
- [ ] Better detection of partial page loads
- [ ] Automatic browser restart on memory issues
