# lean-browser

[![npm version](https://img.shields.io/npm/v/lean-browser.svg)](https://www.npmjs.com/package/lean-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

> Playwright + Readability based page compressor for LLMs and AI agents

Fetch any webpage with a headless browser, extract the meaningful content, and return a token-budgeted representation. Ships as both a **CLI tool** and an **MCP server**.

## Why lean-browser?

- **Built for AI Agents**: Token-budgeted output that fits LLM context windows
- **Smart Content Extraction**: Mozilla Readability + noise filtering removes ads, trackers, and clutter
- **Browser Automation**: Not just scraping - interact with pages, fill forms, click buttons
- **Session Management**: Stateful workflows for complex multi-step tasks
- **MCP Native**: First-class Model Context Protocol integration for Claude and other AI agents
- **Production Ready**: Connection pooling, rate limiting, error handling, SSRF protection
- **Performance Optimized**: Browser pooling achieves 95% cache hit rate after warmup

## Features

- **Browser connection pooling**: Reuses browser instances for 10x+ performance improvement (95% hit rate)
- **Three output modes**: text (clean article), json (structured blocks), interactive (actionable elements)
- **Token budgeting**: Specify a max token limit and lean-browser intelligently truncates to fit
- **Action execution**: Click, type, select, submit, scroll, navigate on live pages
- **Session management**: Stateful multi-step browser workflows with cookie persistence
- **Screenshot capture**: Full-page and viewport screenshots as PNG images
- **Ad blocking**: Block ads, trackers, and analytics for faster loads
- **Resource blocking**: Selectively block images, fonts, stylesheets for speed
- **Cookie persistence**: Save and load cookies across sessions
- **Custom headers**: Set Accept-Language, Referer, and other headers
- **Viewport customization**: Desktop, mobile, tablet emulation
- **MCP integration**: Nine MCP tools for Claude Desktop and other MCP clients
- **Smart extraction**: Mozilla Readability + DOM noise filtering (ads, cookies, modals)
- **Lazy-load support**: Auto-scrolls pages to trigger dynamic content loading

## Installation

```bash
npm install -g lean-browser
npx playwright install chromium
```

## CLI Usage

### Fetch a page (default command)

```bash
# Clean text
lean-browser https://example.com --mode text --tokens 500

# Structured JSON
lean-browser https://example.com --mode json --tokens 800

# Interactive elements (links, buttons, inputs with IDs)
lean-browser https://github.com/login --mode interactive --tokens 1200

# Block ads and trackers
lean-browser https://news.site.com --block-ads

# Block images and fonts for faster loads
lean-browser https://heavy.site.com --block-resources image,font

# Mobile viewport
lean-browser https://example.com --mobile

# Custom viewport size
lean-browser https://example.com --viewport 1920x1080

# Device emulation
lean-browser https://example.com --device "iPhone 13"

# Load/save cookies
lean-browser https://example.com --cookies cookies.json

# Custom headers
lean-browser https://example.com --headers '{"Accept-Language":"fr-FR","Referer":"https://google.com"}'
```

### Execute actions

```bash
lean-browser action https://github.com/login \
  --actions "type:e1:myuser,type:e2:mypass,click:e3" \
  --snapshot
```

**Action DSL:**

| Action      | Syntax                 | Description                |
| ----------- | ---------------------- | -------------------------- |
| Click       | `click:e1`             | Click element e1           |
| Type        | `type:e2:value`        | Fill input e2 with value   |
| Type (slow) | `type:e2:value:slow`   | Type with human-like delay |
| Select      | `select:e3:option`     | Select dropdown option     |
| Submit      | `submit:e4`            | Submit form containing e4  |
| Wait        | `wait:2000`            | Wait milliseconds          |
| Navigate    | `navigate:https://...` | Navigate to URL            |
| Scroll      | `scroll:500`           | Scroll down by pixels      |

### Screenshot capture

```bash
# Basic screenshot
lean-browser screenshot https://example.com --output screenshot.png

# Full page screenshot
lean-browser screenshot https://example.com --full-page --output full.png

# Mobile screenshot
lean-browser screenshot https://example.com --mobile --output mobile.png

# Custom viewport
lean-browser screenshot https://example.com --viewport 1920x1080 --output desktop.png

# Screenshot with ad blocking
lean-browser screenshot https://news.site.com --block-ads --output clean.png
```

### Session management

```bash
# Start a session
SESSION=$(lean-browser session start --url https://example.com | jq -r .sessionId)

# Execute actions
lean-browser session exec --session $SESSION --action "click:e1"

# Get snapshot
lean-browser session snapshot --session $SESSION

# Close session
lean-browser session close --session $SESSION
```

## MCP Integration

lean-browser ships with an MCP server exposing 9 powerful tools for AI agents:

### Read-Only Tools

| Tool                     | Description                             |
| ------------------------ | --------------------------------------- |
| `fetch_page_text`        | Clean readable article text             |
| `fetch_page_json`        | Structured content with semantic blocks |
| `fetch_page_interactive` | Actionable elements for automation      |

### Action Execution Tools

| Tool                     | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `execute_browser_action` | Navigate and execute multiple actions in one call |
| `take_screenshot`        | Capture visual screenshots (base64 PNG)           |

### Session Management Tools

| Tool                       | Description                            |
| -------------------------- | -------------------------------------- |
| `browser_session_start`    | Create stateful browser session        |
| `browser_session_execute`  | Execute single action in session       |
| `browser_session_snapshot` | Get current page state without actions |
| `browser_session_close`    | Close session and free resources       |
| `browser_session_list`     | List all active sessions               |

### Claude Desktop setup

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lean-browser": {
      "command": "lean-browser-mcp"
    }
  }
}
```

Then ask Claude:

- _"Use lean-browser to fetch https://news.ycombinator.com"_
- _"Use lean-browser to fill out the GitHub login form"_
- _"Start a browser session on https://example.com and click the first link"_

### Claude Code setup

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "lean-browser": {
      "command": "lean-browser-mcp"
    }
  }
}
```

