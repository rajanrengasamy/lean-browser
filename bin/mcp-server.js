#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { handleFetchPageText, handleFetchPageJson, handleFetchPageInteractive } from '../src/mcp/handlers.js';
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

const server = new McpServer({
  name: 'lean-browser',
  version: '0.3.0',
});

const commonInputSchema = {
  url: z.string().url().describe('The URL of the webpage to fetch'),
  maxTokens: z.number().int().positive().default(1200).describe('Maximum token budget for the output'),
  timeout: z.number().int().positive().default(45000).describe('Navigation timeout in milliseconds'),
};

// ============================================================================
// Fetch Tools (Read-only)
// ============================================================================

server.registerTool(
  'fetch_page_text',
  {
    title: 'Fetch Page Text',
    description:
      'Fetch a webpage and extract clean readable text. Best for reading articles and long-form content. Returns markdown-formatted text with title, source, and article body.',
    inputSchema: commonInputSchema,
  },
  async (args) => {
    return handleFetchPageText(args);
  },
);

server.registerTool(
  'fetch_page_json',
  {
    title: 'Fetch Page JSON',
    description:
      'Fetch a webpage and return structured JSON with semantic content blocks. Best for data extraction, analysis, and programmatic processing.',
    inputSchema: commonInputSchema,
  },
  async (args) => {
    return handleFetchPageJson(args);
  },
);

server.registerTool(
  'fetch_page_interactive',
  {
    title: 'Fetch Page Interactive',
    description:
      'Fetch a webpage and return actionable elements (links, buttons, inputs, forms) with element IDs and CSS selectors. Best for understanding page structure and planning interactions.',
    inputSchema: commonInputSchema,
  },
  async (args) => {
    return handleFetchPageInteractive(args);
  },
);

// ============================================================================
// Action Execution Tools
// ============================================================================

server.registerTool(
  'execute_browser_action',
  {
    title: 'Execute Browser Actions',
    description:
      'Navigate to a URL and execute a sequence of actions (click, type, select, submit, etc.). Returns action results and final page snapshot. Use this for multi-step workflows without maintaining state. Actions are specified as strings like "click:e1", "type:e2:value", "submit:e3". First use fetch_page_interactive to discover element IDs.',
    inputSchema: executeBrowserActionSchema,
  },
  async (args) => {
    return handleExecuteBrowserAction(args);
  },
);

server.registerTool(
  'take_screenshot',
  {
    title: 'Take Screenshot',
    description:
      'Navigate to a URL and capture a screenshot. Returns base64-encoded PNG image. Useful for visual verification, debugging, or capturing dynamic content. Supports full-page screenshots and custom viewport sizes.',
    inputSchema: takeScreenshotSchema,
  },
  async (args) => {
    return handleTakeScreenshot(args);
  },
);

// ============================================================================
// Session Management Tools
// ============================================================================

server.registerTool(
  'browser_session_start',
  {
    title: 'Start Browser Session',
    description:
      'Create a new stateful browser session. Returns a sessionId that can be used for subsequent actions. The browser stays open and maintains state (cookies, local storage, navigation history) between actions. Sessions automatically expire after 10 minutes of inactivity. Use this when you need to perform multiple steps on the same page or maintain login state.',
    inputSchema: browserSessionStartSchema,
  },
  async (args) => {
    return handleBrowserSessionStart(args);
  },
);

server.registerTool(
  'browser_session_execute',
  {
    title: 'Execute Action in Session',
    description:
      'Execute a single action in an existing browser session. Use the sessionId from browser_session_start. The action is specified as a string like "click:e1", "type:e2:value", etc. Returns the action result and updated page snapshot. First use browser_session_snapshot to discover current element IDs.',
    inputSchema: browserSessionExecuteSchema,
  },
  async (args) => {
    return handleBrowserSessionExecute(args);
  },
);

server.registerTool(
  'browser_session_snapshot',
  {
    title: 'Capture Session Snapshot',
    description:
      'Capture the current state of a browser session without executing any actions. Returns page content in the specified mode (text, json, or interactive). Use this to inspect the current page state, discover available elements, or verify the results of previous actions.',
    inputSchema: browserSessionSnapshotSchema,
  },
  async (args) => {
    return handleBrowserSessionSnapshot(args);
  },
);

server.registerTool(
  'browser_session_close',
  {
    title: 'Close Browser Session',
    description:
      'Close a browser session and free up resources. Sessions automatically expire after 10 minutes of inactivity, but explicitly closing them is recommended when done. Returns confirmation of closure.',
    inputSchema: browserSessionCloseSchema,
  },
  async (args) => {
    return handleBrowserSessionClose(args);
  },
);

server.registerTool(
  'browser_session_list',
  {
    title: 'List Active Sessions',
    description:
      'List all active browser sessions with their metadata (sessionId, URL, creation time, last activity). Useful for debugging or managing multiple concurrent sessions.',
    inputSchema: browserSessionListSchema,
  },
  async (args) => {
    return handleBrowserSessionList(args);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
