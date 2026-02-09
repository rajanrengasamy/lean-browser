import { Buffer } from 'node:buffer';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRenderedHtml, takeScreenshot } from '../../src/browser.js';
import { existsSync, unlinkSync } from 'node:fs';

const TEST_COOKIES = '/tmp/lean-browser-all-features-test-cookies.json';

describe('All features integration', () => {
  it('combines multiple features in single request', async () => {
    // Test combining: viewport, mobile, cookies, ad blocking, and resource blocking
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      viewport: '800x600',
      cookiesFile: TEST_COOKIES,
      blockAds: true,
      blockResources: ['image', 'font'],
      extraHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
    assert.equal(result.status, 200);
    assert.equal(typeof result.blockedCount, 'number');
    assert.ok(existsSync(TEST_COOKIES));

    // Cleanup
    unlinkSync(TEST_COOKIES);
  });

  it('screenshot with multiple features', async () => {
    const result = await takeScreenshot('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      viewport: '1024x768',
      fullPage: true,
      blockAds: true,
      extraHeaders: {
        'Accept-Language': 'fr-FR',
      },
    });

    assert.ok(result.screenshot);
    assert.ok(result.screenshot.length > 0);
    assert.ok(result.finalUrl);
    assert.equal(result.status, 200);

    // Verify it's a valid PNG
    const buffer = Buffer.from(result.screenshot, 'base64');
    assert.equal(buffer[0], 0x89);
    assert.equal(buffer[1], 0x50);
    assert.equal(buffer[2], 0x4e);
    assert.equal(buffer[3], 0x47);
  });

  it('device emulation with all features', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      device: 'iPhone 13',
      blockAds: true,
      blockResources: ['font'],
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
    assert.equal(typeof result.blockedCount, 'number');
  });
});
