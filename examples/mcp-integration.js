#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) integration examples
 *
 * This example demonstrates:
 * - Using lean-browser MCP tools programmatically
 * - Simulating MCP client requests
 * - Testing MCP tool responses
 * - Building custom MCP workflows
 */

import { fetchRenderedHtml } from '../src/browser.js';
import { extractAllFromHtml } from '../src/extractor.js';
import { formatText, formatJson, formatInteractive } from '../src/formatter.js';

// Simulate MCP tool: fetch_page_text
async function fetchPageText(args) {
  const { url, maxTokens = 1200, timeout = 45000 } = args;

  console.log(`🔧 MCP Tool: fetch_page_text`);
  console.log(`   URL: ${url}`);
  console.log(`   Max Tokens: ${maxTokens}`);
  console.log(`   Timeout: ${timeout}ms\n`);

  try {
    // Step 1: Fetch HTML
    const fetched = await fetchRenderedHtml(url, { timeoutMs: timeout });

    // Step 2: Extract content
    const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl);

    // Step 3: Format as text
    const output = await formatText(
      {
        url,
        finalUrl: fetched.finalUrl,
        status: fetched.status,
        fetchedTitle: fetched.title,
      },
      extracted,
      { maxTokens },
    );

    console.log('✅ Success\n');
    console.log('─'.repeat(60));
    console.log(output.text);
    console.log('─'.repeat(60));
    console.log(`\n📊 Metadata:`);
    console.log(`   Tokens: ${output.tokens}`);
    console.log(`   Truncated: ${output.truncated}`);

    return {
      content: [
        {
          type: 'text',
          text: output.text,
        },
      ],
      isError: false,
    };
  } catch (err) {
    console.error('❌ Error:', err.message);
    return {
      content: [
        {
          type: 'text',
          text: `Error fetching page: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
}

// Simulate MCP tool: fetch_page_json
async function fetchPageJson(args) {
  const { url, maxTokens = 1200, timeout = 45000 } = args;

  console.log(`🔧 MCP Tool: fetch_page_json`);
  console.log(`   URL: ${url}`);
  console.log(`   Max Tokens: ${maxTokens}\n`);

  try {
    const fetched = await fetchRenderedHtml(url, { timeoutMs: timeout });
    const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl);

    const output = await formatJson(
      {
        url,
        finalUrl: fetched.finalUrl,
        status: fetched.status,
        fetchedTitle: fetched.title,
      },
      extracted,
      { maxTokens },
    );

    console.log('✅ Success\n');
    console.log('─'.repeat(60));
    console.log(output.text);
    console.log('─'.repeat(60));
    console.log(`\n📊 Metadata:`);
    console.log(`   Tokens: ${output.tokens}`);
    console.log(`   Truncated: ${output.truncated}`);

    return {
      content: [
        {
          type: 'text',
          text: output.text,
        },
      ],
      isError: false,
    };
  } catch (err) {
    console.error('❌ Error:', err.message);
    return {
      content: [
        {
          type: 'text',
          text: `Error fetching page: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
}

// Simulate MCP tool: fetch_page_interactive
async function fetchPageInteractive(args) {
  const { url, maxTokens = 1200, timeout = 45000 } = args;

  console.log(`🔧 MCP Tool: fetch_page_interactive`);
  console.log(`   URL: ${url}`);
  console.log(`   Max Tokens: ${maxTokens}\n`);

  try {
    const fetched = await fetchRenderedHtml(url, { timeoutMs: timeout });
    const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl);

    const output = await formatInteractive(
      {
        url,
        finalUrl: fetched.finalUrl,
        status: fetched.status,
        fetchedTitle: fetched.title,
      },
      extracted,
      { maxTokens },
    );

    console.log('✅ Success\n');
    console.log('─'.repeat(60));
    console.log(output.text);
    console.log('─'.repeat(60));
    console.log(`\n📊 Metadata:`);
    console.log(`   Tokens: ${output.tokens}`);
    console.log(`   Truncated: ${output.truncated}`);

    const data = JSON.parse(output.text);
    console.log(`   Interactive elements: ${data.elements.length}`);

    return {
      content: [
        {
          type: 'text',
          text: output.text,
        },
      ],
      isError: false,
    };
  } catch (err) {
    console.error('❌ Error:', err.message);
    return {
      content: [
        {
          type: 'text',
          text: `Error fetching page: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
}

// Example: Multi-tool workflow
async function mcpWorkflow() {
  console.log('🔄 MCP Multi-Tool Workflow\n');
  console.log('Scenario: Research a topic by reading multiple sources\n');

  const urls = ['https://example.com', 'https://httpbin.org/html'];

  const summaries = [];

  for (const url of urls) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${url}`);
    console.log('='.repeat(60));

    // Use text mode for article reading
    const result = await fetchPageText({
      url,
      maxTokens: 500,
      timeout: 30000,
    });

    if (!result.isError) {
      summaries.push({
        url,
        content: result.content[0].text,
      });
    }

    // Wait between requests to be polite
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📚 Summary of All Sources');
  console.log('='.repeat(60));

  summaries.forEach((summary, i) => {
    console.log(`\n${i + 1}. ${summary.url}`);
    console.log('-'.repeat(60));
    console.log(summary.content.slice(0, 300) + '...\n');
  });

  console.log(`✅ Processed ${summaries.length} sources`);
}

// Example: Adaptive tool selection
async function adaptiveToolSelection(url) {
  console.log('🤖 Adaptive Tool Selection\n');
  console.log(`Analyzing URL: ${url}\n`);

  // First, fetch interactive mode to understand page structure
  const interactiveResult = await fetchPageInteractive({
    url,
    maxTokens: 1000,
    timeout: 30000,
  });

  if (interactiveResult.isError) {
    console.error('Failed to analyze page');
    return;
  }

  const data = JSON.parse(interactiveResult.content[0].text);

  // Decide which tool to use based on page structure
  const hasForm = data.elements.some((el) => el.tag === 'input' || el.tag === 'textarea');
  const hasArticle = data.view.text && data.view.text.length > 500;

  console.log('📊 Page Analysis:');
  console.log(`   Title: ${data.view.title}`);
  console.log(`   Interactive elements: ${data.elements.length}`);
  console.log(`   Has forms: ${hasForm}`);
  console.log(`   Has article content: ${hasArticle}`);
  console.log('');

  if (hasForm) {
    console.log('💡 Recommendation: Use interactive mode for form filling');
  } else if (hasArticle) {
    console.log('💡 Recommendation: Use text mode for article reading');
  } else {
    console.log('💡 Recommendation: Use JSON mode for structured data extraction');
  }
}

// Example: Token budget optimization
async function tokenBudgetOptimization(url) {
  console.log('📊 Token Budget Optimization\n');

  const budgets = [100, 500, 1000, 2000, 5000];

  console.log(`Testing different token budgets for: ${url}\n`);

  for (const budget of budgets) {
    const result = await fetchPageText({
      url,
      maxTokens: budget,
      timeout: 30000,
    });

    if (!result.isError) {
      const data = result.content[0].text;
      const lines = data.split('\n').length;
      const chars = data.length;

      console.log(`Budget: ${budget}`);
      console.log(`   Output: ${chars} chars, ${lines} lines`);
      console.log(`   Truncated: ${data.includes('[lean-browser: truncated')}`);
      console.log('');
    }
  }
}

// Example: Error handling patterns
async function errorHandlingPatterns() {
  console.log('🛡️ Error Handling Patterns\n');

  const testCases = [
    { url: 'https://httpstat.us/404', desc: '404 Not Found' },
    { url: 'https://httpstat.us/500', desc: '500 Server Error' },
    { url: 'https://invalid-domain-that-does-not-exist.com', desc: 'DNS Failure' },
    { url: 'https://example.com', desc: 'Valid URL' },
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.desc}`);
    console.log(`   URL: ${testCase.url}`);

    try {
      const result = await fetchPageText({
        url: testCase.url,
        maxTokens: 500,
        timeout: 10000,
      });

      if (result.isError) {
        console.log(`   ❌ Error: ${result.content[0].text}`);
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }

    console.log('');
  }
}

// Example: Rate limiting for MCP tools
class MCPRateLimiter {
  constructor(requestsPerMinute = 10) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    // Remove requests older than 1 minute
    this.requests = this.requests.filter((t) => now - t < 60000);

    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      console.log(`⏳ Rate limit: waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.requests.push(now);
  }
}

async function rateLimitedWorkflow() {
  console.log('⏱️  Rate-Limited Workflow\n');

  const limiter = new MCPRateLimiter(5); // 5 requests per minute
  const urls = [
    'https://example.com',
    'https://httpbin.org/html',
    'https://github.com',
    'https://news.ycombinator.com',
  ];

  for (const url of urls) {
    await limiter.acquire();
    console.log(`Fetching: ${url}`);

    const result = await fetchPageText({
      url,
      maxTokens: 300,
      timeout: 30000,
    });

    console.log(result.isError ? '❌ Failed' : '✅ Success');
    console.log('');
  }

  console.log('✅ Rate-limited workflow completed');
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  const example = process.argv[2] || 'text';
  const url = process.argv[3] || 'https://example.com';

  switch (example) {
    case 'text':
      fetchPageText({ url, maxTokens: 1200 }).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'json':
      fetchPageJson({ url, maxTokens: 1200 }).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'interactive':
      fetchPageInteractive({ url, maxTokens: 1200 }).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'workflow':
      mcpWorkflow().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'adaptive':
      adaptiveToolSelection(url).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'budget':
      tokenBudgetOptimization(url).catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'errors':
      errorHandlingPatterns().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    case 'ratelimit':
      rateLimitedWorkflow().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
      break;

    default:
      console.log('Usage: node mcp-integration.js [example] [url]');
      console.log('\nExamples:');
      console.log('  node mcp-integration.js text https://example.com');
      console.log('  node mcp-integration.js json https://example.com');
      console.log('  node mcp-integration.js interactive https://github.com/login');
      console.log('  node mcp-integration.js workflow');
      console.log('  node mcp-integration.js adaptive https://example.com');
      console.log('  node mcp-integration.js budget https://example.com');
      console.log('  node mcp-integration.js errors');
      console.log('  node mcp-integration.js ratelimit');
      process.exit(1);
  }
}

export {
  fetchPageText,
  fetchPageJson,
  fetchPageInteractive,
  mcpWorkflow,
  adaptiveToolSelection,
  tokenBudgetOptimization,
  errorHandlingPatterns,
  MCPRateLimiter,
  rateLimitedWorkflow,
};
