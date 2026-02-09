# Testing MCP Tools with MCP Inspector

This guide shows how to test lean-browser MCP tools using the MCP Inspector.

## Install MCP Inspector

```bash
npm install -g @modelcontextprotocol/inspector
```

## Start Inspector

```bash
npx @modelcontextprotocol/inspector lean-browser-mcp
```

This opens a web UI at `http://localhost:5173` (or similar).

---

## Testing Read-Only Tools

### Test 1: fetch_page_text

**Tool:** `fetch_page_text`

**Input:**

```json
{
  "url": "https://example.com",
  "maxTokens": 800,
  "timeout": 30000
}
```

**Expected Output:**

```
Content with type "text" containing:
- Markdown formatted article
- Title (# heading)
- Source URL
- HTTP status
- Article body
```

**Validation:**

- ✅ Text is clean and readable
- ✅ No HTML tags present
- ✅ Proper markdown formatting
- ✅ Title and metadata present

---

### Test 2: fetch_page_json

**Tool:** `fetch_page_json`

**Input:**

```json
{
  "url": "https://example.com",
  "maxTokens": 1000,
  "timeout": 30000
}
```

**Expected Output:**

```json
{
  "url": "https://example.com",
  "status": 200,
  "fetchedTitle": "Example Domain",
  "article": {
    "title": "Example Domain",
    "byline": null,
    "excerpt": "...",
    "text": "This domain is for use in illustrative examples...",
    "blocks": [{ "type": "p", "text": "..." }]
  },
  "truncated": false,
  "tokens": 156
}
```

**Validation:**

- ✅ Valid JSON structure
- ✅ All required fields present
- ✅ Blocks array contains paragraphs
- ✅ Token count is accurate

---

### Test 3: fetch_page_interactive

**Tool:** `fetch_page_interactive`

**Input:**

```json
{
  "url": "https://github.com/login",
  "maxTokens": 1200,
  "timeout": 30000
}
```

