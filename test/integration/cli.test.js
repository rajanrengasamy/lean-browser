import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', '..', 'bin', 'cli.js');

describe('CLI integration', () => {
  it('shows help with --help', async () => {
    const { stdout } = await exec('node', [CLI_PATH, '--help']);
    assert.ok(stdout.includes('lean-browser'));
    assert.ok(stdout.includes('fetch'));
    assert.ok(stdout.includes('action'));
    assert.ok(stdout.includes('session'));
  });

  it('shows version with --version', async () => {
    const { stdout } = await exec('node', [CLI_PATH, '--version']);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });

  it('fetches example.com in text mode', { timeout: 60000 }, async () => {
    const { stdout } = await exec('node', [CLI_PATH, 'https://example.com', '--mode', 'text', '--tokens', '500'], {
      timeout: 55000,
    });
    assert.ok(stdout.includes('Example Domain'));
  });

  it('fetches example.com in json mode', { timeout: 60000 }, async () => {
    const { stdout } = await exec('node', [CLI_PATH, 'https://example.com', '--mode', 'json', '--tokens', '500'], {
      timeout: 55000,
    });
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.url, 'https://example.com/');
    assert.ok(parsed.article);
  });

  it('fetches example.com in interactive mode', { timeout: 60000 }, async () => {
    const { stdout } = await exec(
      'node',
      [CLI_PATH, 'https://example.com', '--mode', 'interactive', '--tokens', '500'],
      { timeout: 55000 },
    );
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.view);
    assert.ok(Array.isArray(parsed.elements));
  });

  it('exits with error for invalid URL', { timeout: 30000 }, async () => {
    try {
      await exec('node', [CLI_PATH, 'not-a-url'], { timeout: 25000 });
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.stderr.includes('[lean-browser]') || err.code !== 0);
    }
  });

  it('shows action command help', async () => {
    const { stdout } = await exec('node', [CLI_PATH, 'action', '--help']);
    assert.ok(stdout.includes('--actions'));
    assert.ok(stdout.includes('--snapshot'));
  });

  it('shows session command help', async () => {
    const { stdout } = await exec('node', [CLI_PATH, 'session', '--help']);
    assert.ok(stdout.includes('--session'));
    assert.ok(stdout.includes('--action'));
  });
});
