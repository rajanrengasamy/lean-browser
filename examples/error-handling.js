#!/usr/bin/env node
/* eslint-disable */
/**
 * Robust error handling example
 *
 * This example demonstrates:
 * - Handling different error types
 * - Retry strategies with exponential backoff
 * - Timeout handling
 * - Graceful degradation
 * - Error logging and reporting
 */

import { fetchRenderedHtml, launchBrowser, navigateAndWait, closeBrowser } from '../src/browser.js';
import { extractAllFromHtml, buildElementMap } from '../src/extractor.js';
import { ActionExecutor, parseActionSpec, ActionError, ElementNotFoundError } from '../src/actions.js';
import { formatText } from '../src/formatter.js';

// Example: Basic error handling
async function basicErrorHandling(url) {
  console.log('🛡️ Basic Error Handling\n');

  try {
    const result = await fetchRenderedHtml(url, { timeoutMs: 30000 });
    console.log(`✅ Success: ${result.title}`);
    return result;
  } catch (err) {
    console.error('❌ Error caught:');
    console.error(`   Type: ${err.name}`);
    console.error(`   Message: ${err.message}`);

    // Handle specific error types
    if (err.name === 'TimeoutError') {
      console.error('   → Page took too long to load');
      console.error('   → Try increasing timeout or check network');
    } else if (err.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      console.error('   → Invalid domain or DNS issue');
    } else if (err.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error('   → Server refused connection');
    }

    throw err;
  }
}

// Example: Retry with exponential backoff
async function fetchWithRetry(url, options = {}) {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, timeoutMs = 30000 } = options;

  console.log(`🔄 Fetching with retry (max ${maxRetries} attempts)\n`);

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: ${url}`);

      const result = await fetchRenderedHtml(url, {
        timeoutMs: timeoutMs + (attempt - 1) * 5000, // Increase timeout each attempt
      });

      console.log(`✅ Success on attempt ${attempt}`);
      return result;
    } catch (err) {
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);

      if (attempt < maxRetries) {
        console.log(`   ⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  console.error(`\n❌ All ${maxRetries} attempts failed`);
  throw lastError;
}

// Example: Circuit breaker pattern
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.failures = 0;
    this.state = 'closed'; // closed, open, half-open
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try to close circuit
      this.state = 'half-open';
    }

    try {
      const result = await fn();

      // Success - reset circuit
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }

      return result;
    } catch (err) {
      this.failures++;

      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        this.nextAttempt = Date.now() + this.resetTimeout;
        console.error(`🔴 Circuit breaker OPENED (${this.failures} failures)`);
      }

      throw err;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
    };
  }
}

