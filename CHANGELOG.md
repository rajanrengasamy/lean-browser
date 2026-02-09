# Changelog

## [0.2.0] - 2026-02-08

### Added

- **Action execution**: `lean-browser action <url> --actions "click:e1,type:e2:value"` for one-shot page interactions
- **Session management**: `lean-browser session start|exec|snapshot|close` for stateful multi-step workflows
- **MCP server**: `lean-browser-mcp` binary for Model Context Protocol integration with three tools:
  - `fetch_page_text` - Clean article text
  - `fetch_page_json` - Structured content blocks
  - `fetch_page_interactive` - Actionable elements
- **Test suite**: Unit and integration tests using Node.js native test runner
- **Quality tooling**: ESLint and Prettier configuration
- **Documentation**: README, CONTRIBUTING, examples, and LICENSE

### Changed

- Refactored CLI to subcommand architecture (backward compatible)
- Extracted reusable browser functions (`launchBrowser`, `navigateAndWait`, `closeBrowser`)
- Added `buildElementMap` to extractor for action execution support

## [0.1.0] - 2026-02-07

### Added

- Initial MVP with three output modes: text, json, interactive
- Playwright-based headless browser rendering
- Mozilla Readability content extraction
- Token budgeting with binary search truncation
- Auto-scroll for lazy-loaded content
- DOM noise filtering (ads, cookies, modals)
