import { launchBrowser, navigateAndWait, closeBrowser } from '../src/browser.js';
import { extractAllFromHtml, buildElementMap } from '../src/extractor.js';
import { parseActionSpec, validateAction, ActionExecutor } from '../src/actions.js';
import { captureSnapshot } from '../src/snapshot.js';

export async function handleActionCommand(url, opts) {
  const actions = parseActionSpec(opts.actions);

  if (actions.length === 0) {
    throw new Error('No actions specified. Use --actions "click:e1,type:e2:value"');
  }

  const { browser, context, page } = await launchBrowser({
    headless: !opts.headed,
  });

  try {
    const nav = await navigateAndWait(page, url, { timeoutMs: opts.timeout });

    // Build element map from initial page state
    const html = await page.content();
    const extracted = extractAllFromHtml(html, nav.finalUrl ?? url);
    const elementMap = buildElementMap(extracted.elements);

    // Validate all actions before executing any
    for (const action of actions) {
      validateAction(action, elementMap);
    }

    // Execute actions sequentially
    const executor = new ActionExecutor(page, elementMap, {
      defaultTimeoutMs: opts.actionTimeout ?? 10000,
    });
    const results = await executor.executeAll(actions);

    const output = {
      url,
      finalUrl: page.url(),
      actions: results,
    };

    // Optionally capture post-action snapshot
    if (opts.snapshot) {
      const snap = await captureSnapshot(page, {
        mode: opts.snapshotMode ?? 'interactive',
        maxTokens: opts.tokens,
      });
      output.snapshot = JSON.parse(snap.text);
    }

    return output;
  } finally {
    await closeBrowser({ browser, context, page });
  }
}
