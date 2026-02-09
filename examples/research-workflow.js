#!/usr/bin/env node
// Multi-page research workflow using lean-browser as a library
import { fetchRenderedHtml } from '../src/browser.js';
import { extractAllFromHtml } from '../src/extractor.js';
import { formatText } from '../src/formatter.js';

const urls = ['https://example.com', 'https://httpbin.org/html'];

for (const url of urls) {
  console.log(`\n--- Fetching: ${url} ---\n`);

  const fetched = await fetchRenderedHtml(url, { timeoutMs: 30000 });
  const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl ?? url);

  // Get a text summary
  const textOut = await formatText({ url, finalUrl: fetched.finalUrl, status: fetched.status }, extracted, {
    maxTokens: 300,
  });

  console.log(textOut.text);
  console.log(`\nTokens used: ${textOut.tokens}, Truncated: ${textOut.truncated}`);
}
