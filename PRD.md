# lean-browser - PRD

## Problem Statement

AI agents and LLMs struggle to interact with the live web efficiently. Feeding raw HTML to an LLM is prohibitively expensive in terms of tokens and confusing due to noise (ads, tracking scripts, massive CSS/SVG payloads, complex nesting). Existing tools often return full DOM dumps or screenshots, which eat up context windows rapidly. There is a need for a "compression layer" between the web and the AI—a tool that renders a page and distills it down to its semantic essence, respecting a strict token budget.

## Proposed Solution

**lean-browser** is a Node.js CLI tool designed specifically for AI agents. It functions as a browser automation backend that fetches web pages (handling dynamic JS via headless browser) and transforms the DOM into highly compressed, semantic representations. It prioritizes the "meat" of the content and interactive elements while discarding navigational clutter and visual styling. It allows the caller (the agent) to specify a token budget, and the tool optimizes the output fidelity to fit that constraint.

## MVP Scope

### Core Core

- [ ] **CLI Scaffolding**: Node.js CLI entry point (`lean-browser <url>`) with argument parsing.
- [ ] **Headless Fetching**: Integration with Playwright (or Puppeteer) to load pages, execute JS, and wait for hydration.
- [ ] **Content Extraction**: Implementation of a "Readability" style engine to identify main content areas vs. boilerplate.
- [ ] **Token Estimation**: Logic to estimate token counts of output sections to adhere to budgets.

### Output Modes

- [ ] **Minimal Mode (`--mode text`)**: Returns only the clean, readable text of the main content (Markdown style). No links, no navigation. Best for "reading" articles.
- [ ] **Structured Mode (`--mode json`)**: Returns a JSON object with semantic blocks (headers, paragraphs, lists) and metadata. Best for data extraction.
- [ ] **Interactive Mode (`--mode interactive`)**: Returns a representation that includes actionable elements (links, buttons, inputs) with unique IDs or XPaths, enabling an agent to plan subsequent actions.

### Optimization

- [ ] **Token Budgeting (`--tokens <limit>`)**:
  - Strict hard cap on output size.
  - Heuristics to prioritize content: Main Article > H1-H3 headers > Interactive Elements > Nav links.
  - Truncation warning if content exceeds limit.
- [ ] **DOM Simplification**:
  - Strip `<script>`, `<style>`, `<svg>`, `<iframe>` (unless relevant), comments.
  - Remove elements with class names indicating ads, modals, or cookie banners.

## Out of Scope for MVP

- **Session Persistence**: Storing cookies/local storage across CLI runs (stateless for MVP).
- **Action Execution**: The CLI will _fetch_ and _parse_, but acting (clicking/typing) is a separate command or future feature. MVP is "read-only" or "snapshot" focus.
- **Visual Analysis**: No screenshot processing or vision model integration.
- **Streaming**: Output will be returned once processing is complete, not streamed.
- **Proxy Management**: No built-in rotation of IPs/proxies.

## Tech Stack

- **Runtime**: Node.js
- **Browser Engine**: Playwright (for reliable rendering of modern React/SPA sites)
- **DOM Parsing**: JSDOM or Cheerio (for static analysis after rendering)
- **Content Extraction**: `@mozilla/readability` (as a baseline) + custom heuristics
- **Tokenizer**: `gpt-3-encoder` or `tiktoken` (for accurate budgeting)
- **CLI Framework**: `commander` or `cac`

## Key Files & Structure

```text
lean-browser/
├── bin/
│   └── cli.js            # Entry point
├── src/
│   ├── browser.js        # Playwright lifecycle management
│   ├── extractor.js      # Logic to strip DOM and identify "main" content
│   ├── formatter.js      # Converters for Text/JSON/Interactive formats
│   ├── tokenizer.js      # Budgeting and truncation logic
│   └── utils.js
├── test/
│   └── samples/          # HTML snapshots for testing extraction
├── package.json
└── README.md
```

## What to Demo

1. **The "Clean Read"**: Run `lean-browser https://complex-news-site.com/article --mode text` and show a clean, markdown-like output of just the story, stripping the 50+ sidebar links and ads.
2. **The "Agent View"**: Run `lean-browser https://github.com/login --mode interactive` and show the compact JSON listing the login form inputs and submit button, ready for an agent to fill.
3. **The "Budget Cut"**: Run against a massive wikipedia page with `--tokens 500` and demonstrate how it intelligently summarizes or truncates while keeping the intro intact.

## Open Questions

- **Handling Lazy Loading**: How long should we wait for content? Should we scroll to bottom automatically before snapshotting? (Likely yes, "scroll-to-bottom" behavior is needed).
- **Token Counting Strategy**: Do we count exact tokens (slow) or use character-count heuristics (fast) for the budget?
- **Error Handling**: How to report anti-bot challenges (Cloudflare) to the calling agent?
