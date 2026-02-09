import { z } from 'zod';
import { launchBrowser, closeBrowser, navigateAndWait } from '../browser.js';
import { extractAllFromHtml, buildElementMap } from '../extractor.js';
import { ActionExecutor, parseActionSpec, validateAction } from '../actions.js';
import { captureSnapshot } from '../snapshot.js';

/**
 * Schema for execute_browser_action tool
 */
export const executeBrowserActionSchema = {
  url: z.string().url().describe('The URL to navigate to'),
  actions: z
    .array(z.string())
    .describe(
      'Array of action specs in the format: "type:elementId:value" or "click:elementId". Examples: ["type:e1:username", "type:e2:password", "click:e3"]',
    ),
  maxTokens: z.number().int().positive().default(1200).describe('Maximum token budget for the final snapshot'),
  timeout: z.number().int().positive().default(45000).describe('Navigation timeout in milliseconds'),
  snapshotMode: z
    .enum(['text', 'json', 'interactive'])
    .default('interactive')
    .describe('Output mode for the final page snapshot'),
};

/**
 * Schema for take_screenshot tool
 */
export const takeScreenshotSchema = {
  url: z.string().url().describe('The URL to capture'),
  fullPage: z.boolean().default(false).describe('Capture full scrollable page'),
  timeout: z.number().int().positive().default(45000).describe('Navigation timeout in milliseconds'),
  viewport: z
    .object({
      width: z.number().int().positive().default(1280),
      height: z.number().int().positive().default(720),
    })
    .optional()
    .describe('Viewport dimensions'),
};

/**
 * Handler for execute_browser_action tool
 * Navigates to a URL, executes a sequence of actions, and returns results + final page snapshot
 */
export async function handleExecuteBrowserAction({
  url,
  actions,
  maxTokens = 1200,
  timeout = 45000,
  snapshotMode = 'interactive',
}) {
  const { browser, context, page } = await launchBrowser({ headless: true });

  try {
    // Navigate to URL
    await navigateAndWait(page, url, { timeoutMs: timeout });

    // Extract interactive elements to build element map
    const html = await page.content();
    const { elements } = extractAllFromHtml(html, page.url());
    const elementMap = buildElementMap(elements);

    // Parse and validate actions
    const parsedActions = [];
    for (const actionSpec of actions) {
      const parsed = parseActionSpec(actionSpec);
      parsedActions.push(...parsed);
    }

    // Validate all actions before executing
    for (const action of parsedActions) {
      validateAction(action, elementMap);
    }

    // Execute actions
    const executor = new ActionExecutor(page, elementMap, { defaultTimeoutMs: 10000 });
    const results = await executor.executeAll(parsedActions);

    // Capture final page state
    const snapshot = await captureSnapshot(page, { mode: snapshotMode, maxTokens });

    // Build response
    const response = {
      url,
      finalUrl: page.url(),
      actionsExecuted: results.length,
      results: results.map((r) => ({
        type: r.type,
        elementId: r.elementId,
        ok: r.ok,
        url: r.url,
        finalUrl: r.finalUrl,
      })),
      snapshot: JSON.parse(snapshot.text),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

/**
 * Handler for take_screenshot tool
 * Captures a screenshot of a webpage and returns it as base64
 */
export async function handleTakeScreenshot({ url, fullPage = false, timeout = 45000, viewport }) {
  const { browser, context, page } = await launchBrowser({ headless: true });

  try {
    // Set viewport if specified
    if (viewport) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    }

    // Navigate to URL
    await navigateAndWait(page, url, { timeoutMs: timeout });

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage,
      type: 'png',
    });

    const base64Image = screenshotBuffer.toString('base64');

    const response = {
      url,
      finalUrl: page.url(),
      fullPage,
      viewport: viewport || { width: 1280, height: 720 },
      imageBase64: base64Image,
      size: screenshotBuffer.length,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } finally {
    await closeBrowser({ browser, context, page });
  }
}
