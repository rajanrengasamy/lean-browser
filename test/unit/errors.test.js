import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BrowserError,
  TimeoutError,
  NetworkError,
  DNSError,
  ConnectionRefusedError,
  ServerError,
  AntiBotError,
  BrowserCrashError,
  ExtractionError,
  ErrorCodes,
  detectAntiBot,
  classifyError,
} from '../../src/errors.js';

describe('BrowserError', () => {
  it('creates error with code and url', () => {
    const error = new BrowserError('Test error', {
      code: ErrorCodes.E_NETWORK,
      url: 'https://example.com',
    });

    assert.equal(error.message, 'Test error');
    assert.equal(error.code, ErrorCodes.E_NETWORK);
    assert.equal(error.url, 'https://example.com');
  });

  it('serializes to JSON', () => {
    const error = new BrowserError('Test error', {
      code: ErrorCodes.E_TIMEOUT,
      url: 'https://example.com',
      statusCode: 408,
      suggestion: 'Try again',
    });

    const json = error.toJSON();
    assert.equal(json.error, 'BrowserError');
    assert.equal(json.code, ErrorCodes.E_TIMEOUT);
    assert.equal(json.message, 'Test error');
    assert.equal(json.url, 'https://example.com');
    assert.equal(json.statusCode, 408);
    assert.equal(json.suggestion, 'Try again');
  });
});

describe('TimeoutError', () => {
  it('creates timeout error with helpful message', () => {
    const error = new TimeoutError('https://example.com', 30000);

    assert.equal(error.name, 'TimeoutError');
    assert.equal(error.code, ErrorCodes.E_TIMEOUT);
    assert.ok(error.message.includes('30000ms'));
    assert.ok(error.message.includes('https://example.com'));
    assert.ok(error.suggestion.includes('60000'));
  });

  it('includes timeout value', () => {
    const error = new TimeoutError('https://example.com', 15000);
    assert.equal(error.timeoutMs, 15000);
  });
});

describe('NetworkError', () => {
  it('creates network error with url', () => {
    const error = new NetworkError('https://example.com', 'Connection reset');

    assert.equal(error.name, 'NetworkError');
    assert.equal(error.code, ErrorCodes.E_NETWORK);
    assert.ok(error.message.includes('https://example.com'));
    assert.ok(error.message.includes('Connection reset'));
  });
});

describe('DNSError', () => {
  it('creates DNS error with suggestion', () => {
    const error = new DNSError('https://invalid-domain-xyz.com');

    assert.equal(error.name, 'DNSError');
    assert.equal(error.code, ErrorCodes.E_DNS);
    assert.ok(error.suggestion.includes('DNS'));
  });
});

describe('ConnectionRefusedError', () => {
  it('creates connection refused error', () => {
    const error = new ConnectionRefusedError('http://localhost:9999');

    assert.equal(error.name, 'ConnectionRefusedError');
    assert.equal(error.code, ErrorCodes.E_CONNECTION_REFUSED);
    assert.ok(error.suggestion.includes('server'));
  });
});

describe('ServerError', () => {
  it('creates server error with status code', () => {
    const error = new ServerError('https://example.com', 503);

    assert.equal(error.name, 'ServerError');
    assert.equal(error.code, ErrorCodes.E_SERVER_ERROR);
    assert.equal(error.statusCode, 503);
    assert.ok(error.message.includes('503'));
  });

  it('provides suggestion for 5xx errors', () => {
    const error = new ServerError('https://example.com', 500);
    assert.ok(error.suggestion);
    assert.ok(error.suggestion.includes('server'));
  });

  it('no suggestion for 4xx errors', () => {
    const error = new ServerError('https://example.com', 404);
    assert.equal(error.suggestion, null);
  });
});

describe('AntiBotError', () => {
  it('detects Cloudflare challenge', () => {
    const error = new AntiBotError('https://example.com', 'cloudflare', 403);

    assert.equal(error.name, 'AntiBotError');
    assert.equal(error.code, ErrorCodes.E_ANTIBOT);
    assert.equal(error.detectionType, 'cloudflare');
    assert.ok(error.message.includes('cloudflare'));
  });

  it('detects reCAPTCHA', () => {
    const error = new AntiBotError('https://example.com', 'recaptcha', 200);
    assert.equal(error.detectionType, 'recaptcha');
    assert.ok(error.message.includes('recaptcha'));
  });

  it('detects forbidden response', () => {
    const error = new AntiBotError('https://example.com', 'forbidden', 403);
    assert.equal(error.detectionType, 'forbidden');
    assert.equal(error.statusCode, 403);
  });
});

