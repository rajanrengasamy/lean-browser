# MCP Tools Documentation

This document provides comprehensive documentation for all MCP tools exposed by lean-browser.

## Table of Contents

1. [Read-Only Tools](#read-only-tools)
2. [Action Execution Tools](#action-execution-tools)
3. [Session Management Tools](#session-management-tools)
4. [Usage Examples](#usage-examples)
5. [Action Syntax Reference](#action-syntax-reference)

## Read-Only Tools

### fetch_page_text

Fetch a webpage and extract clean readable text content.

**Best for:** Articles, blog posts, documentation

**Input:**

```json
{
  "url": "https://example.com",
  "maxTokens": 1200,
  "timeout": 45000
}
```

**Output:**

```markdown
# Article Title

Source: https://example.com
HTTP: 200
By: Author Name
Excerpt: Brief summary...

Full article text content...
```

**Use case:** When you want to read and understand textual content without dealing with page structure or interactive elements.

---

### fetch_page_json

Fetch a webpage and return structured JSON with semantic content blocks.

**Best for:** Data extraction, content analysis, programmatic processing

**Input:**

```json
{
  "url": "https://example.com",
  "maxTokens": 1200,
  "timeout": 45000
}
```

**Output:**

```json
{
  "url": "https://example.com",
  "status": 200,
  "fetchedTitle": "Page Title",
  "article": {
    "title": "Article Title",
    "byline": "Author Name",
    "excerpt": "Brief summary...",
    "text": "Full text...",
    "blocks": [
      { "type": "p", "text": "Paragraph 1..." },
      { "type": "p", "text": "Paragraph 2..." }
    ]
  },
  "truncated": false,
  "tokens": 843
}
```

**Use case:** When you need structured data for analysis, want to process content programmatically, or need to extract specific sections.

---

### fetch_page_interactive

Fetch a webpage and return actionable elements with IDs and selectors.

**Best for:** Understanding page structure, planning interactions, automation

**Input:**

```json
{
  "url": "https://github.com/login",
  "maxTokens": 1200,
  "timeout": 45000
}
```

**Output:**

```json
{
  "url": "https://github.com/login",
  "status": 200,
  "fetchedTitle": "Sign in to GitHub",
  "view": {
    "title": "Sign in to GitHub",
    "excerpt": "...",
    "text": "..."
  },
  "elements": [
    {
      "id": "e1",
      "tag": "input",
      "type": "text",
      "label": "Username or email address",
      "href": null,
      "name": "login",
      "selector": "#login_field"
    },
    {
      "id": "e2",
      "tag": "input",
      "type": "password",
      "label": "Password",
      "href": null,
      "name": "password",
      "selector": "#password"
    },
    {
      "id": "e3",
      "tag": "input",
      "type": "submit",
      "label": "Sign in",
      "href": null,
      "name": "commit",
      "selector": "input[type='submit']"
    }
  ],
  "truncated": false,
  "tokens": 456
}
```

**Use case:** When you need to interact with a page, discover what actions are available, or plan a sequence of clicks/inputs.

---

## Action Execution Tools

### execute_browser_action

Navigate to a URL and execute a sequence of actions in a single call. Does not maintain state between calls.

**Best for:** One-time multi-step workflows, form submissions, automated navigation

**Input:**

```json
{
  "url": "https://github.com/login",
  "actions": ["type:e1:myusername", "type:e2:mypassword", "click:e3"],
  "maxTokens": 1200,
  "timeout": 45000,
  "snapshotMode": "interactive"
}
```

**Output:**

```json
{
  "url": "https://github.com/login",
  "finalUrl": "https://github.com/",
  "actionsExecuted": 3,
  "results": [
    { "type": "type", "elementId": "e1", "ok": true },
    { "type": "type", "elementId": "e2", "ok": true },
    { "type": "click", "elementId": "e3", "ok": true }
  ],
  "snapshot": {
    "url": "https://github.com/",
    "status": 200,
    "view": { "title": "GitHub", "excerpt": "...", "text": "..." },
    "elements": [...]
  }
}
```

**Use case:** Quick automation tasks, form filling, testing workflows, one-off interactions.

**Workflow:**

1. Use `fetch_page_interactive` to discover element IDs
2. Plan your action sequence
3. Execute all actions with `execute_browser_action`
4. Review results and final page state

---

### take_screenshot

Capture a visual screenshot of any webpage.

**Best for:** Visual verification, debugging, capturing dynamic content, archiving

**Input:**

```json
{
  "url": "https://example.com",
  "fullPage": false,
  "timeout": 45000,
  "viewport": {
    "width": 1280,
    "height": 720
  }
}
```

**Output:**

```json
{
  "url": "https://example.com",
  "finalUrl": "https://example.com",
  "fullPage": false,
  "viewport": { "width": 1280, "height": 720 },
  "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAA...",
  "size": 145632
}
```

**Use case:**

- Visual regression testing
- Debugging layout issues
- Capturing charts/graphs
- Creating page archives
- Verifying renders

**Tips:**

- Set `fullPage: true` to capture entire scrollable content
- Adjust viewport for mobile/desktop views
- Use for visual confirmation after action sequences

---

## Session Management Tools

### browser_session_start

Create a new stateful browser session. The browser stays open and maintains all state.

**Best for:** Multi-step workflows, maintaining login state, exploring sites interactively

**Input:**

```json
{
  "url": "https://example.com",
  "timeout": 45000,
  "headless": true,
  "snapshotMode": "interactive",
  "maxTokens": 1200
}
```

**Output:**

```json
{
  "sessionId": "a1b2c3d4",
  "url": "https://example.com",
  "finalUrl": "https://example.com",
  "status": 200,
  "snapshot": {
    "url": "https://example.com",
    "view": { "title": "...", "excerpt": "...", "text": "..." },
    "elements": [...]
  },
  "message": "Session created successfully. Use this sessionId for subsequent actions."
}
```

**Important:**

- Save the `sessionId` for all subsequent operations
- Sessions expire after 10 minutes of inactivity
- Always close sessions when done to free resources

---

### browser_session_execute

Execute a single action in an existing session.

**Best for:** Step-by-step exploration, conditional logic, careful testing

**Input:**

```json
{
  "sessionId": "a1b2c3d4",
  "action": "click:e1",
  "snapshotMode": "interactive",
  "maxTokens": 1200
}
```

**Output:**

```json
{
  "sessionId": "a1b2c3d4",
  "currentUrl": "https://example.com/page2",
  "action": {
    "type": "click",
    "elementId": "e1",
    "ok": true
  },
  "snapshot": {
    "url": "https://example.com/page2",
    "view": { "title": "...", "excerpt": "...", "text": "..." },
    "elements": [...]
  }
}
```

**Workflow:**

1. Start session with `browser_session_start`
2. Use snapshot to discover elements
3. Execute action with `browser_session_execute`
4. Repeat steps 2-3 as needed
5. Close with `browser_session_close`

**Note:** Only one action per call. For multiple actions, call repeatedly or use `execute_browser_action`.

---

### browser_session_snapshot

Capture current state of a session without executing any actions.

**Best for:** Inspecting page state, discovering elements after navigation, debugging

**Input:**

```json
{
  "sessionId": "a1b2c3d4",
  "mode": "interactive",
  "maxTokens": 1200
}
```

**Output:**

```json
{
  "sessionId": "a1b2c3d4",
  "currentUrl": "https://example.com/current-page",
  "snapshot": {
    "url": "https://example.com/current-page",
    "view": { "title": "...", "excerpt": "...", "text": "..." },
    "elements": [...]
  }
}
```

**Use case:**

- Check page state after actions
- Discover new elements after navigation
- Verify expected page content
- Debug why actions aren't working

**Modes:**

- `interactive`: Get actionable elements (default)
- `text`: Get clean readable text
- `json`: Get structured content blocks

---

### browser_session_close

Close a browser session and free resources.

**Input:**

```json
{
  "sessionId": "a1b2c3d4"
}
```

**Output:**

```json
{
  "sessionId": "a1b2c3d4",
  "closed": true,
  "message": "Session closed successfully"
}
```

**Best practice:** Always close sessions explicitly when done, even though they auto-expire after 10 minutes.

---

### browser_session_list

List all active browser sessions.

**Input:**

```json
{}
```

**Output:**

```json
{
  "sessions": [
    {
      "sessionId": "a1b2c3d4",
      "url": "https://example.com",
      "finalUrl": "https://example.com/page",
      "createdAt": 1707512345678,
      "lastActivity": 1707512456789
    }
  ],
  "count": 1
}
```

**Use case:** Debugging, session management, finding orphaned sessions

---

## Usage Examples

### Example 1: Read a Blog Article

```
Use fetch_page_text to read https://example.com/blog/post
```

**Result:** Clean markdown-formatted article content

---

### Example 2: Login to a Website

**Step 1:** Discover form elements

```
Use fetch_page_interactive on https://example.com/login
```

**Step 2:** Execute login

```
Use execute_browser_action:
- url: https://example.com/login
- actions: ["type:e1:myuser", "type:e2:mypass", "click:e3"]
```

**Result:** Logged in and redirected to dashboard

---

### Example 3: Multi-Page Navigation Session

**Step 1:** Start session

```
Use browser_session_start on https://example.com
```

-> Get sessionId: "a1b2c3d4"

**Step 2:** Click first link

```
Use browser_session_execute:
- sessionId: a1b2c3d4
- action: click:e1
```

**Step 3:** Check new page

```
Use browser_session_snapshot:
- sessionId: a1b2c3d4
- mode: interactive
```

**Step 4:** Fill out form

```
Use browser_session_execute:
- sessionId: a1b2c3d4
- action: type:e5:John Doe
```

**Step 5:** Submit form

```
Use browser_session_execute:
- sessionId: a1b2c3d4
- action: click:e10
```

**Step 6:** Clean up

```
Use browser_session_close:
- sessionId: a1b2c3d4
```

---

### Example 4: Visual Screenshot

```
Use take_screenshot:
- url: https://example.com/dashboard
- fullPage: true
- viewport: { width: 1920, height: 1080 }
```

**Result:** Base64-encoded PNG of entire dashboard

---

### Example 5: Search Form Automation

**Step 1:** Get search form

```
Use fetch_page_interactive on https://example.com/search
```

**Step 2:** Execute search

```
Use execute_browser_action:
- url: https://example.com/search
- actions: ["type:e2:artificial intelligence", "click:e3"]
- snapshotMode: json
```

**Result:** Search results in structured JSON format

---

## Action Syntax Reference

All actions use a simple DSL (Domain-Specific Language) with colon-separated parts.

### Action Types

| Action       | Syntax                      | Description                       | Example                 |
| ------------ | --------------------------- | --------------------------------- | ----------------------- |
| **click**    | `click:elementId`           | Click an element                  | `click:e1`              |
| **type**     | `type:elementId:value`      | Fill input with value (fast)      | `type:e2:hello`         |
| **type**     | `type:elementId:value:slow` | Type with human-like delay (80ms) | `type:e2:password:slow` |
| **select**   | `select:elementId:value`    | Select dropdown option            | `select:e3:option1`     |
| **submit**   | `submit:elementId`          | Submit form containing element    | `submit:e4`             |
| **wait**     | `wait:milliseconds`         | Wait for specified time (max 30s) | `wait:2000`             |
| **navigate** | `navigate:url`              | Navigate to new URL               | `navigate:https://...`  |
| **scroll**   | `scroll:pixels`             | Scroll down by pixels             | `scroll:500`            |

### Element IDs

- Element IDs are discovered using `fetch_page_interactive` or session snapshots
- Always start with 'e' followed by a number: e1, e2, e3, etc.
- IDs are mapped to CSS selectors internally
- IDs are specific to each page load

### Action Chaining

For `execute_browser_action`, actions are specified as an array:

```json
{
  "actions": ["type:e1:username", "type:e2:password", "wait:1000", "click:e3", "wait:2000", "scroll:500"]
}
```

For `browser_session_execute`, only one action at a time:

```json
{
  "action": "click:e1"
}
```

### Special Characters in Values

If your value contains colons, the last colon is used as the separator:

```
type:e1:user:name   -> elementId="e1", value="user:name"
type:e1:pass:slow   -> elementId="e1", value="pass", slow=true
```

### Best Practices

1. **Discover before acting:** Always use `fetch_page_interactive` first to get element IDs
2. **Verify elements:** Check that element IDs exist before executing actions
3. **Add waits:** Use `wait` actions between steps for dynamic content
4. **Use sessions for multi-step:** Use session tools when you need to maintain state
5. **Close sessions:** Always close sessions when done to free resources
6. **Handle errors:** Action failures throw errors with details about what went wrong
7. **Test incrementally:** Test each action separately before chaining

### Error Handling

Common errors:

- `ElementNotFoundError`: Element ID not found on page
- `ActionTimeoutError`: Action took too long to execute
- `ValidationError`: Invalid action syntax or parameters
- `Session not found`: Session expired or invalid sessionId

---

## Testing with MCP Inspector

Install MCP Inspector:

```bash
npm install -g @modelcontextprotocol/inspector
```

Run inspector:

```bash
mcp-inspector lean-browser-mcp
```

This opens a web UI where you can:

- Browse all available tools
- Test tool calls interactively
- View request/response payloads
- Debug schema validation

---

## Performance Tips

1. **Token budgeting:** Set appropriate `maxTokens` to avoid truncation
2. **Timeouts:** Increase timeout for slow sites (default 45s)
3. **Headless mode:** Use headless for speed, headed for debugging
4. **Session cleanup:** Close sessions promptly to free browser resources
5. **Parallel fetch:** Use read-only tools in parallel for speed
6. **Sequential actions:** Use session tools for dependent actions

---

## Security Considerations

1. **Never commit credentials:** Don't hardcode passwords in action sequences
2. **Session expiry:** Sessions auto-expire after 10 minutes
3. **Resource limits:** System may limit concurrent sessions
4. **Sanitize inputs:** Validate action parameters before execution
5. **HTTPS only:** Use HTTPS URLs for sensitive operations

---

## Troubleshooting

**Q: Element IDs keep changing**
A: Element IDs are generated fresh on each page load. Always fetch elements before actions.

**Q: Actions timing out**
A: Increase timeout, add wait actions, or verify element is actually clickable.

**Q: Session not found**
A: Sessions expire after 10 minutes. Start a new session.

**Q: Screenshot too large**
A: Reduce viewport size or use fullPage:false.

**Q: Can't find element**
A: Use snapshot to verify element IDs on current page state.

---

For more examples and use cases, see the main README.md and examples/ directory.
