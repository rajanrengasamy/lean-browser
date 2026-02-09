# Architecture

This document describes the internal architecture of lean-browser, including its core components, data flow, and extension points.

## Overview

lean-browser is a modular web content extraction tool designed for AI agents and LLMs. It fetches web pages with a headless browser, extracts meaningful content, and returns token-budgeted representations optimized for language models.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Entry Points                             │
├──────────────┬─────────────────┬────────────────────────────────┤
│  CLI Tool    │  MCP Server     │  Programmatic API              │
│  (bin/cli.js)│(bin/mcp-server) │  (src/*.js imports)            │
└──────┬───────┴────────┬────────┴────────────┬───────────────────┘
       │                │                     │
       └────────────────┴─────────────────────┘
                        │
       ┌────────────────▼────────────────────────────────────┐
       │              Core Pipeline                          │
       │                                                     │
       │  1. Browser    2. Extractor   3. Formatter         │
       │  ┌──────────┐ ┌────────────┐ ┌─────────────┐      │
       │  │ Playwright│→│ Readability│→│   Token     │      │
       │  │  Chromium │ │    +       │ │  Budgeting  │      │
       │  │           │ │  DOM Clean │ │             │      │
       │  └──────────┘ └────────────┘ └─────────────┘      │
       └─────────────────────────────────────────────────────┘
                        │
       ┌────────────────▼─────────────────────────────────┐
       │              Output Modes                        │
       ├────────────┬──────────────┬─────────────────────┤
       │   Text     │     JSON     │    Interactive      │
       │ (Article)  │ (Structured) │  (Actionable DOM)   │
       └────────────┴──────────────┴─────────────────────┘
```

## Core Components

### 1. Browser Module (`src/browser.js`)

**Responsibility**: Headless browser lifecycle management and page rendering.

**Key Functions**:

- `launchBrowser()` - Initialize Playwright Chromium instance
- `navigateAndWait()` - Navigate to URL with intelligent wait strategies
- `fetchRenderedHtml()` - Complete fetch-render-extract workflow
- `autoScroll()` - Trigger lazy-loaded content

**Features**:

- Automatic lazy-load detection via scroll simulation
- Network idle detection with fallback timeouts
- Custom user agent support
- Headless/headed mode for debugging

**Dependencies**:

- `playwright` - Browser automation

### 2. Extractor Module (`src/extractor.js`)

**Responsibility**: Extract meaningful content and interactive elements from raw HTML.

**Key Functions**:

- `extractArticleFromDom()` - Extract article content using Readability
- `extractInteractiveElements()` - Identify actionable page elements
- `buildDom()` - Create JSDOM instance from HTML
- `pruneDocument()` - Remove noise (ads, tracking, modals)

**Extraction Pipeline**:

```
Raw HTML
    │
    ▼
┌─────────────────────┐
│  DOM Construction   │
│  (JSDOM)           │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Noise Removal      │
│  - Scripts/styles   │
│  - Nav/footer       │
│  - Ads/modals       │
│  - Cookie banners   │
└──────┬──────────────┘
       │
       ├─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ Readability     │  │ Interactive      │  │ Element Map     │
│ Article Extract │  │ Element Extract  │  │ (ID→Selector)   │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

**Heuristics**:

- Class/ID name filtering (removes elements with "ad", "cookie", "modal", etc.)
- Element visibility detection (hidden inputs, aria-hidden)
- Link quality scoring (removes "skip to content", JavaScript links)
- Form control prioritization (buttons/inputs before generic links)

**Dependencies**:

- `jsdom` - Server-side DOM
- `@mozilla/readability` - Article extraction
- `src/utils.js` - Helper functions

### 3. Formatter Module (`src/formatter.js`)

**Responsibility**: Convert extracted content to token-budgeted output formats.

**Key Functions**:

- `formatText()` - Clean markdown text output
- `formatJson()` - Structured JSON with semantic blocks
- `formatInteractive()` - Actionable elements with selectors
- `fitObjectToBudget()` - Binary search token truncation

**Token Budgeting Algorithm**:

```
Input: Content object + maxTokens
    │
    ▼
┌─────────────────────────────────┐
│ 1. Estimate initial token count │
└────────┬────────────────────────┘
         │
         ▼
    ┌────────────────┐
    │ Over budget?   │
    └───┬────────┬───┘
        No       Yes
        │        │
        │        ▼
        │   ┌─────────────────────────┐
        │   │ 2. Remove elements/blocks│
        │   │    from end (LIFO)       │
        │   └────────┬────────────────┘
        │            │
        │            ▼
        │       ┌────────────────┐
        │       │ Still over?    │
        │       └───┬────────┬───┘
        │           No       Yes
        │           │        │
        │           │        ▼
        │           │   ┌─────────────────────────┐
        │           │   │ 3. Binary search on     │
        │           │   │    article.text length   │
        │           │   └────────┬────────────────┘
        │           │            │
        │           ▼            ▼
        └───────►┌─────────────────────────────┐
                 │ Return truncated object     │
                 │ + truncated flag + tokens   │
                 └─────────────────────────────┘
```

**Dependencies**:

- `src/tokenizer.js` - Token estimation (GPT-3 encoder)

### 4. Actions Module (`src/actions.js`)

**Responsibility**: Parse and execute browser automation actions.

**Key Classes**:

- `ActionExecutor` - Execute actions against live browser page
- `ActionError` - Base error class for action failures
- `ElementNotFoundError` - Element not found in page
- `ValidationError` - Invalid action specification

**Action DSL**:

```javascript
// Format: "type:arg1:arg2:..."
{
  click: "click:e1",                    // Click element e1
  type: "type:e2:value",                // Fill input e2
  typeSlow: "type:e2:value:slow",       // Type with delay
  select: "select:e3:option",           // Select dropdown
  submit: "submit:e4",                  // Submit form
  wait: "wait:2000",                    // Wait milliseconds
  navigate: "navigate:https://...",     // Navigate to URL
  scroll: "scroll:500"                  // Scroll pixels
}
```

**Dependencies**:

- `playwright` - Browser automation

### 5. Session Manager (`src/session-manager.js`)

**Responsibility**: Manage stateful browser sessions for multi-step workflows.

**Features**:

- UUID-based session IDs
- Automatic session cleanup (10-minute TTL)
- Session listing and retrieval
- Graceful browser cleanup

**Session Lifecycle**:

```
createSession(url)
    │
    ▼
┌─────────────────────┐
│ Launch browser      │
│ Navigate to URL     │
│ Store in Map        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ getSession(id)      │
│ Update lastActivity │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Execute actions     │
│ Take snapshots      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ closeSession(id)    │
│ or auto-expire      │
└─────────────────────┘
```

### 6. Tokenizer Module (`src/tokenizer.js`)

**Responsibility**: Estimate and enforce token budgets.

**Key Functions**:

- `estimateTokens(text)` - Count tokens using GPT-3 encoder
- `truncateToTokenLimit(text, maxTokens)` - Binary search truncation

**Dependencies**:

- `gpt-3-encoder` - BPE tokenizer

### 7. MCP Integration (`src/mcp/handlers.js`, `bin/mcp-server.js`)

**Responsibility**: Expose lean-browser as Model Context Protocol tools.

**MCP Tools**:

1. `fetch_page_text` - Clean article text
2. `fetch_page_json` - Structured content
3. `fetch_page_interactive` - Actionable elements

**MCP Server Flow**:

```
Claude Desktop / MCP Client
    │
    ▼
StdioServerTransport
    │
    ▼
MCP Server (Zod validation)
    │
    ▼
Tool Handler (handleFetchPage*)
    │
    ▼
Core Pipeline (browser → extract → format)
    │
    ▼
JSON-RPC Response
```

**Dependencies**:

- `@modelcontextprotocol/sdk` - MCP server implementation
- `zod` - Schema validation

## Data Flow

### Standard Fetch Flow

```
1. Input
   url: "https://example.com"
   mode: "text"
   maxTokens: 1200

2. Browser Module
   └─> Launch Chromium
   └─> Navigate to URL
   └─> Auto-scroll (lazy-load)
   └─> Wait for network idle
   └─> Extract HTML

3. Extractor Module
   └─> Build JSDOM
   └─> Prune noise (ads, scripts, etc.)
   └─> Run Mozilla Readability
   └─> Extract article content

4. Formatter Module
   └─> Build output structure
   └─> Estimate token count
   └─> Truncate if needed (binary search)
   └─> Return formatted output

5. Output
   {
     text: "# Article Title\n\nSource: ...",
     truncated: false,
     tokens: 847
   }
```

### Interactive Mode Flow

```
1. Input
   url: "https://github.com/login"
   mode: "interactive"

2. Browser Module
   └─> Fetch and render page

3. Extractor Module
   └─> Extract article (for context)
   └─> Extract interactive elements:
       • Inputs (text, password, email)
       • Buttons
       • Links
       • Selects
       • Forms

4. Element Mapping
   └─> Assign IDs: e1, e2, e3...
   └─> Generate CSS selectors
   └─> Extract labels/placeholders

5. Formatter Module
   └─> Build element list JSON
   └─> Apply token budget
   └─> Truncate elements from end if needed

6. Output
   {
     "url": "https://github.com/login",
     "view": {
       "title": "Sign in to GitHub",
       "excerpt": "..."
     },
     "elements": [
       {
         "id": "e1",
         "tag": "input",
         "type": "text",
         "label": "Username or email address",
         "selector": "#login_field"
       },
       ...
     ]
   }
```

### Action Execution Flow

```
1. Input
   actions: "type:e1:myuser,type:e2:mypass,click:e3"
   elementMap: { e1: "#login_field", e2: "#password", ... }

2. Action Parser
   └─> Split by comma
   └─> Parse each action spec
   └─> Validate syntax

3. Action Validator
   └─> Check element IDs exist in map
   └─> Provide helpful error messages

4. Action Executor
   └─> For each action:
       • Resolve element selector
       • Execute Playwright command
       • Wait for completion
       • Collect result

5. Post-Execution
   └─> Optional snapshot (formatInteractive)
   └─> Return action results

6. Output
   {
     "results": [
       { "type": "type", "elementId": "e1", "ok": true },
       { "type": "type", "elementId": "e2", "ok": true },
       { "type": "click", "elementId": "e3", "ok": true }
     ],
     "snapshot": { ... }
   }
```

## Extension Points

### 1. Custom Output Formatters

Add new output modes by creating formatters in `src/formatter.js`:

```javascript
export async function formatCustom(meta, extracted, options) {
  // Build your custom output structure
  const obj = {
    url: meta.finalUrl,
    customField: yourLogic(extracted),
  };

  // Apply token budgeting
  const fit = await fitObjectToBudget(obj, options.maxTokens, {
    // Define which fields to truncate
  });

  return {
    text: JSON.stringify(fit.obj, null, 2),
    truncated: fit.truncated,
    tokens: fit.tokens,
  };
}
```

### 2. Custom Action Types

Extend the action system in `src/actions.js`:

```javascript
// In parseOneAction()
case 'myaction': {
  return { type: 'myaction', customParam: rest.trim() };
}

// In ActionExecutor.execute()
case 'myaction':
  return await this.myAction(action);

// Add executor method
async myAction({ customParam }) {
  await this.page.evaluate((param) => {
    // Custom page interaction
  }, customParam);
  return { type: 'myaction', ok: true };
}
```

### 3. Custom Extraction Rules

Modify extraction heuristics in `src/extractor.js`:

```javascript
export function pruneDocument(doc) {
  // Add custom removal rules
  removeAll(doc, 'your-custom-selector');

  // Add custom element filtering
  for (const el of doc.querySelectorAll('*')) {
    if (yourCustomFilter(el)) {
      el.remove();
    }
  }
}
```

### 4. Custom MCP Tools

Add new MCP tools in `bin/mcp-server.js`:

```javascript
server.registerTool(
  'your_custom_tool',
  {
    title: 'Your Custom Tool',
    description: 'Description for Claude',
    inputSchema: {
      url: z.string().url(),
      customParam: z.string(),
    },
  },
  async (args) => {
    // Implement your custom logic
    return { content: [{ type: 'text', text: result }] };
  },
);
```

### 5. Browser Configuration

Customize browser behavior in `src/browser.js`:

```javascript
export async function launchBrowser(options = {}) {
  const browser = await chromium.launch({
    headless: options.headless,
    // Add custom launch args
    args: ['--disable-web-security', '--window-size=1920,1080'],
    // Add proxy support
    proxy: options.proxy,
  });

  const context = await browser.newContext({
    userAgent: options.userAgent,
    // Add custom viewport
    viewport: { width: 1920, height: 1080 },
    // Add custom headers
    extraHTTPHeaders: options.headers,
  });

  return { browser, context, page: await context.newPage() };
}
```

### 6. Session Storage Backend

Replace in-memory sessions with persistent storage:

```javascript
// src/session-manager.js
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function createSession(url, options) {
  const id = randomUUID().slice(0, 8);
  const session = { /* ... */ };

  // Store in Redis instead of Map
  await redis.set(`session:${id}`, JSON.stringify(session));
  await redis.expire(`session:${id}`, SESSION_TTL_MS / 1000);

  return { sessionId: id, ... };
}
```

## Performance Considerations

### Browser Pool

For high-throughput scenarios, implement a browser pool:

```javascript
class BrowserPool {
  constructor(size = 5) {
    this.browsers = [];
    this.available = [];
    this.size = size;
  }

