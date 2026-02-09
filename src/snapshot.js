import { extractAllFromHtml } from './extractor.js';
import { formatInteractive, formatJson, formatText } from './formatter.js';

export async function captureSnapshot(page, { mode = 'interactive', maxTokens = 1200 } = {}) {
  const html = await page.content();
  const url = page.url();
  const title = await page.title().catch(() => undefined);

  const extracted = extractAllFromHtml(html, url);
  const meta = { url, finalUrl: url, status: 200, fetchedTitle: title };

  if (mode === 'text') {
    return formatText(meta, extracted, { maxTokens });
  } else if (mode === 'json') {
    return formatJson(meta, extracted, { maxTokens });
  } else {
    return formatInteractive(meta, extracted, { maxTokens });
  }
}
