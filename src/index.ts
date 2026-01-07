import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';

// API Server URL
const API_URL = process.env.WIREWEAVE_API_URL || 'https://api.wireweave.org';
const API_KEY = process.env.WIREWEAVE_API_KEY;

// Logging utility - sanitize sensitive info
function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✓';
  console.error(`[Wireweave] ${prefix} ${message}`);
}

// Tool definitions
const tools = [
  {
    name: 'wireweave_parse',
    description: 'Parse Wireweave DSL source code into an AST (Abstract Syntax Tree)',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The Wireweave DSL source code to parse',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'wireweave_validate',
    description: 'Validate Wireweave DSL syntax without generating output',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The Wireweave DSL source code to validate',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'wireweave_grammar',
    description: 'Get the Wireweave DSL grammar documentation and syntax reference',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'wireweave_render_html',
    description: 'Render Wireweave DSL to HTML and CSS',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The Wireweave DSL source code to render',
        },
        theme: {
          type: 'string',
          enum: ['light', 'dark'],
          description: 'Color theme for rendering',
          default: 'light',
        },
        fullDocument: {
          type: 'boolean',
          description: 'Return a complete HTML document instead of fragment',
          default: false,
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'wireweave_render_svg',
    description: 'Render Wireweave DSL to SVG format',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The Wireweave DSL source code to render',
        },
        width: {
          type: 'number',
          description: 'SVG width in pixels',
          default: 1200,
        },
        padding: {
          type: 'number',
          description: 'Padding around content',
          default: 24,
        },
        theme: {
          type: 'string',
          enum: ['light', 'dark'],
          description: 'Color theme for rendering',
          default: 'light',
        },
      },
      required: ['source'],
    },
  },
];

// Map tool names to API endpoints
const toolEndpoints: Record<string, { method: string; path: string }> = {
  wireweave_parse: { method: 'POST', path: '/tools/parse' },
  wireweave_validate: { method: 'POST', path: '/tools/validate' },
  wireweave_grammar: { method: 'GET', path: '/tools/grammar' },
  wireweave_render_html: { method: 'POST', path: '/tools/render/html' },
  wireweave_render_svg: { method: 'POST', path: '/tools/render/svg' },
};

/**
 * Call the Wireweave API Server
 */
async function callApi(
  endpoint: { method: string; path: string },
  body?: Record<string, unknown>
): Promise<unknown> {
  if (!API_KEY) {
    throw new Error('WIREWEAVE_API_KEY environment variable is required');
  }

  const url = `${API_URL}${endpoint.path}`;
  const options: RequestInit = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };

  if (endpoint.method === 'POST' && body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    // Sanitize error messages for users
    const userMessage = response.status === 401 ? 'Invalid API key'
      : response.status === 403 ? 'Access denied. Upgrade your plan for this feature.'
      : response.status === 429 ? 'Rate limit exceeded. Please wait and try again.'
      : response.status >= 500 ? 'Service temporarily unavailable'
      : error.error || 'Request failed';
    throw new Error(userMessage);
  }

  return response.json();
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
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
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
    const result = await callApi(endpoint, args as Record<string, unknown>);

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