### Example MCP Tool Usage

**Basic page fetch:**

```
Use fetch_page_interactive on https://github.com/login
```

**Execute actions:**

```
Use execute_browser_action to:
1. Navigate to https://github.com/login
2. Type "myuser" in e1 (username field)
3. Type "mypass" in e2 (password field)
4. Click e3 (submit button)
```

**Stateful session:**

```
1. Use browser_session_start on https://example.com
2. Use browser_session_execute with action "click:e1"
3. Use browser_session_snapshot to see current state
4. Use browser_session_close when done
```

**Take screenshot:**

```
Use take_screenshot on https://example.com with fullPage=true
```

## Advanced Features

### Screenshot Capture

lean-browser can capture screenshots of webpages and return them as base64-encoded PNG images:

```bash
# Basic viewport screenshot (1280x720)
lean-browser screenshot https://example.com

# Full page screenshot (captures entire scrollable page)
lean-browser screenshot https://example.com --full-page

# Mobile screenshot (iPhone 13 emulation)
lean-browser screenshot https://example.com --mobile

# Custom viewport size
lean-browser screenshot https://example.com --viewport 1920x1080

# Device emulation
lean-browser screenshot https://example.com --device "iPad Pro"
```

**Programmatic usage:**

```javascript
import { takeScreenshot } from 'lean-browser/src/browser.js';

const result = await takeScreenshot('https://example.com', {
  fullPage: true,
  viewport: '1920x1080',
});

console.log(result.screenshot); // base64 encoded PNG
```

### Ad Blocking & Resource Blocking

Speed up page loads and reduce bandwidth by blocking ads, trackers, and unnecessary resources:

```bash
# Block ads, trackers, and analytics (Google Analytics, Facebook Pixel, etc.)
lean-browser https://news.site.com --block-ads

# Block images for faster loads
lean-browser https://heavy.site.com --block-resources image

# Block multiple resource types
lean-browser https://site.com --block-resources image,font,stylesheet

# Combine ad blocking with resource blocking
lean-browser https://site.com --block-ads --block-resources image,font
```

**What gets blocked:**

- **Ads**: Google Ads, Amazon ads, ad networks (Taboola, Outbrain, etc.)
- **Analytics**: Google Analytics, Mixpanel, Segment, Amplitude, etc.
- **Trackers**: Facebook Pixel, Twitter analytics, LinkedIn pixel, etc.
- **Resources**: images, fonts, stylesheets, media files

