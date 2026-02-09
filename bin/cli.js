#!/usr/bin/env node
import { Command } from 'commander';
import process from 'node:process';
import { fetchRenderedHtml, takeScreenshot } from '../src/browser.js';
import { extractAllFromHtml } from '../src/extractor.js';
import { formatInteractive, formatJson, formatText } from '../src/formatter.js';
import { handleActionCommand } from './cli-action.js';
import { handleSessionCommand } from './cli-session.js';
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { BrowserError } from '../src/errors.js';

/**
 * Format error for CLI output with helpful context and suggestions.
 */
function formatCliError(error) {
  if (error instanceof BrowserError) {
    let output = `Error [${error.code}]: ${error.message}\n`;

    if (error.url) {
      output += `URL: ${error.url}\n`;
    }

    if (error.statusCode) {
      output += `HTTP Status: ${error.statusCode}\n`;
    }

    if (error.suggestion) {
      output += `\nSuggestion: ${error.suggestion}\n`;
    }

    return output;
  }

  return error?.stack || error?.message || String(error);
}

/**
 * Handle retry callback for CLI operations.
 */
function onRetry(error, attempt) {
  const errorType = error.name || 'Error';
  process.stderr.write(`[lean-browser] ${errorType} occurred. Retrying (attempt ${attempt})...\n`);
}

const program = new Command();

program
  .name('lean-browser')
  .description('Fetch a webpage with Playwright and compress it for LLM consumption')
  .version('0.3.0')
  .showHelpAfterError();

// ── Default: fetch command (backward compatible) ──────────────────────
program
  .command('fetch <url>', { isDefault: true })
  .description('Fetch and extract a webpage (default command)')
  .option('--mode <mode>', 'text | json | interactive', 'text')
  .option('--tokens <n>', 'max output token budget', (v) => Number(v), 1200)
  .option('--timeout <ms>', 'navigation timeout in ms', (v) => Number(v), 45000)
  .option('--headed', 'run browser in headed mode (debug)', false)
  .option('--viewport <size>', 'viewport size (e.g. 1920x1080)')
  .option('--device <name>', 'device to emulate (e.g. "iPhone 13", "iPad Pro")')
  .option('--mobile', 'use mobile emulation (iPhone 13)', false)
  .option('--cookies <file>', 'load/save cookies from/to JSON file')
  .option('--block-ads', 'block ads, trackers, and analytics', false)
  .option('--block-resources <types>', 'block resource types: image,font,stylesheet,media (comma-separated)')
  .option('--headers <json>', 'custom HTTP headers as JSON string')
  .action(async (url, opts) => {
    const mode = String(opts.mode ?? 'text').toLowerCase();
    const maxTokens = Number.isFinite(opts.tokens) ? opts.tokens : undefined;

    if (!['text', 'json', 'interactive'].includes(mode)) {
      console.error(`Invalid --mode: ${opts.mode}. Expected text|json|interactive.`);
      process.exit(2);
    }

    // Parse blocked resources
    const blockResources = opts.blockResources ? opts.blockResources.split(',').map((s) => s.trim()) : [];

    // Parse custom headers
    let extraHeaders = {};
    if (opts.headers) {
      try {
        extraHeaders = JSON.parse(opts.headers);
      } catch (err) {
        console.error(`Invalid --headers JSON: ${err.message}`);
        process.exit(2);
      }
    }

    try {
      const fetched = await fetchRenderedHtml(url, {
        timeoutMs: opts.timeout,
        headless: !opts.headed,
        viewport: opts.viewport,
        device: opts.device,
        mobile: opts.mobile,
        cookiesFile: opts.cookies,
        blockAds: opts.blockAds,
        blockResources,
        extraHeaders,
        enableRetry: true,
        onRetry,
      });

      const extracted = extractAllFromHtml(fetched.html, fetched.finalUrl ?? url);

      let out;
      if (mode === 'text') {
        out = await formatText({ url, finalUrl: fetched.finalUrl, status: fetched.status }, extracted, { maxTokens });
      } else if (mode === 'json') {
        out = await formatJson(
          { url, finalUrl: fetched.finalUrl, status: fetched.status, fetchedTitle: fetched.title },
          extracted,
          { maxTokens },
        );
      } else {
        out = await formatInteractive(
          { url, finalUrl: fetched.finalUrl, status: fetched.status, fetchedTitle: fetched.title },
          extracted,
          { maxTokens },
        );
      }

      process.stdout.write(out.text);
      if (!out.text.endsWith('\n')) process.stdout.write('\n');

      if (out.truncated) {
        process.stderr.write(`[lean-browser] Output truncated to fit ~${maxTokens} tokens (approx).\n`);
      }

      if (fetched.blockedCount > 0) {
        process.stderr.write(`[lean-browser] Blocked ${fetched.blockedCount} requests (ads/trackers/resources).\n`);
      }
    } catch (err) {
      console.error(`[lean-browser] ${formatCliError(err)}`);
      process.exit(1);
    }
  });

