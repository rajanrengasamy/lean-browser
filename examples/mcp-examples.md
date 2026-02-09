# MCP Examples for Claude Desktop and Claude Code

This file contains practical examples of using lean-browser MCP tools with Claude Desktop and Claude Code.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Fetching](#basic-fetching)
3. [Form Automation](#form-automation)
4. [Multi-Step Workflows](#multi-step-workflows)
5. [Data Extraction](#data-extraction)
6. [Visual Verification](#visual-verification)
7. [Advanced Patterns](#advanced-patterns)

---

## Getting Started

### Installation

1. Install lean-browser globally:

```bash
npm install -g lean-browser
npx playwright install chromium
```

2. Configure Claude Desktop:

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

3. Restart Claude Desktop

4. Verify installation by asking: _"What MCP tools do you have available?"_

---

## Basic Fetching

### Example 1: Read a News Article

**Prompt:**

```
Use lean-browser to fetch and summarize the latest article from https://news.ycombinator.com
```

**What Claude will do:**

1. Use `fetch_page_interactive` to get the page
2. Identify the first article link (e.g., e5)
3. Use `fetch_page_text` on that article URL
4. Summarize the content

**Expected result:** Clean summary of the article content

---

### Example 2: Extract Structured Data

**Prompt:**

```
Use lean-browser to fetch https://example.com/blog and extract all blog post titles and excerpts as structured JSON
```

**What Claude will do:**

1. Use `fetch_page_json` to get structured content
2. Parse the JSON blocks
3. Extract titles and excerpts
4. Format as requested

---

### Example 3: Discover Page Elements

**Prompt:**

```
What interactive elements are available on https://github.com/login?
```

**What Claude will do:**

1. Use `fetch_page_interactive`
2. List all buttons, inputs, links with their IDs and labels
3. Explain what each element does

**Expected result:**

```
The GitHub login page has these interactive elements:

- e1: Username input (text field, name="login")
- e2: Password input (password field, name="password")
- e3: Sign in button (submit button)
- e4: Forgot password link (href="/password_reset")
- e5: Create account link (href="/join")
```

---

## Form Automation

### Example 4: Search GitHub

**Prompt:**

```
Use lean-browser to search for "playwright" on GitHub and show me the first 3 repository results
```

**What Claude will do:**

1. Use `fetch_page_interactive` on https://github.com
2. Identify search input (e.g., e2)
3. Use `execute_browser_action` with actions: ["type:e2:playwright", "submit:e2"]
4. Use `fetch_page_json` on results page
5. Extract top 3 repositories

---

### Example 5: Fill Contact Form

**Prompt:**

```
Use lean-browser to fill out the contact form at https://example.com/contact with:
- Name: John Doe
- Email: john@example.com
- Message: Hello, I'm interested in your services
Don't actually submit it, just show me the filled state.
```

**What Claude will do:**

1. Use `fetch_page_interactive` to discover form fields
2. Use `execute_browser_action` with type actions
3. Use `browser_session_snapshot` to show filled state
4. Confirm form is filled but not submitted

---

### Example 6: Login Flow

**Prompt:**

```
Use lean-browser to attempt login at https://example.com/login with demo credentials and tell me what happens
```

**Important:** Claude should ask for credentials or use test/demo accounts only.

**What Claude will do:**

1. Use `fetch_page_interactive` to discover login form
2. Use `execute_browser_action` to fill and submit
3. Analyze the resulting page
4. Report success/failure and next page content

---

## Multi-Step Workflows

### Example 7: Shopping Cart Workflow

**Prompt:**

```
Use lean-browser to:
1. Go to https://example.com/shop
2. Add the first product to cart
3. Go to cart
4. Show me the cart contents
```

**What Claude will do:**

1. Use `browser_session_start` on shop URL
2. Use `browser_session_snapshot` to find "Add to cart" button
3. Use `browser_session_execute` to click it
4. Use `browser_session_execute` to navigate to cart
5. Use `browser_session_snapshot` to show cart contents
6. Use `browser_session_close` to clean up

---

### Example 8: Multi-Page Navigation

**Prompt:**

```
Start a browser session on https://example.com, click the "About" link, then click "Team", and tell me about the team members
```

**What Claude will do:**

1. `browser_session_start` on homepage
2. `browser_session_snapshot` to find About link
3. `browser_session_execute` to click About (action: "click:e5")
4. `browser_session_snapshot` to find Team link
5. `browser_session_execute` to click Team
6. `browser_session_snapshot` in "text" mode to read content
7. Summarize team members
8. `browser_session_close` to clean up

---

### Example 9: Conditional Workflow

**Prompt:**

```
Use lean-browser to check if https://example.com/sale has a "Buy Now" button. If it does, tell me the price. If not, tell me what's on the page instead.
```

**What Claude will do:**

1. Use `fetch_page_interactive` to get page elements
2. Check if any element has "Buy Now" label
3. If found: extract price information nearby
4. If not found: use `fetch_page_text` to describe page content
5. Report findings

---

## Data Extraction

### Example 10: Scrape Product Information

**Prompt:**

```
Use lean-browser to extract product information from https://example.com/product/123 including:
- Product name
- Price
- Description
- Availability
Format as JSON
```

**What Claude will do:**

1. Use `fetch_page_json` to get structured content
2. Parse and extract relevant fields
3. Format as clean JSON object

---

### Example 11: Extract Links from Page

**Prompt:**

```
Use lean-browser to get all article links from https://example.com/blog and categorize them by topic
```

**What Claude will do:**

1. Use `fetch_page_interactive` to get all links
2. Filter for article links (href patterns)
3. Group by URL patterns or link text
4. Return categorized list

---

### Example 12: Monitor Page Changes

**Prompt:**

```
Use lean-browser to fetch https://example.com/status twice (5 seconds apart) and tell me what changed
```

**What Claude will do:**

1. Use `fetch_page_json` to get initial state
2. Wait 5 seconds
3. Use `fetch_page_json` again
4. Compare the two JSON outputs
5. Report differences

---

## Visual Verification

### Example 13: Capture Screenshot

**Prompt:**

```
Use lean-browser to take a full-page screenshot of https://example.com and describe what you see
```

**What Claude will do:**

1. Use `take_screenshot` with fullPage: true
2. Receive base64 PNG image
3. Analyze the image visually
4. Describe layout, colors, content, and design

---

### Example 14: Compare Desktop vs Mobile

**Prompt:**

```
Use lean-browser to compare how https://example.com looks on desktop (1920x1080) vs mobile (375x667)
```

**What Claude will do:**

1. Use `take_screenshot` with viewport: {width: 1920, height: 1080}
2. Use `take_screenshot` with viewport: {width: 375, height: 667}
3. Compare the two screenshots
4. Describe differences in layout and responsiveness

---

### Example 15: Visual Verification After Action

**Prompt:**

```
Use lean-browser to fill out the signup form at https://example.com/signup with test data, then take a screenshot to show the filled state
```

**What Claude will do:**

1. Start `browser_session_start`
2. Get form fields with `browser_session_snapshot`
3. Fill fields with `browser_session_execute` (multiple calls)
4. Use `take_screenshot` on the session
5. Show screenshot of filled form
6. Close session

---

## Advanced Patterns

### Example 16: Error Handling

**Prompt:**

```
Use lean-browser to try clicking element e999 on https://example.com and handle the error gracefully
```

**What Claude will do:**

1. Use `fetch_page_interactive` to get valid elements
2. Attempt `execute_browser_action` with invalid element ID
3. Catch ElementNotFoundError
4. Explain what went wrong
5. Suggest valid element IDs

---

### Example 17: Dynamic Content Wait

**Prompt:**

```
Use lean-browser to search for "test" on https://example.com, wait for results to load, then extract the first 5 results
```

**What Claude will do:**

1. Use `execute_browser_action` with actions:
   - "type:e2:test"
   - "submit:e2"
   - "wait:3000"
2. Use `fetch_page_json` to extract results
3. Return top 5 results

---

### Example 18: Session Management

**Prompt:**

```
Start a browser session, list all active sessions, then close all of them
```

**What Claude will do:**

1. Use `browser_session_start` on example.com
2. Use `browser_session_list` to see active sessions
3. For each session: use `browser_session_close`
4. Confirm all sessions closed

---

### Example 19: Complex Form with Validation

**Prompt:**

```
Use lean-browser to fill out a registration form, and if validation errors appear, adjust the inputs and try again
```

**What Claude will do:**

1. Start session and get form
2. Fill form with test data
3. Submit form
4. Check snapshot for error messages
5. If errors: adjust inputs based on error text
6. Resubmit
7. Report success or failure

---

### Example 20: Parallel Fetching

**Prompt:**

```
Use lean-browser to fetch and compare these three news sites:
- https://news.ycombinator.com
- https://reddit.com/r/programming
- https://lobste.rs

Tell me which one has the most interesting top story right now.
```

**What Claude will do:**

1. Use `fetch_page_interactive` on all three URLs (can be parallel)
2. Extract top story from each
3. Use `fetch_page_text` to read each top story
4. Compare and provide opinion
5. Explain reasoning

---

## Tips for Effective Prompts

### Good Prompts:

✅ "Use lean-browser to fetch https://example.com and extract the main heading"
✅ "Start a browser session, click the login button, then show me the login form"
✅ "Take a screenshot of https://example.com with mobile viewport"
✅ "Search for 'AI' on example.com and show me the first 3 results"

### Prompts That Need Clarification:

⚠️ "Login to my account" → Needs credentials (should use test accounts)
⚠️ "Buy something" → Ethical concerns, should confirm before actual purchase
⚠️ "Scrape all pages" → May need rate limiting, pagination strategy
⚠️ "Fill out the form" → Needs specific values to fill

### Best Practices:

1. **Be specific about URLs:** Provide full URLs including protocol
2. **Specify data format:** Ask for JSON, text, or specific structure
3. **Handle credentials carefully:** Use test/demo accounts only
4. **Clean up sessions:** Prompt should mention closing if long workflow
5. **Set expectations:** Mention if screenshot/snapshot is needed at end

---

## Debugging Failed Interactions

### Problem: Element not found

**Solution:**

```
First use fetch_page_interactive to discover current element IDs, then try the action again
```

### Problem: Action timed out

**Solution:**

```
Add a wait action before the timeout-prone action:
actions: ["wait:2000", "click:e5"]
```

### Problem: Session expired

**Solution:**

```
Sessions expire after 10 minutes. Start a new session.
```

### Problem: Wrong page after action

**Solution:**

```
After each action, use browser_session_snapshot to verify you're on the expected page
```

---

## Example Conversation Flow

**User:** "Use lean-browser to search for 'playwright' on GitHub"

**Claude:** "I'll search for 'playwright' on GitHub using lean-browser. Let me:

1. First, fetch GitHub's homepage to find the search box
2. Execute a search action
3. Show you the results

_[calls fetch_page_interactive on github.com]_

I found the search box (element e2). Now I'll search for 'playwright':

_[calls execute_browser_action with actions: ["type:e2:playwright", "submit:e2"]]_

Here are the top results:

1. **microsoft/playwright** - Fast and reliable end-to-end testing
   ⭐ 45.2k stars | Used by 234k repositories

2. **playwright-community/playwright-pytest** - Pytest plugin for Playwright
   ⭐ 3.1k stars | Python integration

3. **mxschmitt/awesome-playwright** - Curated list of Playwright resources
   ⭐ 890 stars | Community resources

Would you like me to get more details about any of these repositories?"

---

For more information, see:

- [MCP_TOOLS.md](../MCP_TOOLS.md) - Complete tool reference
- [README.md](../README.md) - Main documentation
- [Action DSL Reference](../MCP_TOOLS.md#action-syntax-reference)
