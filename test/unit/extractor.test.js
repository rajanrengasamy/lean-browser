import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildDom,
  extractArticleFromDom,
  extractInteractiveElements,
  buildElementMap,
  extractAllFromHtml,
} from '../../src/extractor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('extractArticleFromDom', () => {
  it('extracts title and text from simple article', () => {
    const html = loadFixture('simple-article.html');
    const dom = buildDom(html, 'https://example.com/article');
    const article = extractArticleFromDom(dom);

    assert.ok(article.title.length > 0);
    assert.ok(article.text.includes('Token budgets'));
  });

  it('falls back to body text when Readability fails', () => {
    const html = '<html><body><p>Just some text.</p></body></html>';
    const dom = buildDom(html, 'https://example.com');
    const article = extractArticleFromDom(dom);

    assert.ok(article.text.includes('Just some text'));
  });
});

describe('extractInteractiveElements', () => {
  it('extracts form elements from login page', () => {
    const html = loadFixture('login-form.html');
    const dom = buildDom(html, 'https://example.com/login');
    const elements = extractInteractiveElements(dom);

    assert.ok(elements.length >= 4, `Expected at least 4 elements, got ${elements.length}`);

    const ids = elements.map((e) => e.id);
    assert.ok(ids.includes('e1'));
    assert.ok(ids.includes('e2'));

    const tags = elements.map((e) => e.tag);
    assert.ok(tags.includes('input'));
    assert.ok(tags.includes('button'));
  });

  it('assigns sequential IDs starting at e1', () => {
    const html = loadFixture('login-form.html');
    const dom = buildDom(html, 'https://example.com/login');
    const elements = extractInteractiveElements(dom);

    for (let i = 0; i < elements.length; i++) {
      assert.equal(elements[i].id, `e${i + 1}`);
    }
  });

  it('filters hidden elements', () => {
    const html = '<html><body><input type="hidden" name="csrf"><input type="text" name="query"></body></html>';
    const dom = buildDom(html, 'https://example.com');
    const elements = extractInteractiveElements(dom);

    assert.equal(elements.length, 1);
    assert.equal(elements[0].name, 'query');
  });

  it('respects limit option', () => {
    const html = loadFixture('login-form.html');
    const dom = buildDom(html, 'https://example.com/login');
    const elements = extractInteractiveElements(dom, { limit: 2 });

    assert.equal(elements.length, 2);
  });
});

describe('buildElementMap', () => {
  it('maps element IDs to selectors', () => {
    const elements = [
      { id: 'e1', selector: '#username' },
      { id: 'e2', selector: '#password' },
    ];
    const map = buildElementMap(elements);

    assert.equal(map.e1, '#username');
    assert.equal(map.e2, '#password');
  });

  it('skips elements without selector', () => {
    const elements = [
      { id: 'e1', selector: '#username' },
      { id: 'e2', selector: null },
    ];
    const map = buildElementMap(elements);

    assert.equal(Object.keys(map).length, 1);
  });

  it('handles null/empty input', () => {
    assert.deepEqual(buildElementMap(null), {});
    assert.deepEqual(buildElementMap([]), {});
  });
});

describe('extractAllFromHtml', () => {
  it('returns article and elements', () => {
    const html = loadFixture('login-form.html');
    const result = extractAllFromHtml(html, 'https://example.com/login');

    assert.ok(result.article);
    assert.ok(result.elements);
    assert.ok(Array.isArray(result.elements));
  });
});
