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
  const suffix = '\n\n[lean-browser: truncated to token budget]';

  if (!Number.isFinite(limit) || limit === Infinity) {
    return { text: input, truncated: false, tokens: await estimateTokens(input) };
  }

  const totalTokens = await estimateTokens(input);
  if (totalTokens <= limit) {
    return { text: input, truncated: false, tokens: totalTokens };
  }

  async function findBestFit(includeSuffix) {
    let lo = 0;
    let hi = input.length;
    let best = -1;
    let bestTokens = Infinity;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = includeSuffix ? input.slice(0, mid).trimEnd() + suffix : input.slice(0, mid);
      const candidateTokens = await estimateTokens(candidate);

      if (candidateTokens <= limit) {
        best = mid;
        bestTokens = candidateTokens;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best < 0) {
      return null;
    }

    const bestText = includeSuffix ? input.slice(0, best).trimEnd() + suffix : input.slice(0, best);
    return { text: bestText, tokens: bestTokens, truncated: true };
  }

  // Prefer including a truncation marker, but fall back to raw truncation
  // when the budget is too small to fit the marker itself.
  return (await findBestFit(true)) ?? (await findBestFit(false)) ?? { text: '', truncated: true, tokens: 0 };
}
