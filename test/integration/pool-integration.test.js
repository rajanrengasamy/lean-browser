import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRenderedHtml } from '../../src/browser.js';
import { getGlobalPool, resetGlobalPool } from '../../src/browser-pool.js';

describe('Browser Pool Integration', () => {
  after(async () => {
    await resetGlobalPool();
  });

  it('uses pool for multiple requests', async () => {
    await resetGlobalPool();
    const pool = getGlobalPool();

    // First request (pool miss)
    const result1 = await fetchRenderedHtml('https://example.com', { usePool: true });
    assert.ok(result1.html);
    assert.ok(result1.finalUrl);

    // Second request (pool hit)
    const result2 = await fetchRenderedHtml('https://example.com', { usePool: true });
    assert.ok(result2.html);
    assert.ok(result2.finalUrl);

    // Check stats
    const stats = pool.getStats();
    assert.equal(stats.totalRequests, 2);
    assert.equal(stats.poolHits, 1);
    assert.equal(stats.poolMisses, 1);
    assert.equal(stats.browsersCreated, 1);
  });

  it('bypasses pool when usePool is false', async () => {
    await resetGlobalPool();
    const pool = getGlobalPool();

    const result = await fetchRenderedHtml('https://example.com', { usePool: false });
    assert.ok(result.html);

    // Pool should not be used
    const stats = pool.getStats();
    assert.equal(stats.totalRequests, 0);
  });

  it('bypasses pool for custom configurations', async () => {
    await resetGlobalPool();
    const pool = getGlobalPool();

    const result = await fetchRenderedHtml('https://example.com', {
      usePool: true,
      viewport: '1920x1080', // Custom viewport should bypass pool
    });
    assert.ok(result.html);

    // Pool should not be used
    const stats = pool.getStats();
    assert.equal(stats.totalRequests, 0);
  });

  it('handles concurrent requests', async () => {
    await resetGlobalPool();
    const pool = getGlobalPool();

    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(fetchRenderedHtml('https://example.com', { usePool: true }));
    }

    const results = await Promise.all(promises);
    assert.equal(results.length, 3);

    for (const result of results) {
      assert.ok(result.html);
      assert.ok(result.finalUrl);
    }

    const stats = pool.getStats();
    assert.equal(stats.totalRequests, 3);
    assert.ok(stats.browsersCreated <= 3);
  });

  it('returns correct content from pooled browsers', async () => {
    await resetGlobalPool();

    const result = await fetchRenderedHtml('https://example.com', { usePool: true });

    assert.ok(result.html.includes('Example Domain'));
    assert.equal(result.finalUrl, 'https://example.com/');
    assert.equal(result.status, 200);
  });
});
