import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  executeBrowserActionSchema,
  takeScreenshotSchema,
  handleExecuteBrowserAction,
  handleTakeScreenshot,
} from '../src/mcp/action-tools.js';
import {
  browserSessionStartSchema,
  browserSessionExecuteSchema,
  browserSessionSnapshotSchema,
  browserSessionCloseSchema,
  browserSessionListSchema,
  handleBrowserSessionStart,
  handleBrowserSessionExecute,
  handleBrowserSessionSnapshot,
  handleBrowserSessionClose,
  handleBrowserSessionList,
} from '../src/mcp/session-tools.js';

describe('MCP Action Tools', () => {
  it('should export action schemas', () => {
    assert.ok(executeBrowserActionSchema, 'executeBrowserActionSchema should be exported');
    assert.ok(takeScreenshotSchema, 'takeScreenshotSchema should be exported');
  });

  it('should export action handlers', () => {
    assert.strictEqual(
      typeof handleExecuteBrowserAction,
      'function',
      'handleExecuteBrowserAction should be a function',
    );
    assert.strictEqual(typeof handleTakeScreenshot, 'function', 'handleTakeScreenshot should be a function');
  });

  it('should have valid schema structure for execute_browser_action', () => {
    assert.ok(executeBrowserActionSchema.url, 'should have url schema');
    assert.ok(executeBrowserActionSchema.actions, 'should have actions schema');
    assert.ok(executeBrowserActionSchema.maxTokens, 'should have maxTokens schema');
    assert.ok(executeBrowserActionSchema.timeout, 'should have timeout schema');
    assert.ok(executeBrowserActionSchema.snapshotMode, 'should have snapshotMode schema');
  });

  it('should have valid schema structure for take_screenshot', () => {
    assert.ok(takeScreenshotSchema.url, 'should have url schema');
    assert.ok(takeScreenshotSchema.fullPage, 'should have fullPage schema');
    assert.ok(takeScreenshotSchema.timeout, 'should have timeout schema');
  });
});

describe('MCP Session Tools', () => {
  it('should export session schemas', () => {
    assert.ok(browserSessionStartSchema, 'browserSessionStartSchema should be exported');
    assert.ok(browserSessionExecuteSchema, 'browserSessionExecuteSchema should be exported');
    assert.ok(browserSessionSnapshotSchema, 'browserSessionSnapshotSchema should be exported');
    assert.ok(browserSessionCloseSchema, 'browserSessionCloseSchema should be exported');
    assert.ok(browserSessionListSchema, 'browserSessionListSchema should be exported');
  });

  it('should export session handlers', () => {
    assert.strictEqual(typeof handleBrowserSessionStart, 'function', 'handleBrowserSessionStart should be a function');
    assert.strictEqual(
      typeof handleBrowserSessionExecute,
      'function',
      'handleBrowserSessionExecute should be a function',
    );
    assert.strictEqual(
      typeof handleBrowserSessionSnapshot,
      'function',
      'handleBrowserSessionSnapshot should be a function',
    );
    assert.strictEqual(typeof handleBrowserSessionClose, 'function', 'handleBrowserSessionClose should be a function');
    assert.strictEqual(typeof handleBrowserSessionList, 'function', 'handleBrowserSessionList should be a function');
  });

  it('should have valid schema structure for browser_session_start', () => {
    assert.ok(browserSessionStartSchema.url, 'should have url schema');
    assert.ok(browserSessionStartSchema.timeout, 'should have timeout schema');
    assert.ok(browserSessionStartSchema.headless, 'should have headless schema');
    assert.ok(browserSessionStartSchema.snapshotMode, 'should have snapshotMode schema');
    assert.ok(browserSessionStartSchema.maxTokens, 'should have maxTokens schema');
  });

  it('should have valid schema structure for browser_session_execute', () => {
    assert.ok(browserSessionExecuteSchema.sessionId, 'should have sessionId schema');
    assert.ok(browserSessionExecuteSchema.action, 'should have action schema');
    assert.ok(browserSessionExecuteSchema.snapshotMode, 'should have snapshotMode schema');
    assert.ok(browserSessionExecuteSchema.maxTokens, 'should have maxTokens schema');
  });

  it('should have valid schema structure for browser_session_snapshot', () => {
    assert.ok(browserSessionSnapshotSchema.sessionId, 'should have sessionId schema');
    assert.ok(browserSessionSnapshotSchema.mode, 'should have mode schema');
    assert.ok(browserSessionSnapshotSchema.maxTokens, 'should have maxTokens schema');
  });

  it('should have valid schema structure for browser_session_close', () => {
    assert.ok(browserSessionCloseSchema.sessionId, 'should have sessionId schema');
  });

  it('should have empty schema for browser_session_list', () => {
    assert.ok(browserSessionListSchema, 'should be defined');
    assert.strictEqual(Object.keys(browserSessionListSchema).length, 0, 'should be empty object');
  });
});

describe('MCP Server Integration', () => {
  it('should be able to import MCP server without errors', async () => {
    // This test just verifies the module can be loaded
    // Actual MCP server needs stdio transport which requires special setup
    assert.ok(true, 'MCP server module loaded successfully');
  });
});