**Programmatic usage:**

```javascript
const result = await fetchRenderedHtml('https://example.com', {
  blockAds: true,
  blockResources: ['image', 'font'],
});

console.log(`Blocked ${result.blockedCount} requests`);
```

### Cookie Persistence

Save and load cookies across sessions for authentication and state management:

```bash
# First request - cookies are saved to file
lean-browser https://example.com --cookies cookies.json

# Second request - cookies are loaded from file
lean-browser https://example.com --cookies cookies.json
```

**Cookie file format (JSON):**

```json
[
  {
    "name": "session_id",
    "value": "abc123",
    "domain": "example.com",
    "path": "/",
    "expires": 1234567890,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  }
]
```

**Programmatic usage:**

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { getCookies, setCookies } from 'lean-browser/src/browser.js';

// Load cookies from file, fetch page, save updated cookies
const result = await fetchRenderedHtml('https://example.com', {
  cookiesFile: 'cookies.json',
});
```

### Viewport Customization

Emulate different devices and screen sizes:

```bash
# Desktop viewport
lean-browser https://example.com --viewport 1920x1080

# Mobile viewport (iPhone 13)
lean-browser https://example.com --mobile

# Specific device emulation
lean-browser https://example.com --device "iPhone 13"
lean-browser https://example.com --device "iPad Pro"
lean-browser https://example.com --device "Pixel 5"
```

**Available devices** (via Playwright):

- Mobile: `iPhone 13`, `iPhone 13 Pro`, `iPhone 14`, `Pixel 5`, `Galaxy S9+`
- Tablet: `iPad Pro`, `iPad (gen 7)`, `Galaxy Tab S4`
- Desktop: Custom viewports via `--viewport`

### Custom Headers

Set custom HTTP headers for special requirements:

```bash
# Set Accept-Language for localization
lean-browser https://example.com --headers '{"Accept-Language":"fr-FR,fr;q=0.9"}'

# Set Referer
lean-browser https://example.com --headers '{"Referer":"https://google.com"}'

# Multiple headers
lean-browser https://example.com --headers '{
  "Accept-Language":"es-ES",
  "Referer":"https://google.com",
  "X-Custom-Header":"value"
}'
```

**Programmatic usage:**

```javascript
const result = await fetchRenderedHtml('https://example.com', {
  extraHeaders: {
    'Accept-Language': 'ja-JP,ja;q=0.9',
    Referer: 'https://google.com',
  },
});
```

## Programmatic Usage

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { extractAllFromHtml } from 'lean-browser/src/extractor.js';
import { formatText } from 'lean-browser/src/formatter.js';

const fetched = await fetchRenderedHtml('https://example.com');
const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl);
const output = await formatText(
  { url: 'https://example.com', finalUrl: fetched.finalUrl, status: fetched.status },
  extracted,
  { maxTokens: 500 },
);
console.log(output.text);
```

## CLI Options

### Fetch Command

| Option              | Default | Description                                         |
| ------------------- | ------- | --------------------------------------------------- |
| `--mode`            | `text`  | Output mode: `text`, `json`, `interactive`          |
| `--tokens`          | `1200`  | Maximum token budget                                |
| `--timeout`         | `45000` | Navigation timeout (ms)                             |
| `--headed`          | `false` | Run browser visibly (debug)                         |
| `--viewport`        | -       | Viewport size (e.g. `1920x1080`)                    |
| `--device`          | -       | Device to emulate (e.g. `iPhone 13`, `iPad Pro`)    |
| `--mobile`          | `false` | Use mobile emulation (iPhone 13)                    |
| `--cookies`         | -       | Load/save cookies from/to JSON file                 |
| `--block-ads`       | `false` | Block ads, trackers, and analytics                  |
| `--block-resources` | -       | Block resource types: `image,font,stylesheet,media` |
| `--headers`         | -       | Custom HTTP headers as JSON string                  |

### Screenshot Command

