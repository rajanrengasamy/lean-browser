import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatText, formatJson, formatInteractive } from '../../src/formatter.js';

const mockArticle = {
  title: 'Test Article',
  byline: 'Test Author',
  excerpt: 'A short excerpt.',
  text: 'This is the full article text. It contains multiple sentences and important information.',
};

const mockElements = [
  { id: 'e1', tag: 'input', type: 'text', label: 'Search', href: null, name: 'q', selector: '#search' },
  { id: 'e2', tag: 'button', type: null, label: 'Submit', href: null, name: null, selector: '#submit' },
];

const meta = { url: 'https://example.com', finalUrl: 'https://example.com/', status: 200, fetchedTitle: 'Test' };

describe('formatText', () => {
  it('includes title and source', async () => {
    const result = await formatText(meta, { article: mockArticle }, { maxTokens: 1000 });
    assert.ok(result.text.includes('# Test Article'));
    assert.ok(result.text.includes('Source: https://example.com/'));
  });

  it('includes article text', async () => {
    const result = await formatText(meta, { article: mockArticle }, { maxTokens: 1000 });
    assert.ok(result.text.includes('full article text'));
  });

  it('truncates when budget is tiny', async () => {
    const result = await formatText(meta, { article: mockArticle }, { maxTokens: 10 });
    assert.equal(result.truncated, true);
  });

  it('returns truncated=false when fits', async () => {
    const result = await formatText(meta, { article: mockArticle }, { maxTokens: 5000 });
    assert.equal(result.truncated, false);
  });
});

describe('formatJson', () => {
  it('returns valid JSON', async () => {
    const result = await formatJson(meta, { article: mockArticle }, { maxTokens: 5000 });
    const parsed = JSON.parse(result.text);
    assert.equal(parsed.url, 'https://example.com/');
    assert.equal(parsed.article.title, 'Test Article');
  });

  it('includes blocks array', async () => {
    const result = await formatJson(meta, { article: mockArticle }, { maxTokens: 5000 });
    const parsed = JSON.parse(result.text);
    assert.ok(Array.isArray(parsed.article.blocks));
  });

  it('respects token budget', async () => {
    const result = await formatJson(meta, { article: mockArticle }, { maxTokens: 30 });
    assert.equal(result.truncated, true);
    assert.ok(result.tokens <= 30);
  });
});

describe('formatInteractive', () => {
  it('includes elements array', async () => {
    const result = await formatInteractive(meta, { article: mockArticle, elements: mockElements }, { maxTokens: 5000 });
    const parsed = JSON.parse(result.text);
    assert.ok(Array.isArray(parsed.elements));
    assert.equal(parsed.elements.length, 2);
  });

  it('includes view with title and text', async () => {
    const result = await formatInteractive(meta, { article: mockArticle, elements: mockElements }, { maxTokens: 5000 });
    const parsed = JSON.parse(result.text);
    assert.equal(parsed.view.title, 'Test Article');
    assert.ok(parsed.view.text.length > 0);
  });

  it('truncates elements when budget is tight', async () => {
    const result = await formatInteractive(meta, { article: mockArticle, elements: mockElements }, { maxTokens: 30 });
    assert.equal(result.truncated, true);
    assert.ok(result.tokens <= 30);
  });
});
