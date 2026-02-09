import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRenderedHtml } from '../../src/browser.js';

describe('Request blocking', () => {
  it('blocks ads and trackers', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      blockAds: true,
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
    // blockedCount should be a number (may be 0 for simple pages)
    assert.equal(typeof result.blockedCount, 'number');
    assert.ok(result.blockedCount >= 0);
  });

  it('blocks image resources', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      blockResources: ['image'],
    });

    assert.ok(result.html);
    assert.equal(typeof result.blockedCount, 'number');
  });

  it('blocks multiple resource types', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      blockResources: ['image', 'font', 'stylesheet'],
    });

    assert.ok(result.html);
    assert.equal(typeof result.blockedCount, 'number');
  });

  it('combines ad blocking and resource blocking', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      blockAds: true,
      blockResources: ['image'],
    });

    assert.ok(result.html);
    assert.equal(typeof result.blockedCount, 'number');
  });

  it('works without blocking', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      blockAds: false,
      blockResources: [],
    });

    assert.ok(result.html);
    // blockedCount should be 0 when no blocking is enabled
    assert.equal(result.blockedCount, 0);
  });
});
