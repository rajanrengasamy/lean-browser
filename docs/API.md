# API Reference

Complete API documentation for programmatic usage of lean-browser.

## Table of Contents

- [Installation](#installation)
- [Browser Module](#browser-module)
- [Extractor Module](#extractor-module)
- [Formatter Module](#formatter-module)
- [Actions Module](#actions-module)
- [Session Manager Module](#session-manager-module)
- [Tokenizer Module](#tokenizer-module)
- [Utils Module](#utils-module)
- [Type Definitions](#type-definitions)
- [Examples](#examples)

## Installation

```bash
npm install lean-browser
npx playwright install chromium
```

## Browser Module

**Import**: `import { ... } from 'lean-browser/src/browser.js'`

### `launchBrowser(options)`

Launch a Chromium browser instance with Playwright.

**Parameters:**

- `options` (Object, optional)
  - `headless` (Boolean) - Run browser in headless mode. Default: `true`
  - `userAgent` (String) - Custom user agent string. Default: `'lean-browser/0.2 (+https://github.com/)'`

**Returns:** `Promise<{ browser, context, page }>`

- `browser` (Browser) - Playwright Browser instance
- `context` (BrowserContext) - Playwright BrowserContext instance
- `page` (Page) - Playwright Page instance

**Example:**

```javascript
import { launchBrowser } from 'lean-browser/src/browser.js';

const { browser, context, page } = await launchBrowser({
  headless: false,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
});

console.log('Browser launched');
```

**Type Definition:**

```typescript
type LaunchOptions = {
  headless?: boolean;
  userAgent?: string;
};

type BrowserInstance = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

function launchBrowser(options?: LaunchOptions): Promise<BrowserInstance>;
```

---

### `navigateAndWait(page, url, options)`

Navigate to a URL and wait for the page to be fully loaded.

**Parameters:**

- `page` (Page) - Playwright Page instance
- `url` (String) - URL to navigate to
- `options` (Object, optional)
  - `timeoutMs` (Number) - Navigation timeout in milliseconds. Default: `45000`

**Returns:** `Promise<{ finalUrl, title, status }>`

- `finalUrl` (String) - Final URL after redirects
- `title` (String|undefined) - Page title
- `status` (Number|undefined) - HTTP status code

**Example:**

```javascript
import { launchBrowser, navigateAndWait } from 'lean-browser/src/browser.js';

const { browser, context, page } = await launchBrowser();
const { finalUrl, title, status } = await navigateAndWait(page, 'https://example.com', {
  timeoutMs: 60000,
});

console.log(`Loaded: ${title} (${status}) at ${finalUrl}`);
```

**Type Definition:**

```typescript
type NavigateOptions = {
  timeoutMs?: number;
};

type NavigateResult = {
  finalUrl: string;
  title?: string;
  status?: number;
};

function navigateAndWait(page: Page, url: string, options?: NavigateOptions): Promise<NavigateResult>;
```

---

### `closeBrowser({ browser, context, page })`

Close browser, context, and page instances gracefully.

**Parameters:**

- `browser` (Browser, optional) - Playwright Browser instance
- `context` (BrowserContext, optional) - Playwright BrowserContext instance
- `page` (Page, optional) - Playwright Page instance

**Returns:** `Promise<void>`

**Example:**

```javascript
import { launchBrowser, closeBrowser } from 'lean-browser/src/browser.js';

const { browser, context, page } = await launchBrowser();
// ... do work ...
await closeBrowser({ browser, context, page });
```

**Type Definition:**

```typescript
function closeBrowser(instance: { browser?: Browser; context?: BrowserContext; page?: Page }): Promise<void>;
```

---

### `fetchRenderedHtml(url, options)`

Complete workflow: launch browser, navigate, extract HTML, close browser.

**Parameters:**

- `url` (String) - URL to fetch
- `options` (Object, optional)
  - `timeoutMs` (Number) - Navigation timeout. Default: `45000`
  - `headless` (Boolean) - Run headless. Default: `true`
  - `userAgent` (String) - Custom user agent. Default: `'lean-browser/0.2 (+https://github.com/)'`

**Returns:** `Promise<{ html, finalUrl, title, status }>`

- `html` (String) - Rendered HTML content
- `finalUrl` (String) - Final URL after redirects
- `title` (String|undefined) - Page title
- `status` (Number|undefined) - HTTP status code

**Example:**

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';

const result = await fetchRenderedHtml('https://example.com', {
  timeoutMs: 30000,
  headless: true,
});

console.log('HTML length:', result.html.length);
console.log('Title:', result.title);
console.log('Status:', result.status);
```

**Type Definition:**

```typescript
type FetchOptions = {
  timeoutMs?: number;
  headless?: boolean;
  userAgent?: string;
};

type FetchResult = {
  html: string;
  finalUrl: string;
  title?: string;
  status?: number;
};

function fetchRenderedHtml(url: string, options?: FetchOptions): Promise<FetchResult>;
```

---

## Extractor Module

**Import**: `import { ... } from 'lean-browser/src/extractor.js'`

### `extractAllFromHtml(html, url)`

Extract article content and interactive elements from HTML.

**Parameters:**

- `html` (String) - Raw HTML content
- `url` (String) - Page URL for context

**Returns:** `{ article, elements }`

- `article` (Object) - Extracted article content
  - `title` (String) - Article title
  - `byline` (String|null) - Author information
  - `excerpt` (String|null) - Article excerpt
  - `text` (String) - Article text content
- `elements` (Array<Object>) - Interactive elements
  - `id` (String) - Element ID (e1, e2, ...)
  - `tag` (String) - HTML tag name
  - `type` (String|null) - Input type (for inputs)
  - `label` (String|null) - Element label
  - `href` (String|null) - Link href (for anchors)
  - `name` (String|null) - Element name attribute
  - `selector` (String) - CSS selector

**Example:**

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { extractAllFromHtml } from 'lean-browser/src/extractor.js';

const { html, finalUrl } = await fetchRenderedHtml('https://example.com');
const { article, elements } = extractAllFromHtml(html, finalUrl);

console.log('Title:', article.title);
console.log('Text length:', article.text.length);
console.log('Interactive elements:', elements.length);
```

**Type Definition:**

```typescript
type Article = {
  title: string;
  byline: string | null;
  excerpt: string | null;
  text: string;
};

type InteractiveElement = {
  id: string;
  tag: string;
  type: string | null;
  label: string | null;
  href: string | null;
  name: string | null;
  selector: string;
};

type ExtractionResult = {
  article: Article;
  elements: InteractiveElement[];
};

function extractAllFromHtml(html: string, url: string): ExtractionResult;
```

---

### `buildDom(html, url)`

Create a JSDOM instance from HTML.

**Parameters:**

- `html` (String) - Raw HTML content
- `url` (String) - Page URL for context

**Returns:** JSDOM instance

**Example:**

```javascript
import { buildDom } from 'lean-browser/src/extractor.js';

const dom = buildDom('<html><body>Hello</body></html>', 'https://example.com');
const text = dom.window.document.body.textContent;
console.log(text); // "Hello"
```

---

### `extractArticleFromDom(dom)`

Extract article content from a JSDOM instance using Mozilla Readability.

**Parameters:**

- `dom` (JSDOM) - JSDOM instance

**Returns:** `{ title, byline, excerpt, text }`

**Example:**

```javascript
import { buildDom, extractArticleFromDom } from 'lean-browser/src/extractor.js';

const dom = buildDom(html, url);
const article = extractArticleFromDom(dom);
console.log(article.title);
```

---

### `extractInteractiveElements(dom, options)`

Extract interactive elements (buttons, inputs, links) from a JSDOM instance.

**Parameters:**

- `dom` (JSDOM) - JSDOM instance
- `options` (Object, optional)
  - `limit` (Number) - Maximum elements to extract. Default: `60`

**Returns:** Array of element objects

**Example:**

```javascript
import { buildDom, extractInteractiveElements } from 'lean-browser/src/extractor.js';

const dom = buildDom(html, url);
const elements = extractInteractiveElements(dom, { limit: 100 });

for (const el of elements) {
  console.log(`${el.id}: ${el.tag} - ${el.label}`);
}
```

---

### `buildElementMap(elements)`

Convert element array to a map of element ID to CSS selector.

**Parameters:**

- `elements` (Array<Object>) - Array of elements from `extractInteractiveElements`

**Returns:** Object mapping element IDs to selectors

**Example:**

```javascript
import { buildElementMap } from 'lean-browser/src/extractor.js';

const elements = [
  { id: 'e1', selector: '#login' },
  { id: 'e2', selector: '#password' },
];

const map = buildElementMap(elements);
console.log(map); // { e1: '#login', e2: '#password' }
```

---

## Formatter Module

**Import**: `import { ... } from 'lean-browser/src/formatter.js'`

### `formatText(meta, extracted, options)`

Format extracted content as clean markdown text.

**Parameters:**

- `meta` (Object) - Metadata
  - `url` (String) - Original URL
  - `finalUrl` (String) - Final URL after redirects
  - `status` (Number) - HTTP status code
- `extracted` (Object) - Extracted content from `extractAllFromHtml`
  - `article` (Object) - Article data
- `options` (Object, optional)
  - `maxTokens` (Number) - Maximum token budget. Default: unlimited

**Returns:** `Promise<{ text, truncated, tokens }>`

- `text` (String) - Formatted markdown text
- `truncated` (Boolean) - Whether content was truncated
- `tokens` (Number) - Estimated token count

**Example:**

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { extractAllFromHtml } from 'lean-browser/src/extractor.js';
import { formatText } from 'lean-browser/src/formatter.js';

const { html, finalUrl, status } = await fetchRenderedHtml('https://example.com');
const extracted = extractAllFromHtml(html, finalUrl);

const output = await formatText({ url: 'https://example.com', finalUrl, status }, extracted, { maxTokens: 1000 });

console.log(output.text);
console.log(`Tokens: ${output.tokens}, Truncated: ${output.truncated}`);
```

**Type Definition:**

```typescript
type Meta = {
  url: string;
  finalUrl: string;
  status?: number;
};

type FormatOptions = {
  maxTokens?: number;
};

type FormattedOutput = {
  text: string;
  truncated: boolean;
  tokens: number;
};

function formatText(meta: Meta, extracted: ExtractionResult, options?: FormatOptions): Promise<FormattedOutput>;
```

---

### `formatJson(meta, extracted, options)`

Format extracted content as structured JSON with semantic blocks.

**Parameters:**

- `meta` (Object) - Metadata (same as `formatText`)
- `extracted` (Object) - Extracted content
- `options` (Object, optional)
  - `maxTokens` (Number) - Maximum token budget

**Returns:** `Promise<{ text, truncated, tokens }>`

- `text` (String) - JSON string (pretty-printed)
- `truncated` (Boolean) - Whether content was truncated
- `tokens` (Number) - Estimated token count

**Example:**

```javascript
import { formatJson } from 'lean-browser/src/formatter.js';

const output = await formatJson(meta, extracted, { maxTokens: 2000 });
const data = JSON.parse(output.text);

console.log('URL:', data.url);
console.log('Title:', data.article.title);
console.log('Blocks:', data.article.blocks.length);
```

---

### `formatInteractive(meta, extracted, options)`

Format extracted content with interactive elements for automation.

**Parameters:**

- `meta` (Object) - Metadata (same as `formatText`)
- `extracted` (Object) - Extracted content (must include `elements`)
- `options` (Object, optional)
  - `maxTokens` (Number) - Maximum token budget

**Returns:** `Promise<{ text, truncated, tokens }>`

- `text` (String) - JSON string with view and elements
- `truncated` (Boolean) - Whether content was truncated
- `tokens` (Number) - Estimated token count

**Example:**

```javascript
import { formatInteractive } from 'lean-browser/src/formatter.js';

const output = await formatInteractive(meta, extracted, { maxTokens: 1500 });
const data = JSON.parse(output.text);

console.log('Page title:', data.view.title);
console.log('Interactive elements:');
for (const el of data.elements) {
  console.log(`  ${el.id}: ${el.label} (${el.tag})`);
}
```

---

## Actions Module

**Import**: `import { ... } from 'lean-browser/src/actions.js'`

### `parseActionSpec(specString)`

Parse action specification string into action objects.

**Parameters:**

- `specString` (String) - Comma-separated action specs

**Returns:** Array of action objects

**Example:**

```javascript
import { parseActionSpec } from 'lean-browser/src/actions.js';

const actions = parseActionSpec('type:e1:username,type:e2:password,click:e3');

console.log(actions);
// [
//   { type: 'type', elementId: 'e1', value: 'username', slow: false },
//   { type: 'type', elementId: 'e2', value: 'password', slow: false },
//   { type: 'click', elementId: 'e3' }
// ]
```

**Type Definition:**

```typescript
type Action =
  | { type: 'click'; elementId: string }
  | { type: 'type'; elementId: string; value: string; slow: boolean }
  | { type: 'select'; elementId: string; value: string }
  | { type: 'submit'; elementId: string }
  | { type: 'wait'; ms: number }
  | { type: 'navigate'; url: string }
  | { type: 'scroll'; pixels: number };

function parseActionSpec(specString: string): Action[];
```

---

### `validateAction(action, elementMap)`

Validate an action against available elements.

**Parameters:**

- `action` (Object) - Action object from `parseActionSpec`
- `elementMap` (Object) - Map of element IDs to selectors

**Returns:** `void` (throws on validation error)

**Throws:**

- `ValidationError` - Invalid action
- `ElementNotFoundError` - Element ID not in map

**Example:**

```javascript
import { parseActionSpec, validateAction } from 'lean-browser/src/actions.js';
import { buildElementMap } from 'lean-browser/src/extractor.js';

const actions = parseActionSpec('click:e1');
const elementMap = buildElementMap(elements);

try {
  for (const action of actions) {
    validateAction(action, elementMap);
  }
} catch (err) {
  console.error('Validation failed:', err.message);
}
```

---

### `ActionExecutor`

Class for executing actions against a live browser page.

**Constructor:**

```javascript
new ActionExecutor(page, elementMap, options);
```

**Parameters:**

- `page` (Page) - Playwright Page instance
- `elementMap` (Object) - Map of element IDs to selectors
- `options` (Object, optional)
  - `defaultTimeoutMs` (Number) - Action timeout. Default: `10000`

**Methods:**

#### `execute(action)`

Execute a single action.

**Returns:** `Promise<{ type, ok, ... }>`

#### `executeAll(actions)`

Execute multiple actions in sequence.

**Returns:** `Promise<Array<{ type, ok, ... }>>`

**Example:**

```javascript
import { launchBrowser, navigateAndWait } from 'lean-browser/src/browser.js';
import { extractAllFromHtml, buildElementMap } from 'lean-browser/src/extractor.js';
import { ActionExecutor, parseActionSpec } from 'lean-browser/src/actions.js';

const { browser, context, page } = await launchBrowser();
await navigateAndWait(page, 'https://github.com/login');

const html = await page.content();
const { elements } = extractAllFromHtml(html, page.url());
const elementMap = buildElementMap(elements);

const actions = parseActionSpec('type:e1:myuser,type:e2:mypass,click:e3');
const executor = new ActionExecutor(page, elementMap);

const results = await executor.executeAll(actions);
console.log('Actions executed:', results);

await closeBrowser({ browser, context, page });
```

**Type Definition:**

```typescript
type ExecutorOptions = {
  defaultTimeoutMs?: number;
};

type ActionResult = {
  type: string;
  ok: boolean;
  [key: string]: any;
};

class ActionExecutor {
  constructor(page: Page, elementMap: Record<string, string>, options?: ExecutorOptions);
  execute(action: Action): Promise<ActionResult>;
  executeAll(actions: Action[]): Promise<ActionResult[]>;
}
```

---

## Session Manager Module

**Import**: `import { ... } from 'lean-browser/src/session-manager.js'`

### `createSession(url, options)`

Create a stateful browser session.

**Parameters:**

- `url` (String) - Initial URL to navigate to
- `options` (Object, optional)
  - `timeoutMs` (Number) - Navigation timeout. Default: `45000`
  - `headless` (Boolean) - Run headless. Default: `true`

**Returns:** `Promise<{ sessionId, url, finalUrl, status }>`

- `sessionId` (String) - Session ID (8-char UUID)
- `url` (String) - Original URL
- `finalUrl` (String) - Final URL after redirects
- `status` (Number) - HTTP status code

**Example:**

```javascript
import { createSession } from 'lean-browser/src/session-manager.js';

const session = await createSession('https://example.com', {
  headless: false,
  timeoutMs: 30000,
});

console.log('Session created:', session.sessionId);
```

**Type Definition:**

```typescript
type SessionOptions = {
  timeoutMs?: number;
  headless?: boolean;
};

type Session = {
  sessionId: string;
  url: string;
  finalUrl: string;
  status?: number;
};

function createSession(url: string, options?: SessionOptions): Promise<Session>;
```

---

### `getSession(sessionId)`

Retrieve an active session.

**Parameters:**

- `sessionId` (String) - Session ID

**Returns:** Session object with browser, context, page

**Throws:** Error if session not found or expired

**Example:**

```javascript
import { getSession } from 'lean-browser/src/session-manager.js';

const session = getSession('abc123');
console.log('Session URL:', session.url);

// Access browser page
const title = await session.page.title();
console.log('Page title:', title);
```

---

### `closeSession(sessionId)`

Close a session and cleanup browser resources.

**Parameters:**

- `sessionId` (String) - Session ID

**Returns:** `Promise<{ sessionId, closed }>`

**Example:**

```javascript
import { closeSession } from 'lean-browser/src/session-manager.js';

await closeSession('abc123');
console.log('Session closed');
```

---

### `listSessions()`

List all active sessions.

**Returns:** Array of session info objects

**Example:**

```javascript
import { listSessions } from 'lean-browser/src/session-manager.js';

const sessions = listSessions();
for (const s of sessions) {
  console.log(`${s.sessionId}: ${s.url} (created ${new Date(s.createdAt)})`);
}
```

---

## Tokenizer Module

**Import**: `import { ... } from 'lean-browser/src/tokenizer.js'`

### `estimateTokens(text)`

Estimate token count using GPT-3 encoder.

**Parameters:**

- `text` (String) - Text to estimate

**Returns:** `Promise<number>` - Estimated token count

**Example:**

```javascript
import { estimateTokens } from 'lean-browser/src/tokenizer.js';

const text = 'Hello, world!';
const tokens = await estimateTokens(text);
console.log('Tokens:', tokens); // ~4
```

---

### `truncateToTokenLimit(text, maxTokens)`

Truncate text to fit within token budget using binary search.

**Parameters:**

- `text` (String) - Text to truncate
- `maxTokens` (Number) - Maximum token budget

**Returns:** `Promise<{ text, truncated, tokens }>`

- `text` (String) - Truncated text (may include truncation marker)
- `truncated` (Boolean) - Whether truncation occurred
- `tokens` (Number) - Actual token count

**Example:**

```javascript
import { truncateToTokenLimit } from 'lean-browser/src/tokenizer.js';

const longText = '...'; // Very long article
const result = await truncateToTokenLimit(longText, 500);

console.log('Truncated:', result.truncated);
console.log('Tokens:', result.tokens);
console.log('Text:', result.text);
```

---

## Utils Module

**Import**: `import { ... } from 'lean-browser/src/utils.js'`

### `normalizeWhitespace(text)`

Normalize whitespace in text (collapse multiple spaces, trim).

**Parameters:**

- `text` (String) - Text to normalize

**Returns:** `String` - Normalized text

**Example:**

```javascript
import { normalizeWhitespace } from 'lean-browser/src/utils.js';

const text = '  Hello    world  \n\n  ';
const normalized = normalizeWhitespace(text);
console.log(normalized); // "Hello world"
```

---

### `safeTruncate(text, maxLength)`

Truncate text to maximum length with ellipsis.

**Parameters:**

- `text` (String) - Text to truncate
- `maxLength` (Number) - Maximum length

**Returns:** `String` - Truncated text

**Example:**

```javascript
import { safeTruncate } from 'lean-browser/src/utils.js';

const text = 'This is a very long string';
const truncated = safeTruncate(text, 10);
console.log(truncated); // "This is a..."
```

---

### `cssPath(element)`

Generate a unique CSS selector for an element.

**Parameters:**

- `element` (Element) - DOM element

**Returns:** `String` - CSS selector

**Example:**

```javascript
import { cssPath } from 'lean-browser/src/utils.js';

const selector = cssPath(element);
console.log(selector); // "#login-form > input[type='text']"
```

---

### `isProbablyNoiseClass(classOrId)`

Check if a class or ID name likely represents noise (ads, tracking, etc.).

**Parameters:**

- `classOrId` (String) - Class or ID attribute value

**Returns:** `Boolean` - True if likely noise

**Example:**

```javascript
import { isProbablyNoiseClass } from 'lean-browser/src/utils.js';

console.log(isProbablyNoiseClass('cookie-banner')); // true
console.log(isProbablyNoiseClass('article-content')); // false
```

---

## Type Definitions

### Complete TypeScript Definitions

```typescript
// Browser Module
type LaunchOptions = {
  headless?: boolean;
  userAgent?: string;
};

type BrowserInstance = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

type NavigateOptions = {
  timeoutMs?: number;
};

type NavigateResult = {
  finalUrl: string;
  title?: string;
  status?: number;
};

type FetchOptions = {
  timeoutMs?: number;
  headless?: boolean;
  userAgent?: string;
};

type FetchResult = {
  html: string;
  finalUrl: string;
  title?: string;
  status?: number;
};

// Extractor Module
type Article = {
  title: string;
  byline: string | null;
  excerpt: string | null;
  text: string;
};

type InteractiveElement = {
  id: string;
  tag: string;
  type: string | null;
  label: string | null;
  href: string | null;
  name: string | null;
  selector: string;
};

type ExtractionResult = {
  article: Article;
  elements: InteractiveElement[];
};

// Formatter Module
type Meta = {
  url: string;
  finalUrl: string;
  status?: number;
  fetchedTitle?: string;
};

type FormatOptions = {
  maxTokens?: number;
};

type FormattedOutput = {
  text: string;
  truncated: boolean;
  tokens: number;
};

// Actions Module
type Action =
  | { type: 'click'; elementId: string }
  | { type: 'type'; elementId: string; value: string; slow: boolean }
  | { type: 'select'; elementId: string; value: string }
  | { type: 'submit'; elementId: string }
  | { type: 'wait'; ms: number }
  | { type: 'navigate'; url: string }
  | { type: 'scroll'; pixels: number };

type ExecutorOptions = {
  defaultTimeoutMs?: number;
};

type ActionResult = {
  type: string;
  ok: boolean;
  [key: string]: any;
};

// Session Manager
type SessionOptions = {
  timeoutMs?: number;
  headless?: boolean;
};

type Session = {
  sessionId: string;
  url: string;
  finalUrl: string;
  status?: number;
};

type SessionInstance = Session & {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  lastActivity: number;
};
```

---

## Examples

### Complete Workflow Example

```javascript
#!/usr/bin/env node
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { extractAllFromHtml } from 'lean-browser/src/extractor.js';
import { formatText, formatJson, formatInteractive } from 'lean-browser/src/formatter.js';

const url = 'https://example.com';

// Fetch HTML
const fetched = await fetchRenderedHtml(url, {
  timeoutMs: 30000,
  headless: true,
});

console.log(`Fetched: ${fetched.title} (${fetched.status})`);

// Extract content
const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl);

console.log(`Article: ${extracted.article.title}`);
console.log(`Elements: ${extracted.elements.length}`);

// Format as text
const textOut = await formatText({ url, finalUrl: fetched.finalUrl, status: fetched.status }, extracted, {
  maxTokens: 1000,
});

console.log('\n--- TEXT OUTPUT ---');
console.log(textOut.text);

// Format as JSON
const jsonOut = await formatJson({ url, finalUrl: fetched.finalUrl, status: fetched.status }, extracted, {
  maxTokens: 2000,
});

console.log('\n--- JSON OUTPUT ---');
console.log(jsonOut.text);

// Format as interactive
const interactiveOut = await formatInteractive({ url, finalUrl: fetched.finalUrl, status: fetched.status }, extracted, {
  maxTokens: 1500,
});

console.log('\n--- INTERACTIVE OUTPUT ---');
console.log(interactiveOut.text);
```

### Action Execution Example

```javascript
#!/usr/bin/env node
import { launchBrowser, navigateAndWait, closeBrowser } from 'lean-browser/src/browser.js';
import { extractAllFromHtml, buildElementMap } from 'lean-browser/src/extractor.js';
import { ActionExecutor, parseActionSpec } from 'lean-browser/src/actions.js';

const url = 'https://github.com/login';

// Launch browser
const { browser, context, page } = await launchBrowser({ headless: false });

try {
  // Navigate to login page
  await navigateAndWait(page, url);

  // Extract interactive elements
  const html = await page.content();
  const { elements } = extractAllFromHtml(html, page.url());
  const elementMap = buildElementMap(elements);

  console.log('Available elements:');
  for (const el of elements) {
    console.log(`  ${el.id}: ${el.label} (${el.tag})`);
  }

  // Execute actions
  const actions = parseActionSpec('type:e1:myusername,type:e2:mypassword,wait:1000');
  const executor = new ActionExecutor(page, elementMap);

  const results = await executor.executeAll(actions);

  console.log('\nAction results:');
  for (const result of results) {
    console.log(`  ${result.type}: ${result.ok ? 'OK' : 'FAILED'}`);
  }

  // Take screenshot
  await page.screenshot({ path: 'login-filled.png' });
  console.log('\nScreenshot saved to login-filled.png');
} finally {
  await closeBrowser({ browser, context, page });
}
```

### Session Management Example

```javascript
#!/usr/bin/env node
import { createSession, getSession, closeSession } from 'lean-browser/src/session-manager.js';
import { extractAllFromHtml, buildElementMap } from 'lean-browser/src/extractor.js';
import { ActionExecutor, parseActionSpec } from 'lean-browser/src/actions.js';

// Create session
const session = await createSession('https://github.com/login', { headless: false });
console.log('Session created:', session.sessionId);

try {
  // Get session instance
  const sessionInstance = getSession(session.sessionId);
  const { page } = sessionInstance;

  // Extract elements
  const html = await page.content();
  const { elements } = extractAllFromHtml(html, page.url());
  const elementMap = buildElementMap(elements);

  // Execute multi-step workflow
  const executor = new ActionExecutor(page, elementMap);

  // Step 1: Fill username
  await executor.execute(parseActionSpec('type:e1:myuser')[0]);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 2: Fill password
  await executor.execute(parseActionSpec('type:e2:mypass')[0]);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 3: Click login
  await executor.execute(parseActionSpec('click:e3')[0]);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Get final state
  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);
} finally {
  // Always close session
  await closeSession(session.sessionId);
  console.log('Session closed');
}
```

### Custom Formatter Example

```javascript
#!/usr/bin/env node
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { extractAllFromHtml } from 'lean-browser/src/extractor.js';
import { estimateTokens } from 'lean-browser/src/tokenizer.js';

async function formatCustom(meta, extracted, options) {
  // Build custom output structure
  const obj = {
    url: meta.finalUrl,
    status: meta.status,
    metadata: {
      title: extracted.article.title,
      author: extracted.article.byline,
      wordCount: extracted.article.text.split(/\s+/).length,
    },
    summary: extracted.article.excerpt || extracted.article.text.slice(0, 200),
    interactiveCount: extracted.elements.length,
  };

  // Apply token budgeting if needed
  const json = JSON.stringify(obj, null, 2);
  const tokens = await estimateTokens(json);

  return {
    text: json,
    truncated: false,
    tokens,
  };
}

// Usage
const fetched = await fetchRenderedHtml('https://example.com');
const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl);

const output = await formatCustom(
  { url: 'https://example.com', finalUrl: fetched.finalUrl, status: fetched.status },
  extracted,
  {},
);

console.log(output.text);
```

---

## Error Handling

All functions may throw errors. Use try-catch for robust error handling:

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { ActionError, ElementNotFoundError } from 'lean-browser/src/actions.js';

try {
  const result = await fetchRenderedHtml('https://example.com', {
    timeoutMs: 30000,
  });
  console.log('Success:', result.title);
} catch (err) {
  if (err.name === 'TimeoutError') {
    console.error('Page took too long to load');
  } else if (err instanceof ElementNotFoundError) {
    console.error('Element not found:', err.elementId);
  } else if (err instanceof ActionError) {
    console.error('Action failed:', err.message);
  } else {
    console.error('Unknown error:', err);
  }
}
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design and components
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
- [Performance Guide](./PERFORMANCE.md) - Optimization strategies
- [Examples](../examples/) - Working code examples
