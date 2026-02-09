# Implementation Plan: Complete & Release lean-browser for Public Use

**Status**: ✅ Phases 1-7 Complete - Ready for Release
**Last Updated**: 2026-02-08
**Session**: Can be resumed anytime - see "How to Resume" below

## Quick Context

lean-browser is a CLI tool that uses Playwright (headless browser) + Mozilla Readability to compress web pages into LLM-friendly formats with token budgeting. It currently has three output modes (text, json, interactive) and works well as a read-only tool.

**Goal**: Complete the PRD features (action execution, session management), add production-ready testing/docs/CI, integrate MCP support, and release publicly to GitHub/npm for the world to use.

**Current State**: MVP code is clean and functional but lacks:

- Action execution capabilities (agents can't interact, only read)
- Test coverage (test/ directory is empty)
- Production documentation
- MCP integration
- Public release infrastructure

---

## How to Resume

When you're ready to continue:

1. **SSH back into your machine**
2. **Start tmux** (recommended):
   ```bash
   tmux new -s lean-browser-dev
   ```
3. **Navigate to project**:
   ```bash
   cd /Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser
   ```
4. **Resume with Claude**:
   ```bash
   claude code
   ```
   Then say: "Continue implementing the plan in IMPLEMENTATION_PLAN.md - we left off at Phase 1"

---

## Progress Tracker

- [x] Plan created and approved
- [x] **Phase 1: Action Execution Core**
  - [x] Create src/actions.js
  - [x] Create src/snapshot.js
  - [x] Create bin/cli-action.js
  - [x] Refactor bin/cli.js for subcommands
  - [x] Update src/browser.js with reusable functions
  - [x] Update src/extractor.js with element mapping
- [x] Phase 2: Session Management
- [x] Phase 3: Testing Infrastructure (64 unit + 8 integration tests)
- [x] Phase 4: MCP Integration (3 tools: fetch_page_text/json/interactive)
- [x] Phase 5: Quality Tooling (ESLint + Prettier)
- [x] Phase 6: Examples & Documentation (README, CONTRIBUTING, CHANGELOG, LICENSE)
- [x] Phase 7: CI/CD & Release (GitHub Actions, templates, dependabot)
- [ ] Phase 8: Post-Release Polish ⬅️ Manual: git init, push, npm publish

---

## Architecture Decisions

### 1. Single Package with Two Binaries ✅

**Decision**: Keep everything in one npm package (`lean-browser`) with two entry points:

- `lean-browser` - CLI tool (existing)
- `lean-browser-mcp` - MCP server (new)

**Rationale**: Simpler to install, maintain, and document. Shared core logic. Users get both CLI and MCP with one install.

### 2. Action Execution: Subcommand Architecture ✅

**Decision**: Refactor CLI to support subcommands while maintaining backward compatibility:

```bash
# Existing (default)
lean-browser https://example.com --mode text

# New action execution
lean-browser action <url> --actions "click:e1,type:e2:password"

# New session management
lean-browser session start <url>   # Returns session ID
lean-browser session exec <session-id> --action "click:e1"
```

**Rationale**: Clean separation, backward compatible, supports both one-shot and stateful workflows.

### 3. Testing: Node.js Native Test Runner ✅

**Decision**: Use built-in `node:test` (no Vitest/Jest/Mocha dependencies)

**Rationale**: Zero extra dependencies, fast, built into Node 18+, good enough for this scope.

### 4. MCP Tools: Three Separate Tools ✅

**Decision**: Expose three distinct MCP tools instead of one parameterized tool:

- `fetch_page_text` - Clean article text (maps to --mode text)
- `fetch_page_json` - Structured blocks (maps to --mode json)
- `fetch_page_interactive` - Actionable elements (maps to --mode interactive)

**Rationale**: Better discoverability in MCP clients, clearer semantics for LLMs.

---

## Implementation Phases

### Phase 1: Action Execution Core (Week 1) 🚧 IN PROGRESS

**New Files**:

1. **src/actions.js** - Action execution engine
   - `ActionExecutor` class (click, type, select, submit, navigate, wait, scroll)
   - `parseActionSpec()` - Parse "click:e1" → {type: 'click', elementId: 'e1'}
   - `validateAction()` - Pre-validate actions against available elements
   - Error types: ElementNotFoundError, ActionTimeoutError, ValidationError

2. **src/snapshot.js** - Post-action state capture
   - `captureSnapshot(page, url, options)` - Extract page state after actions
   - Reuses existing formatter logic

3. **bin/cli-action.js** - Action command handler
   - `handleActionCommand(url, options)` - One-shot action execution flow

**Modified Files**:

1. **bin/cli.js** - Add subcommand support
   - Refactor to use `program.command('fetch')`, `program.command('action')`
   - Default to `fetch` for backward compatibility
   - Route to appropriate handlers

2. **src/browser.js** - Extract reusable browser logic
   - `launchBrowser(options)` - Extracted browser launch logic
   - `navigateAndWait(page, url, options)` - Reusable navigation
   - Keep existing `fetchRenderedHtml()` unchanged

3. **src/extractor.js** - Element mapping support
   - `buildElementMap(elements)` - Map elementId → CSS selector
   - `findElementByIdOrSelector(dom, elementId, map)` - Resolve e1 → DOM node

**Action DSL Syntax**:

```
click:e1                           # Click element e1
type:e2:username@example.com       # Type into e2
type:e2:password:slow              # Type slowly (human-like)
select:e3:option-value             # Select dropdown option
submit:e4                          # Submit form
wait:2000                          # Wait milliseconds
navigate:https://example.com/next  # Navigate to URL
scroll:500                         # Scroll pixels
```

**Verification**:

```bash
# Test one-shot actions
lean-browser action https://github.com/login \
  --actions "type:e1:user,type:e2:pass,click:e3" \
  --snapshot

# Should return post-action page state with success status
```

### Phase 2: Session Management (Week 1-2)

**New Files**:

1. **src/session-manager.js** - Session lifecycle
   - `SessionManager` class
   - `createSession(url, options)` - Launch browser, persist state
   - `getSession(sessionId)` - Retrieve active session
   - `updateSession(sessionId, data)` - Update state
   - `closeSession(sessionId)` - Cleanup
   - `cleanupExpiredSessions()` - Background cleanup
   - Session storage: `/tmp/lean-browser-sessions/<id>/`

2. **bin/cli-session.js** - Session command handler
   - `handleSessionCommand(subcommand, options)` - Route start/exec/snapshot/close

**Modified Files**:

1. **bin/cli.js** - Add session subcommand
   - `program.command('session <subcommand>')` with options

**Session Flow**:

```bash
# Start session (returns session ID)
SESSION=$(lean-browser session start https://example.com | jq -r .sessionId)

# Execute action
lean-browser session exec --session $SESSION --action "type:e1:search query"

# Get snapshot
lean-browser session snapshot --session $SESSION

# Close
lean-browser session close --session $SESSION
```

**Verification**:

```bash
# Test session lifecycle
SESSION=$(lean-browser session start https://github.com/login | jq -r .sessionId)
lean-browser session exec --session $SESSION --action "type:e1:test"
lean-browser session snapshot --session $SESSION
lean-browser session close --session $SESSION
```

### Phase 3: Testing Infrastructure (Week 2)

**New Files**:

1. **test/unit/tokenizer.test.js** - Token estimation tests
2. **test/unit/utils.test.js** - Utils (cssPath, normalize, etc.)
3. **test/unit/extractor.test.js** - Readability, element extraction
4. **test/unit/formatter.test.js** - Text/JSON/Interactive formatting
5. **test/unit/actions.test.js** - Action parsing, validation
6. **test/integration/cli.test.js** - End-to-end CLI tests
7. **test/integration/browser.test.js** - Playwright integration
8. **test/fixtures/** - Sample HTML files:
   - simple-article.html - Clean content
   - noisy-page.html - Ads, modals, tracking
   - login-form.html - Interactive elements
   - spa-app.html - Client-rendered content

**Modified Files**:

1. **package.json** - Add test scripts:
   ```json
   "scripts": {
     "test": "node --test test/**/*.test.js",
     "test:unit": "node --test test/unit/**/*.test.js",
     "test:integration": "node --test test/integration/**/*.test.js",
     "test:watch": "node --test --watch test/**/*.test.js"
   }
   ```

**Verification**:

```bash
npm test           # All tests pass
npm run test:unit  # Unit tests pass
npm run test:integration  # Integration tests pass
```

### Phase 4: MCP Integration (Week 2)

**New Files**:

1. **src/mcp/tools.js** - Tool definitions

   ```javascript
   export const TOOLS = [
     {
       name: 'fetch_page_text',
       description: 'Fetch and extract clean readable text from a webpage',
       inputSchema: {
         /* zod schema for url, maxTokens, timeout */
       },
     },
     {
       name: 'fetch_page_json',
       description: 'Fetch structured content with semantic blocks',
       inputSchema: {
         /* zod schema */
       },
     },
     {
       name: 'fetch_page_interactive',
       description: 'Fetch page with actionable elements for automation',
       inputSchema: {
         /* zod schema */
       },
     },
   ];
   ```

2. **src/mcp/handlers.js** - Request handlers

   ```javascript
   export async function handleFetchPageText(args) {
     // Wrap fetchRenderedHtml + formatText
     // Return MCP-compatible content structure
   }
   // Similar for JSON and Interactive
   ```

3. **bin/mcp-server.js** - MCP server entry point

   ```javascript
   import { Server } from '@modelcontextprotocol/sdk/server/index.js';
   import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
   // Initialize server, register tools, connect transport
   ```

4. **test/mcp.test.js** - MCP integration tests

**Modified Files**:

1. **package.json** - Add MCP dependencies and binary:
   ```json
   {
     "bin": {
       "lean-browser": "./bin/cli.js",
       "lean-browser-mcp": "./bin/mcp-server.js"
     },
     "dependencies": {
       "@modelcontextprotocol/sdk": "^1.26.0",
       "zod": "^3.24.1"
     }
   }
   ```

**Verification**:

```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector lean-browser-mcp