**Expected Output:**

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
    }
  ],
  "truncated": false,
  "tokens": 456
}
```

**Validation:**

- ✅ Elements array contains interactive items
- ✅ Each element has id, tag, type, label, selector
- ✅ IDs start with "e" and are sequential (e1, e2, e3...)
- ✅ Input fields have proper type attribute

---

## Testing Action Execution Tools

### Test 4: execute_browser_action (Simple)

**Tool:** `execute_browser_action`

**Input:**

```json
{
  "url": "https://example.com",
  "actions": ["scroll:500", "wait:1000"],
  "maxTokens": 800,
  "timeout": 30000,
  "snapshotMode": "text"
}
```

**Expected Output:**

```json
{
  "url": "https://example.com",
  "finalUrl": "https://example.com",
  "actionsExecuted": 2,
  "results": [
    { "type": "scroll", "pixels": 500, "ok": true },
    { "type": "wait", "ms": 1000, "ok": true }
  ],
  "snapshot": {
    "url": "https://example.com",
    "view": { "title": "...", "text": "..." }
  }
}
```

**Validation:**

- ✅ All actions executed successfully
- ✅ Results array matches actions array length
- ✅ Each result has ok: true
- ✅ Snapshot contains final page state

---

### Test 5: execute_browser_action (Form Fill)

**Tool:** `execute_browser_action`

**Prerequisites:** First run `fetch_page_interactive` to get element IDs

**Input:**

```json
{
  "url": "https://httpbin.org/forms/post",
  "actions": ["type:e1:John Doe", "type:e3:john@example.com"],
  "maxTokens": 1200,
  "timeout": 30000,
  "snapshotMode": "interactive"
}
```

**Expected Output:**

```json
{
  "url": "https://httpbin.org/forms/post",
  "finalUrl": "https://httpbin.org/forms/post",
  "actionsExecuted": 2,
  "results": [
    { "type": "type", "elementId": "e1", "ok": true },
    { "type": "type", "elementId": "e3", "ok": true }
  ],
  "snapshot": {
    "elements": [...]
  }
}
```

**Validation:**

- ✅ No errors thrown
- ✅ All type actions successful
- ✅ Snapshot shows updated page state

---

### Test 6: execute_browser_action (Error Case)

**Tool:** `execute_browser_action`

**Input:** (Using invalid element ID)

```json
{
  "url": "https://example.com",
  "actions": ["click:e999"],
  "maxTokens": 800,
  "timeout": 30000
}
```

**Expected Output:**
Error with message like:

```
ElementNotFoundError: Element "e999" not found (Available: e1, e2, e3...)
```

**Validation:**

- ✅ Error is thrown with clear message
- ✅ Error includes available element IDs
- ✅ No partial execution

---

### Test 7: take_screenshot

**Tool:** `take_screenshot`

**Input:**

```json
{
  "url": "https://example.com",
  "fullPage": false,
  "timeout": 30000,
  "viewport": {
    "width": 1280,
    "height": 720
  }
}
```

**Expected Output:**

```json
{
  "url": "https://example.com",
  "finalUrl": "https://example.com",
  "fullPage": false,
  "viewport": { "width": 1280, "height": 720 },
  "imageBase64": "iVBORw0KGgoAAAANSUhEUg...",
  "size": 145632
}
```

**Validation:**

- ✅ imageBase64 starts with "iVBORw0KG" (PNG header)
- ✅ size matches base64 string length (approximately)
- ✅ Can decode base64 to valid PNG image
- ✅ Image dimensions match viewport

**How to verify image:**

```bash
# Copy base64 string and decode
echo "iVBORw0KGgoAAAA..." | base64 -d > test.png
open test.png
```

---

## Testing Session Management Tools

### Test 8: browser_session_start

**Tool:** `browser_session_start`

**Input:**

```json
{
  "url": "https://example.com",
  "timeout": 30000,
  "headless": true,
  "snapshotMode": "interactive",
  "maxTokens": 1200
}
```

**Expected Output:**

```json
{
  "sessionId": "a1b2c3d4",
  "url": "https://example.com",
  "finalUrl": "https://example.com",
  "status": 200,
  "snapshot": {
    "url": "https://example.com",
    "elements": [...]
  },
  "message": "Session created successfully. Use this sessionId for subsequent actions."
}
```

**Validation:**

- ✅ sessionId is 8-character string
- ✅ snapshot contains page state
- ✅ finalUrl matches navigated URL
- ✅ status is 200

**Important:** Save the sessionId for next tests!

---

### Test 9: browser_session_snapshot

**Tool:** `browser_session_snapshot`

**Prerequisites:** Must have active session from Test 8

**Input:**

```json
{
  "sessionId": "a1b2c3d4",
  "mode": "interactive",
  "maxTokens": 1200
}
```

**Expected Output:**

```json
{
  "sessionId": "a1b2c3d4",
  "currentUrl": "https://example.com",
  "snapshot": {
    "url": "https://example.com",
    "view": { "title": "...", "text": "..." },
    "elements": [...]
  }
}
```

**Validation:**

- ✅ Same sessionId echoed back
- ✅ currentUrl shows current page
- ✅ snapshot matches requested mode
- ✅ No error about session not found

---

### Test 10: browser_session_execute

**Tool:** `browser_session_execute`

**Prerequisites:** Active session with interactive elements

**Input:**

```json
{
  "sessionId": "a1b2c3d4",
  "action": "scroll:500",
  "snapshotMode": "text",
  "maxTokens": 800
}
```

**Expected Output:**

```json
{
  "sessionId": "a1b2c3d4",
  "currentUrl": "https://example.com",
  "action": {
    "type": "scroll",
    "ok": true
  },
  "snapshot": {
    "url": "https://example.com",
    "view": { "title": "...", "text": "..." }
  }
}
```

**Validation:**

- ✅ Action executed successfully (ok: true)
- ✅ Snapshot reflects page after action
- ✅ Session state maintained

---

### Test 11: browser_session_list

**Tool:** `browser_session_list`

**Prerequisites:** At least one active session

**Input:**

```json
{}
```

**Expected Output:**

```json
{
  "sessions": [
    {
      "sessionId": "a1b2c3d4",
      "url": "https://example.com",
      "finalUrl": "https://example.com",
      "createdAt": 1707512345678,
      "lastActivity": 1707512456789
    }
  ],
  "count": 1
}
```

**Validation:**

- ✅ Sessions array contains active sessions
- ✅ Count matches array length
- ✅ Each session has required fields
- ✅ Timestamps are recent

---

### Test 12: browser_session_close

**Tool:** `browser_session_close`

**Prerequisites:** Active session to close

**Input:**

```json
{
  "sessionId": "a1b2c3d4"
}
```

**Expected Output:**

```json
{
  "sessionId": "a1b2c3d4",
  "closed": true,
  "message": "Session closed successfully"
}
```

**Validation:**

- ✅ closed is true
- ✅ No error thrown
- ✅ Subsequent calls with same sessionId should fail

**Verify closure:**
Try calling `browser_session_snapshot` with same sessionId - should get error.

---

## Testing Error Scenarios

### Test 13: Invalid URL

**Tool:** `fetch_page_text`

**Input:**

```json
{
  "url": "not-a-url",
  "maxTokens": 800
}
```

**Expected:** Validation error from Zod schema

---

### Test 14: Timeout

**Tool:** `fetch_page_text`

**Input:**

```json
{
  "url": "https://httpstat.us/200?sleep=60000",
  "timeout": 5000
}
```

**Expected:** Timeout error after ~5 seconds

---

### Test 15: Session Not Found

**Tool:** `browser_session_snapshot`

**Input:**

```json
{
  "sessionId": "invalid123"
}
```

**Expected:** Error: Session "invalid123" not found or expired

---

### Test 16: Session Expired

**Tool:** `browser_session_snapshot`

**Prerequisites:** Start session and wait 11 minutes (or manually expire)

**Expected:** Error: Session expired

---

## Performance Testing

### Test 17: Large Page

**Tool:** `fetch_page_json`

**Input:**

```json
{
  "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
  "maxTokens": 2000,
  "timeout": 60000
}
```

**Expected:**

- ✅ Completes within timeout
- ✅ Content is truncated to token limit
- ✅ truncated flag is true
- ✅ tokens field shows ~2000

---

### Test 18: Multiple Actions

**Tool:** `execute_browser_action`

**Input:**

```json
{
  "url": "https://example.com",
  "actions": ["scroll:200", "wait:500", "scroll:200", "wait:500", "scroll:200", "wait:500", "scroll:-400"],
  "maxTokens": 800,
  "timeout": 45000
}
```

**Expected:**

- ✅ All 7 actions execute successfully
- ✅ Total time < 5 seconds
- ✅ All results have ok: true

---

### Test 19: Screenshot Size

**Tool:** `take_screenshot`

**Input:**

```json
{
  "url": "https://example.com",
  "fullPage": true,
  "timeout": 30000,
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

**Expected:**

- ✅ imageBase64 is valid
- ✅ size is reasonable (< 1MB for simple page)
- ✅ fullPage captures entire scrollable content

---

## Complete Test Workflow

Run this complete workflow to test all tools:

```javascript
// 1. Fetch interactive page
const interactive = await fetchPageInteractive('https://example.com');
// Verify: elements array populated

// 2. Start session
const session = await browserSessionStart('https://example.com');
const sessionId = session.sessionId;
// Verify: sessionId received

// 3. Execute action in session
const execute = await browserSessionExecute(sessionId, 'scroll:500');
// Verify: action executed

// 4. Get snapshot
const snapshot = await browserSessionSnapshot(sessionId, 'text');
// Verify: snapshot returned

// 5. List sessions
const list = await browserSessionList();
// Verify: sessionId appears in list

// 6. Close session
const close = await browserSessionClose(sessionId);
// Verify: session closed

// 7. Execute multi-action
const actions = await executeBrowserAction('https://example.com', ['scroll:300', 'wait:1000']);
// Verify: both actions executed

// 8. Take screenshot
const screenshot = await takeScreenshot('https://example.com', false);
// Verify: base64 image returned
```

---

## Checklist for Release

Before releasing, verify:

- [ ] All 9 tools appear in MCP Inspector
- [ ] All tools have proper schemas defined
- [ ] All tools return MCP-compatible content format
- [ ] Errors are handled gracefully with clear messages
- [ ] Sessions auto-expire after 10 minutes
- [ ] Screenshots are valid PNG images
- [ ] Token budgeting works across all tools
- [ ] Action parsing handles all 8 action types
- [ ] Element IDs are properly mapped to selectors
- [ ] Documentation matches actual behavior

---

## Debugging Tips

### Enable verbose logging

Set environment variable before starting inspector:

```bash
DEBUG=* npx @modelcontextprotocol/inspector lean-browser-mcp
```

### Check tool registration

In inspector UI, verify all 9 tools are listed:

1. fetch_page_text
2. fetch_page_json
3. fetch_page_interactive
4. execute_browser_action
5. take_screenshot
6. browser_session_start
7. browser_session_execute
8. browser_session_snapshot
9. browser_session_close
10. browser_session_list

### Test schema validation

Try invalid inputs to verify Zod validation:

- Missing required fields
- Wrong types (string instead of number)
- Invalid URLs
- Out of range numbers

### Monitor browser processes

Check browser processes during testing:

```bash
ps aux | grep chromium
```

Verify they're cleaned up after session close.

---

Happy testing! 🚀
