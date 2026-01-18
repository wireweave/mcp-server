#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';

import { tools, toolEndpoints } from './tools.js';
import { callApi, type ApiConfig } from './api.js';

// API Server URL
const API_URL = process.env.WIREWEAVE_API_URL || 'https://api.wireweave.org';
const API_KEY = process.env.WIREWEAVE_API_KEY || '';

const apiConfig: ApiConfig = {
  apiUrl: API_URL,
  apiKey: API_KEY,
};

// Logging utility - sanitize sensitive info
function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✓';
  console.error(`[Wireweave] ${prefix} ${message}`);
}

// Create MCP server instance
const server = new Server(
  {
    name: 'wireweave-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tools/list request
server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  return { tools };
});

// Handle tools/call request
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  const endpoint = toolEndpoints[name];
  if (!endpoint) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Unknown tool: ${name}`,
            availableTools: Object.keys(toolEndpoints),
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await callApi(apiConfig, endpoint, args as Record<string, unknown>);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Error handling - sanitized
server.onerror = (error) => {
  log('An error occurred', 'error');
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  log('MCP server started');

  if (!API_KEY) {
    log('API key not configured. Get one at https://dashboard.wireweave.org', 'warn');
  }
}

main().catch(() => {
  log('Failed to start server', 'error');
  process.exit(1);
});
