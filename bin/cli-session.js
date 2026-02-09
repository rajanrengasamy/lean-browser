import { createSession, getSession, closeSession, listSessions } from '../src/session-manager.js';
import { extractAllFromHtml, buildElementMap } from '../src/extractor.js';
import { parseActionSpec, validateAction, ActionExecutor } from '../src/actions.js';
import { captureSnapshot } from '../src/snapshot.js';

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

export async function handleSessionCommand(subcommand, opts) {
  switch (subcommand) {
    case 'start':
      return handleStart(opts);
    case 'exec':
      return handleExec(opts);
    case 'snapshot':
      return handleSnapshot(opts);
    case 'close':
      return handleClose(opts);
    case 'list':
      return handleList();
    default:
      throw new Error(`Unknown session subcommand: "${subcommand}". Expected: start|exec|snapshot|close|list`);
  }
}

async function handleStart(opts) {
  if (!opts.url) throw new Error('session start requires a URL');
  return createSession(opts.url, {
    timeoutMs: opts.timeout,
    headless: !opts.headed,
  });
}

async function handleExec(opts) {
  if (!opts.session) throw new Error('--session <id> is required');
  if (!opts.action) throw new Error('--action <spec> is required');

  const session = getSession(opts.session);
  const page = session.page;

  // Build element map from current page state
  const html = await page.content();
  const url = page.url();
  const extracted = extractAllFromHtml(html, url);
  const elementMap = buildElementMap(extracted.elements);

  const actions = parseActionSpec(opts.action);
  for (const action of actions) {
    validateAction(action, elementMap);
  }

  const executor = new ActionExecutor(page, elementMap, {
    defaultTimeoutMs: opts.actionTimeout ?? 10000,
  });
  const results = await executor.executeAll(actions);

  return {
    sessionId: opts.session,
    finalUrl: page.url(),
    actions: results,
  };
}

async function handleSnapshot(opts) {
  if (!opts.session) throw new Error('--session <id> is required');

  const session = getSession(opts.session);
  const snap = await captureSnapshot(session.page, {
    mode: opts.mode ?? 'interactive',
    maxTokens: opts.tokens,
  });

  return parseSnapshotPayload(snap.text, opts.mode ?? 'interactive');
}

async function handleClose(opts) {
  if (!opts.session) throw new Error('--session <id> is required');
  return closeSession(opts.session);
}

async function handleList() {
  return listSessions();
}
