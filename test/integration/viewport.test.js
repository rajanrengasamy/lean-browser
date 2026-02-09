import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRenderedHtml, takeScreenshot } from '../../src/browser.js';

describe('Viewport customization', () => {
  it('fetches with custom viewport size', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      viewport: '1920x1080',
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });

  it('fetches with mobile emulation', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      mobile: true,
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });

  it('fetches with specific device emulation', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      device: 'iPhone 13',
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });

  it('device emulation takes precedence over mobile flag', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      device: 'iPad Pro',
      mobile: true,
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });

  it('viewport applies to screenshots', async () => {
    const result = await takeScreenshot('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      viewport: '800x600',
    });

    assert.ok(result.screenshot);
    assert.ok(result.screenshot.length > 0);
  });
});
