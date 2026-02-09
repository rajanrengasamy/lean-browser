# Changelog

## [0.3.0] - 2026-02-09

### Added

- **MCP Action Tools**: Extended MCP server with browser automation capabilities
  - `execute_browser_action` - Execute multiple actions in one call (click, type, select, submit, etc.)
  - `take_screenshot` - Capture visual screenshots as base64 PNG images
- **MCP Session Tools**: Stateful browser session management via MCP
  - `browser_session_start` - Create persistent browser sessions with state management
  - `browser_session_execute` - Execute single actions in existing sessions
  - `browser_session_snapshot` - Capture current page state without actions
  - `browser_session_close` - Close sessions and free resources
  - `browser_session_list` - List all active browser sessions
- **Comprehensive Documentation**:
  - `MCP_TOOLS.md` - Complete MCP tool reference with examples
  - `MCP_QUICK_START.md` - 5-minute setup guide for MCP
  - `examples/mcp-examples.md` - 20+ practical usage examples for Claude Desktop
- **Test Coverage**: Unit tests for all MCP tools and handlers
- **Action DSL**: Support for 8 action types (click, type, select, submit, wait, navigate, scroll)
- **Session Management**: Auto-expiring sessions with 10-minute TTL and cleanup

### Enhanced

- MCP server now exposes 9 tools (up from 3) for comprehensive browser automation
- Session state persistence with browser, context, and page objects
- Smart element discovery with automatic ID mapping
- Error handling with specific error types (ElementNotFoundError, ActionTimeoutError, ValidationError)
- Token budgeting support across all new tools

### Documentation

- Updated README with expanded MCP integration section
- Added detailed action syntax reference
- Included Claude Desktop and Claude Code setup examples
- Added troubleshooting guide and best practices
- Comprehensive example workflows (form filling, navigation, data extraction, screenshots)

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
