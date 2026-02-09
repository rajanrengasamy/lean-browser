# lean-browser

> Playwright + Readability based page compressor for LLMs and AI agents

Fetch any webpage with a headless browser, extract the meaningful content, and return a token-budgeted representation. Ships as both a **CLI tool** and an **MCP server**.

## Features

- **Three output modes**: text (clean article), json (structured blocks), interactive (actionable elements)
- **Token budgeting**: Specify a max token limit and lean-browser intelligently truncates to fit
- **Action execution**: Click, type, select, submit, scroll, navigate on live pages
- **Session management**: Stateful multi-step browser workflows
- **MCP integration**: Three MCP tools for Claude Desktop and other MCP clients
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

lean-browser ships with an MCP server exposing three tools:

| Tool                     | Description                             |
| ------------------------ | --------------------------------------- |
| `fetch_page_text`        | Clean readable article text             |
| `fetch_page_json`        | Structured content with semantic blocks |
| `fetch_page_interactive` | Actionable elements for automation      |

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

Then ask Claude: _"Use lean-browser to fetch https://news.ycombinator.com"_

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

| Option      | Default | Description                                |
| ----------- | ------- | ------------------------------------------ |
| `--mode`    | `text`  | Output mode: `text`, `json`, `interactive` |
| `--tokens`  | `1200`  | Maximum token budget                       |
| `--timeout` | `45000` | Navigation timeout (ms)                    |
| `--headed`  | `false` | Run browser visibly (debug)                |

## Requirements

- Node.js >= 18
- Chromium (installed via `npx playwright install chromium`)

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

## License

MIT