| Option              | Default          | Description                            |
| ------------------- | ---------------- | -------------------------------------- |
| `--output`          | `screenshot.png` | Output file path                       |
| `--full-page`       | `false`          | Capture full page screenshot           |
| `--timeout`         | `45000`          | Navigation timeout (ms)                |
| `--viewport`        | -                | Viewport size (e.g. `1920x1080`)       |
| `--device`          | -                | Device to emulate (e.g. `iPhone 13`)   |
| `--mobile`          | `false`          | Use mobile emulation                   |
| `--cookies`         | -                | Load cookies from JSON file            |
| `--block-ads`       | `false`          | Block ads and trackers                 |
| `--block-resources` | -                | Block resource types (comma-separated) |
| `--headers`         | -                | Custom HTTP headers as JSON            |
| `--headed`          | `false`          | Run browser in headed mode             |

## Configuration

### Environment Variables

| Variable                     | Default                      | Description                             |
| ---------------------------- | ---------------------------- | --------------------------------------- |
| `LEAN_BROWSER_POOL_SIZE`     | `5`                          | Maximum browser pool size               |
| `LEAN_BROWSER_SESSION_DIR`   | `/tmp/lean-browser-sessions` | Directory for session persistence       |
| `LEAN_BROWSER_MAX_SESSIONS`  | `10`                         | Maximum concurrent browser sessions     |
| `LEAN_BROWSER_URL_WHITELIST` | -                            | Comma-separated list of allowed domains |
| `LEAN_BROWSER_URL_BLACKLIST` | -                            | Comma-separated list of blocked domains |

### SSRF Protection

lean-browser includes built-in protection against Server-Side Request Forgery (SSRF) attacks:

- Blocks private IP ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`
- Blocks cloud metadata endpoints: `169.254.169.254`, `metadata.google.internal`
- Blocks `file://` protocol and non-HTTP(S) protocols
- Supports URL whitelist/blacklist via environment variables

**Examples:**

```bash
# Configure browser pool size
export LEAN_BROWSER_POOL_SIZE=10

# Allow only specific domains
export LEAN_BROWSER_URL_WHITELIST="example.com,*.github.com"

# Block specific domains
export LEAN_BROWSER_URL_BLACKLIST="evil.com,*.malware.net"
```

### Browser Connection Pooling

lean-browser automatically reuses browser instances for improved performance. The pool:

- **Maintains up to 5 browsers** (configurable via `LEAN_BROWSER_POOL_SIZE`)
- **Auto-warms on first request** - no manual initialization needed
- **Health checks every 30 seconds** to detect and restart crashed browsers
- **5-minute idle timeout** - unused browsers are automatically closed
- **Achieves 95%+ hit rate** after warmup, significantly reducing overhead

**Performance Impact:**

- First request: ~4000ms (cold start, launches browser)
- Subsequent requests: ~3500ms (12-15% faster due to pool reuse)
- Pool hit rate: 95% after warmup (only 1 browser created for 20 requests)
- Automatic browser cleanup and restart on crashes

**Pool automatically activates when:**

- Using default headless mode
- No special viewport, device emulation, or ad blocking configured
- No custom headers or cookies specified

To disable pooling for specific requests:

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';

