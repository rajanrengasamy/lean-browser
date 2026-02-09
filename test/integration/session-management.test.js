import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, getSession, closeSession, listSessions } from '../../src/session-manager.js';
import { captureSnapshot } from '../../src/snapshot.js';
import { parseActionSpec, validateAction, ActionExecutor } from '../../src/actions.js';
import { extractAllFromHtml } from '../../src/extractor.js';

describe('Session Management Integration', () => {
  let activeSessionIds = [];

  afterEach(async () => {
    // Clean up all sessions created during tests
    for (const sessionId of activeSessionIds) {
      try {
        await closeSession(sessionId);
      } catch {
        // Ignore errors during cleanup
      }
    }
    activeSessionIds = [];
  });

  describe('session lifecycle', () => {
    it('creates, retrieves, and closes a session', { timeout: 60000 }, async () => {
      // Create session
      const created = await createSession('https://example.com', { headless: true });
      activeSessionIds.push(created.sessionId);

      assert.ok(created.sessionId);
      assert.equal(created.url, 'https://example.com');
      assert.ok(created.finalUrl);
      assert.equal(created.status, 200);

      // Retrieve session
      const session = getSession(created.sessionId);
      assert.equal(session.id, created.sessionId);
      assert.ok(session.page);
      assert.ok(session.browser);

      // Close session
      const closed = await closeSession(created.sessionId);
      assert.equal(closed.sessionId, created.sessionId);
      assert.equal(closed.closed, true);

      // Verify session is gone
      assert.throws(() => {
        getSession(created.sessionId);
      }, /not found or expired/);

      // Remove from tracking since we manually closed it
      activeSessionIds = activeSessionIds.filter((id) => id !== created.sessionId);
    });

    it('creates multiple independent sessions', { timeout: 90000 }, async () => {
      // Create multiple sessions
      const session1 = await createSession('https://example.com');
      activeSessionIds.push(session1.sessionId);

      const session2 = await createSession('https://example.org');
      activeSessionIds.push(session2.sessionId);

      // Verify they are different
      assert.notEqual(session1.sessionId, session2.sessionId);

      // List sessions
      const sessions = listSessions();
      assert.ok(sessions.length >= 2);

      const sessionIds = sessions.map((s) => s.sessionId);
      assert.ok(sessionIds.includes(session1.sessionId));
      assert.ok(sessionIds.includes(session2.sessionId));
    });
  });

  describe('session interaction', () => {
    it('navigates to URL and captures snapshot', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com');
      activeSessionIds.push(created.sessionId);

      const session = getSession(created.sessionId);

      // Capture snapshot in text mode
      const snapshot = await captureSnapshot(session.page, { mode: 'text', maxTokens: 500 });

      assert.ok(snapshot.text);
      assert.ok(snapshot.text.includes('Example Domain'));
    });

    it('captures snapshot in different modes', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com');
      activeSessionIds.push(created.sessionId);

      const session = getSession(created.sessionId);

      // Text mode
      const textSnapshot = await captureSnapshot(session.page, { mode: 'text' });
      assert.ok(textSnapshot.text);
      assert.equal(typeof textSnapshot.text, 'string');

      // JSON mode
      const jsonSnapshot = await captureSnapshot(session.page, { mode: 'json' });
      assert.ok(jsonSnapshot.text);
      const jsonParsed = JSON.parse(jsonSnapshot.text);
      assert.ok(jsonParsed.url);
      assert.ok(jsonParsed.article);

      // Interactive mode
      const interactiveSnapshot = await captureSnapshot(session.page, { mode: 'interactive' });
      assert.ok(interactiveSnapshot.text);
      const interactiveParsed = JSON.parse(interactiveSnapshot.text);
      assert.ok(interactiveParsed.view || interactiveParsed.elements);
    });

    it('performs actions within a session', { timeout: 60000 }, async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <input id="searchInput" type="text" placeholder="Search..." />
            <button id="searchBtn" onclick="
              const query = document.getElementById('searchInput').value;
              document.getElementById('result').innerText = 'Searching for: ' + query;
            ">Search</button>
            <div id="result"></div>
          </body>
        </html>
      `;

      // Create session with a data URL
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;
      const created = await createSession(dataUrl);
      activeSessionIds.push(created.sessionId);

      const session = getSession(created.sessionId);

      // Extract elements
      const html = await session.page.content();
      const extracted = extractAllFromHtml(html, session.page.url());
      const elementMap = Object.fromEntries(extracted.elements.map((el) => [el.id, el.selector]));

      // Parse and execute actions
      const actions = parseActionSpec('type:e1:playwright,click:e2');
      actions.forEach((action) => validateAction(action, elementMap));

      const executor = new ActionExecutor(session.page, elementMap);
      await executor.executeAll(actions);

      // Verify result
      const resultText = await session.page.$eval('#result', (el) => el.innerText);
      assert.equal(resultText, 'Searching for: playwright');
    });
  });

  describe('session persistence', () => {
    it('maintains page state across multiple snapshots', { timeout: 60000 }, async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body>
            <input id="counter" type="text" value="0" readonly />
            <button id="increment" onclick="
              const counter = document.getElementById('counter');
              counter.value = parseInt(counter.value) + 1;
            ">Increment</button>
          </body>
        </html>
      `;

      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;
      const created = await createSession(dataUrl);
      activeSessionIds.push(created.sessionId);

      const session = getSession(created.sessionId);

      // Take initial snapshot
      const snapshot1 = await captureSnapshot(session.page, { mode: 'interactive' });
      JSON.parse(snapshot1.text);

      // Perform action
      const html1 = await session.page.content();
      const extracted1 = extractAllFromHtml(html1, session.page.url());
      const elementMap1 = Object.fromEntries(extracted1.elements.map((el) => [el.id, el.selector]));

      const actions = parseActionSpec('click:e2');
      const executor = new ActionExecutor(session.page, elementMap1);
      await executor.executeAll(actions);

      // Take second snapshot
      await captureSnapshot(session.page, { mode: 'interactive' });

      // Verify counter was incremented
      const counterValue = await session.page.$eval('#counter', (el) => el.value);
      assert.equal(counterValue, '1');
    });

    it('updates lastActivity timestamp on access', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com');
      activeSessionIds.push(created.sessionId);

      const session1 = getSession(created.sessionId);
      const firstActivity = session1.lastActivity;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const session2 = getSession(created.sessionId);
      const secondActivity = session2.lastActivity;

      assert.ok(secondActivity >= firstActivity);
    });
  });

  describe('session navigation', () => {
    it('navigates to new URL within session', { timeout: 90000 }, async () => {
      const created = await createSession('https://example.com');
      activeSessionIds.push(created.sessionId);

      const session = getSession(created.sessionId);
      const initialUrl = session.page.url();

      // Navigate to a different page
      await session.page.goto('https://example.org', { waitUntil: 'domcontentloaded' });
      await session.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const newUrl = session.page.url();
      assert.notEqual(newUrl, initialUrl);
      assert.ok(newUrl.includes('example.org'));

      // Capture snapshot of new page
      const snapshot = await captureSnapshot(session.page, { mode: 'text' });
      assert.ok(snapshot.text);
    });

    it('uses navigate action to change pages', { timeout: 90000 }, async () => {
      const created = await createSession('https://example.com');
      activeSessionIds.push(created.sessionId);

      const session = getSession(created.sessionId);

      // Use navigate action
      const actions = parseActionSpec('navigate:https://example.org');
      const executor = new ActionExecutor(session.page, {});
      const results = await executor.executeAll(actions);

      assert.equal(results[0].type, 'navigate');
      assert.equal(results[0].ok, true);
      assert.ok(results[0].finalUrl.includes('example.org'));
    });
  });

  describe('error handling', () => {
    it('handles invalid session ID', () => {
      assert.throws(() => {
        getSession('invalid-session-id');
      }, /not found or expired/);
    });

    it('handles closing non-existent session gracefully', async () => {
      const result = await closeSession('non-existent-id');
      assert.equal(result.sessionId, 'non-existent-id');
      assert.equal(result.closed, true);
    });

    it('handles navigation errors within session', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com');
      activeSessionIds.push(created.sessionId);

      const session = getSession(created.sessionId);

      // Try to navigate to invalid URL
      await assert.rejects(async () => {
        await session.page.goto('http://invalid-url-that-does-not-exist.test', {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });
      }, /net::ERR_NAME_NOT_RESOLVED|NS_ERROR_UNKNOWN_HOST|ENOTFOUND/);

      // Session should still be valid
      const retrieved = getSession(created.sessionId);
      assert.equal(retrieved.id, created.sessionId);
    });
  });

  describe('session cleanup', () => {
    it('lists only active sessions', { timeout: 60000 }, async () => {
      const created1 = await createSession('https://example.com');
      activeSessionIds.push(created1.sessionId);

      const created2 = await createSession('https://example.org');
      activeSessionIds.push(created2.sessionId);

      let sessions = listSessions();
      assert.ok(sessions.length >= 2);

      // Close one session
      await closeSession(created1.sessionId);
      activeSessionIds = activeSessionIds.filter((id) => id !== created1.sessionId);

      // List should only include active session
      sessions = listSessions();
      const sessionIds = sessions.map((s) => s.sessionId);
      assert.ok(!sessionIds.includes(created1.sessionId));
      assert.ok(sessionIds.includes(created2.sessionId));
    });

    it('includes session metadata in list', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com');
      activeSessionIds.push(created.sessionId);

      const sessions = listSessions();
      const session = sessions.find((s) => s.sessionId === created.sessionId);

      assert.ok(session);
      assert.equal(session.sessionId, created.sessionId);
      assert.equal(session.url, 'https://example.com');
      assert.ok(session.finalUrl);
      assert.ok(session.createdAt);
      assert.ok(session.lastActivity);
    });
  });

  describe('concurrent sessions', () => {
    it('handles multiple sessions performing actions independently', { timeout: 90000 }, async () => {
      const testHtml1 = `
        <!DOCTYPE html>
        <html>
          <body>
            <input id="input1" type="text" />
            <div id="result"></div>
          </body>
        </html>
      `;

      const testHtml2 = `
        <!DOCTYPE html>
        <html>
          <body>
            <input id="input2" type="text" />
            <div id="result"></div>
          </body>
        </html>
      `;

      const dataUrl1 = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml1)}`;
      const dataUrl2 = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml2)}`;

      // Create two sessions
      const session1 = await createSession(dataUrl1);
      activeSessionIds.push(session1.sessionId);

      const session2 = await createSession(dataUrl2);
      activeSessionIds.push(session2.sessionId);

      // Perform different actions in each session
      const sess1 = getSession(session1.sessionId);
      const html1 = await sess1.page.content();
      const extracted1 = extractAllFromHtml(html1, sess1.page.url());
      const elementMap1 = Object.fromEntries(extracted1.elements.map((el) => [el.id, el.selector]));

      const sess2 = getSession(session2.sessionId);
      const html2 = await sess2.page.content();
      const extracted2 = extractAllFromHtml(html2, sess2.page.url());
      const elementMap2 = Object.fromEntries(extracted2.elements.map((el) => [el.id, el.selector]));

      const actions1 = parseActionSpec('type:e1:Session 1');
      const executor1 = new ActionExecutor(sess1.page, elementMap1);
      await executor1.executeAll(actions1);

      const actions2 = parseActionSpec('type:e1:Session 2');
      const executor2 = new ActionExecutor(sess2.page, elementMap2);
      await executor2.executeAll(actions2);

      // Verify each session has independent state
      const value1 = await sess1.page.$eval('#input1', (el) => el.value);
      const value2 = await sess2.page.$eval('#input2', (el) => el.value);

      assert.equal(value1, 'Session 1');
      assert.equal(value2, 'Session 2');
    });
  });

  describe('real-world workflow', () => {
    it('complete workflow: create, interact, snapshot, close', { timeout: 90000 }, async () => {
      // Step 1: Create session
      const created = await createSession('https://example.com');
      activeSessionIds.push(created.sessionId);

      assert.ok(created.sessionId);
      assert.ok(created.finalUrl);

      // Step 2: Verify session exists
      const sessions = listSessions();
      assert.ok(sessions.some((s) => s.sessionId === created.sessionId));

      // Step 3: Get session and capture initial snapshot
      const session = getSession(created.sessionId);
      const initialSnapshot = await captureSnapshot(session.page, { mode: 'json', maxTokens: 1000 });
      const initialParsed = JSON.parse(initialSnapshot.text);

      assert.ok(initialParsed.url);
      assert.ok(initialParsed.article);

      // Step 4: Capture interactive snapshot
      const interactiveSnapshot = await captureSnapshot(session.page, { mode: 'interactive', maxTokens: 1500 });
      const interactiveParsed = JSON.parse(interactiveSnapshot.text);

      assert.ok(interactiveParsed.view || interactiveParsed.elements);

      // Step 5: Close session
      const closed = await closeSession(created.sessionId);
      assert.equal(closed.closed, true);

      // Step 6: Verify session is removed
      assert.throws(() => {
        getSession(created.sessionId);
      }, /not found or expired/);

      activeSessionIds = activeSessionIds.filter((id) => id !== created.sessionId);
    });
  });
});
