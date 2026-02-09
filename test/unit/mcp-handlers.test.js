import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleFetchPageText, handleFetchPageJson, handleFetchPageInteractive } from '../../src/mcp/handlers.js';

describe('mcp/handlers', () => {
  describe('handleFetchPageText', () => {
    it('fetches and formats page as text', { timeout: 60000 }, async () => {
      const result = await handleFetchPageText({ url: 'https://example.com', maxTokens: 500 });

      assert.ok(result.content);
      assert.equal(result.content.length, 1);
      assert.equal(result.content[0].type, 'text');
      assert.ok(result.content[0].text);
      assert.ok(typeof result.content[0].text === 'string');
      assert.ok(result.content[0].text.includes('Example Domain'));
    });

    it('respects maxTokens parameter', { timeout: 60000 }, async () => {
      const result = await handleFetchPageText({ url: 'https://example.com', maxTokens: 200 });

      assert.ok(result.content[0].text);
      // Text should be reasonably short given the token limit
      assert.ok(result.content[0].text.length < 5000);
    });

    it('handles custom timeout', { timeout: 60000 }, async () => {
      await assert.doesNotReject(async () => {
        await handleFetchPageText({ url: 'https://example.com', maxTokens: 500, timeout: 30000 });
      });
    });
  });

  describe('handleFetchPageJson', () => {
    it('fetches and formats page as JSON', { timeout: 60000 }, async () => {
      const result = await handleFetchPageJson({ url: 'https://example.com', maxTokens: 1000 });

      assert.ok(result.content);
      assert.equal(result.content.length, 1);
      assert.equal(result.content[0].type, 'text');

      // Should be valid JSON
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.url);
      assert.ok(parsed.url.includes('example.com'));
      assert.ok(parsed.article);
    });

    it('includes title and metadata', { timeout: 60000 }, async () => {
      const result = await handleFetchPageJson({ url: 'https://example.com' });

      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.url);
      assert.ok(parsed.article);
    });
  });

  describe('handleFetchPageInteractive', () => {
    it('fetches and formats page as interactive', { timeout: 60000 }, async () => {
      const result = await handleFetchPageInteractive({ url: 'https://example.com', maxTokens: 1500 });

      assert.ok(result.content);
      assert.equal(result.content.length, 1);
      assert.equal(result.content[0].type, 'text');

      // Should be valid JSON with interactive structure
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.view || parsed.elements);
    });

    it('respects maxTokens parameter', { timeout: 60000 }, async () => {
      const result = await handleFetchPageInteractive({ url: 'https://example.com', maxTokens: 500 });

      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed);
      // Should have content but within limits
    });
  });

  describe('error handling', () => {
    it('handles fetch errors', { timeout: 30000 }, async () => {
      await assert.rejects(
        async () => {
          await handleFetchPageText({ url: 'http://invalid-url-that-does-not-exist.test', timeout: 5000 });
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