# Test with Claude Desktop (add to config):
# ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "lean-browser": {
      "command": "lean-browser-mcp"
    }
  }
}
# Then ask Claude: "Use lean-browser to fetch https://example.com"
```

### Phase 5: Quality Tooling (Week 2)

**New Files**:

1. **eslint.config.js** - ESLint 9+ flat config
2. **.prettierrc.json** - Prettier formatting rules
3. **.prettierignore** - Ignore patterns
4. **.husky/pre-commit** - Pre-commit hooks
5. **jsconfig.json** - JSDoc type checking

**Modified Files**:

1. **package.json** - Add dev dependencies and scripts:

   ```json
   {
     "devDependencies": {
       "@eslint/js": "^9.16.0",
       "eslint": "^9.16.0",
       "prettier": "^3.4.2",
       "husky": "^9.1.7",
       "lint-staged": "^15.2.11",
       "typescript": "^5.7.2"
     },
     "scripts": {
       "lint": "eslint .",
       "lint:fix": "eslint --fix .",
       "format": "prettier --write .",
       "format:check": "prettier --check .",
       "typecheck": "tsc --noEmit",
       "prepare": "husky install"
     },
     "lint-staged": {
       "*.js": ["eslint --fix", "prettier --write"],
       "*.{json,md}": ["prettier --write"]
     }
   }
   ```

2. Add JSDoc comments to all public functions in src/

**Verification**:

```bash
npm run lint          # No errors
npm run format:check  # Formatting consistent
npm run typecheck     # JSDoc types valid
git commit            # Pre-commit hooks run
```

### Phase 6: Examples & Documentation (Week 3)

**New Files**:

1. **examples/basic-usage.sh** - Simple shell examples
2. **examples/research-workflow.js** - Multi-page research
3. **examples/form-analysis.js** - Extract form fields
4. **examples/token-optimization.js** - Compare budgets
5. **CONTRIBUTING.md** - Contribution guidelines
6. **CHANGELOG.md** - Version history
7. **LICENSE** - MIT License text

**Modified Files**:

1. **README.md** - Complete rewrite for public audience:
   - Hero section with badges
   - Features list
   - Installation (CLI + MCP)
   - Usage examples (all modes)
   - MCP integration guide
   - API documentation
   - Troubleshooting
   - Contributing link

**README Structure**:

```markdown
# lean-browser

