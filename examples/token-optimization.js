#!/usr/bin/env node
// Compare token budgets to see how lean-browser optimizes output
import { fetchRenderedHtml } from '../src/browser.js';
import { extractAllFromHtml } from '../src/extractor.js';
import { formatText } from '../src/formatter.js';

const url = 'https://example.com';
const budgets = [100, 300, 500, 1000, 2000];

const fetched = await fetchRenderedHtml(url, { timeoutMs: 30000 });
const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl ?? url);
const meta = { url, finalUrl: fetched.finalUrl, status: fetched.status };

console.log('Token Budget Comparison\n');
console.log('Budget | Tokens | Truncated | Text Length');
console.log('-------|--------|-----------|------------');

for (const budget of budgets) {
  const out = await formatText(meta, extracted, { maxTokens: budget });
  console.log(
    `${String(budget).padStart(6)} | ${String(out.tokens).padStart(6)} | ${String(out.truncated).padStart(9)} | ${out.text.length}`,
  );
}
