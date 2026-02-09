#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { handleFetchPageText, handleFetchPageJson, handleFetchPageInteractive } from '../src/mcp/handlers.js';

const server = new McpServer({
  name: 'lean-browser',
  version: '0.2.0',
});

const commonInputSchema = {
  url: z.string().url().describe('The URL of the webpage to fetch'),
  maxTokens: z.number().int().positive().default(1200).describe('Maximum token budget for the output'),
  timeout: z.number().int().positive().default(45000).describe('Navigation timeout in milliseconds'),
};

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

const transport = new StdioServerTransport();
await server.connect(transport);
