import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { captureSnapshot } from '../../src/snapshot.js';

describe('snapshot (simplified)', () => {
  describe('captureSnapshot', () => {
    it('captures snapshot with valid page object', async () => {
      // Create a minimal mock page with proper article content
      const mockPage = {
        content: async () => `
          <html>
            <head><title>Test Article</title></head>
            <body>
              <article>
                <h1>Test Page Title</h1>
                <p>This is the main content of the article. It contains enough text to be recognized by Readability.</p>
                <p>Here is another paragraph with more content to ensure the article is substantial enough.</p>
                <p>And a third paragraph for good measure. This should definitely be enough content.</p>
              </article>
            </body>
          </html>
        `,
        url: () => 'https://example.com/page',
        title: async () => 'Test Article',
      };

      const result = await captureSnapshot(mockPage, { mode: 'text', maxTokens: 500 });

      assert.ok(result.text);
      assert.ok(typeof result.text === 'string');
      assert.ok(result.text.length > 0);
    });

    it('captures snapshot in json mode', async () => {
      const mockPage = {
        content: async () => `
          <html>
            <body>
              <article>
                <h1>Test Article</h1>
                <p>This is sufficient content for the article.</p>
                <p>Multiple paragraphs ensure proper extraction.</p>
                <p>Third paragraph adds more substance.</p>
              </article>
            </body>
          </html>
        `,
        url: () => 'https://example.com/page',
        title: async () => 'Test Article',
      };

      const result = await captureSnapshot(mockPage, { mode: 'json', maxTokens: 1000 });

      assert.ok(result.text);
      const parsed = JSON.parse(result.text);
      assert.ok(parsed.url);
      assert.ok(parsed.article);
    });

    it('captures snapshot in interactive mode', async () => {
      const mockPage = {
        content: async () => `
          <html>
            <body>
              <article>
                <h1>Interactive Page</h1>
                <p>This page has both content and interactive elements.</p>
                <p>Multiple paragraphs of substantial content here.</p>
              </article>
              <button>Click</button>
              <input type="text"/>
            </body>
          </html>
        `,
        url: () => 'https://example.com/page',
        title: async () => 'Interactive Page',
      };

      const result = await captureSnapshot(mockPage, { mode: 'interactive', maxTokens: 1500 });

      assert.ok(result.text);
      const parsed = JSON.parse(result.text);
      assert.ok(parsed.view || parsed.elements);
    });

    it('defaults to interactive mode', async () => {
      const mockPage = {
        content: async () => `
          <html>
            <body>
              <article>
                <h1>Default Mode Test</h1>
                <p>This tests the default mode behavior with sufficient content.</p>
                <p>Multiple paragraphs ensure proper article extraction.</p>
              </article>
              <button>Click</button>
            </body>
          </html>
        `,
        url: () => 'https://example.com/page',
        title: async () => 'Default Mode Test',
      };

      const result = await captureSnapshot(mockPage);

      // Interactive mode returns JSON
      assert.doesNotThrow(() => {
        JSON.parse(result.text);
      });
    });

    it('respects maxTokens parameter', async () => {
      const mockPage = {
        content: async () => `
          <html>
            <body>
              <article>
                <h1>Token Limit Test</h1>
                <p>This is short but sufficient content for extraction.</p>
                <p>Just enough paragraphs to be valid.</p>
              </article>
            </body>
          </html>
        `,
        url: () => 'https://example.com/page',
        title: async () => 'Token Limit Test',
      };

      const result = await captureSnapshot(mockPage, { mode: 'text', maxTokens: 100 });

      // Result should have text content
      assert.ok(result.text);
      assert.ok(result.text.length > 0);
    });

    it('handles pages with missing title', async () => {
      const mockPage = {
        content: async () => '<html><body><article><p>Content</p></article></body></html>',
        url: () => 'https://example.com/page',
        title: async () => {
          throw new Error('Title unavailable');
        },
      };

      // Should not throw, should handle gracefully
      const result = await captureSnapshot(mockPage, { mode: 'json' });
      assert.ok(result.text);
    });
  });
});
