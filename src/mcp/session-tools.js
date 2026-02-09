import { z } from 'zod';
import { createSession, getSession, closeSession, listSessions } from '../session-manager.js';
import { extractAllFromHtml, buildElementMap } from '../extractor.js';
import { ActionExecutor, parseActionSpec, validateAction } from '../actions.js';
import { captureSnapshot } from '../snapshot.js';

function parseSnapshotPayload(snapshotText, mode) {
  if (mode === 'text') {
    return snapshotText;
  }

  try {
    return JSON.parse(snapshotText);
  } catch {
    return snapshotText;
  }
}

/**
 * Schema for browser_session_start tool
 */
export const browserSessionStartSchema = {
  url: z.string().url().describe('The URL to navigate to'),
  timeout: z.number().int().positive().default(45000).describe('Navigation timeout in milliseconds'),
  headless: z.boolean().default(true).describe('Run browser in headless mode'),
  snapshotMode: z
    .enum(['text', 'json', 'interactive'])
    .default('interactive')
    .describe('Output mode for the initial page snapshot'),
  maxTokens: z.number().int().positive().default(1200).describe('Maximum token budget for the snapshot'),
};

/**
 * Schema for browser_session_execute tool
 */
export const browserSessionExecuteSchema = {
  sessionId: z.string().describe('The session ID returned from browser_session_start'),
  action: z
    .string()
    .describe(
      'Action spec in the format: "type:elementId:value" or "click:elementId". Examples: "type:e1:username", "click:e3"',
    ),
  snapshotMode: z
    .enum(['text', 'json', 'interactive'])
    .default('interactive')
    .describe('Output mode for the page snapshot after action'),
  maxTokens: z.number().int().positive().default(1200).describe('Maximum token budget for the snapshot'),
};

/**
 * Schema for browser_session_snapshot tool
 */
export const browserSessionSnapshotSchema = {
  sessionId: z.string().describe('The session ID returned from browser_session_start'),
  mode: z
    .enum(['text', 'json', 'interactive'])
    .default('interactive')
    .describe('Output mode: text (clean article), json (structured blocks), interactive (actionable elements)'),
  maxTokens: z.number().int().positive().default(1200).describe('Maximum token budget for the output'),
};

/**
 * Schema for browser_session_close tool
 */
export const browserSessionCloseSchema = {
  sessionId: z.string().describe('The session ID to close'),
};

/**
 * Schema for browser_session_list tool
 */
export const browserSessionListSchema = {};

/**
 * Handler for browser_session_start tool
 * Creates a new browser session and returns the session ID with initial page state
 */
export async function handleBrowserSessionStart({
  url,
  timeout = 45000,
  headless = true,
  snapshotMode = 'interactive',
  maxTokens = 1200,
}) {
  const result = await createSession(url, { timeoutMs: timeout, headless });

  // Get the session and capture initial snapshot
  const session = getSession(result.sessionId);
  const snapshot = await captureSnapshot(session.page, { mode: snapshotMode, maxTokens });

  const response = {
    sessionId: result.sessionId,
    url: result.url,
    finalUrl: result.finalUrl,
    status: result.status,
    snapshot: parseSnapshotPayload(snapshot.text, snapshotMode),
    message: 'Session created successfully. Use this sessionId for subsequent actions.',
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
  };
}

/**
 * Handler for browser_session_execute tool
 * Executes an action in an existing session and returns the result + updated page state
 */
export async function handleBrowserSessionExecute({
  sessionId,
  action,
  snapshotMode = 'interactive',
  maxTokens = 1200,
}) {
  const session = getSession(sessionId);
  const { page } = session;

  // Extract interactive elements to build element map
  const html = await page.content();
  const { elements } = extractAllFromHtml(html, page.url());
  const elementMap = buildElementMap(elements);

  // Parse and validate action
  const parsedActions = parseActionSpec(action);
  if (parsedActions.length === 0) {
    throw new Error('No valid action provided');
  }
  if (parsedActions.length > 1) {
    throw new Error(
      'Only one action at a time is supported in session execute. Use execute_browser_action for multiple actions.',
    );
  }

  const actionToExecute = parsedActions[0];
  validateAction(actionToExecute, elementMap);

  // Execute action
  const executor = new ActionExecutor(page, elementMap, { defaultTimeoutMs: 10000 });
  const result = await executor.execute(actionToExecute);

  // Capture updated page state
  const snapshot = await captureSnapshot(page, { mode: snapshotMode, maxTokens });

  const response = {
    sessionId,
    currentUrl: page.url(),
    action: {
      type: result.type,
      elementId: result.elementId,
      ok: result.ok,
    },
    snapshot: parseSnapshotPayload(snapshot.text, snapshotMode),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
  };
}

/**
 * Handler for browser_session_snapshot tool
 * Captures the current state of a session without executing any actions
 */
export async function handleBrowserSessionSnapshot({ sessionId, mode = 'interactive', maxTokens = 1200 }) {
  const session = getSession(sessionId);
  const { page } = session;

  const snapshot = await captureSnapshot(page, { mode, maxTokens });

  const response = {
    sessionId,
    currentUrl: page.url(),
    snapshot: parseSnapshotPayload(snapshot.text, mode),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
  };
}

/**
 * Handler for browser_session_close tool
 * Closes a browser session and cleans up resources
 */
export async function handleBrowserSessionClose({ sessionId }) {
  const result = await closeSession(sessionId);

  const response = {
    sessionId: result.sessionId,
    closed: result.closed,
    message: 'Session closed successfully',
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
  };
}

/**
 * Handler for browser_session_list tool
 * Lists all active browser sessions
 */
export async function handleBrowserSessionList() {
  const sessions = listSessions();

  const response = {
    sessions,
    count: sessions.length,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
  };
}
