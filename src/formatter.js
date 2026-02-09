import { estimateTokens, truncateToTokenLimit } from './tokenizer.js';
import { toParagraphs, safeTruncate } from './utils.js';

const TRUNCATION_MARKER = '\n\n[lean-browser: truncated to token budget]';

export async function formatText({ url, finalUrl, status }, { article }, { maxTokens } = {}) {
  const lines = [];
  const t = article?.title ? `# ${article.title}` : '# (untitled)';
  lines.push(t);
  lines.push('');
  lines.push(`Source: ${finalUrl ?? url}`);
  if (status) lines.push(`HTTP: ${status}`);
  if (article?.byline) lines.push(`By: ${article.byline}`);
  if (article?.excerpt) lines.push(`Excerpt: ${safeTruncate(article.excerpt, 240)}`);
  lines.push('');
  lines.push(article?.text ?? '');

  const out = lines.join('\n');
  return truncateToTokenLimit(out, maxTokens);
}

function buildBlocksFromArticle(article) {
  const paras = toParagraphs(article?.text ?? '');
  return paras.map((p) => ({ type: 'p', text: p }));
}

async function fitObjectToBudget(
  obj,
  maxTokens,
  { elementsKey = null, blocksKey = null, textPath = ['article', 'text'] } = {},
) {
  if (!Number.isFinite(maxTokens)) {
    return { obj, truncated: false, tokens: await estimateTokens(JSON.stringify(obj)) };
  }

  // Helper to get/set deep path
  const getAt = (o, path) => path.reduce((acc, k) => (acc ? acc[k] : undefined), o);
  const setAt = (o, path, value) => {
    let cur = o;
    for (let i = 0; i < path.length - 1; i++) {
      cur = cur[path[i]];
    }
    cur[path[path.length - 1]] = value;
  };

  let truncated = false;

  // First: reduce elements/blocks lists from the end.
  while (true) {
    const json = JSON.stringify(obj, null, 2);
    const tokens = await estimateTokens(json);
    if (tokens <= maxTokens) return { obj, truncated, tokens };

    const elements = elementsKey ? obj[elementsKey] : null;
    const blocks = blocksKey ? getAt(obj, blocksKey) : null;

    if (Array.isArray(elements) && elements.length > 0) {
      elements.pop();
      truncated = true;
      continue;
    }

    if (Array.isArray(blocks) && blocks.length > 1) {
      blocks.pop();
      truncated = true;
      continue;
    }

    break;
  }

  // Then: binary search text field length.
  const originalText = String(getAt(obj, textPath) ?? '');
  async function findFittingText(includeMarker) {
    let lo = 0;
    let hi = originalText.length;
    let bestText = null;
    let bestTokens = Infinity;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidateText = includeMarker
        ? originalText.slice(0, mid).trimEnd() + TRUNCATION_MARKER
        : originalText.slice(0, mid);
      setAt(obj, textPath, candidateText);

      const tokens = await estimateTokens(JSON.stringify(obj, null, 2));
      if (tokens <= maxTokens) {
        bestText = candidateText;
        bestTokens = tokens;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (bestText == null) {
      return null;
    }

    return { text: bestText, tokens: bestTokens };
  }

  const withMarker = await findFittingText(true);
  if (withMarker) {
    setAt(obj, textPath, withMarker.text);
    return { obj, truncated: true, tokens: withMarker.tokens };
  }

  const withoutMarker = await findFittingText(false);
  if (withoutMarker) {
    setAt(obj, textPath, withoutMarker.text);
    return { obj, truncated: true, tokens: withoutMarker.tokens };
  }

  // Budget may be too small to fit marker or any text body.
  setAt(obj, textPath, '');
  truncated = true;

  const finalTokens = await estimateTokens(JSON.stringify(obj, null, 2));
  return { obj, truncated, tokens: finalTokens };
}

async function finalizeJsonObject(obj, { truncated, maxTokens, fallbackCandidates = [] }) {
  obj.truncated = truncated;
  obj.tokens = 0;

  let stableText = '';
  let stableTokens = 0;

  // Stabilize self-referential "tokens" field.
  for (let i = 0; i < 4; i++) {
    stableText = JSON.stringify(obj, null, 2);
    stableTokens = await estimateTokens(stableText);
    if (obj.tokens === stableTokens) {
      break;
    }
    obj.tokens = stableTokens;
  }

  if (!Number.isFinite(maxTokens) || stableTokens <= maxTokens) {
    return { text: stableText, tokens: stableTokens, truncated: Boolean(obj.truncated) };
  }

  let bestFallback = { text: stableText, tokens: stableTokens, truncated: true };
  for (const candidate of fallbackCandidates) {
    const candidateText = JSON.stringify(candidate, null, 2);
    const candidateTokens = await estimateTokens(candidateText);
    const result = { text: candidateText, tokens: candidateTokens, truncated: true };

    if (candidateTokens <= maxTokens) {
      return result;
    }
    if (candidateTokens < bestFallback.tokens) {
      bestFallback = result;
    }
  }

  return bestFallback;
}

export async function formatJson({ url, finalUrl, status, fetchedTitle }, { article }, { maxTokens } = {}) {
  const blocks = buildBlocksFromArticle(article);
  const obj = {
    url: finalUrl ?? url,
    status: status ?? null,
    fetchedTitle: fetchedTitle ?? null,
    article: {
      title: article?.title ?? null,
      byline: article?.byline ?? null,
      excerpt: article?.excerpt ?? null,
      text: article?.text ?? '',
      blocks,
    },
  };

  const fit = await fitObjectToBudget(obj, maxTokens, {
    blocksKey: ['article', 'blocks'],
    textPath: ['article', 'text'],
  });

  const finalized = await finalizeJsonObject(fit.obj, {
    truncated: fit.truncated,
    maxTokens,
    fallbackCandidates: [{ url: finalUrl ?? url, truncated: true }, { truncated: true }, {}],
  });

  return finalized;
}

export async function formatInteractive(
  { url, finalUrl, status, fetchedTitle },
  { article, elements },
  { maxTokens } = {},
) {
  const obj = {
    url: finalUrl ?? url,
    status: status ?? null,
    fetchedTitle: fetchedTitle ?? null,
    view: {
      title: article?.title ?? null,
      excerpt: article?.excerpt ?? safeTruncate(article?.text ?? '', 280),
      text: article?.text ?? '',
    },
    elements: (elements ?? []).map((e) => ({
      id: e.id,
      tag: e.tag,
      type: e.type,
      label: e.label,
      href: e.href,
      name: e.name,
      selector: e.selector,
    })),
  };

  const fit = await fitObjectToBudget(obj, maxTokens, {
    elementsKey: 'elements',
    textPath: ['view', 'text'],
  });

  const finalized = await finalizeJsonObject(fit.obj, {
    truncated: fit.truncated,
    maxTokens,
    fallbackCandidates: [{ url: finalUrl ?? url, truncated: true }, { truncated: true }, {}],
  });

  return finalized;
}