[![npm](badge)] [![CI](badge)] [![License](badge)] [![MCP](badge)]

> Playwright + Readability based page compressor for LLMs

## Features

[Bullet points]

## Installation

### CLI: npm install -g lean-browser

### MCP: [Claude Desktop config]

## Usage

### CLI Examples

[Text mode, JSON mode, Interactive mode, Actions]

### MCP Integration

[Setup guide, available tools]

### Programmatic Usage

[Import as library]

## Documentation

[API reference, token budgeting, troubleshooting]

## Contributing

[Link to CONTRIBUTING.md]

## License

MIT
```

**Verification**:

- README renders correctly on GitHub
- All example scripts run successfully
- Links are valid
- Badges display correctly

### Phase 7: CI/CD & Release (Week 3)

**New Files**:

1. **.github/workflows/ci.yml** - Test on push/PR
   - Matrix: Node 18/20/22 × ubuntu/macos/windows
   - Install Playwright browsers
   - Run lint + tests

2. **.github/workflows/publish.yml** - Publish to npm on tag
   - Trigger on `v*` tags
   - Run tests first
   - Publish with provenance

3. **.github/workflows/codeql.yml** - Security scanning

4. **.github/ISSUE_TEMPLATE/bug_report.md** - Bug template

5. **.github/ISSUE_TEMPLATE/feature_request.md** - Feature template

6. **.github/PULL_REQUEST_TEMPLATE.md** - PR template

7. **.github/dependabot.yml** - Dependency updates

8. **.gitignore** - Already exists, verify completeness

**Git Setup**:

```bash
cd /Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser
git init
git add .
git commit -m "Initial commit: lean-browser v0.2.0