async function circuitBreakerExample() {
  console.log('⚡ Circuit Breaker Pattern\n');

  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 5000,
  });

  const urls = [
    'https://httpstat.us/500', // Will fail
    'https://httpstat.us/500',
    'https://httpstat.us/500',
    'https://httpstat.us/500', // Should trigger circuit breaker
    'https://example.com', // Won't be tried (circuit open)
  ];

  for (const url of urls) {
    try {
      console.log(`Fetching: ${url}`);
      console.log(`Circuit state: ${breaker.getState().state}`);

      await breaker.execute(async () => {
        return await fetchRenderedHtml(url, { timeoutMs: 5000 });
      });

      console.log('✅ Success\n');
    } catch (err) {
      console.error(`❌ Failed: ${err.message}\n`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('Final circuit state:', breaker.getState());
}

// Example: Graceful degradation
async function fetchWithFallback(url) {
  console.log('🔄 Graceful Degradation\n');

  // Try with full features
  try {
    console.log('Trying full-featured fetch...');
    const result = await fetchRenderedHtml(url, {
      timeoutMs: 30000,
      headless: true,
    });
    console.log('✅ Full fetch succeeded');
    return result;
  } catch (err) {
    console.error('❌ Full fetch failed:', err.message);
  }

  // Fallback 1: Shorter timeout
  try {
    console.log('Trying with shorter timeout...');
    const result = await fetchRenderedHtml(url, {
      timeoutMs: 10000,
      headless: true,
    });
    console.log('✅ Quick fetch succeeded');
    return result;
  } catch (err) {
    console.error('❌ Quick fetch failed:', err.message);
  }

  // Fallback 2: Use simple HTTP fetch (no JavaScript)
  try {
    console.log('Trying simple HTTP fetch...');
    const response = await fetch(url);
    const html = await response.text();
    console.log('✅ HTTP fetch succeeded (no JS execution)');

    return {
      html,
      finalUrl: response.url,
      title: html.match(/<title>(.*?)<\/title>/i)?.[1] || null,
      status: response.status,
    };
  } catch (err) {
    console.error('❌ HTTP fetch failed:', err.message);
  }

  throw new Error('All fallback methods failed');
}

// Example: Action error handling
async function robustActionExecution(url, actions) {
  console.log('🎯 Robust Action Execution\n');

  const { browser, context, page } = await launchBrowser({ headless: false });

  try {
    // Navigate
    await navigateAndWait(page, url);

    // Extract elements
    const html = await page.content();
    const { elements } = extractAllFromHtml(html, page.url());
    const elementMap = buildElementMap(elements);

    // Parse actions
    const parsedActions = parseActionSpec(actions);
    console.log(`Executing ${parsedActions.length} actions...\n`);

    // Execute with detailed error handling
    const executor = new ActionExecutor(page, elementMap, {
      defaultTimeoutMs: 10000,
    });

    const results = [];

    for (let i = 0; i < parsedActions.length; i++) {
      const action = parsedActions[i];
      console.log(`Action ${i + 1}: ${action.type}${action.elementId ? ' ' + action.elementId : ''}`);

      try {
        const result = await executor.execute(action);
        results.push({ ...result, success: true });
        console.log(`   ✅ Success`);
      } catch (err) {
        results.push({ action, error: err.message, success: false });

        if (err instanceof ElementNotFoundError) {
          console.error(`   ❌ Element not found: ${err.elementId}`);
          console.error(`   Available elements: ${Object.keys(elementMap).join(', ')}`);

          // Try to continue with remaining actions
          console.log('   ⚠️  Skipping and continuing...');
        } else if (err instanceof ActionError) {
          console.error(`   ❌ Action error: ${err.message}`);

          // Decide whether to continue
          if (action.type === 'click' || action.type === 'submit') {
            console.log('   ⚠️  Critical action failed, stopping');
            break;
          } else {
            console.log('   ⚠️  Non-critical action failed, continuing...');
          }
        } else {
          console.error(`   ❌ Unexpected error: ${err.message}`);
          break;
        }
      }

      // Wait between actions
      await page.waitForTimeout(500);
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n📊 Summary:`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${results.length}`);

    return results;
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    throw err;
  } finally {
    await closeBrowser({ browser, context, page });
  }
}

// Example: Timeout handling
async function fetchWithCustomTimeout(url, timeoutMs = 30000) {
  console.log(`⏱️  Fetch with ${timeoutMs}ms timeout\n`);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const result = await Promise.race([fetchRenderedHtml(url, { timeoutMs }), timeoutPromise]);

    console.log('✅ Completed within timeout');
    return result;
  } catch (err) {
    console.error('❌ Timeout exceeded:', err.message);
    throw err;
  }
}

// Example: Error logging and monitoring
class ErrorLogger {
  constructor() {
    this.errors = [];
  }

  log(error, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    };

    this.errors.push(entry);

    // Log to console
    console.error(`[${entry.timestamp}] ${error.name}: ${error.message}`);
    if (context.url) console.error(`   URL: ${context.url}`);
    if (context.action) console.error(`   Action: ${context.action}`);
  }

  getErrors() {
    return this.errors;
  }

  getSummary() {
    const byType = {};
    for (const err of this.errors) {
      byType[err.name] = (byType[err.name] || 0) + 1;
    }
    return {
      total: this.errors.length,
      byType,
      recent: this.errors.slice(-5),
    };
  }

  clear() {
    this.errors = [];
  }
}

