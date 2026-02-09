import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../../src/logger.js';
import { unlinkSync } from 'node:fs';
import { readFileSync, existsSync } from 'node:fs';

describe('Logger', () => {
  let logger;
  const testLogFile = '/tmp/lean-browser-test.log';

  afterEach(() => {
    if (logger) {
      logger.close();
    }
    if (existsSync(testLogFile)) {
      unlinkSync(testLogFile);
    }
  });

  describe('createLogger', () => {
    it('creates a logger with default options', () => {
      logger = createLogger();
      assert.ok(logger);
      assert.equal(typeof logger.info, 'function');
      assert.equal(typeof logger.error, 'function');
      assert.equal(typeof logger.debug, 'function');
    });

    it('creates a logger with custom log level', () => {
      logger = createLogger({ level: 'debug' });
      assert.ok(logger.shouldLog('debug'));
    });

    it('creates a logger with debug mode', () => {
      logger = createLogger({ debugMode: true });
      assert.ok(logger.debugMode);
    });
  });

  describe('log levels', () => {
    it('respects log level filtering', () => {
      logger = createLogger({ level: 'error' });
      assert.ok(logger.shouldLog('error'));
      assert.ok(!logger.shouldLog('info'));
      assert.ok(!logger.shouldLog('debug'));
    });

    it('debug mode enables debug logging', () => {
      logger = createLogger({ debugMode: true, level: 'info' });
      assert.ok(logger.shouldLog('debug'));
    });
  });

  describe('file logging', () => {
    it('writes logs to file when logFile is specified', async () => {
      logger = createLogger({ logFile: testLogFile, level: 'info' });
      await logger.initFileStream();

      logger.info('test message');
      logger.close();

      // Wait a bit for write to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(existsSync(testLogFile));
      const content = readFileSync(testLogFile, 'utf-8');
      assert.ok(content.includes('test message'));
      assert.ok(content.includes('[INFO]'));
    });
  });

  describe('DEBUG environment variable', () => {
    it('enables debug mode when DEBUG=* is set', () => {
      process.env.DEBUG = '*';
      logger = createLogger({ module: 'lean-browser' });
      assert.ok(logger.debugMode);
      delete process.env.DEBUG;
    });

    it('enables debug mode for matching module', () => {
      process.env.DEBUG = 'lean-browser';
      logger = createLogger({ module: 'lean-browser' });
      assert.ok(logger.debugMode);
      delete process.env.DEBUG;
    });

    it('does not enable debug mode for non-matching module', () => {
      process.env.DEBUG = 'other-module';
      logger = createLogger({ module: 'lean-browser', level: 'info' });
      assert.ok(!logger.debugMode);
      delete process.env.DEBUG;
    });
  });

  describe('formatting', () => {
    it('includes timestamp in messages', () => {
      logger = createLogger({ level: 'info' });
      const formatted = logger.formatMessage('info', 'test');
      assert.ok(formatted.includes('[INFO]'));
      assert.ok(formatted.includes('test'));
      assert.match(formatted, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('includes metadata in messages', () => {
      logger = createLogger({ level: 'info' });
      const formatted = logger.formatMessage('info', 'test', { key: 'value' });
      assert.ok(formatted.includes('{"key":"value"}'));
    });
  });
});