describe('BrowserCrashError', () => {
  it('creates browser crash error', () => {
    const error = new BrowserCrashError('https://example.com');

    assert.equal(error.name, 'BrowserCrashError');
    assert.equal(error.code, ErrorCodes.E_BROWSER_CRASH);
    assert.ok(error.suggestion.includes('crash'));
  });
});

describe('ExtractionError', () => {
  it('creates extraction error', () => {
    const error = new ExtractionError('https://example.com', 'No content found');

    assert.equal(error.name, 'ExtractionError');
    assert.equal(error.code, ErrorCodes.E_EXTRACTION_FAILED);
    assert.ok(error.message.includes('No content found'));
  });
});

describe('detectAntiBot', () => {
  it('detects Cloudflare challenge page', () => {
    const html = `
      <html>
        <head><title>Just a moment...</title></head>
        <body>
          <div class="cf-browser-verification">
            Checking your browser before accessing example.com
          </div>
        </body>
      </html>
    `;

    const error = detectAntiBot(html, 403, 'https://example.com');
    assert.ok(error instanceof AntiBotError);
    assert.equal(error.detectionType, 'cloudflare');
  });

  it('detects challenge-running Cloudflare page', () => {
    const html = '<html><body><div class="challenge-running">Please wait...</div></body></html>';

    const error = detectAntiBot(html, 503, 'https://example.com');
    assert.ok(error instanceof AntiBotError);
    assert.equal(error.detectionType, 'cloudflare');
  });

  it('detects reCAPTCHA', () => {
    const html = '<html><body><div class="g-recaptcha" data-sitekey="..."></div></body></html>';

    const error = detectAntiBot(html, 200, 'https://example.com');
    assert.ok(error instanceof AntiBotError);
    assert.equal(error.detectionType, 'recaptcha');
  });

  it('detects 403 Forbidden as anti-bot', () => {
    const html = '<html><body>Access Denied</body></html>';

    const error = detectAntiBot(html, 403, 'https://example.com');
    assert.ok(error instanceof AntiBotError);
    assert.equal(error.detectionType, 'forbidden');
  });

  it('returns null for normal pages', () => {
    const html = '<html><body><h1>Welcome</h1><p>Normal content here.</p></body></html>';

    const error = detectAntiBot(html, 200, 'https://example.com');
    assert.equal(error, null);
  });

  it('returns null for empty HTML', () => {
    const error = detectAntiBot('', 200, 'https://example.com');
    assert.equal(error, null);
  });
});

describe('classifyError', () => {
  it('classifies timeout errors', () => {
    const originalError = new Error('Navigation timeout of 30000 ms exceeded');
    const classified = classifyError(originalError, 'https://example.com', 30000);

    assert.ok(classified instanceof TimeoutError);
    assert.equal(classified.url, 'https://example.com');
    assert.equal(classified.timeoutMs, 30000);
  });

  it('classifies DNS errors', () => {
    const originalError = new Error('net::ERR_NAME_NOT_RESOLVED');
    const classified = classifyError(originalError, 'https://invalid.com', 30000);

    assert.ok(classified instanceof DNSError);
    assert.equal(classified.url, 'https://invalid.com');
  });

  it('classifies connection refused errors', () => {
    const originalError = new Error('net::ERR_CONNECTION_REFUSED');
    const classified = classifyError(originalError, 'http://localhost:9999', 30000);

    assert.ok(classified instanceof ConnectionRefusedError);
  });

  it('classifies generic network errors', () => {
    const originalError = new Error('net::ERR_NETWORK_CHANGED');
    const classified = classifyError(originalError, 'https://example.com', 30000);

    assert.ok(classified instanceof NetworkError);
  });

  it('classifies browser crash errors', () => {
    const originalError = new Error('Target closed');
    const classified = classifyError(originalError, 'https://example.com', 30000);

    assert.ok(classified instanceof BrowserCrashError);
  });

  it('classifies unknown errors as BrowserError', () => {
    const originalError = new Error('Something went wrong');
    const classified = classifyError(originalError, 'https://example.com', 30000);

    assert.ok(classified instanceof BrowserError);
    assert.equal(classified.code, ErrorCodes.E_UNKNOWN);
  });

  it('preserves original error as cause', () => {
    const originalError = new Error('Original error message');
    const classified = classifyError(originalError, 'https://example.com', 30000);

    assert.equal(classified.cause, originalError);
  });
});
