import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { validateURL, SSRFError } from '../../src/security.js';

describe('Security - URL Validation', () => {
  describe('Basic URL validation', () => {
    it('should accept valid HTTP URLs', () => {
      const url = validateURL('http://example.com');
      assert.strictEqual(url.hostname, 'example.com');
    });

    it('should accept valid HTTPS URLs', () => {
      const url = validateURL('https://example.com');
      assert.strictEqual(url.hostname, 'example.com');
    });

    it('should reject invalid URLs', () => {
      assert.throws(
        () => validateURL('not-a-url'),
        (err) => err instanceof SSRFError && err.reason === 'invalid_url',
      );
    });

    it('should reject file:// protocol', () => {
      assert.throws(
        () => validateURL('file:///etc/passwd'),
        (err) => err instanceof SSRFError && err.reason === 'blocked_protocol',
      );
    });

    it('should reject ftp:// protocol', () => {
      assert.throws(
        () => validateURL('ftp://example.com'),
        (err) => err instanceof SSRFError && err.reason === 'blocked_protocol',
      );
    });

    it('should reject data: protocol by default', () => {
      assert.throws(
        () => validateURL('data:text/plain,hello'),
        (err) => err instanceof SSRFError && err.reason === 'blocked_protocol',
      );
    });

    it('should allow data: protocol when allowData is enabled', () => {
      const url = validateURL('data:text/plain,hello', { allowData: true });
      assert.strictEqual(url.protocol, 'data:');
    });
  });

  describe('Private IP blocking', () => {
    it('should block localhost (127.0.0.1)', () => {
      assert.throws(
        () => validateURL('http://127.0.0.1'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });

    it('should block localhost (127.0.0.2)', () => {
      assert.throws(
        () => validateURL('http://127.0.0.2:8080'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });

    it('should block 10.0.0.0/8 range', () => {
      assert.throws(
        () => validateURL('http://10.0.0.1'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );

      assert.throws(
        () => validateURL('http://10.255.255.255'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });

    it('should block 172.16.0.0/12 range', () => {
      assert.throws(
        () => validateURL('http://172.16.0.1'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );

      assert.throws(
        () => validateURL('http://172.31.255.255'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });

    it('should block 192.168.0.0/16 range', () => {
      assert.throws(
        () => validateURL('http://192.168.1.1'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );

      assert.throws(
        () => validateURL('http://192.168.255.255'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });

    it('should block link-local addresses (169.254.0.0/16)', () => {
      assert.throws(
        () => validateURL('http://169.254.1.1'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });

    it('should allow public IP addresses', () => {
      const url = validateURL('http://8.8.8.8');
      assert.strictEqual(url.hostname, '8.8.8.8');

      const url2 = validateURL('http://1.1.1.1');
      assert.strictEqual(url2.hostname, '1.1.1.1');
    });
  });

  describe('Metadata endpoint blocking', () => {
    it('should block AWS metadata endpoint', () => {
      assert.throws(
        () => validateURL('http://169.254.169.254/latest/meta-data'),
        (err) => err instanceof SSRFError && err.reason === 'metadata_endpoint',
      );
    });

    it('should block GCP metadata endpoint', () => {
      assert.throws(
        () => validateURL('http://metadata.google.internal/computeMetadata/v1/'),
        (err) => err instanceof SSRFError && err.reason === 'metadata_endpoint',
      );
    });

    it('should allow private IPs if allowMetadata is enabled', () => {
      const url = validateURL('http://169.254.169.254', { allowMetadata: true, allowPrivateIPs: true });
      assert.strictEqual(url.hostname, '169.254.169.254');
    });
  });

  describe('Whitelist functionality', () => {
    it('should allow only whitelisted domains', () => {
      const url = validateURL('http://example.com', { whitelist: ['example.com', 'google.com'] });
      assert.strictEqual(url.hostname, 'example.com');
    });

    it('should reject non-whitelisted domains', () => {
      assert.throws(() => validateURL('http://evil.com', { whitelist: ['example.com', 'google.com'] }), SSRFError);
    });

    it('should support wildcard patterns in whitelist', () => {
      const url = validateURL('http://sub.example.com', { whitelist: ['*.example.com'] });
      assert.strictEqual(url.hostname, 'sub.example.com');

      const url2 = validateURL('http://deep.sub.example.com', { whitelist: ['*.example.com'] });
      assert.strictEqual(url2.hostname, 'deep.sub.example.com');
    });

    it('should allow private IPs if whitelisted', () => {
      const url = validateURL('http://127.0.0.1', { whitelist: ['127.0.0.1'] });
      assert.strictEqual(url.hostname, '127.0.0.1');
    });
  });

  describe('Blacklist functionality', () => {
    it('should block blacklisted domains', () => {
      assert.throws(() => validateURL('http://evil.com', { blacklist: ['evil.com', 'malware.com'] }), SSRFError);
    });

    it('should allow non-blacklisted domains', () => {
      const url = validateURL('http://example.com', { blacklist: ['evil.com', 'malware.com'] });
      assert.strictEqual(url.hostname, 'example.com');
    });

    it('should support wildcard patterns in blacklist', () => {
      assert.throws(() => validateURL('http://sub.evil.com', { blacklist: ['*.evil.com'] }), SSRFError);
    });
  });

  describe('Environment variable support', () => {
    beforeEach(() => {
      // Clean up environment
      delete process.env.LEAN_BROWSER_URL_WHITELIST;
      delete process.env.LEAN_BROWSER_URL_BLACKLIST;
    });

    it('should use whitelist from environment', () => {
      process.env.LEAN_BROWSER_URL_WHITELIST = 'example.com,google.com';

      const url = validateURL('http://example.com');
      assert.strictEqual(url.hostname, 'example.com');

      assert.throws(() => validateURL('http://evil.com'), SSRFError);

      delete process.env.LEAN_BROWSER_URL_WHITELIST;
    });

    it('should use blacklist from environment', () => {
      process.env.LEAN_BROWSER_URL_BLACKLIST = 'evil.com,malware.com';

      assert.throws(() => validateURL('http://evil.com'), SSRFError);

      const url = validateURL('http://example.com');
      assert.strictEqual(url.hostname, 'example.com');

      delete process.env.LEAN_BROWSER_URL_BLACKLIST;
    });
  });

  describe('IPv6 support', () => {
    it('should block IPv6 localhost', () => {
      assert.throws(
        () => validateURL('http://[::1]'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });

    it('should block IPv6 link-local addresses', () => {
      assert.throws(
        () => validateURL('http://[fe80::1]'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });

    it('should block IPv6 unique local addresses', () => {
      assert.throws(
        () => validateURL('http://[fc00::1]'),
        (err) => err instanceof SSRFError && err.reason === 'private_ip',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle URLs with ports', () => {
      const url = validateURL('http://example.com:8080');
      assert.strictEqual(url.hostname, 'example.com');
      assert.strictEqual(url.port, '8080');
    });

    it('should handle URLs with paths', () => {
      const url = validateURL('http://example.com/path/to/resource');
      assert.strictEqual(url.hostname, 'example.com');
      assert.strictEqual(url.pathname, '/path/to/resource');
    });

    it('should handle URLs with query parameters', () => {
      const url = validateURL('http://example.com?foo=bar');
      assert.strictEqual(url.hostname, 'example.com');
      assert.strictEqual(url.search, '?foo=bar');
    });
  });
});
