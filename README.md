# lean-browser

[![npm version](https://img.shields.io/npm/v/lean-browser.svg)](https://www.npmjs.com/package/lean-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Playwright + Readability page fetcher/compressor for AI agents.

`lean-browser` renders real pages (including JS), extracts useful content, and returns token-budgeted output for LLM workflows. It ships as:

- CLI: `lean-browser`
- MCP server: `lean-browser-mcp`
- Programmatic library modules under `src/`

## Table of Contents

- [What It Does](#what-it-does)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI](#cli)
- [Action DSL](#action-dsl)
- [MCP Server](#mcp-server)
- [Programmatic API](#programmatic-api)
- [Security](#security)
- [Performance and Pooling](#performance-and-pooling)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Publishing to npm](#publishing-to-npm)
- [License](#license)

## What It Does

- Executes pages in Chromium (Playwright)
- Extracts article-like content with Readability + DOM cleanup
- Returns one of 3 output modes:
  - `text`: human-readable markdown-like text
  - `json`: structured blocks
  - `interactive`: text + actionable elements (IDs/selectors)
- Supports token budgets (`--tokens` / `maxTokens`)
- Supports actions: click, type, select, submit, wait, navigate, scroll
- Supports long-lived browser sessions for multi-step flows
- Supports screenshots (PNG)
- Includes SSRF protections

## Installation

```bash
npm install -g lean-browser
npx playwright install chromium
```

Requirements:

- Node.js `>=18`
- Playwright Chromium binary installed (`npx playwright install chromium`)

## Quick Start

```bash
# Text mode (default command is fetch)
lean-browser https://example.com --mode text --tokens 500

# JSON mode
lean-browser https://example.com --mode json --tokens 1000

# Interactive mode
lean-browser https://github.com/login --mode interactive --tokens 1200

# Screenshot
lean-browser screenshot https://example.com --output screenshot.png
```

## CLI

### Commands

- `lean-browser fetch <url>` (default command)
- `lean-browser screenshot <url>`
- `lean-browser action <url> --actions "..."`
- `lean-browser session <start|exec|snapshot|close|list> ...`

### Fetch

```bash
lean-browser https://example.com --mode text --tokens 500
lean-browser https://example.com --mode json --tokens 1200
lean-browser https://example.com --mode interactive --tokens 1200

lean-browser https://news.ycombinator.com --block-ads
lean-browser https://example.com --block-resources image,font

lean-browser https://example.com --viewport 1920x1080
lean-browser https://example.com --mobile
lean-browser https://example.com --device "iPhone 13"

lean-browser https://example.com --cookies cookies.json
lean-browser https://example.com --headers '{"Accept-Language":"fr-FR"}'
```

Fetch options:

| Option              | Default | Description                                         |
| ------------------- | ------- | --------------------------------------------------- |
| `--mode`            | `text`  | `text`, `json`, `interactive`                       |
| `--tokens`          | `1200`  | Maximum token budget                                |
| `--timeout`         | `45000` | Navigation timeout in ms                            |
| `--headed`          | `false` | Run visible browser                                 |
| `--viewport`        | -       | `WIDTHxHEIGHT`                                      |
| `--device`          | -       | Playwright device name                              |
| `--mobile`          | `false` | iPhone 13 emulation                                 |
| `--cookies`         | -       | Load/save cookie JSON file                          |
| `--block-ads`       | `false` | Block ad/tracker requests                           |
| `--block-resources` | -       | Comma-separated types: `image,font,stylesheet,media` |
| `--headers`         | -       | JSON headers object                                 |

### Screenshot

```bash
lean-browser screenshot https://example.com --output shot.png
lean-browser screenshot https://example.com --full-page --output full.png
lean-browser screenshot https://example.com --mobile --output mobile.png
```

Screenshot options:

| Option              | Default          | Description             |
| ------------------- | ---------------- | ----------------------- |
| `--output`          | `screenshot.png` | Output file path        |
| `--full-page`       | `false`          | Full page capture       |
| `--timeout`         | `45000`          | Navigation timeout (ms) |
| `--viewport`        | -                | `WIDTHxHEIGHT`          |
| `--device`          | -                | Device name             |
| `--mobile`          | `false`          | Mobile emulation        |
| `--cookies`         | -                | Cookie file             |
| `--block-ads`       | `false`          | Ad/tracker blocking     |
| `--block-resources` | -                | Block resource types    |
| `--headers`         | -                | Custom headers JSON     |
| `--headed`          | `false`          | Run visible browser     |

### Action Command

```bash
lean-browser action https://github.com/login \
  --actions "type:e1:myuser,type:e2:mypass,click:e3" \
  --snapshot \
  --snapshot-mode interactive
```

### Session Command

```bash
# Start
SESSION=$(lean-browser session start --url https://example.com | jq -r .sessionId)

# Execute action
lean-browser session exec --session "$SESSION" --action "click:e1"

# Snapshot
lean-browser session snapshot --session "$SESSION" --mode interactive

# Close
lean-browser session close --session "$SESSION"
```

## Action DSL

Supported actions:

| Action      | Syntax                 | Description                |
| ----------- | ---------------------- | -------------------------- |
| Click       | `click:e1`             | Click element `e1`         |
| Type        | `type:e2:value`        | Fill input `e2`            |
| Type (slow) | `type:e2:value:slow`   | Type with delay            |
| Select      | `select:e3:option`     | Select option              |
| Submit      | `submit:e4`            | Submit containing form     |
| Wait        | `wait:2000`            | Wait milliseconds          |
| Navigate    | `navigate:https://...` | Navigate to URL            |
| Scroll      | `scroll:500`           | Scroll by pixels           |

Notes:

- Multiple actions are comma-separated.
- Values can include commas for `type` payloads (parser is delimiter-aware).
- Element IDs come from `interactive` output (e.g., `e1`, `e2`, ...).

## MCP Server

`lean-browser-mcp` exposes 9 tools.

### Read-only tools

- `fetch_page_text`
- `fetch_page_json`
- `fetch_page_interactive`

### Action tools

- `execute_browser_action`
- `take_screenshot`

### Session tools

- `browser_session_start`
- `browser_session_execute`
- `browser_session_snapshot`
- `browser_session_close`
- `browser_session_list`

### Claude Desktop config

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lean-browser": {
      "command": "lean-browser-mcp"
    }
  }
}
```

### Claude Code config

`.mcp.json`:

```json
{
  "mcpServers": {
    "lean-browser": {
      "command": "lean-browser-mcp"
    }
  }
}
```

## Programmatic API

### Basic fetch/extract/format

```js
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { extractAllFromHtml } from 'lean-browser/src/extractor.js';
import { formatText } from 'lean-browser/src/formatter.js';

const fetched = await fetchRenderedHtml('https://example.com', {
  timeoutMs: 45000,
  usePool: false, // default is false for one-shot safety
});

const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl);
const out = await formatText(
  { url: 'https://example.com', finalUrl: fetched.finalUrl, status: fetched.status },
  extracted,
  { maxTokens: 800 },
);

console.log(out.text);
console.log(out.tokens, out.truncated);
```

### Use browser pool explicitly

```js
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';

const result = await fetchRenderedHtml('https://example.com', {
  usePool: true,
});
```

### Screenshot API

```js
import { takeScreenshot } from 'lean-browser/src/browser.js';

const shot = await takeScreenshot('https://example.com', {
  fullPage: true,
  timeoutMs: 45000,
});

// shot.screenshot is base64 png
```

## Security

Built-in SSRF controls:

- Allows only `http:` and `https:` by default
- Blocks private/local ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, link-local)
- Blocks cloud metadata hosts (e.g., `169.254.169.254`, `metadata.google.internal`)
- Re-validates redirect final URL, not just input URL
- Supports allow/deny domain policies via env vars

Environment-based controls:

- `LEAN_BROWSER_URL_WHITELIST`
- `LEAN_BROWSER_URL_BLACKLIST`

`data:` URLs are blocked by default and only permitted in explicit trusted internal paths (e.g. controlled session test workflows).

## Performance and Pooling

Pooling is available but **opt-in** for one-shot fetches (`usePool: true`).

Why opt-in default:

- Avoid hanging short-lived CLI/test processes
- Avoid cross-request state contamination unless you intentionally reuse browser instances

Pool controls:

- `LEAN_BROWSER_POOL_SIZE` (default `5`)
- Idle timeout and health checks are managed internally

When to use pooling:

- High-volume trusted service process
- Repeated similar fetch requests
- You want lower browser-launch overhead and can accept pooled lifecycle management

## Configuration

Environment variables:

| Variable                     | Default                      | Description                             |
| ---------------------------- | ---------------------------- | --------------------------------------- |
| `LEAN_BROWSER_POOL_SIZE`     | `5`                          | Max browser pool size                   |
| `LEAN_BROWSER_SESSION_DIR`   | `/tmp/lean-browser-sessions` | Session metadata directory              |
| `LEAN_BROWSER_MAX_SESSIONS`  | `10`                         | Max concurrent sessions                 |
| `LEAN_BROWSER_URL_WHITELIST` | -                            | Comma-separated allowed host patterns   |
| `LEAN_BROWSER_URL_BLACKLIST` | -                            | Comma-separated blocked host patterns   |

## Troubleshooting

### `Executable doesn't exist at ... chromium_headless_shell...`

Install browsers:

```bash
npx playwright install chromium
```

### CLI appears to hang after output

Use current release (`0.3.0+`) where one-shot pooling defaults are fixed. If embedding programmatically, ensure you only enable `usePool: true` when intended.

### `ExtractionError: Insufficient content`

- Use `interactive` mode for action-oriented pages with little article text.
- Ensure page is fully rendered (timeouts, auth/session state).

### `SSRFError` on blocked URLs

- Verify URL and redirects.
- If running a controlled internal use-case, explicitly configure allow/deny rules.

## Development

```bash
git clone https://github.com/YOUR_USERNAME/lean-browser.git
cd lean-browser
npm install
npx playwright install chromium

npm run lint
npm test
```

Docs:

- [Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Performance](./docs/PERFORMANCE.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Contributing](./CONTRIBUTING.md)

## Publishing to npm

### Preflight

```bash
npm run lint
npm test
npm pack --dry-run
```

### Authenticate

```bash
npm whoami
# if not logged in
npm login
```

### Publish

```bash
npm publish --access public
```

If your npm account has 2FA enabled for publish, npm will prompt for OTP.

## License

MIT

## Acknowledgments

- [Playwright](https://playwright.dev/)
- [Mozilla Readability](https://github.com/mozilla/readability)
- [Model Context Protocol](https://modelcontextprotocol.io/)
