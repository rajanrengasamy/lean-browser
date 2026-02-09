import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRenderedHtml } from '../../src/browser.js';
import { existsSync, unlinkSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const TEST_COOKIES_FILE = '/tmp/lean-browser-test-cookies.json';

after(() => {
  // Cleanup test cookies file
  if (existsSync(TEST_COOKIES_FILE)) {
    unlinkSync(TEST_COOKIES_FILE);
  }
});

describe('Cookie persistence', () => {
  it('saves cookies to file', async () => {
    // First request - cookies will be saved
    await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      cookiesFile: TEST_COOKIES_FILE,
    });

    // Check if cookies file was created
    assert.ok(existsSync(TEST_COOKIES_FILE));

    // Read cookies file
    const cookiesJson = await readFile(TEST_COOKIES_FILE, 'utf-8');
    const cookies = JSON.parse(cookiesJson);

    // Cookies should be an array
    assert.ok(Array.isArray(cookies));
  });

  it('loads cookies from file', async () => {
    // First request - save cookies
    await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      cookiesFile: TEST_COOKIES_FILE,
    });

    assert.ok(existsSync(TEST_COOKIES_FILE));

    // Second request - load cookies
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      cookiesFile: TEST_COOKIES_FILE,
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });

  it('handles missing cookies file gracefully', async () => {
    const nonExistentFile = '/tmp/non-existent-cookies.json';

    // Should not throw error
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      cookiesFile: nonExistentFile,
    });

    assert.ok(result.html);
    assert.ok(existsSync(nonExistentFile));

    // Cleanup
    unlinkSync(nonExistentFile);
  });
});