// ── Screenshot command ────────────────────────────────────────────────
program
  .command('screenshot <url>')
  .description('Take a screenshot of a webpage')
  .option('--output <file>', 'output file path (default: screenshot.png)')
  .option('--full-page', 'capture full page screenshot', false)
  .option('--timeout <ms>', 'navigation timeout in ms', (v) => Number(v), 45000)
  .option('--viewport <size>', 'viewport size (e.g. 1920x1080)')
  .option('--device <name>', 'device to emulate (e.g. "iPhone 13")')
  .option('--mobile', 'use mobile emulation', false)
  .option('--cookies <file>', 'load cookies from JSON file')
  .option('--block-ads', 'block ads and trackers', false)
  .option('--block-resources <types>', 'block resource types (comma-separated)')
  .option('--headers <json>', 'custom HTTP headers as JSON')
  .option('--headed', 'run browser in headed mode', false)
  .action(async (url, opts) => {
    const blockResources = opts.blockResources ? opts.blockResources.split(',').map((s) => s.trim()) : [];
    let extraHeaders = {};
    if (opts.headers) {
      try {
        extraHeaders = JSON.parse(opts.headers);
      } catch (err) {
        console.error(`Invalid --headers JSON: ${err.message}`);
        process.exit(2);
      }
    }

    try {
      const result = await takeScreenshot(url, {
        timeoutMs: opts.timeout,
        headless: !opts.headed,
        fullPage: opts.fullPage,
        viewport: opts.viewport,
        device: opts.device,
        mobile: opts.mobile,
        cookiesFile: opts.cookies,
        blockAds: opts.blockAds,
        blockResources,
        extraHeaders,
        enableRetry: true,
        onRetry,
      });

      const outputFile = opts.output || 'screenshot.png';
      const buffer = Buffer.from(result.screenshot, 'base64');
      await writeFile(outputFile, buffer);

      console.log(`Screenshot saved to ${outputFile}`);
      console.log(`URL: ${result.finalUrl}`);
      console.log(`Status: ${result.status}`);
    } catch (err) {
      console.error(`[lean-browser] ${formatCliError(err)}`);
      process.exit(1);
    }
  });

// ── Action command ────────────────────────────────────────────────────
program
  .command('action <url>')
  .description('Execute actions on a page (click, type, select, etc.)')
  .requiredOption('--actions <spec>', 'comma-separated action specs (e.g. "click:e1,type:e2:value")')
  .option('--snapshot', 'capture page snapshot after actions', false)
  .option('--snapshot-mode <mode>', 'snapshot output mode (text|json|interactive)', 'interactive')
  .option('--tokens <n>', 'max token budget for snapshot', (v) => Number(v), 1200)
  .option('--timeout <ms>', 'navigation timeout in ms', (v) => Number(v), 45000)
  .option('--action-timeout <ms>', 'per-action timeout in ms', (v) => Number(v), 10000)
  .option('--headed', 'run browser in headed mode (debug)', false)
  .action(async (url, opts) => {
    try {
      const result = await handleActionCommand(url, opts);
      process.stdout.write(JSON.stringify(result, null, 2));
      process.stdout.write('\n');
    } catch (err) {
      console.error(`[lean-browser] ${formatCliError(err)}`);
      process.exit(1);
    }
  });

// ── Session command ───────────────────────────────────────────────────
program
  .command('session <subcommand>')
  .description('Manage stateful browser sessions (start|exec|snapshot|close|list)')
  .option('--url <url>', 'URL for session start')
  .option('--session <id>', 'session ID')
  .option('--action <spec>', 'action spec for exec (e.g. "click:e1")')
  .option('--mode <mode>', 'snapshot output mode (text|json|interactive)', 'interactive')
  .option('--tokens <n>', 'max token budget for snapshot', (v) => Number(v), 1200)
  .option('--timeout <ms>', 'navigation timeout in ms', (v) => Number(v), 45000)
  .option('--action-timeout <ms>', 'per-action timeout in ms', (v) => Number(v), 10000)
  .option('--headed', 'run browser in headed mode', false)
  .action(async (subcommand, opts) => {
    try {
      const result = await handleSessionCommand(subcommand, opts);
      process.stdout.write(JSON.stringify(result, null, 2));
      process.stdout.write('\n');
    } catch (err) {
      console.error(`[lean-browser] ${formatCliError(err)}`);
      process.exit(1);
    }
  });

await program.parseAsync(process.argv);
