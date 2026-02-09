# MCP Quick Start Guide

Get started with lean-browser MCP tools in 5 minutes.

## Setup

### 1. Install

```bash
npm install -g lean-browser
npx playwright install chromium
```

### 2. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lean-browser": {
      "command": "lean-browser-mcp"
    }
  }
}
```

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop completely.

### 4. Verify

Ask Claude: _"What MCP tools do you have?"_

You should see 9 lean-browser tools listed.

---

## 30-Second Examples

### Read a webpage

```
Use lean-browser to fetch https://news.ycombinator.com
```

### Fill a form

```
Use lean-browser to search for "AI" on GitHub
```

### Multi-step workflow

```
Start a browser session on https://example.com, click the first link, then show me the page
```

### Take a screenshot

```
Use lean-browser to take a full-page screenshot of https://example.com
```

---

## Tool Cheat Sheet

| Tool                         | Use Case          | Example Prompt                                     |
| ---------------------------- | ----------------- | -------------------------------------------------- |
| **fetch_page_text**          | Read articles     | "Fetch and summarize https://blog.example.com"     |
| **fetch_page_json**          | Extract data      | "Get structured content from https://example.com"  |
| **fetch_page_interactive**   | Discover elements | "What buttons are on https://example.com/login?"   |
| **execute_browser_action**   | Automate forms    | "Fill out the contact form at https://example.com" |
| **take_screenshot**          | Visual capture    | "Screenshot https://example.com in mobile view"    |
| **browser_session_start**    | Start workflow    | "Start session on https://example.com"             |
| **browser_session_execute**  | Step-by-step      | "In session abc123, click element e1"              |
| **browser_session_snapshot** | Check state       | "Show me the current page in session abc123"       |
| **browser_session_close**    | Clean up          | "Close session abc123"                             |

---

## Common Patterns

### Pattern 1: One-Time Form Fill

```
Prompt: Fill login form at https://example.com/login with test/test123

Claude will:
1. fetch_page_interactive to get form elements
2. execute_browser_action with type and click actions
3. Return result
```

### Pattern 2: Stateful Navigation

```
Prompt: Start session, navigate to About page, then Team page

Claude will:
1. browser_session_start on homepage
2. browser_session_execute to click About link
3. browser_session_execute to click Team link
4. browser_session_snapshot to show final page
5. browser_session_close to clean up
```

### Pattern 3: Data Extraction

```
Prompt: Extract product info from https://example.com/product/123

Claude will:
1. fetch_page_json to get structured content
2. Parse and format the data
3. Return as clean JSON
```

---

## Action Syntax

Quick reference for the action DSL:

```
click:e1              → Click element e1
type:e2:value         → Type "value" in e2
type:e2:pass:slow     → Type slowly (human-like)
select:e3:option1     → Select dropdown option
submit:e4             → Submit form
wait:2000             → Wait 2 seconds
navigate:https://...  → Go to URL
scroll:500            → Scroll down 500px
```

Combine multiple actions:

```json
{
  "actions": ["type:e1:username", "type:e2:password", "wait:500", "click:e3"]
}
```

---

## Troubleshooting

### Problem: Claude doesn't see lean-browser tools

**Solution:**

1. Check config file path is correct
2. Restart Claude Desktop completely (Cmd+Q)
3. Check MCP server works: `lean-browser-mcp` in terminal
4. Check Claude's MCP logs (Help → View Logs)

### Problem: Element not found

**Solution:**

```
First ask: "Use fetch_page_interactive to show me all elements on the page"
Then: Use the correct element IDs from that list
```

### Problem: Session expired

**Solution:**
Sessions expire after 10 minutes. Just start a new one.

### Problem: Action times out

**Solution:**
Add a wait action before it: `["wait:2000", "click:e5"]`

---

## Best Practices

1. ✅ Always discover elements first with `fetch_page_interactive`
2. ✅ Close sessions when done to free resources
3. ✅ Use sessions for multi-step workflows
4. ✅ Use `execute_browser_action` for one-time automations
5. ✅ Add wait actions for dynamic content
6. ❌ Don't hardcode credentials in prompts
7. ❌ Don't keep sessions open unnecessarily
8. ❌ Don't use sessions for simple one-off fetches

---

## Next Steps

- Read [MCP_TOOLS.md](./MCP_TOOLS.md) for comprehensive documentation
- See [examples/mcp-examples.md](./examples/mcp-examples.md) for 20+ examples
- Check [README.md](./README.md) for CLI usage
- Test with MCP Inspector: `npm install -g @modelcontextprotocol/inspector`

---

## Support

- GitHub Issues: https://github.com/YOUR_USERNAME/lean-browser/issues
- Documentation: See MCP_TOOLS.md
- Examples: See examples/mcp-examples.md

---

**Ready to go! Try asking Claude:**

_"Use lean-browser to fetch the top story from Hacker News and summarize it for me"_