Playwright + Readability based page compressor for LLMs
- CLI with text/json/interactive modes
- Action execution and session management
- MCP server integration
- Comprehensive test suite

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Create GitHub repo first, then:
git remote add origin git@github.com:username/lean-browser.git
git branch -M main
git push -u origin main
```

**NPM Publishing**:

```bash
npm login
npm publish --access public
```

**Verification**:

```bash
# Test npm package
npm install -g lean-browser@latest
lean-browser --version
lean-browser-mcp

# Test CI
git push  # Triggers CI workflow
# Check Actions tab on GitHub

# Test publishing
git tag v0.2.0
git push --tags  # Triggers publish workflow
# Verify on npmjs.com
```

### Phase 8: Post-Release Polish (Week 4)

**Tasks**:

1. Create GitHub Release with CHANGELOG
2. Update README badges with real URLs
3. Test installation on fresh systems
4. Monitor initial issues/feedback
5. Create demo GIF/video
6. Write blog post announcement (optional)
7. Submit to MCP server showcases

**Verification**:

- Package installs cleanly on Mac/Linux/Windows
- MCP server works in Claude Desktop
- All examples run correctly
- Documentation is clear
- Community can contribute

---

## Critical Files Reference

### Must Modify

1. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/bin/cli.js` - Refactor for subcommands
2. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/src/browser.js` - Extract reusable functions
3. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/src/extractor.js` - Add element mapping
4. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/package.json` - Update deps, scripts, bins
5. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/README.md` - Complete rewrite

