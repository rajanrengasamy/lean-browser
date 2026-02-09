# Debugging Guide

This guide covers lean-browser's debugging and developer experience features.

## Debug Mode

Enable debug mode for verbose logging and additional diagnostic information:

```bash
# Enable debug mode with --debug flag
lean-browser fetch https://example.com --debug

# Or use DEBUG environment variable
DEBUG=lean-browser lean-browser fetch https://example.com

# Enable debug mode for all modules
DEBUG=* lean-browser fetch https://example.com
```

### Debug Mode Features

When debug mode is enabled, lean-browser will:

1. **Log all browser events**: Requests, responses, console messages, and errors
2. **Add timestamps**: All log entries include ISO 8601 timestamps
3. **Show stack traces**: Errors include full stack traces
4. **Log browser console**: Capture and display console.log/error from the page
5. **Track network activity**: Monitor all network requests and responses

### Saving Debug Artifacts

Save debugging artifacts for offline analysis:

```bash
# Save HAR (HTTP Archive) file
lean-browser fetch https://example.com --debug --save-har output.har

# Save rendered HTML
lean-browser fetch https://example.com --save-html output.html

# Save screenshot on error
lean-browser action https://example.com --actions "click:e1" --debug
# (screenshot automatically saved to lean-browser-error-{timestamp}.png on error)
```

## Log Levels

Control verbosity with log levels:

```bash
# Set log level (trace, debug, info, warn, error)
lean-browser fetch https://example.com --log-level debug

# Log to file
lean-browser fetch https://example.com --log-file debug.log

# Combine options
lean-browser fetch https://example.com --debug --log-level trace --log-file trace.log
```

### Log Level Descriptions

- **trace**: Most verbose - logs every detail
- **debug**: Detailed information for debugging
- **info**: General informational messages (default)
- **warn**: Warning messages
- **error**: Error messages only

## Progress Indicators

lean-browser shows progress for long-running operations:

```bash
# Shows "Launching browser..."
# Shows "Scrolling... 3/12"
# Shows "Extracting content..."
lean-browser fetch https://example.com
```

Progress indicators are automatically enabled unless:

- Output is not a TTY (e.g., piped to file)
- Log level is set to error or higher
- `--no-progress` flag is used

## Dry Run Mode

Validate actions without executing them:

```bash
# Dry run for actions
lean-browser action https://github.com/login \
  --actions "type:e1:user,type:e2:pass,click:e3" \
  --dry-run

# Output shows what would be executed:
# [DRY RUN] Would execute: type:e1:user
# [DRY RUN] Would execute: type:e2:pass
# [DRY RUN] Would execute: click:e3
# [DRY RUN] Element validation:
#   ✓ e1 exists (input[name="username"])
#   ✓ e2 exists (input[name="password"])
#   ✓ e3 exists (button[type="submit"])
```

### Dry Run Benefits

- **Validate element IDs** before running actions
- **Check action syntax** for errors
- **Preview execution** without side effects
- **Faster feedback** (doesn't launch browser)

## Error Context

When errors occur, lean-browser provides rich context:

### Standard Error Output

```
[lean-browser] Error: Element "e5" not found
Available elements: e1, e2, e3, e4
Last page: https://example.com/login
```

### Debug Mode Error Output

```
[2026-02-09T10:30:45.123Z] [lean-browser] [ERROR] Element "e5" not found
Stack trace:
  at ActionExecutor.execute (actions.js:156)
  at handleActionCommand (cli-action.js:34)

Browser console errors:
  [10:30:44] Uncaught TypeError: Cannot read property 'x' of undefined

Last 10 network requests:
  1. GET https://example.com/login (200 OK)
  2. GET https://example.com/static/css/main.css (200 OK)
  3. GET https://example.com/api/config (404 Not Found)
  ...

Screenshot saved: lean-browser-error-2026-02-09T10-30-45.png
```

## HAR Files

HAR (HTTP Archive) files capture all network activity for inspection:

```bash
# Generate HAR file
lean-browser fetch https://example.com --save-har example.har

# View in Chrome DevTools:
# 1. Open Chrome DevTools (F12)
# 2. Go to Network tab
# 3. Right-click > Import HAR file
# 4. Select example.har
```

### HAR File Contents

- All HTTP requests and responses
- Request/response headers
- Timing information
- Response sizes
- Status codes

## Debugging Specific Issues

### Browser Not Launching

```bash
# Enable debug mode
DEBUG=lean-browser lean-browser fetch https://example.com --headed

# Check Playwright installation
npx playwright install chromium --force
```

### Element Not Found

```bash
# Get interactive element map
lean-browser fetch https://example.com --mode interactive --tokens 2000

# Use dry-run to validate
lean-browser action https://example.com --actions "click:e1" --dry-run
```

### Network Issues

```bash
# Capture all network activity
lean-browser fetch https://example.com --debug --save-har network.har

# Check for blocked requests
lean-browser fetch https://example.com --debug | grep "Request failed"
```

### Performance Issues

```bash
# Enable trace logging
DEBUG=* lean-browser fetch https://example.com --log-level trace --log-file trace.log

# Review timing in trace.log
grep "Scrolling" trace.log
grep "Extracting" trace.log
```

## Environment Variables

- `DEBUG`: Enable debug mode for specific modules
  - `DEBUG=*` - All modules
  - `DEBUG=lean-browser` - lean-browser only
  - `DEBUG=lean-browser:browser` - Browser module only

- `LOG_LEVEL`: Set default log level (trace, debug, info, warn, error)

- `NO_COLOR`: Disable colored output

## Programmatic Usage with Debug

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { initLogger } from 'lean-browser/src/logger.js';

// Initialize logger
const logger = initLogger({
  level: 'debug',
  debugMode: true,
  logFile: 'debug.log',
});

// Fetch with debug options
const result = await fetchRenderedHtml('https://example.com', {
  debugMode: true,
  saveHar: 'example.har',
  saveHtml: 'example.html',
  logger,
});
```

## Best Practices

1. **Start with --debug**: When troubleshooting, always enable debug mode first
2. **Use --dry-run**: Test actions before executing them
3. **Save artifacts**: Keep HAR and HTML files for complex issues
4. **Check logs**: Review log files for patterns and trends
5. **Enable headed mode**: Use `--headed` to watch browser behavior
6. **Validate elements**: Use interactive mode to inspect element IDs

## Common Debug Patterns

### Debugging a failing action sequence

```bash
# Step 1: Get element map
lean-browser fetch URL --mode interactive > elements.json

# Step 2: Dry run actions
lean-browser action URL --actions "..." --dry-run

# Step 3: Run with debug
lean-browser action URL --actions "..." --debug --headed

# Step 4: Review artifacts
# - Check screenshot (if error occurred)
# - Review HAR file for network issues
# - Check debug.log for detailed timing
```

### Debugging extraction issues

```bash
# Save HTML for inspection
lean-browser fetch URL --save-html page.html

# Compare modes
lean-browser fetch URL --mode text > text.txt
lean-browser fetch URL --mode json > json.txt

# Enable trace logging
lean-browser fetch URL --log-level trace --log-file trace.log
```

## Support

For additional help:

- GitHub Issues: https://github.com/YOUR_USERNAME/lean-browser/issues
- Include: `--debug` output, HAR file, and screenshots when reporting bugs
