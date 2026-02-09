import { Buffer } from 'node:buffer';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { takeScreenshot } from '../../src/browser.js';

describe('takeScreenshot', () => {
  it('captures a basic screenshot', async () => {
    const result = await takeScreenshot('https://example.com', {
      timeoutMs: 30000,
      headless: true,
    });

    assert.ok(result.screenshot);
    assert.ok(result.screenshot.length > 0);
    assert.equal(typeof result.screenshot, 'string');
    assert.ok(result.finalUrl.includes('example.com'));
    assert.equal(result.status, 200);
  });

  it('captures a full page screenshot', async () => {
    const result = await takeScreenshot('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      fullPage: true,
    });

    assert.ok(result.screenshot);
    assert.ok(result.screenshot.length > 0);
  });

  it('captures with custom viewport', async () => {
    const result = await takeScreenshot('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      viewport: '800x600',
    });

    assert.ok(result.screenshot);
    assert.ok(result.screenshot.length > 0);
  });

  it('captures with mobile emulation', async () => {
    const result = await takeScreenshot('https://example.com', {
      timeoutMs: 30000,
      headless: true,
      mobile: true,
    });

    assert.ok(result.screenshot);
    assert.ok(result.screenshot.length > 0);
  });

  it('returns base64 encoded image', async () => {
    const result = await takeScreenshot('https://example.com', {
      timeoutMs: 30000,
      headless: true,
    });

    // Base64 should only contain valid characters
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    assert.ok(base64Regex.test(result.screenshot));

    // Should be able to decode
    const buffer = Buffer.from(result.screenshot, 'base64');
    assert.ok(buffer.length > 0);

    // PNG files start with specific magic bytes
    assert.equal(buffer[0], 0x89);
    assert.equal(buffer[1], 0x50);
    assert.equal(buffer[2], 0x4e);
    assert.equal(buffer[3], 0x47);
  });
});
