export function normalizeWhitespace(s) {
  return (s ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function toParagraphs(text) {
  const t = normalizeWhitespace(text);
  // Try to preserve paragraphing by splitting on double newlines.
  return t
    .split(/\n\n+/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function cssPath(el) {
  if (!el || el.nodeType !== 1) return null;
  const parts = [];
  let node = el;
  for (let depth = 0; node && node.nodeType === 1 && depth < 7; depth++) {
    const tag = node.tagName.toLowerCase();
    const id = node.getAttribute?.('id');
    if (id) {
      parts.unshift(`#${escapeCssIdent(id)}`);
      break;
    }

    const parent = node.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }

    // nth-of-type within parent
    let index = 1;
    let sib = node;
    while ((sib = sib.previousElementSibling)) {
      if (sib.tagName === node.tagName) index++;
    }
    parts.unshift(`${tag}:nth-of-type(${index})`);
    node = parent;
  }
  return parts.join(' > ');
}

function escapeCssIdent(ident) {
  // minimal escaping for ids
  return String(ident).replace(/([^a-zA-Z0-9_-])/g, (m) => `\\${m}`);
}

export function isProbablyNoiseClass(value) {
  if (!value) return false;
  return /(cookie|consent|banner|modal|subscribe|newsletter|promo|advert|ad\b|ads\b|tracking|paywall|overlay)/i.test(
    String(value),
  );
}

export function safeTruncate(str, maxChars) {
  const s = str ?? '';
  if (!Number.isFinite(maxChars) || maxChars <= 0) return '';
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
}
