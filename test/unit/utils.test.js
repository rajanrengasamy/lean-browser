import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhitespace, toParagraphs, isProbablyNoiseClass, safeTruncate } from '../../src/utils.js';

describe('normalizeWhitespace', () => {
  it('collapses multiple spaces', () => {
    assert.equal(normalizeWhitespace('hello   world'), 'hello world');
  });

  it('normalizes CRLF to LF', () => {
    assert.equal(normalizeWhitespace('line1\r\nline2'), 'line1\nline2');
  });

  it('collapses 3+ newlines to 2', () => {
    assert.equal(normalizeWhitespace('a\n\n\n\nb'), 'a\n\nb');
  });

  it('trims leading and trailing whitespace', () => {
    assert.equal(normalizeWhitespace('  hello  '), 'hello');
  });

  it('handles null/undefined', () => {
    assert.equal(normalizeWhitespace(null), '');
    assert.equal(normalizeWhitespace(undefined), '');
  });
});

describe('toParagraphs', () => {
  it('splits on double newlines', () => {
    const result = toParagraphs('para1\n\npara2\n\npara3');
    assert.deepEqual(result, ['para1', 'para2', 'para3']);
  });

  it('filters empty paragraphs', () => {
    const result = toParagraphs('para1\n\n\n\n\n\npara2');
    assert.deepEqual(result, ['para1', 'para2']);
  });

  it('handles empty string', () => {
    assert.deepEqual(toParagraphs(''), []);
  });
});

describe('isProbablyNoiseClass', () => {
  it('detects cookie-related classes', () => {
    assert.equal(isProbablyNoiseClass('cookie-banner'), true);
    assert.equal(isProbablyNoiseClass('CookieConsent'), true);
  });

  it('detects ad-related classes', () => {
    assert.equal(isProbablyNoiseClass('ad-container'), true);
    assert.equal(isProbablyNoiseClass('advert-block'), true);
  });

  it('detects modal/overlay classes', () => {
    assert.equal(isProbablyNoiseClass('subscribe-modal'), true);
    assert.equal(isProbablyNoiseClass('overlay-popup'), true);
  });

  it('returns false for normal classes', () => {
    assert.equal(isProbablyNoiseClass('main-content'), false);
    assert.equal(isProbablyNoiseClass('article-body'), false);
  });

  it('handles null/undefined', () => {
    assert.equal(isProbablyNoiseClass(null), false);
    assert.equal(isProbablyNoiseClass(undefined), false);
  });
});

describe('safeTruncate', () => {
  it('returns full string if under limit', () => {
    assert.equal(safeTruncate('hello', 10), 'hello');
  });

  it('truncates with ellipsis', () => {
    const result = safeTruncate('hello world', 6);
    assert.equal(result, 'hello\u2026');
  });

  it('handles null', () => {
    assert.equal(safeTruncate(null, 10), '');
  });

  it('returns empty for zero maxChars', () => {
    assert.equal(safeTruncate('hello', 0), '');
  });
});
