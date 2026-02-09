#!/usr/bin/env node
/* eslint-disable */
/**
 * Example demonstrating error handling and retry logic in lean-browser.
 *
 * Run with: node examples/error-handling-demo.js
 */

import { fetchRenderedHtml } from '../src/browser.js';
import { extractAllFromHtml } from '../src/extractor.js';
import { BrowserError, ErrorCodes } from '../src/errors.js';

console.log('=== Error Handling & Retry Demo ===\n');

// Example 1: Successful fetch with retry enabled
async function example1() {
  console.log('1. Fetch with automatic retry (success case):');
  try {
    const result = await fetchRenderedHtml('https://example.com', {
      timeoutMs: 30000,
      enableRetry: true,
      onRetry: (error, attempt) => {
        console.log(`   ⟳ Retry attempt ${attempt}: ${error.name}`);
      },
    });

    console.log(`   ✓ Success! Status: ${result.status}`);
    console.log(`   ✓ Title: ${result.title}`);
  } catch (error) {
    console.error(`   ✗ Failed: ${error.message}`);
  }
  console.log('');
}

// Example 2: Invalid domain (DNS error)
async function example2() {
  console.log('2. Invalid domain (DNS error):');
  try {
    const result = await fetchRenderedHtml('https://this-domain-does-not-exist-12345.com', {
      timeoutMs: 15000,
      enableRetry: true,
      onRetry: (error, attempt) => {
        console.log(`   ⟳ Retry attempt ${attempt}: ${error.name}`);
      },
    });
    console.log(`   ✓ Unexpected success`);
  } catch (error) {
    if (error instanceof BrowserError) {
      console.log(`   ✗ Error Code: ${error.code}`);
      console.log(`   ✗ Error Type: ${error.name}`);
      console.log(`   ✗ Suggestion: ${error.suggestion}`);
    } else {
      console.error(`   ✗ Failed: ${error.message}`);
    }
  }
  console.log('');
}

// Example 3: Extraction with fallback
async function example3() {
  console.log('3. Content extraction with fallback:');

  const minimalHtml = `
    <html>
      <head><title>Minimal Page</title></head>
      <body>
        <div>This is a very simple page with minimal structure.</div>
        <p>It might not have enough content for Readability to extract properly.</p>
        <p>So we use fallback mode to get the text content anyway.</p>
      </body>
    </html>
  `;

  try {
    const result = extractAllFromHtml(minimalHtml, 'https://example.com', {
      enableFallback: true,
    });

    console.log(`   ✓ Extraction succeeded`);
    console.log(`   ✓ Used fallback: ${result.article.fallback}`);
    console.log(`   ✓ Text length: ${result.article.text.length} chars`);
  } catch (error) {
    console.error(`   ✗ Failed: ${error.message}`);
  }
  console.log('');
}

// Example 4: Connection refused (local server not running)
async function example4() {
  console.log('4. Connection refused (server not running):');
  try {
    const result = await fetchRenderedHtml('http://localhost:9999', {
      timeoutMs: 10000,
      enableRetry: true,
      onRetry: (error, attempt) => {
        console.log(`   ⟳ Retry attempt ${attempt}: ${error.name}`);
      },
    });
    console.log(`   ✓ Unexpected success`);
  } catch (error) {
    if (error instanceof BrowserError) {
      console.log(`   ✗ Error Code: ${error.code}`);
      console.log(`   ✗ Error Type: ${error.name}`);
      console.log(`   ✗ Suggestion: ${error.suggestion}`);
    } else {
      console.error(`   ✗ Failed: ${error.message}`);
    }
  }
  console.log('');
}

// Example 5: Handling different error codes
async function example5() {
  console.log('5. Error code handling:');

  const testUrls = [
    { url: 'https://example.com', shouldSucceed: true },
    { url: 'https://invalid-domain-xyz.com', code: ErrorCodes.E_DNS },
    { url: 'http://localhost:9999', code: ErrorCodes.E_CONNECTION_REFUSED },
  ];

  for (const test of testUrls) {
    try {
      await fetchRenderedHtml(test.url, {
        timeoutMs: 5000,
        enableRetry: false, // Disable retry for faster testing
      });

      if (test.shouldSucceed) {
        console.log(`   ✓ ${test.url} - Success`);
      } else {
        console.log(`   ? ${test.url} - Unexpected success`);
      }
    } catch (error) {
      if (error instanceof BrowserError && error.code === test.code) {
        console.log(`   ✓ ${test.url} - Expected error: ${error.code}`);
      } else {
        console.log(`   ✗ ${test.url} - Unexpected error: ${error.code || error.message}`);
      }
    }
  }
  console.log('');
}

// Example 6: Anti-bot detection
async function example6() {
  console.log('6. Anti-bot detection simulation:');

  const cloudflareHtml = `
    <html>
      <head><title>Just a moment...</title></head>
      <body>
        <div class="cf-browser-verification">
          Checking your browser before accessing example.com
        </div>
      </body>
    </html>
  `;

  const recaptchaHtml = `
    <html>
      <body>
        <div class="g-recaptcha" data-sitekey="..."></div>
        <form>
          <button type="submit">Submit</button>
        </form>
      </body>
    </html>
  `;

  // Test Cloudflare detection
  const { detectAntiBot } = await import('../src/errors.js');

  const cf = detectAntiBot(cloudflareHtml, 403, 'https://example.com');
  console.log(`   Cloudflare detected: ${cf ? cf.detectionType : 'No'}`);

  const rc = detectAntiBot(recaptchaHtml, 200, 'https://example.com');
  console.log(`   reCAPTCHA detected: ${rc ? rc.detectionType : 'No'}`);

  console.log('');
}

// Run all examples
async function main() {
  await example1();
  await example2();
  await example3();
  await example4();
  await example5();
  await example6();

  console.log('=== Demo Complete ===');
  console.log('\nKey Takeaways:');
  console.log('• Retry logic automatically handles transient failures');
  console.log('• DNS, network, and timeout errors are retried 2-3 times');
  console.log('• Exponential backoff prevents overwhelming servers');
  console.log('• Helpful error messages with suggestions');
  console.log('• Graceful degradation with fallback extraction');
  console.log('• Anti-bot detection for Cloudflare and reCAPTCHA');
}

main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
