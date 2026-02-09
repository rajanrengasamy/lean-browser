let _encoder = null;

async function loadEncoder() {
  if (_encoder) return _encoder;
  try {
    const mod = await import('gpt-3-encoder');
    // gpt-3-encoder is CJS; ESM import usually lands in `default`.
    const api = mod?.default ?? mod;
    if (typeof api?.encode === 'function') {
      _encoder = api;
      return _encoder;
    }
  } catch {
    // ignore
  }
  _encoder = { encode: (s) => approximateEncode(s) };
  return _encoder;
}

function approximateEncode(text) {
  // Very rough fallback: 1 token ~= 4 chars in English.
  // Return an array-like so `.length` behaves.
  const n = Math.max(0, Math.ceil((text ?? '').length / 4));
  return new Array(n);
}

export async function estimateTokens(text) {
  const enc = await loadEncoder();
  try {
    return enc.encode(text ?? '').length;
  } catch {
    return approximateEncode(text ?? '').length;
  }
}

export async function truncateToTokenLimit(text, maxTokens) {
  const input = text ?? '';
  const limit = Number.isFinite(maxTokens) ? Math.max(0, Math.floor(maxTokens)) : Infinity;

  if (!Number.isFinite(limit) || limit === Infinity) {
    return { text: input, truncated: false, tokens: await estimateTokens(input) };
  }

  const totalTokens = await estimateTokens(input);
  if (totalTokens <= limit) {
    return { text: input, truncated: false, tokens: totalTokens };
  }

  // Binary search the largest substring that fits.
  let lo = 0;
  let hi = input.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = input.slice(0, mid);
    const t = await estimateTokens(candidate);
    if (t <= limit) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // Try to avoid cutting mid-word if possible.
  let cut = best;
  const nextSpace = input.lastIndexOf(' ', cut);
  if (nextSpace > 0 && cut - nextSpace < 50) cut = nextSpace;

  const truncatedText = input.slice(0, cut).trimEnd() + '\n\n[lean-browser: truncated to token budget]';
  return { text: truncatedText, truncated: true, tokens: await estimateTokens(truncatedText) };
}
