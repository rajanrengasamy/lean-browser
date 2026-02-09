import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { cssPath, isProbablyNoiseClass, normalizeWhitespace, safeTruncate } from './utils.js';

function removeAll(doc, selector) {
  doc.querySelectorAll(selector).forEach((n) => n.remove());
}

function removeComments(doc) {
  const walker = doc.createTreeWalker(doc, 128 /* NodeFilter.SHOW_COMMENT */);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const c of comments) c.parentNode?.removeChild(c);
}

export function buildDom(html, url) {
  return new JSDOM(html ?? '', { url: url ?? 'https://example.com/' });
}

export function pruneDocument(doc) {
  // Strip heavy / noisy tags
  removeAll(doc, 'script, style, svg, iframe, noscript, template');
  removeAll(doc, 'link[rel="preload"], link[rel="preconnect"], link[rel="dns-prefetch"]');
  removeAll(doc, 'meta[http-equiv="refresh"]');

  // Remove common boilerplate containers
  removeAll(doc, 'nav, footer, aside, header');

  // Remove nodes by class/id heuristics
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    const id = el.getAttribute('id');
    const cls = el.getAttribute('class');
    if (isProbablyNoiseClass(id) || isProbablyNoiseClass(cls)) {
      el.remove();
    }
  }

  removeComments(doc);
}

export function extractArticleFromDom(dom) {
  const doc = dom.window.document;
  pruneDocument(doc);

  const reader = new Readability(doc);
  const article = reader.parse();

  if (!article) {
    // Fallback: plain body text.
    const fallbackText = normalizeWhitespace(doc.body?.textContent ?? '');
    return {
      title: normalizeWhitespace(doc.title ?? ''),
      byline: null,
      excerpt: safeTruncate(fallbackText, 280),
      text: fallbackText,
    };
  }

  return {
    title: article.title ?? normalizeWhitespace(doc.title ?? ''),
    byline: article.byline ?? null,
    excerpt: article.excerpt ?? null,
    text: normalizeWhitespace(article.textContent ?? ''),
  };
}

function labelFromDocument(doc, el) {
  const id = el.getAttribute?.('id');
  if (id) {
    const lbl = doc.querySelector(`label[for="${cssEscape(id)}"]`);
    const t = normalizeWhitespace(lbl?.textContent ?? '');
    if (t) return safeTruncate(t, 160);
  }
  const labelledBy = el.getAttribute?.('aria-labelledby');
  if (labelledBy) {
    const ref = doc.getElementById(labelledBy);
    const t = normalizeWhitespace(ref?.textContent ?? '');
    if (t) return safeTruncate(t, 160);
  }
  return null;
}

function elementLabel(doc, el) {
  const fromDoc = labelFromDocument(doc, el);
  if (fromDoc) return fromDoc;

  const attrs = ['aria-label', 'title', 'placeholder', 'name', 'id', 'value'];
  for (const a of attrs) {
    const v = el.getAttribute?.(a);
    if (v && String(v).trim()) return safeTruncate(String(v).trim(), 160);
  }
  const txt = normalizeWhitespace(el.textContent ?? '');
  if (txt) return safeTruncate(txt, 160);
  return null;
}

function isHiddenLike(el) {
  const type = (el.getAttribute?.('type') ?? '').toLowerCase();
  if (type === 'hidden') return true;
  const style = (el.getAttribute?.('style') ?? '').toLowerCase();
  if (style.includes('display:none') || style.includes('visibility:hidden')) return true;
  if (el.getAttribute?.('hidden') != null) return true;
  if (el.getAttribute?.('aria-hidden') === 'true') return true;
  return false;
}

function cssEscape(s) {
  return String(s).replace(/"/g, '\\"');
}

function isUsefulLink(el) {
  const href = (el.getAttribute?.('href') ?? '').trim();
  if (!href) return false;
  if (href.startsWith('#')) return false;
  if (/^javascript:/i.test(href)) return false;
  const label = normalizeWhitespace(el.textContent ?? '').toLowerCase();
  if (label.startsWith('skip to')) return false;
  return true;
}

export function extractInteractiveElements(dom, { limit = 60 } = {}) {
  const doc = dom.window.document;

  // Prioritize form controls and buttons over generic links.
  const primary = Array.from(doc.querySelectorAll('input, textarea, select, button, [role="button"], [onclick]'));
  const links = Array.from(doc.querySelectorAll('a[href]')).filter(isUsefulLink);

  const nodes = [...primary, ...links];
  const out = [];
  const seen = new Set();

  for (const el of nodes) {
    if (out.length >= limit) break;
    if (isHiddenLike(el)) continue;

    const selector = cssPath(el);
    if (selector && seen.has(selector)) continue;
    if (selector) seen.add(selector);

    const tag = el.tagName.toLowerCase();
    const href = tag === 'a' ? el.getAttribute('href') : null;
    const type = tag === 'input' ? (el.getAttribute('type') ?? 'text') : null;

    out.push({
      id: `e${out.length + 1}`,
      tag,
      type,
      label: elementLabel(doc, el),
      href,
      name: el.getAttribute?.('name') ?? null,
      selector,
    });
  }

  return out;
}

export function buildElementMap(elements) {
  const map = {};
  for (const el of elements ?? []) {
    if (el.id && el.selector) {
      map[el.id] = el.selector;
    }
  }
  return map;
}

export function extractAllFromHtml(html, url) {
  const dom = buildDom(html, url);
  const article = extractArticleFromDom(dom);
  const elements = extractInteractiveElements(dom);
  return { article, elements };
}
