import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, navigateAndWait, closeBrowser, fetchRenderedHtml } from '../../src/browser.js';

describe('browser', () => {
  let browser, context, page;

  afterEach(async () => {
    // Clean up browser resources after each test
    if (browser || context || page) {
      await closeBrowser({ browser, context, page }).catch(() => {});
      browser = context = page = null;
    }
  });

  describe('launchBrowser', () => {
    it('launches browser with default options', { timeout: 30000 }, async () => {
      const result = await launchBrowser({ headless: true });

      assert.ok(result.browser);
      assert.ok(result.context);
      assert.ok(result.page);

      browser = result.browser;
      context = result.context;
      page = result.page;
    });

    it('launches browser in headless mode', { timeout: 30000 }, async () => {
      const result = await launchBrowser({ headless: true });

      assert.ok(result.browser);
      assert.ok(result.page);

      browser = result.browser;
      context = result.context;
      page = result.page;
    });
  });

  describe('navigateAndWait', () => {
    it('navigates to URL and returns metadata', { timeout: 60000 }, async () => {
      const launched = await launchBrowser({ headless: true });
      browser = launched.browser;
      context = launched.context;
      page = launched.page;

      const result = await navigateAndWait(page, 'https://example.com');

      assert.ok(result.finalUrl);
      assert.ok(result.finalUrl.includes('example.com'));
      assert.ok(result.title);
      assert.equal(result.status, 200);
    });

    it('uses custom timeout', { timeout: 60000 }, async () => {
      const launched = await launchBrowser({ headless: true });
      browser = launched.browser;
      context = launched.context;
      page = launched.page;

      // Should not throw with valid timeout
      await assert.doesNotReject(async () => {
        await navigateAndWait(page, 'https://example.com', { timeoutMs: 30000 });
      });
    });
  });

  describe('closeBrowser', () => {
    it('closes browser, context, and page', { timeout: 30000 }, async () => {
      const launched = await launchBrowser({ headless: true });

      // Should not throw
      await assert.doesNotReject(async () => {
        await closeBrowser(launched);
      });

      // Mark as null so afterEach doesn't try to close again
      browser = context = page = null;
    });

    it('handles missing objects gracefully', async () => {
      await assert.doesNotReject(async () => {
        await closeBrowser({});
        await closeBrowser({ browser: null, context: null, page: null });
        await closeBrowser();
      });
    });
  });

  describe('fetchRenderedHtml', () => {
    it('fetches HTML and returns metadata', { timeout: 60000 }, async () => {
      const result = await fetchRenderedHtml('https://example.com', { headless: true });

      assert.ok(result.html);
      assert.ok(result.html.includes('Example Domain'));
      assert.ok(result.finalUrl);
      assert.ok(result.finalUrl.includes('example.com'));
      assert.ok(result.title);
      assert.equal(result.status, 200);

      // Browser should be closed automatically (no need to track)
    });

    it('uses custom timeout', { timeout: 60000 }, async () => {
      await assert.doesNotReject(async () => {
        await fetchRenderedHtml('https://example.com', { timeoutMs: 30000, headless: true });
      });
    });

    it('closes browser even if navigation fails', { timeout: 30000 }, async () => {
      // Invalid URL should fail but not leave browsers open
      await assert.rejects(
        async () => {
          await fetchRenderedHtml('http://invalid-url-that-does-not-exist.test', { timeoutMs: 5000, headless: true });
        },
        (err) => {
          // Should throw an error (may be DNSError or other network error)
          return (
            err.message.includes('DNS resolution failed') ||
            err.message.includes('ERR_NAME_NOT_RESOLVED') ||
            err.message.includes('ENOTFOUND') ||
            err.cause?.message?.includes('ERR_NAME_NOT_RESOLVED')
          );
        },
      );
    });
  });
});
