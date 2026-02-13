#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  type CallToolResult,
  type ListToolsResult,
  type ListPromptsResult,
  type GetPromptResult,
  type ListResourcesResult,
  type ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';

import { tools, toolEndpoints } from './tools.js';
import { prompts, promptTemplates } from './prompts.js';
import { resources, resourceToTool } from './resources.js';
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
      prompts: {},
      resources: {},
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
            availableTools: tools.map((t) => t.name),
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

// Handle prompts/list request
server.setRequestHandler(ListPromptsRequestSchema, async (): Promise<ListPromptsResult> => {
  return { prompts };
});

// Handle prompts/get request
server.setRequestHandler(GetPromptRequestSchema, async (request): Promise<GetPromptResult> => {
  const { name, arguments: args } = request.params;

  const prompt = prompts.find(p => p.name === name);
  if (!prompt) {
    throw new Error(`Prompt not found: ${name}`);
  }

  const template = promptTemplates[name];
  if (!template) {
    throw new Error(`Prompt template not found: ${name}`);
  }

  // Substitute {{arg}} placeholders with actual values
  let messageText = template;
  if (args) {
    for (const [key, value] of Object.entries(args)) {
      messageText = messageText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
  }
  // Replace any remaining placeholders with defaults
  messageText = messageText.replace(/\{\{[^}]+\}\}/g, '');

  return {
    description: prompt.description,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: messageText,
        },
      },
    ],
  };
});

// Handle resources/list request
server.setRequestHandler(ListResourcesRequestSchema, async (): Promise<ListResourcesResult> => {
  return { resources };
});

// Handle resources/read request
server.setRequestHandler(ReadResourceRequestSchema, async (request): Promise<ReadResourceResult> => {
  const { uri } = request.params;

  const resource = resources.find(r => r.uri === uri);
  if (!resource) {
    throw new Error(`Resource not found: ${uri}`);
  }

  // Use imported resourceToTool mapping from resources.ts
  const toolName = resourceToTool[uri];
  if (!toolName) {
    throw new Error(`No tool mapping for resource: ${uri}`);
  }

  const endpoint = toolEndpoints[toolName];
  if (!endpoint) {
    throw new Error(`Tool endpoint not found: ${toolName}`);
  }

  try {
    const result = await callApi(apiConfig, endpoint, {});
    const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

    return {
      contents: [
        {
          uri,
          mimeType: resource.mimeType,
          text: content,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to fetch resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  log(`MCP server started with ${tools.length} tools, ${prompts.length} prompts, ${resources.length} resources`);

  if (!API_KEY) {
    log('API key not configured. Get one at https://dashboard.wireweave.org', 'warn');
  }
}

main().catch(() => {
  log('Failed to start server', 'error');
  process.exit(1);
});
