#!/usr/bin/env node
/**
 * md2ppt MCP Server
 * Model Context Protocol サーバーとしてmd2ppt機能を提供
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getToolDefinitions, handleToolCall } from './mcp-handlers.js';

const server = new Server(
  {
    name: 'md2ppt',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getToolDefinitions(),
  };
});

// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleToolCall(name, args as Record<string, unknown>);
  return {
    ...result,
  } as const;
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('md2ppt MCP server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
