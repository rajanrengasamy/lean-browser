import { fetchRenderedHtml, takeScreenshot } from '../browser.js';
import { extractAllFromHtml } from '../extractor.js';
import { formatText, formatJson, formatInteractive } from '../formatter.js';

async function fetchAndExtract(url, { timeout = 45000 } = {}) {
  const fetched = await fetchRenderedHtml(url, { timeoutMs: timeout });
  const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl ?? url);
  return { fetched, extracted };
}

export async function handleFetchPageText({ url, maxTokens = 1200, timeout = 45000 }) {
  const { fetched, extracted } = await fetchAndExtract(url, { timeout });

  const out = await formatText({ url, finalUrl: fetched.finalUrl, status: fetched.status }, extracted, { maxTokens });

  return {
    content: [{ type: 'text', text: out.text }],
  };
}

export async function handleFetchPageJson({ url, maxTokens = 1200, timeout = 45000 }) {
  const { fetched, extracted } = await fetchAndExtract(url, { timeout });

  const out = await formatJson(
    { url, finalUrl: fetched.finalUrl, status: fetched.status, fetchedTitle: fetched.title },
    extracted,
    { maxTokens },
  );

  return {
    content: [{ type: 'text', text: out.text }],
  };
}

export async function handleFetchPageInteractive({ url, maxTokens = 1200, timeout = 45000 }) {
  const { fetched, extracted } = await fetchAndExtract(url, { timeout });

  const out = await formatInteractive(
    { url, finalUrl: fetched.finalUrl, status: fetched.status, fetchedTitle: fetched.title },
    extracted,
    { maxTokens },
  );

  return {
    content: [{ type: 'text', text: out.text }],
  };
}

export async function handleFetchPageScreenshot({ url, fullPage = false, timeout = 45000 }) {
  const result = await takeScreenshot(url, {
    timeoutMs: timeout,
    fullPage,
  });

  return {
    content: [
      {
        type: 'image',
        data: result.screenshot,
        mimeType: 'image/png',
      },
    ],
  };
}