### Must Create

1. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/src/actions.js` - Action execution engine
2. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/src/session-manager.js` - Session lifecycle
3. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/bin/mcp-server.js` - MCP entry point
4. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/src/mcp/handlers.js` - MCP tool handlers
5. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/test/` - Test suite (unit + integration)

### Reference (Reuse Patterns)

1. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/src/formatter.js` - Output formatting patterns
2. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/src/tokenizer.js` - Token budgeting logic
3. `/Users/rajan/Library/CloudStorage/Dropbox/Projects/moltbot/labs/lean-browser/src/utils.js` - CSS selector utilities

---

## End-to-End Verification

After completing all phases, verify the complete system:

### 1. CLI Functionality

```bash
# Basic modes
lean-browser https://example.com --mode text --tokens 500
lean-browser https://example.com --mode json
lean-browser https://github.com/login --mode interactive

# Actions (one-shot)
lean-browser action https://github.com/login \
  --actions "type:e1:user,type:e2:pass,click:e3" \
  --snapshot

# Session (stateful)
SESSION=$(lean-browser session start https://example.com | jq -r .sessionId)
lean-browser session exec --session $SESSION --action "click:e1"
lean-browser session snapshot --session $SESSION
lean-browser session close --session $SESSION
```

### 2. MCP Integration

```bash
# Test with Inspector
npx @modelcontextprotocol/inspector lean-browser-mcp

# Test with Claude Desktop
# Add to ~/Library/Application Support/Claude/claude_desktop_config.json
# Ask Claude: "Use lean-browser to fetch https://news.ycombinator.com"
```

### 3. Programmatic Usage

```javascript
import { fetchRenderedHtml } from 'lean-browser/src/browser.js';
import { formatText } from 'lean-browser/src/formatter.js';

const fetched = await fetchRenderedHtml('https://example.com');
const output = await formatText({}, extracted, { maxTokens: 500 });
console.log(output.text);
```

### 4. Testing & Quality

```bash
npm test                  # All tests pass
npm run lint             # No errors
npm run format:check     # Formatting consistent
npm run typecheck        # Types valid
```

### 5. Installation

```bash
# Global
npm install -g lean-browser
which lean-browser
which lean-browser-mcp

# Local
npm install lean-browser
npx lean-browser https://example.com
```

### 6. CI/CD

- Push to GitHub → CI runs → All checks pass
- Create tag v0.2.0 → Publish workflow runs → Package on npm
- npm view lean-browser → Shows correct version

---

## Success Criteria

- ✅ All CLI modes work (text, json, interactive)
- ✅ Action execution works (one-shot + session)
- ✅ MCP server works in Claude Desktop
- ✅ Test coverage >80%
- ✅ All examples run successfully
- ✅ Documentation is comprehensive
- ✅ CI/CD pipeline works
- ✅ Package published to npm
- ✅ GitHub repo is public and well-documented
- ✅ Community can install and use immediately

---

## Timeline Summary

- **Week 1**: Action execution + session management
- **Week 2**: Testing infrastructure + MCP integration + quality tooling
- **Week 3**: Documentation + CI/CD + release
- **Week 4**: Post-release polish

**Total**: ~4 weeks to production-ready public release

---

## Notes

- Maintain backward compatibility throughout (existing CLI usage should never break)
- Use existing code patterns (don't reinvent, extend)
- Keep dependencies minimal (only add what's necessary)
- Write tests as you go (not at the end)
- Document decisions in code comments
- Follow semantic versioning (0.2.0 → 1.0.0 when stable)

---

## Full Planning Transcript

If you need specific details from the planning session (like exact code snippets, error messages, or content generated), read the full transcript at:
`/Users/rajan/.claude/projects/-Users-rajan/f5e20317-3bd0-442d-a4e8-cd9262b76eb2.jsonl`
