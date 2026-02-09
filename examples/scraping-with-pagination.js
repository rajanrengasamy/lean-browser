#!/usr/bin/env node
/* eslint-disable */
/**
 * Multi-page scraping with pagination example
 *
 * This example demonstrates:
 * - Detecting pagination controls
 * - Scraping data across multiple pages
 * - Different pagination patterns (next button, page numbers, infinite scroll)
 * - Deduplication and data aggregation
 */

import { launchBrowser, navigateAndWait, closeBrowser } from '../src/browser.js';
import { extractAllFromHtml, buildElementMap } from '../src/extractor.js';
import { ActionExecutor, parseActionSpec } from '../src/actions.js';
import { formatText } from '../src/formatter.js';
import fs from 'node:fs';

// Example: Scrape Hacker News (simple pagination)
async function scrapeHackerNews(maxPages = 3) {
  console.log('📰 Scraping Hacker News with pagination\n');

  const { browser, context, page } = await launchBrowser({ headless: true });
  const allArticles = [];

  try {
    let currentPage = 1;
    let url = 'https://news.ycombinator.com/';

    while (currentPage <= maxPages) {
      console.log(`📄 Scraping page ${currentPage}/${maxPages}...`);

      // Navigate to current page
      await navigateAndWait(page, url);

      // Extract article data
      const html = await page.content();
      const { article, elements } = extractAllFromHtml(html, page.url());

      // Parse articles from the page
      const articles = await page.evaluate(() => {
        const items = [];
        const rows = document.querySelectorAll('.athing');

        rows.forEach((row) => {
          const titleEl = row.querySelector('.titleline > a');
          const scoreEl = row.nextElementSibling?.querySelector('.score');
          const commentsEl = row.nextElementSibling?.querySelectorAll('a').item(5);

          if (titleEl) {
            items.push({
              title: titleEl.textContent.trim(),
              url: titleEl.href,
              score: scoreEl ? parseInt(scoreEl.textContent) : 0,
              comments: commentsEl ? commentsEl.textContent : '0 comments',
            });
          }
        });

        return items;
      });

      console.log(`   ✅ Found ${articles.length} articles`);
      allArticles.push(...articles);

      // Find "More" link for next page
      const moreLink = elements.find((el) => el.label === 'More' && el.href);

      if (moreLink && currentPage < maxPages) {
        url = new URL(moreLink.href, page.url()).href;
        currentPage++;
        await page.waitForTimeout(1000); // Be polite
      } else {
        console.log('   ℹ️  No more pages found');
        break;
      }
    }

    // Display results
    console.log(`\n📊 Total articles scraped: ${allArticles.length}\n`);
    console.log('Top 10 articles:');
    allArticles.slice(0, 10).forEach((article, i) => {
      console.log(`${i + 1}. ${article.title}`);
      console.log(`   Score: ${article.score} | ${article.comments}`);
      console.log(`   URL: ${article.url}\n`);
    });

    // Save to JSON
    const outputFile = 'hackernews-articles.json';
    fs.writeFileSync(outputFile, JSON.stringify(allArticles, null, 2));
    console.log(`💾 Saved to ${outputFile}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Scrape with numbered pagination
async function scrapeWithPageNumbers(baseUrl, maxPages = 5) {
  console.log('📰 Scraping with page numbers\n');

  const { browser, context, page } = await launchBrowser({ headless: true });
  const allData = [];

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      // Construct page URL (common patterns)
      const url = baseUrl.includes('?') ? `${baseUrl}&page=${pageNum}` : `${baseUrl}?page=${pageNum}`;

      console.log(`📄 Page ${pageNum}: ${url}`);

      await navigateAndWait(page, url);

      // Extract content
      const html = await page.content();
      const { article } = extractAllFromHtml(html, page.url());

      if (article.text.length < 100) {
        console.log('   ⚠️  Page appears empty, stopping');
        break;
      }

      // Store page data
      allData.push({
        page: pageNum,
        url: page.url(),
        title: article.title,
        content: article.text.slice(0, 500), // First 500 chars
      });

      console.log(`   ✅ Scraped: ${article.title}`);

      await page.waitForTimeout(1000); // Rate limiting
    }

    console.log(`\n📊 Scraped ${allData.length} pages`);
    return allData;
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }

  return allData;
}

// Example: Infinite scroll pagination
async function scrapeInfiniteScroll(url, scrollCount = 5) {
  console.log('📰 Scraping with infinite scroll\n');

  const { browser, context, page } = await launchBrowser({ headless: false });
  const allItems = new Set(); // Use Set for deduplication

  try {
    await navigateAndWait(page, url);

    for (let i = 0; i < scrollCount; i++) {
      console.log(`📜 Scroll ${i + 1}/${scrollCount}...`);

      // Get current items before scroll
      const beforeCount = await page.evaluate(() => {
        return document.querySelectorAll('[data-item]').length; // Adjust selector
      });

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for new content to load
      await page.waitForTimeout(2000);

      // Check if new content loaded
      const afterCount = await page.evaluate(() => {
        return document.querySelectorAll('[data-item]').length;
      });

      console.log(`   Items: ${beforeCount} → ${afterCount} (+${afterCount - beforeCount})`);

      if (afterCount === beforeCount) {
        console.log('   ℹ️  No new content loaded, stopping');
        break;
      }

      // Extract items
      const items = await page.evaluate(() => {
        const elements = document.querySelectorAll('[data-item]');
        return Array.from(elements).map((el) => el.textContent.trim());
      });

      items.forEach((item) => allItems.add(item));
    }

    console.log(`\n📊 Total unique items: ${allItems.size}`);
    return Array.from(allItems);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }

  return [];
}

// Example: Smart pagination detection
async function scrapeWithSmartPagination(startUrl, maxPages = 5) {
  console.log('📰 Smart pagination detection\n');

  const { browser, context, page } = await launchBrowser({ headless: true });
  const visited = new Set();
  const allData = [];

  try {
    let currentUrl = startUrl;
    let pageCount = 0;

    while (pageCount < maxPages && !visited.has(currentUrl)) {
      visited.add(currentUrl);
      pageCount++;

      console.log(`📄 Page ${pageCount}: ${currentUrl}`);

      await navigateAndWait(page, currentUrl);

      // Extract content
      const html = await page.content();
      const { article, elements } = extractAllFromHtml(html, page.url());

      allData.push({
        url: currentUrl,
        title: article.title,
        excerpt: article.excerpt,
      });

      console.log(`   ✅ ${article.title}`);

      // Detect next page link using multiple strategies
      let nextUrl = null;

      // Strategy 1: Look for "Next" button/link
      const nextElement = elements.find((el) => {
        const label = (el.label || '').toLowerCase();
        return (
          label === 'next' ||
          label === 'next page' ||
          label.includes('→') ||
          label.includes('›') ||
          label.includes('next')
        );
      });

      if (nextElement?.href) {
        nextUrl = new URL(nextElement.href, currentUrl).href;
      }

      // Strategy 2: Look for numbered pagination (current + 1)
      if (!nextUrl) {
        const currentPageNum = await page.evaluate(() => {
          const activeEl = document.querySelector('.active, .current, [aria-current="page"]');
          return activeEl ? parseInt(activeEl.textContent) : null;
        });

        if (currentPageNum) {
          const nextPageLink = elements.find((el) => el.label === String(currentPageNum + 1));
          if (nextPageLink?.href) {
            nextUrl = new URL(nextPageLink.href, currentUrl).href;
          }
        }
      }

      // Strategy 3: Look for URL pattern (page=N or /page/N)
      if (!nextUrl && currentUrl.match(/[?&]page=(\d+)/)) {
        const match = currentUrl.match(/[?&]page=(\d+)/);
        const nextPage = parseInt(match[1]) + 1;
        nextUrl = currentUrl.replace(/([?&]page=)\d+/, `$1${nextPage}`);
      }

      if (nextUrl && !visited.has(nextUrl)) {
        console.log(`   → Next page: ${nextUrl}`);
        currentUrl = nextUrl;
        await page.waitForTimeout(1000); // Rate limiting
      } else {
        console.log('   ℹ️  No next page found');
        break;
      }
    }

    console.log(`\n📊 Scraped ${allData.length} pages`);
    return allData;
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }

  return allData;
}

// Example: Scrape with "Load More" button
async function scrapeWithLoadMore(url, maxClicks = 5) {
  console.log('📰 Scraping with "Load More" button\n');

  const { browser, context, page } = await launchBrowser({ headless: false });

  try {
    await navigateAndWait(page, url);

    for (let i = 0; i < maxClicks; i++) {
      console.log(`🔄 Click ${i + 1}/${maxClicks}...`);

      // Re-extract elements after each load
      const html = await page.content();
      const { elements } = extractAllFromHtml(html, page.url());

      // Find "Load More" button
      const loadMoreBtn = elements.find((el) => {
        const label = (el.label || '').toLowerCase();
        return label.includes('load more') || label.includes('show more') || label.includes('see more');
      });

      if (!loadMoreBtn) {
        console.log('   ℹ️  No "Load More" button found');
        break;
      }

      // Click the button
      const elementMap = buildElementMap(elements);
      const executor = new ActionExecutor(page, elementMap);

      await executor.execute(parseActionSpec(`click:${loadMoreBtn.id}`)[0]);

      // Wait for content to load
      await page.waitForTimeout(2000);

      console.log('   ✅ Loaded more content');
    }

    // Extract all content
    const html = await page.content();
    const { article } = extractAllFromHtml(html, page.url());

    console.log(`\n📊 Final content length: ${article.text.length} characters`);
    return article;
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Helper: Deduplicate scraped data
function deduplicateData(items, keyField = 'url') {
  const seen = new Set();
  return items.filter((item) => {
    const key = item[keyField];
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Helper: Save scraped data
function saveScrapedData(data, filename = 'scraped-data.json') {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`💾 Saved ${data.length} items to ${filename}`);
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  const example = process.argv[2] || 'hn';

  switch (example) {
    case 'hn':
      scrapeHackerNews(3).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'numbers':
      const url = process.argv[3] || 'https://example.com/articles';
      scrapeWithPageNumbers(url, 3).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'scroll':
      const scrollUrl = process.argv[3] || 'https://example.com/infinite';
      scrapeInfiniteScroll(scrollUrl, 5).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'smart':
      const startUrl = process.argv[3] || 'https://example.com/blog';
      scrapeWithSmartPagination(startUrl, 5).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'loadmore':
      const loadUrl = process.argv[3] || 'https://example.com/feed';
      scrapeWithLoadMore(loadUrl, 5).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    default:
      console.log('Usage: node scraping-with-pagination.js [hn|numbers|scroll|smart|loadmore] [url]');
      console.log('\nExamples:');
      console.log('  node scraping-with-pagination.js hn');
      console.log('  node scraping-with-pagination.js numbers https://example.com/articles');
      console.log('  node scraping-with-pagination.js smart https://example.com/blog');
      process.exit(1);
  }
}

export {
  scrapeHackerNews,
  scrapeWithPageNumbers,
  scrapeInfiniteScroll,
  scrapeWithSmartPagination,
  scrapeWithLoadMore,
  deduplicateData,
  saveScrapedData,
};
