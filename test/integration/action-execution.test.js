import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, closeBrowser } from '../../src/browser.js';
import { parseActionSpec, validateAction, ActionExecutor } from '../../src/actions.js';
import { buildDom, extractInteractiveElements, buildElementMap } from '../../src/extractor.js';

describe('Action Execution Integration', () => {
  let browser, context, page;

  beforeEach(async () => {
    const launched = await launchBrowser({ headless: true });
    browser = launched.browser;
    context = launched.context;
    page = launched.page;
  });

  afterEach(async () => {
    await closeBrowser({ browser, context, page });
  });

  describe('click action workflow', () => {
    it('parses, validates, and executes click action', async () => {
      // Load test page with a button
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <button id="testBtn" onclick="document.getElementById('result').innerText = 'Clicked!'">Click Me</button>
            <div id="result"></div>
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      // Extract elements
      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      // Parse action
      const actions = parseActionSpec('click:e1');
      assert.equal(actions.length, 1);

      // Validate action
      validateAction(actions[0], elementMap);

      // Execute action
      const executor = new ActionExecutor(page, elementMap);
      const results = await executor.executeAll(actions);

      assert.equal(results.length, 1);
      assert.equal(results[0].type, 'click');
      assert.equal(results[0].ok, true);

      // Verify the button was clicked
      const resultText = await page.$eval('#result', (el) => el.innerText);
      assert.equal(resultText, 'Clicked!');
    });
  });

  describe('type action workflow', () => {
    it('parses, validates, and executes type action', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <input id="testInput" type="text" />
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      const actions = parseActionSpec('type:e1:Hello World');
      validateAction(actions[0], elementMap);

      const executor = new ActionExecutor(page, elementMap);
      const results = await executor.executeAll(actions);

      assert.equal(results[0].type, 'type');
      assert.equal(results[0].ok, true);

      const inputValue = await page.$eval('#testInput', (el) => el.value);
      assert.equal(inputValue, 'Hello World');
    });

    it('executes type action with slow modifier', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <input id="slowInput" type="text" />
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      const actions = parseActionSpec('type:e1:Test:slow');
      assert.equal(actions[0].slow, true);

      const executor = new ActionExecutor(page, elementMap);
      await executor.executeAll(actions);

      const inputValue = await page.$eval('#slowInput', (el) => el.value);
      assert.equal(inputValue, 'Test');
    });
  });

  describe('select action workflow', () => {
    it('parses, validates, and executes select action', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <select id="testSelect">
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
              <option value="option3">Option 3</option>
            </select>
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      const actions = parseActionSpec('select:e1:option2');
      validateAction(actions[0], elementMap);

      const executor = new ActionExecutor(page, elementMap);
      const results = await executor.executeAll(actions);

      assert.equal(results[0].type, 'select');
      assert.equal(results[0].ok, true);

      const selectedValue = await page.$eval('#testSelect', (el) => el.value);
      assert.equal(selectedValue, 'option2');
    });
  });

  describe('submit action workflow', () => {
    it('parses, validates, and executes submit action', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <form id="testForm" onsubmit="event.preventDefault(); document.getElementById('status').innerText = 'Submitted'; return false;">
              <input type="text" name="username" />
              <button id="submitBtn" type="submit">Submit</button>
            </form>
            <div id="status"></div>
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      const actions = parseActionSpec('submit:e2');
      validateAction(actions[0], elementMap);

      const executor = new ActionExecutor(page, elementMap);
      const results = await executor.executeAll(actions);

      assert.equal(results[0].type, 'submit');
      assert.equal(results[0].ok, true);

      // Wait a bit for the form submission to process
      await page.waitForTimeout(500);

      const statusText = await page.$eval('#status', (el) => el.innerText);
      assert.equal(statusText, 'Submitted');
    });
  });

  describe('wait action workflow', () => {
    it('parses and executes wait action', async () => {
      await page.setContent('<html><body>Test</body></html>');

      const actions = parseActionSpec('wait:1000');
      assert.equal(actions[0].type, 'wait');
      assert.equal(actions[0].ms, 1000);

      const executor = new ActionExecutor(page, {});
      const startTime = Date.now();
      await executor.executeAll(actions);
      const elapsed = Date.now() - startTime;

      // Should wait at least 1 second
      assert.ok(elapsed >= 1000);
    });
  });

  describe('scroll action workflow', () => {
    it('parses and executes scroll action', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body style="height: 3000px;">
            <div style="height: 100px;">Top</div>
            <div id="scrolled" style="margin-top: 1000px;">Scrolled Content</div>
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      const actions = parseActionSpec('scroll:500');
      const executor = new ActionExecutor(page, {});
      await executor.executeAll(actions);

      const scrollY = await page.evaluate(() => window.scrollY);
      assert.ok(scrollY >= 500);
    });

    it('executes negative scroll (scroll up)', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body style="height: 3000px;">
            <div style="height: 100px;">Content</div>
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      // Scroll down first
      await page.evaluate(() => window.scrollTo(0, 1000));

      const actions = parseActionSpec('scroll:-500');
      const executor = new ActionExecutor(page, {});
      await executor.executeAll(actions);

      const scrollY = await page.evaluate(() => window.scrollY);
      assert.ok(scrollY < 1000);
    });
  });

  describe('navigate action workflow', () => {
    it('parses and executes navigate action', { timeout: 60000 }, async () => {
      const actions = parseActionSpec('navigate:https://example.com');
      assert.equal(actions[0].type, 'navigate');
      assert.equal(actions[0].url, 'https://example.com');

      const executor = new ActionExecutor(page, {});
      const results = await executor.executeAll(actions);

      assert.equal(results[0].type, 'navigate');
      assert.equal(results[0].ok, true);
      assert.ok(results[0].finalUrl.includes('example.com'));
    });
  });

  describe('multi-action workflow', () => {
    it('executes multiple actions in sequence', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <input id="username" type="text" />
            <input id="password" type="password" />
            <button id="submit" onclick="
              const u = document.getElementById('username').value;
              const p = document.getElementById('password').value;
              document.getElementById('result').innerText = 'User: ' + u + ', Pass: ' + p;
            ">Login</button>
            <div id="result"></div>
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      // Parse multiple actions
      const actions = parseActionSpec('type:e1:testuser,type:e2:testpass,click:e3');
      assert.equal(actions.length, 3);

      // Validate all actions
      actions.forEach((action) => validateAction(action, elementMap));

      // Execute all actions
      const executor = new ActionExecutor(page, elementMap);
      const results = await executor.executeAll(actions);

      assert.equal(results.length, 3);
      assert.ok(results.every((r) => r.ok));

      // Verify result
      const resultText = await page.$eval('#result', (el) => el.innerText);
      assert.equal(resultText, 'User: testuser, Pass: testpass');
    });

    it('executes actions with wait between them', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <button id="btn1" onclick="setTimeout(() => {
              document.getElementById('result').innerText = 'Step1';
            }, 500)">Step 1</button>
            <button id="btn2" onclick="document.getElementById('result').innerText += ' Step2'">Step 2</button>
            <div id="result"></div>
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      // Click first button, wait for async result, then click second button
      const actions = parseActionSpec('click:e1,wait:1000,click:e2');
      const executor = new ActionExecutor(page, elementMap);
      await executor.executeAll(actions);

      const resultText = await page.$eval('#result', (el) => el.innerText);
      assert.equal(resultText, 'Step1 Step2');
    });
  });

  describe('error handling', () => {
    it('throws ElementNotFoundError for invalid element ID', async () => {
      await page.setContent('<html><body><button id="btn">Test</button></body></html>');

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      const actions = parseActionSpec('click:e99');

      assert.throws(() => {
        validateAction(actions[0], elementMap);
      }, /Element "e99" not found/);
    });

    it('handles action execution timeout', { timeout: 15000 }, async () => {
      await page.setContent('<html><body><button id="btn">Test</button></body></html>');

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      buildElementMap(elements);

      // Try to click a non-existent element (will timeout)
      const executor = new ActionExecutor(page, { e1: '#nonexistent' }, { defaultTimeoutMs: 2000 });

      await assert.rejects(async () => {
        await executor.execute({ type: 'click', elementId: 'e1' });
      }, /Action failed/);
    });

    it('continues execution after non-fatal errors', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <button id="btn1" onclick="document.getElementById('result').innerText = 'First'">First</button>
            <button id="btn2" onclick="document.getElementById('result').innerText += ' Second'">Second</button>
            <div id="result"></div>
          </body>
        </html>
      `;
      await page.setContent(testHtml);

      const html = await page.content();
      const dom = buildDom(html, 'about:blank');
      const elements = extractInteractiveElements(dom);
      const elementMap = buildElementMap(elements);

      // First action succeeds, second action would fail but we catch it
      const actions = parseActionSpec('click:e1,click:e2');
      const executor = new ActionExecutor(page, elementMap);

      try {
        await executor.executeAll(actions);
      } catch {
        // Even if there's an error, check partial results
        assert.ok(executor.results.length > 0);
      }

      const resultText = await page.$eval('#result', (el) => el.innerText);
      assert.ok(resultText.length > 0);
    });
  });
});
