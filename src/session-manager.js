import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { launchBrowser, navigateAndWait, closeBrowser } from './browser.js';

const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SESSIONS = parseInt(process.env.LEAN_BROWSER_MAX_SESSIONS || '10', 10);
const SESSION_DIR = process.env.LEAN_BROWSER_SESSION_DIR || '/tmp/lean-browser-sessions';

function isDataUrl(url) {
  return typeof url === 'string' && url.trim().toLowerCase().startsWith('data:');
}

// Ensure session directory exists
try {
  mkdirSync(SESSION_DIR, { recursive: true });
} catch (err) {
  console.warn(`Failed to create session directory: ${err.message}`);
}

// Graceful shutdown handler
let isShuttingDown = false;

export async function shutdownAllSessions() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\nShutting down all browser sessions...');
  const allSessions = Array.from(sessions.values());

  for (const session of allSessions) {
    try {
      await persistSessionState(session);
      await closeBrowser(session);
    } catch (err) {
      console.error(`Failed to close session ${session.id}:`, err.message);
    }
  }

  sessions.clear();
  console.log('All sessions closed.');
}

// Register shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await shutdownAllSessions();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdownAllSessions();
    process.exit(0);
  });
}

// Persist session metadata to disk
function persistSessionState(session) {
  try {
    const metadata = {
      id: session.id,
      url: session.url,
      finalUrl: session.finalUrl,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      requestCount: session.requestCount || 0,
    };

    const filePath = join(SESSION_DIR, `${session.id}.json`);
    writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.warn(`Failed to persist session ${session.id}:`, err.message);
  }
}

// Load session metadata from disk
function loadSessionState(sessionId) {
  try {
    const filePath = join(SESSION_DIR, `${sessionId}.json`);
    if (!existsSync(filePath)) return null;

    const data = readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.warn(`Failed to load session ${sessionId}:`, err.message);
    return null;
  }
}

// Delete session metadata from disk
function deleteSessionState(sessionId) {
  try {
    const filePath = join(SESSION_DIR, `${sessionId}.json`);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`Failed to delete session ${sessionId}:`, err.message);
  }
}

// Load all persisted sessions from disk (metadata only)
function loadPersistedSessions() {
  try {
    if (!existsSync(SESSION_DIR)) return [];

    const files = readdirSync(SESSION_DIR);
    const sessions = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionId = file.replace('.json', '');
      const state = loadSessionState(sessionId);
      if (state) {
        sessions.push(state);
      }
    }

    return sessions;
  } catch (err) {
    console.warn(`Failed to load persisted sessions:`, err.message);
    return [];
  }
}

function cleanupExpired() {
  const now = Date.now();
  const toDelete = [];

  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      toDelete.push(id);
    }
  }

  for (const id of toDelete) {
    const session = sessions.get(id);
    persistSessionState(session);
    closeBrowser(session).catch(() => {});
    sessions.delete(id);
  }

  // Clean up old persisted sessions
  const persisted = loadPersistedSessions();
  for (const state of persisted) {
    if (now - state.lastActivity > SESSION_TTL_MS) {
      deleteSessionState(state.id);
    }
  }
}

export async function createSession(
  url,
  {
    timeoutMs = 45000,
    headless = true,
    viewport = null,
    device = null,
    mobile = false,
    cookiesFile = null,
    blockAds = false,
    blockResources = [],
    extraHeaders = {},
  } = {},
) {
  cleanupExpired();

  // Check session limit
  if (sessions.size >= MAX_SESSIONS) {
    throw new Error(`Maximum number of sessions (${MAX_SESSIONS}) reached. Please close some sessions first.`);
  }

  const id = randomUUID().slice(0, 8);
  const { browser, context, page } = await launchBrowser({
    headless,
    viewport,
    device,
    mobile,
    cookiesFile,
    blockAds,
    blockResources,
    extraHeaders,
  });

  const nav = await navigateAndWait(page, url, {
    timeoutMs,
    allowDataURLs: isDataUrl(url),
  });

  const session = {
    id,
    browser,
    context,
    page,
    url,
    finalUrl: nav.finalUrl,
    cookiesFile,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    requestCount: 0,
  };

  sessions.set(id, session);
  persistSessionState(session);

  return { sessionId: id, url, finalUrl: nav.finalUrl, status: nav.status };
}

export function getSession(sessionId) {
  cleanupExpired();
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session "${sessionId}" not found or expired`);
  }
  session.lastActivity = Date.now();
  session.requestCount = (session.requestCount || 0) + 1;
  persistSessionState(session);
  return session;
}

export async function closeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    persistSessionState(session);

    // Save cookies before closing if cookiesFile was specified
    if (session.cookiesFile && session.context) {
      try {
        const { writeFile } = await import('node:fs/promises');
        const cookies = await session.context.cookies();
        await writeFile(session.cookiesFile, JSON.stringify(cookies, null, 2));
      } catch (err) {
        console.warn(`Failed to save cookies for session ${sessionId}:`, err.message);
      }
    }

    await closeBrowser(session);
    sessions.delete(sessionId);
    deleteSessionState(sessionId);
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
    requestCount: s.requestCount || 0,
  }));
}

// Export for testing
export { MAX_SESSIONS, SESSION_DIR, SESSION_TTL_MS };
