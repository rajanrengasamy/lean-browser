import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateURL, SSRFError } from '../../src/security.js';

describe('Security Integration Tests', () => {
  describe('SSRF protection in browser operations', () => {
    it('should reject private IPs', () => {
      const privateIPs = [
        'http://127.0.0.1',
        'http://localhost',
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://192.168.1.1',
        'http://169.254.169.254',
      ];

      for (const url of privateIPs) {
        assert.throws(() => validateURL(url), SSRFError, `Should block private IP: ${url}`);
      }
    });

    it('should reject metadata endpoints', () => {
      const metadataUrls = [
        'http://169.254.169.254/latest/meta-data',
        'http://metadata.google.internal/computeMetadata/v1/',
      ];

      for (const url of metadataUrls) {
        assert.throws(() => validateURL(url), SSRFError, `Should block metadata endpoint: ${url}`);
      }
    });

    it('should accept public URLs', () => {
      const publicUrls = ['https://example.com', 'https://github.com', 'https://www.google.com', 'http://8.8.8.8'];

      for (const url of publicUrls) {
        assert.doesNotThrow(() => validateURL(url), `Should allow public URL: ${url}`);
      }
    });

    it('should respect whitelist environment variable', () => {
      process.env.LEAN_BROWSER_URL_WHITELIST = 'example.com';

      assert.doesNotThrow(() => validateURL('https://example.com'));
      assert.throws(() => validateURL('https://github.com'), SSRFError);

      delete process.env.LEAN_BROWSER_URL_WHITELIST;
    });

    it('should respect blacklist environment variable', () => {
      process.env.LEAN_BROWSER_URL_BLACKLIST = 'evil.com';

      assert.throws(() => validateURL('https://evil.com'), SSRFError);
      assert.doesNotThrow(() => validateURL('https://example.com'));

      delete process.env.LEAN_BROWSER_URL_BLACKLIST;
    });
  });
});
