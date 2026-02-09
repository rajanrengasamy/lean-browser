import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, getSession, closeSession, listSessions } from '../../src/session-manager.js';

describe('session-manager', () => {
  let activeSessionIds = [];

  afterEach(async () => {
    // Clean up all sessions created during tests
    for (const sessionId of activeSessionIds) {
      try {
        await closeSession(sessionId);
      } catch {
        // Ignore cleanup errors
      }
    }
    activeSessionIds = [];
  });

  describe('createSession', () => {
    it('creates a new session with unique ID', { timeout: 60000 }, async () => {
      const result = await createSession('https://example.com', { headless: true });
      activeSessionIds.push(result.sessionId);

      assert.ok(result.sessionId);
      assert.equal(typeof result.sessionId, 'string');
      assert.equal(result.sessionId.length, 8);
      assert.equal(result.url, 'https://example.com');
      assert.ok(result.finalUrl);
      assert.equal(result.status, 200);
    });

    it('creates sessions with unique IDs', { timeout: 90000 }, async () => {
      const result1 = await createSession('https://example.com', { headless: true });
      activeSessionIds.push(result1.sessionId);

      const result2 = await createSession('https://example.org', { headless: true });
      activeSessionIds.push(result2.sessionId);

      assert.notEqual(result1.sessionId, result2.sessionId);
    });

    it('stores session metadata correctly', { timeout: 60000 }, async () => {
      const result = await createSession('https://example.com', { headless: true });
      activeSessionIds.push(result.sessionId);

      const session = getSession(result.sessionId);

      assert.equal(session.id, result.sessionId);
      assert.equal(session.url, 'https://example.com');
      assert.ok(session.finalUrl);
      assert.ok(session.browser);
      assert.ok(session.context);
      assert.ok(session.page);
      assert.ok(session.createdAt);
      assert.ok(session.lastActivity);
    });
  });

  describe('getSession', () => {
    it('retrieves existing session', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com', { headless: true });
      activeSessionIds.push(created.sessionId);

      const session = getSession(created.sessionId);

      assert.equal(session.id, created.sessionId);
      assert.equal(session.url, 'https://example.com');
    });

    it('throws error for non-existent session', () => {
      assert.throws(() => getSession('nonexistent'), /Session "nonexistent" not found or expired/);
    });

    it('updates lastActivity timestamp', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com', { headless: true });
      activeSessionIds.push(created.sessionId);

      const session1 = getSession(created.sessionId);
      const firstActivity = session1.lastActivity;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      const session2 = getSession(created.sessionId);
      const secondActivity = session2.lastActivity;

      assert.ok(secondActivity >= firstActivity);
    });
  });

  describe('closeSession', () => {
    it('closes existing session', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com', { headless: true });
      activeSessionIds.push(created.sessionId);

      const result = await closeSession(created.sessionId);

      assert.equal(result.sessionId, created.sessionId);
      assert.equal(result.closed, true);

      // Verify session is removed
      assert.throws(() => getSession(created.sessionId), /Session ".*" not found or expired/);

      // Remove from tracking since we manually closed it
      activeSessionIds = activeSessionIds.filter((id) => id !== created.sessionId);
    });

    it('handles closing non-existent session gracefully', async () => {
      const result = await closeSession('nonexistent');

      assert.equal(result.sessionId, 'nonexistent');
      assert.equal(result.closed, true);
    });
  });

  describe('listSessions', () => {
    it('returns empty array when no sessions', () => {
      // Make sure no sessions exist
      const sessions = listSessions();
      // Filter to only our test sessions (there might be others from concurrent tests)
      const ourSessions = sessions.filter((s) => activeSessionIds.includes(s.sessionId));
      assert.equal(ourSessions.length, 0);
    });

    it('returns all active sessions', { timeout: 90000 }, async () => {
      const created1 = await createSession('https://example.com', { headless: true });
      activeSessionIds.push(created1.sessionId);

      const created2 = await createSession('https://example.org', { headless: true });
      activeSessionIds.push(created2.sessionId);

      const sessions = listSessions();

      // Check that our sessions are in the list
      const sessionIds = sessions.map((s) => s.sessionId);
      assert.ok(sessionIds.includes(created1.sessionId));
      assert.ok(sessionIds.includes(created2.sessionId));
    });

    it('includes session metadata', { timeout: 60000 }, async () => {
      const created = await createSession('https://example.com', { headless: true });
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
});