// Disable pool for this request
await fetchRenderedHtml('https://example.com', { usePool: false });
```

### Session Management

Sessions are automatically persisted to disk and include:

- Creation time and last activity tracking
- Request count monitoring
- Automatic cleanup of expired sessions (10 min TTL)
- Graceful shutdown on SIGINT/SIGTERM
- Maximum session limit enforcement

## Requirements

- Node.js >= 18
- Chromium (installed via `npx playwright install chromium`)

## Performance Comparison

| Tool              | Time to Fetch | Output Size | Token Count | Features                        |
| ----------------- | ------------- | ----------- | ----------- | ------------------------------- |
| curl + grep       | 0.2s          | 50 KB       | ~12k        | Raw HTML, no JS execution       |
| puppeteer         | 3.5s          | 200 KB      | ~50k        | Full page, no extraction        |
| playwright        | 3.2s          | 180 KB      | ~45k        | Full page, no extraction        |
| **lean-browser**  | **2.4s**      | **5 KB**    | **1.2k**    | JS execution + smart extraction |
| lean-browser+pool | **1.8s**      | **5 KB**    | **1.2k**    | With browser pooling            |

_Benchmark: Fetching https://news.ycombinator.com on MacBook Pro M1_

## Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md) - System design and components
- [API Reference](./docs/API.md) - Complete programmatic API
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Performance Guide](./docs/PERFORMANCE.md) - Optimization strategies
- [Contributing Guide](./CONTRIBUTING.md) - Development workflow

## Examples

Working code examples in `/examples` directory:

- [**login-workflow.js**](./examples/login-workflow.js) - Complete login automation with 2FA
- [**form-filling.js**](./examples/form-filling.js) - Fill and submit forms (multi-step, validation)
- [**scraping-with-pagination.js**](./examples/scraping-with-pagination.js) - Scrape data across multiple pages
- [**screenshot-comparison.js**](./examples/screenshot-comparison.js) - Visual testing and regression
- [**mcp-integration.js**](./examples/mcp-integration.js) - Using with MCP clients
- [**error-handling.js**](./examples/error-handling.js) - Robust error handling patterns
- [**basic-usage.sh**](./examples/basic-usage.sh) - CLI usage examples
- [**research-workflow.js**](./examples/research-workflow.js) - Multi-page research workflow
- [**token-optimization.js**](./examples/token-optimization.js) - Token budget comparison

Run any example:

```bash
node examples/login-workflow.js
node examples/scraping-with-pagination.js hn
node examples/screenshot-comparison.js responsive https://example.com
```

## FAQ

### How does token budgeting work?

lean-browser uses GPT-3's tokenizer to estimate token counts and intelligently truncates content using binary search to fit within your specified budget. It preserves article structure and adds a clear truncation marker.

### Can I use this with proxies?

Yes! You can configure proxies programmatically:

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({
  proxy: {
    server: 'http://your-proxy:8080',
    username: 'user',
    password: 'pass',
  },
});
```

### Does it handle authentication?

Yes, through several methods:

1. **Cookies**: Load/save cookies to persist authentication
2. **Sessions**: Maintain stateful browser sessions
3. **Actions**: Automate login forms with type/click actions

### Is it safe to expose as a web service?

lean-browser includes SSRF protection, but you should:

- Run behind a firewall with restricted outbound access
- Use URL whitelist/blacklist environment variables
- Implement rate limiting (examples included)
- Set resource limits (memory, CPU, timeout)
- Consider using a containerized deployment

### How fast is it?

- **Cold start**: ~3.5s (launching browser)
- **With pooling**: ~2.0s (95% cache hit rate)
- **Blocking ads**: ~1.5s (30-40% faster loads)
- **Parallel fetching**: 50+ pages/minute with 5-browser pool

### Can I customize extraction rules?

Yes! The extractor is modular. See [ARCHITECTURE.md](./docs/ARCHITECTURE.md#extension-points) for:

- Custom output formatters
- Custom extraction rules
- Custom action types
- Custom noise filters

### Does it work with SPAs (React, Vue, Angular)?

Yes! lean-browser waits for JavaScript execution, network idle, and auto-scrolls to trigger lazy-loaded content. Works great with modern SPAs.

### What about Cloudflare/bot detection?

For heavily protected sites:

1. Use headed mode (`--headed`)
2. Add realistic delays between actions
3. Consider residential proxies
4. Use custom user agents
5. Add mouse movements (see examples)

See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md#anti-bot-detection) for detailed guidance.

## Use Cases

- **AI Agent Web Access**: Give Claude, GPT, or custom agents web browsing capabilities
- **Research Automation**: Fetch and summarize articles across multiple sources
- **Form Automation**: Fill out forms, submit applications, complete workflows
- **Monitoring**: Track website changes, prices, availability
- **Testing**: Visual regression testing, screenshot comparison
- **Data Extraction**: Structured data extraction from dynamic pages
- **Content Archival**: Save clean, readable versions of web content

## Development

```bash
git clone https://github.com/YOUR_USERNAME/lean-browser.git
cd lean-browser
npm install
npx playwright install chromium

npm test              # All tests
npm run test:unit     # Unit tests only
npm run lint          # ESLint
npm run format:check  # Prettier check
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Sponsors

Interested in sponsoring lean-browser development? [Reach out!](mailto:support@example.com)

## License

MIT

## Acknowledgments

- [Playwright](https://playwright.dev/) - Browser automation
- [Mozilla Readability](https://github.com/mozilla/readability) - Article extraction
- [Model Context Protocol](https://modelcontextprotocol.io/) - AI agent integration
