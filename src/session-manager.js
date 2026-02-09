import { randomUUID } from 'node:crypto';
import { launchBrowser, navigateAndWait, closeBrowser } from './browser.js';

const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupExpired() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      closeBrowser(session).catch(() => {});
      sessions.delete(id);
    }
  }
}

export async function createSession(url, { timeoutMs = 45000, headless = true } = {}) {
  cleanupExpired();

  const id = randomUUID().slice(0, 8);
  const { browser, context, page } = await launchBrowser({ headless });

  const nav = await navigateAndWait(page, url, { timeoutMs });

  const session = {
    id,
    browser,
    context,
    page,
    url,
    finalUrl: nav.finalUrl,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  sessions.set(id, session);
  return { sessionId: id, url, finalUrl: nav.finalUrl, status: nav.status };
}

export function getSession(sessionId) {
  cleanupExpired();
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session "${sessionId}" not found or expired`);
  }
  session.lastActivity = Date.now();
  return session;
}

export async function closeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    await closeBrowser(session);
    sessions.delete(sessionId);
  }
  return { sessionId, closed: true };
}

export function listSessions() {
  cleanupExpired();
  return Array.from(sessions.values()).map((s) => ({
    sessionId: s.id,
    url: s.url,
    finalUrl: s.finalUrl,
    createdAt: s.createdAt,
    lastActivity: s.lastActivity,
  }));
}
