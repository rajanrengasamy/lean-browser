import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractAllFromHtml } from '../../src/extractor.js';
import { ExtractionError } from '../../src/errors.js';

describe('Error Handling Integration', () => {
  describe('extractAllFromHtml with fallback', () => {
    it('successfully extracts simple content', () => {
      const html = '<html><body><p>Simple paragraph with some content that should be extracted.</p></body></html>';
      const result = extractAllFromHtml(html, 'https://example.com', { enableFallback: true });

      assert.ok(result.article);
      assert.ok(result.article.text.includes('Simple paragraph') || result.article.text.includes('extracted'));
      // Fallback flag depends on whether Readability succeeds
      assert.ok(typeof result.article.fallback === 'boolean');
    });

    it('succeeds with valid article content', () => {
      const html = `
        <html>
          <head><title>Test Article</title></head>
          <body>
            <article>
              <h1>Article Title</h1>
              <p>This is a well-structured article with multiple paragraphs.</p>
              <p>Readability should be able to extract this content properly.</p>
              <p>We want to ensure that the extraction works correctly.</p>
            </article>
          </body>
        </html>
      `;

      const result = extractAllFromHtml(html, 'https://example.com', { enableFallback: true });

      assert.ok(result.article);
      assert.ok(result.article.text.length > 50);
    });

    it('uses fallback when Readability returns null', () => {
      // Very minimal HTML that Readability likely can't extract well
      const html = '<html><body><div>Short content here that may not be extracted</div></body></html>';

      // With fallback enabled, should still succeed
      const result = extractAllFromHtml(html, 'https://example.com', { enableFallback: true });
      assert.ok(result.article);
    });

    it('throws when content is insufficient even with fallback', () => {
      const html = '<html><body></body></html>';

      assert.throws(
        () => {
          extractAllFromHtml(html, 'https://example.com', { enableFallback: true });
        },
        (error) => {
          assert.ok(error instanceof ExtractionError);
          assert.ok(error.message.includes('Insufficient content'));
          return true;
        },
      );
    });

    it('extracts interactive elements even with minimal content', () => {
      const html = `
        <html>
          <body>
            <h1>Login Page</h1>
            <p>Please enter your credentials to access your account.</p>
            <form>
              <input type="text" name="username" id="user" placeholder="Username" />
              <input type="password" name="password" id="pass" placeholder="Password" />
              <button type="submit">Login</button>
            </form>
            <p>Having trouble logging in? Contact support for assistance.</p>
          </body>
        </html>
      `;

      const result = extractAllFromHtml(html, 'https://example.com', { enableFallback: true });

      assert.ok(result.elements);
      assert.ok(result.elements.length >= 3);

      const hasInput = result.elements.some((el) => el.tag === 'input');
      const hasButton = result.elements.some((el) => el.tag === 'button');

      assert.ok(hasInput);
      assert.ok(hasButton);
    });

    it('provides helpful error context', () => {
      const html = '<html><body></body></html>';

      try {
        extractAllFromHtml(html, 'https://example.com/test', { enableFallback: true });
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error instanceof ExtractionError);
        assert.equal(error.url, 'https://example.com/test');
        assert.ok(error.suggestion);
        assert.ok(error.code);
      }
    });
  });

  describe('extractAllFromHtml error handling', () => {
    it('handles empty HTML gracefully', () => {
      // Empty HTML should trigger extraction error
      assert.throws(
        () => {
          extractAllFromHtml('', 'https://example.com');
        },
        (error) => {
          assert.ok(error instanceof ExtractionError);
          return true;
        },
      );
    });

    it('throws ExtractionError with proper context', () => {
      try {
        extractAllFromHtml('', 'https://example.com/test-page');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error instanceof ExtractionError);
        assert.equal(error.url, 'https://example.com/test-page');
        assert.equal(error.code, 'E_EXTRACTION_FAILED');
      }
    });
  });
});
