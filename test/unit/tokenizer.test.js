import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, truncateToTokenLimit } from '../../src/tokenizer.js';

describe('estimateTokens', () => {
  it('returns a positive number for non-empty text', async () => {
    const tokens = await estimateTokens('Hello, world!');
    assert.ok(tokens > 0, `Expected positive tokens, got ${tokens}`);
  });

  it('returns 0 for empty string', async () => {
    const tokens = await estimateTokens('');
    assert.equal(tokens, 0);
  });

  it('handles null', async () => {
    const tokens = await estimateTokens(null);
    assert.equal(tokens, 0);
  });

  it('longer text produces more tokens', async () => {
    const short = await estimateTokens('Hello');
    const long = await estimateTokens('Hello, this is a much longer piece of text that should produce more tokens.');
    assert.ok(long > short);
  });
});

describe('truncateToTokenLimit', () => {
  it('returns full text when under limit', async () => {
    const result = await truncateToTokenLimit('Hello, world!', 1000);
    assert.equal(result.truncated, false);
    assert.equal(result.text, 'Hello, world!');
  });

  it('truncates when over limit', async () => {
    const longText = 'word '.repeat(500);
    const result = await truncateToTokenLimit(longText, 50);
    assert.equal(result.truncated, true);
    assert.ok(result.tokens <= 50);
  });

  it('stays within strict tiny budgets', async () => {
    const result = await truncateToTokenLimit('A very long string that must be cut aggressively.', 1);
    assert.equal(result.truncated, true);
    assert.ok(result.tokens <= 1);
  });

  it('returns full text when limit is Infinity', async () => {
    const result = await truncateToTokenLimit('Hello', Infinity);
    assert.equal(result.truncated, false);
    assert.equal(result.text, 'Hello');
  });

  it('returns full text when limit is undefined', async () => {
    const result = await truncateToTokenLimit('Hello');
    assert.equal(result.truncated, false);
    assert.equal(result.text, 'Hello');
  });
});
