import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRenderedHtml } from '../../src/browser.js';

describe('Custom headers', () => {
  it('fetches with custom Accept-Language header', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      extraHeaders: {
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });

  it('fetches with custom Referer header', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      extraHeaders: {
        Referer: 'https://google.com',
      },
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });

  it('fetches with multiple custom headers', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      extraHeaders: {
        'Accept-Language': 'es-ES,es;q=0.9',
        Referer: 'https://example.org',
        'X-Custom-Header': 'test-value',
      },
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });

  it('fetches without custom headers', async () => {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      extraHeaders: {},
    });

    assert.ok(result.html);
    assert.ok(result.finalUrl);
  });
});