  async acquire() {
    if (this.available.length > 0) {
      return this.available.pop();
    }
    if (this.browsers.length < this.size) {
      const { browser, context, page } = await launchBrowser();
      this.browsers.push({ browser, context, page });
      return { browser, context, page };
    }
    // Wait for available browser
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (this.available.length > 0) {
          clearInterval(check);
          resolve(this.available.pop());
        }
      }, 100);
    });
  }

  release(browserInstance) {
    this.available.push(browserInstance);
  }
}
```

### Token Estimation Caching

Cache token estimates for repeated content:

```javascript
const tokenCache = new Map();

export async function estimateTokens(text) {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  if (tokenCache.has(hash)) {
    return tokenCache.get(hash);
  }
  const count = encode(text).length;
  tokenCache.set(hash, count);
  return count;
}
```

### Lazy DOM Processing

For large pages, process DOM lazily:

```javascript
export function* extractInteractiveLazy(dom) {
  const nodes = dom.window.document.querySelectorAll('input, button, a');
  for (const node of nodes) {
    if (isHiddenLike(node)) continue;
    yield buildElementObject(node);
  }
}
```

## Security Considerations

See [Security Module](../src/security.js) for:

- URL validation and sanitization
- Blocklist enforcement (malware, phishing domains)
- Safe navigation checks
- Content Security Policy helpers

## Testing Architecture

```
test/
├── unit/                    # Unit tests (isolated)
│   ├── actions.test.js
│   ├── extractor.test.js
│   ├── formatter.test.js
│   ├── tokenizer.test.js
│   └── utils.test.js
└── integration/             # Integration tests (full pipeline)
    └── cli.test.js
