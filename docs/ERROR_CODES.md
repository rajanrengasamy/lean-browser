# Error Codes Quick Reference

## Error Code Table

| Code                   | Error Type             | Retryable         | Max Retries | Delay        | Description                       |
| ---------------------- | ---------------------- | ----------------- | ----------- | ------------ | --------------------------------- |
| `E_TIMEOUT`            | TimeoutError           | ✅ Yes            | 3           | 1s → 2s → 4s | Navigation exceeded timeout limit |
| `E_NETWORK`            | NetworkError           | ✅ Yes            | 2           | 1s → 2s      | Network connectivity error        |
| `E_DNS`                | DNSError               | ✅ Yes            | 3           | 2s → 4s → 8s | DNS resolution failed             |
| `E_CONNECTION_REFUSED` | ConnectionRefusedError | ✅ Yes            | 2           | 1.5s → 3s    | Server refused connection         |
| `E_SERVER_ERROR`       | ServerError            | ✅ Yes (5xx only) | 2           | 1s → 2s      | HTTP 5xx server error             |
| `E_ANTIBOT`            | AntiBotError           | ❌ No             | 0           | -            | Anti-bot protection detected      |
| `E_BROWSER_CRASH`      | BrowserCrashError      | ✅ Yes            | Auto        | -            | Browser process crashed           |
| `E_EXTRACTION_FAILED`  | ExtractionError        | ⚠️ Fallback       | -           | -            | Content extraction failed         |
| `E_INVALID_URL`        | BrowserError           | ❌ No             | 0           | -            | Invalid or unsafe URL             |
| `E_UNKNOWN`            | BrowserError           | ❌ No             | 0           | -            | Unknown error                     |

## Error Properties

Every error includes:

```javascript
{
  name: 'ErrorType',          // e.g., 'TimeoutError'
  code: 'E_CODE',             // e.g., 'E_TIMEOUT'
  message: 'Description',     // Human-readable description
  url: 'https://...',         // URL that failed
  statusCode: 404,            // HTTP status (if applicable)
  suggestion: 'Try...',       // Helpful suggestion
  cause: originalError        // Original error object
}
```

## CLI Error Output Format

```
Error [E_TIMEOUT]: Navigation timeout after 30000ms for https://example.com
URL: https://example.com
Suggestion: Try increasing timeout with --timeout 60000
```

## Anti-Bot Detection Types

| Detection Type | Indicators                                                          | Status Code        |
| -------------- | ------------------------------------------------------------------- | ------------------ |
| `cloudflare`   | cf-browser-verification, challenge-running, "Checking your browser" | Usually 403 or 503 |
| `recaptcha`    | g-recaptcha, recaptcha in HTML                                      | Usually 200        |
| `forbidden`    | Generic anti-bot response                                           | 403                |

## Common Suggestions

| Error                  | Suggestion                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| E_TIMEOUT              | Try increasing timeout with --timeout {double}                          |
| E_NETWORK              | Check your internet connection and try again                            |
| E_DNS                  | Check the domain name and your DNS settings                             |
| E_CONNECTION_REFUSED   | The server may be down or the port may be incorrect                     |
| E_SERVER_ERROR (5xx)   | The server is experiencing issues. Try again later.                     |
| E_ANTIBOT (cloudflare) | Cloudflare challenge detected. This site requires browser verification. |
| E_ANTIBOT (recaptcha)  | reCAPTCHA detected. This site requires human verification.              |
| E_ANTIBOT (forbidden)  | Access forbidden (403). The site may be blocking automated requests.    |
| E_BROWSER_CRASH        | Browser process crashed. This may be a system resource issue.           |
| E_EXTRACTION_FAILED    | The page structure may be unusual. Check the HTML content.              |

## Handling Errors in Code

### Check Error Code

```javascript
try {
  await fetchRenderedHtml(url);
} catch (error) {
  if (error.code === 'E_ANTIBOT') {
    console.log('Anti-bot detected');
  }
}
```

### Check Error Type

```javascript
import { TimeoutError, AntiBotError } from './src/errors.js';

try {
  await fetchRenderedHtml(url);
} catch (error) {
  if (error instanceof TimeoutError) {
    // Handle timeout
  } else if (error instanceof AntiBotError) {
    // Handle anti-bot
  }
}
```

### Access Error Properties

```javascript
try {
  await fetchRenderedHtml(url);
} catch (error) {
  console.log('Error code:', error.code);
  console.log('URL:', error.url);
  console.log('Status:', error.statusCode);
  console.log('Suggestion:', error.suggestion);
  console.log('Cause:', error.cause);
}
```

### Serialize to JSON

```javascript
try {
  await fetchRenderedHtml(url);
} catch (error) {
  const json = error.toJSON();
  console.log(JSON.stringify(json, null, 2));
}
```

## Retry Behavior

### Automatic Retry

```javascript
// Default: retry enabled
await fetchRenderedHtml(url);

// Explicit control
await fetchRenderedHtml(url, {
  enableRetry: true,
  onRetry: (error, attempt) => {
    console.log(`Retry ${attempt}: ${error.name}`);
  },
});
```

### Disable Retry

```javascript
await fetchRenderedHtml(url, {
  enableRetry: false,
});
```

### Manual Retry

```javascript
import { withRetry } from './src/retry.js';

await withRetry(
  async () => {
    // Your operation
  },
  {
    maxRetries: 5,
    baseDelayMs: 500,
    onRetry: (error, attempt) => {
      console.log(`Retry ${attempt}`);
    },
  },
);
```

## Exit Codes

CLI exits with code 1 on any error:

```bash
lean-browser https://invalid.com
# Exit code: 1
```

Success:

```bash
lean-browser https://example.com
# Exit code: 0
```

## Related Documentation

- [ERROR_HANDLING.md](../ERROR_HANDLING.md) - Complete error handling guide
- [examples/error-handling-demo.js](../examples/error-handling-demo.js) - Working examples
- [IMPROVEMENTS_SUMMARY.md](../IMPROVEMENTS_SUMMARY.md) - Implementation details
