#!/usr/bin/env node
import { Command } from 'commander';
import process from 'node:process';
import { fetchRenderedHtml } from '../src/browser.js';
import { extractAllFromHtml } from '../src/extractor.js';
import { formatInteractive, formatJson, formatText } from '../src/formatter.js';
import { handleActionCommand } from './cli-action.js';
import { handleSessionCommand } from './cli-session.js';

const program = new Command();

program
  .name('lean-browser')
  .description('Fetch a webpage with Playwright and compress it for LLM consumption')
  .version('0.2.0')
  .showHelpAfterError();

// ── Default: fetch command (backward compatible) ──────────────────────
program
  .command('fetch <url>', { isDefault: true })
  .description('Fetch and extract a webpage (default command)')
  .option('--mode <mode>', 'text | json | interactive', 'text')
  .option('--tokens <n>', 'max output token budget', (v) => Number(v), 1200)
  .option('--timeout <ms>', 'navigation timeout in ms', (v) => Number(v), 45000)
  .option('--headed', 'run browser in headed mode (debug)', false)
  .action(async (url, opts) => {
    const mode = String(opts.mode ?? 'text').toLowerCase();
    const maxTokens = Number.isFinite(opts.tokens) ? opts.tokens : undefined;

    if (!['text', 'json', 'interactive'].includes(mode)) {
      console.error(`Invalid --mode: ${opts.mode}. Expected text|json|interactive.`);
      process.exit(2);
    }

    try {
      const fetched = await fetchRenderedHtml(url, {
        timeoutMs: opts.timeout,
        headless: !opts.headed,
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
    } catch (err) {
      const msg = err?.stack || err?.message || String(err);
      console.error(`[lean-browser] Error: ${msg}`);
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
      const msg = err?.stack || err?.message || String(err);
      console.error(`[lean-browser] Error: ${msg}`);
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
      const msg = err?.stack || err?.message || String(err);
      console.error(`[lean-browser] Error: ${msg}`);
      process.exit(1);
    }
  });

await program.parseAsync(process.argv);