```

**Test Strategy**:

- Unit tests: Mock dependencies (JSDOM, Playwright)
- Integration tests: Real browser, live URLs
- Snapshot tests: Ensure output stability
- Performance tests: Token budget accuracy

## Configuration

Environment variables:

```bash
# Browser
LEAN_BROWSER_HEADLESS=true       # Run headless (default: true)
LEAN_BROWSER_TIMEOUT=45000       # Navigation timeout (default: 45000ms)
LEAN_BROWSER_USER_AGENT="..."    # Custom user agent

# Session Management
LEAN_SESSION_TTL=600000          # Session TTL (default: 10 min)

# Token Budgeting
LEAN_DEFAULT_TOKENS=1200         # Default max tokens (default: 1200)

# MCP Server
LEAN_MCP_LOG_LEVEL=info          # Log level (default: info)
```

## Debugging

Enable debugging with environment variables:

```bash
# Playwright debug
DEBUG=pw:api npm start

# Run in headed mode
lean-browser https://example.com --headed

# Verbose logging
NODE_ENV=development lean-browser https://example.com
```

## Related Documentation

- [API Reference](./API.md) - Complete API documentation
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions
- [Performance Guide](./PERFORMANCE.md) - Optimization strategies
- [Contributing Guide](../CONTRIBUTING.md) - Development workflow