async function errorLoggingExample() {
  console.log('📝 Error Logging Example\n');

  const logger = new ErrorLogger();

  const testUrls = [
    { url: 'https://example.com', desc: 'Valid' },
    { url: 'https://httpstat.us/404', desc: '404 Error' },
    { url: 'https://httpstat.us/500', desc: '500 Error' },
    { url: 'https://invalid.domain', desc: 'DNS Error' },
  ];

  for (const test of testUrls) {
    console.log(`Testing: ${test.desc} (${test.url})`);

    try {
      await fetchRenderedHtml(test.url, { timeoutMs: 10000 });
      console.log('   ✅ Success\n');
    } catch (err) {
      logger.log(err, { url: test.url, description: test.desc });
      console.log('');
    }
  }

  // Display summary
  console.log('─'.repeat(60));
  console.log('📊 Error Summary\n');

  const summary = logger.getSummary();
  console.log(`Total errors: ${summary.total}`);
  console.log('\nBy type:');
  for (const [type, count] of Object.entries(summary.byType)) {
    console.log(`   ${type}: ${count}`);
  }
}

// Example: Safe cleanup
async function safeCleanup() {
  console.log('🧹 Safe Cleanup Example\n');

  let browser, context, page;

  try {
    ({ browser, context, page } = await launchBrowser({ headless: true }));
    await navigateAndWait(page, 'https://example.com');

    // Simulate error
    throw new Error('Simulated error');
  } catch (err) {
    console.error('❌ Error occurred:', err.message);
  } finally {
    // Always cleanup, even if error occurred
    console.log('🧹 Cleaning up resources...');

    if (page) {
      await page.close().catch((err) => console.error('Failed to close page:', err.message));
    }
    if (context) {
      await context.close().catch((err) => console.error('Failed to close context:', err.message));
    }
    if (browser) {
      await browser.close().catch((err) => console.error('Failed to close browser:', err.message));
    }

    console.log('✅ Cleanup complete');
  }
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  const example = process.argv[2] || 'basic';
  const url = process.argv[3] || 'https://example.com';

  switch (example) {
    case 'basic':
      basicErrorHandling(url).catch((err) => {
        console.error('\nFatal error:', err.message);
        process.exit(1);
      });
      break;

    case 'retry':
      fetchWithRetry(url).catch((err) => {
        console.error('\nAll retries failed');
        process.exit(1);
      });
      break;

    case 'circuit':
      circuitBreakerExample().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'fallback':
      fetchWithFallback(url).catch((err) => {
        console.error('\nAll fallbacks failed');
        process.exit(1);
      });
      break;

    case 'actions':
      const actions = process.argv[4] || 'click:e1,type:e2:value';
      robustActionExecution(url, actions).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'timeout':
      const timeout = parseInt(process.argv[4]) || 5000;
      fetchWithCustomTimeout(url, timeout).catch((err) => {
        console.error('Timeout error');
        process.exit(1);
      });
      break;

    case 'logging':
      errorLoggingExample().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'cleanup':
      safeCleanup().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    default:
      console.log('Usage: node error-handling.js [example] [url] [options]');
      console.log('\nExamples:');
      console.log('  node error-handling.js basic https://example.com');
      console.log('  node error-handling.js retry https://flaky-site.com');
      console.log('  node error-handling.js circuit');
      console.log('  node error-handling.js fallback https://example.com');
      console.log('  node error-handling.js actions https://example.com "click:e1"');
      console.log('  node error-handling.js timeout https://slow-site.com 10000');
      console.log('  node error-handling.js logging');
      console.log('  node error-handling.js cleanup');
      process.exit(1);
  }
}

export {
  basicErrorHandling,
  fetchWithRetry,
  CircuitBreaker,
  circuitBreakerExample,
  fetchWithFallback,
  robustActionExecution,
  fetchWithCustomTimeout,
  ErrorLogger,
  errorLoggingExample,
  safeCleanup,
};
