import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type ListToolsResult,
  type Tool,
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
const tools: Tool[] = [
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
    name: 'wireweave_guide',
    description: 'Get the comprehensive LLM guide for Wireweave DSL. This is the PRIMARY resource for learning the language - includes syntax, components, patterns, and best practices. Call this FIRST before generating wireframes.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'wireweave_patterns',
    description: 'Get common layout patterns for wireframes including headers, sidebars, forms, cards, and more. Use these as building blocks.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'wireweave_examples',
    description: 'Get Wireweave code examples. Use this to learn patterns and best practices for different UI types.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'form', 'dashboard', 'mobile', 'social', 'commerce', 'media'],
          description: 'Filter examples by category. Use "all" to get all examples.',
          default: 'all',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of examples to return',
          default: 5,
        },
      },
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
  {
    name: 'wireweave_validate_ux',
    description: 'Validate Wireweave DSL for UX best practices. Returns issues with severity levels and actionable recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The Wireweave DSL source code to validate',
        },
        categories: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['accessibility', 'usability', 'form', 'touch-target', 'consistency', 'navigation'],
          },
          description: 'UX rule categories to check. If not specified, all categories are checked.',
        },
        minSeverity: {
          type: 'string',
          enum: ['error', 'warning', 'info'],
          description: 'Minimum severity level to report',
          default: 'info',
        },
        maxIssues: {
          type: 'number',
          description: 'Maximum number of issues to return',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'wireweave_ux_rules',
    description: 'Get available UX rule categories and their descriptions',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'wireweave_diff',
    description: 'Compare two Wireweave DSL sources and return the differences between them',
    inputSchema: {
      type: 'object',
      properties: {
        oldSource: {
          type: 'string',
          description: 'The original Wireweave DSL source code',
        },
        newSource: {
          type: 'string',
          description: 'The modified Wireweave DSL source code',
        },
        ignoreAttributes: {
          type: 'boolean',
          description: 'Ignore attribute changes, only compare structure',
          default: false,
        },
        ignoreOrder: {
          type: 'boolean',
          description: 'Ignore the order of children when comparing',
          default: false,
        },
      },
      required: ['oldSource', 'newSource'],
    },
  },
  {
    name: 'wireweave_export_json',
    description: 'Export Wireweave DSL to JSON format for integration with other tools',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The Wireweave DSL source code to export',
        },
        includeLocations: {
          type: 'boolean',
          description: 'Include source location information in output',
          default: false,
        },
        prettyPrint: {
          type: 'boolean',
          description: 'Format JSON with indentation',
          default: true,
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'wireweave_export_figma',
    description: 'Export Wireweave DSL to Figma-compatible format',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The Wireweave DSL source code to export',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'wireweave_analyze',
    description: 'Analyze Wireweave DSL for statistics and metrics including component usage, tree structure, accessibility score, and complexity',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The Wireweave DSL source code to analyze',
        },
        includeComponentBreakdown: {
          type: 'boolean',
          description: 'Include detailed component usage breakdown',
          default: true,
        },
        includeAccessibility: {
          type: 'boolean',
          description: 'Include accessibility analysis',
          default: true,
        },
        includeComplexity: {
          type: 'boolean',
          description: 'Include complexity metrics',
          default: true,
        },
        includeLayout: {
          type: 'boolean',
          description: 'Include layout pattern analysis',
          default: true,
        },
        includeContent: {
          type: 'boolean',
          description: 'Include content analysis',
          default: true,
        },
      },
      required: ['source'],
    },
  },

  // ============================================
  // Cloud Storage Tools
  // ============================================
  {
    name: 'wireweave_cloud_list_projects',
    description: 'List all your Wireweave projects. Projects help organize your wireframes.',
    inputSchema: {
      type: 'object',
      properties: {
        includeArchived: {
          type: 'boolean',
          description: 'Include archived projects',
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: 'wireweave_cloud_create_project',
    description: 'Create a new project to organize wireframes',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Project name',
        },
        description: {
          type: 'string',
          description: 'Project description',
        },
        color: {
          type: 'string',
          description: 'Project color (hex code, e.g., #6366f1)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'wireweave_cloud_update_project',
    description: 'Update an existing project',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Project ID to update',
        },
        name: {
          type: 'string',
          description: 'New project name',
        },
        description: {
          type: 'string',
          description: 'New project description',
        },
        color: {
          type: 'string',
          description: 'New project color (hex code)',
        },
        isArchived: {
          type: 'boolean',
          description: 'Archive or unarchive the project',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wireweave_cloud_delete_project',
    description: 'Delete a project permanently. All wireframes in the project will be moved to the default project.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Project ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wireweave_cloud_list_wireframes',
    description: 'List your saved wireframes. Optionally filter by project or tags.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of wireframes to return',
          default: 20,
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination',
          default: 0,
        },
      },
      required: [],
    },
  },
  {
    name: 'wireweave_cloud_get_wireframe',
    description: 'Get a specific wireframe by ID, including its code and metadata',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Wireframe ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wireweave_cloud_save_wireframe',
    description: 'Save a new wireframe to the cloud. Costs 1 credit.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Wireframe name',
        },
        code: {
          type: 'string',
          description: 'Wireweave DSL code',
        },
        description: {
          type: 'string',
          description: 'Wireframe description',
        },
        projectId: {
          type: 'string',
          description: 'Project ID to save to (uses default project if not specified)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization',
        },
        isPublic: {
          type: 'boolean',
          description: 'Make wireframe publicly visible',
          default: false,
        },
      },
      required: ['name', 'code'],
    },
  },
  {
    name: 'wireweave_cloud_update_wireframe',
    description: 'Update an existing wireframe. Creates a new version automatically. Costs 1 credit.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Wireframe ID to update',
        },
        name: {
          type: 'string',
          description: 'New name (optional)',
        },
        code: {
          type: 'string',
          description: 'New Wireweave DSL code (optional)',
        },
        description: {
          type: 'string',
          description: 'New description (optional)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags (optional)',
        },
        isPublic: {
          type: 'boolean',
          description: 'Update public visibility (optional)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wireweave_cloud_delete_wireframe',
    description: 'Delete a wireframe permanently',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Wireframe ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'wireweave_cloud_get_versions',
    description: 'Get version history of a wireframe',
    inputSchema: {
      type: 'object',
      properties: {
        wireframeId: {
          type: 'string',
          description: 'Wireframe ID',
        },
      },
      required: ['wireframeId'],
    },
  },
  {
    name: 'wireweave_cloud_restore_version',
    description: 'Restore a wireframe to a previous version. Costs 1 credit.',
    inputSchema: {
      type: 'object',
      properties: {
        wireframeId: {
          type: 'string',
          description: 'Wireframe ID',
        },
        version: {
          type: 'number',
          description: 'Version number to restore',
        },
      },
      required: ['wireframeId', 'version'],
    },
  },
  {
    name: 'wireweave_cloud_create_share_link',
    description: 'Create a shareable link for a wireframe. Costs 5 credits.',
    inputSchema: {
      type: 'object',
      properties: {
        wireframeId: {
          type: 'string',
          description: 'Wireframe ID to share',
        },
        title: {
          type: 'string',
          description: 'Custom title for the shared view',
        },
        allowCopy: {
          type: 'boolean',
          description: 'Allow viewers to copy the code',
          default: false,
        },
        password: {
          type: 'string',
          description: 'Password protection (optional)',
        },
        expiresInDays: {
          type: 'number',
          description: 'Link expiration in days (optional, null = never)',
        },
      },
      required: ['wireframeId'],
    },
  },
  {
    name: 'wireweave_cloud_list_shares',
    description: 'List share links for a wireframe',
    inputSchema: {
      type: 'object',
      properties: {
        wireframeId: {
          type: 'string',
          description: 'Wireframe ID',
        },
      },
      required: ['wireframeId'],
    },
  },

  // ============================================
  // Account & Billing Tools
  // ============================================
  {
    name: 'wireweave_account_balance',
    description: 'Check your current credit balance and subscription status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'wireweave_account_subscription',
    description: 'Get detailed subscription information including plan features',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'wireweave_account_transactions',
    description: 'View your credit transaction history',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of transactions to return',
          default: 20,
        },
        type: {
          type: 'string',
          enum: ['purchase', 'subscription', 'usage', 'refund', 'bonus', 'admin'],
          description: 'Filter by transaction type',
        },
      },
      required: [],
    },
  },
  {
    name: 'wireweave_pricing',
    description: 'Get current pricing information for plans, credit packs, and feature costs',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // ============================================
  // Public Gallery
  // ============================================
  {
    name: 'wireweave_gallery',
    description: 'Browse public wireframe gallery for inspiration',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags',
        },
        limit: {
          type: 'number',
          description: 'Number of wireframes to return',
          default: 20,
        },
      },
      required: [],
    },
  },
];

// Map tool names to API endpoints
const toolEndpoints: Record<string, { method: string; path: string; pathParams?: string[] }> = {
  // Core tools
  wireweave_parse: { method: 'POST', path: '/tools/parse' },
  wireweave_validate: { method: 'POST', path: '/tools/validate' },
  wireweave_grammar: { method: 'GET', path: '/tools/grammar' },
  wireweave_guide: { method: 'GET', path: '/tools/guide' },
  wireweave_patterns: { method: 'GET', path: '/tools/patterns' },
  wireweave_examples: { method: 'GET', path: '/tools/examples' },
  wireweave_render_html: { method: 'POST', path: '/tools/render/html' },
  wireweave_render_svg: { method: 'POST', path: '/tools/render/svg' },
  wireweave_validate_ux: { method: 'POST', path: '/tools/validate/ux' },
  wireweave_ux_rules: { method: 'GET', path: '/tools/ux-rules' },
  wireweave_diff: { method: 'POST', path: '/tools/diff' },
  wireweave_export_json: { method: 'POST', path: '/tools/export/json' },
  wireweave_export_figma: { method: 'POST', path: '/tools/export/figma' },
  wireweave_analyze: { method: 'POST', path: '/tools/analyze' },

  // Cloud storage tools
  wireweave_cloud_list_projects: { method: 'GET', path: '/cloud/projects' },
  wireweave_cloud_create_project: { method: 'POST', path: '/cloud/projects' },
  wireweave_cloud_update_project: { method: 'PATCH', path: '/cloud/projects/:id', pathParams: ['id'] },
  wireweave_cloud_delete_project: { method: 'DELETE', path: '/cloud/projects/:id', pathParams: ['id'] },
  wireweave_cloud_list_wireframes: { method: 'GET', path: '/cloud/wireframes' },
  wireweave_cloud_get_wireframe: { method: 'GET', path: '/cloud/wireframes/:id', pathParams: ['id'] },
  wireweave_cloud_save_wireframe: { method: 'POST', path: '/cloud/wireframes' },
  wireweave_cloud_update_wireframe: { method: 'PATCH', path: '/cloud/wireframes/:id', pathParams: ['id'] },
  wireweave_cloud_delete_wireframe: { method: 'DELETE', path: '/cloud/wireframes/:id', pathParams: ['id'] },
  wireweave_cloud_get_versions: { method: 'GET', path: '/cloud/wireframes/:wireframeId/versions', pathParams: ['wireframeId'] },
  wireweave_cloud_restore_version: { method: 'POST', path: '/cloud/wireframes/:wireframeId/versions/:version/restore', pathParams: ['wireframeId', 'version'] },
  wireweave_cloud_create_share_link: { method: 'POST', path: '/cloud/wireframes/:wireframeId/shares', pathParams: ['wireframeId'] },
  wireweave_cloud_list_shares: { method: 'GET', path: '/cloud/wireframes/:wireframeId/shares', pathParams: ['wireframeId'] },

  // Account & billing tools
  wireweave_account_balance: { method: 'GET', path: '/billing/balance' },
  wireweave_account_subscription: { method: 'GET', path: '/billing/subscription' },
  wireweave_account_transactions: { method: 'GET', path: '/billing/transactions' },
  wireweave_pricing: { method: 'GET', path: '/billing/pricing' },

  // Public gallery
  wireweave_gallery: { method: 'GET', path: '/cloud/gallery' },
};

/**
 * Call the Wireweave API Server
 */
async function callApi(
  endpoint: { method: string; path: string; pathParams?: string[] },
  args?: Record<string, unknown>
): Promise<unknown> {
  if (!API_KEY) {
    throw new Error('WIREWEAVE_API_KEY environment variable is required');
  }

  // Build URL with path parameters
  let path = endpoint.path;
  const body: Record<string, unknown> = { ...args };

  // Replace path parameters (e.g., :id, :wireframeId)
  if (endpoint.pathParams && args) {
    for (const param of endpoint.pathParams) {
      const value = args[param];
      if (value !== undefined) {
        path = path.replace(`:${param}`, String(value));
        delete body[param]; // Remove from body since it's in the path
      }
    }
  }

  let url = `${API_URL}${path}`;
  const options: RequestInit = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };

  if (['POST', 'PATCH', 'PUT'].includes(endpoint.method) && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  } else if (endpoint.method === 'GET' && Object.keys(body).length > 0) {
    // Add query parameters for GET requests
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array parameters (e.g., tags)
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    }
    url = `${url}?${params.toString()}`;
  }

  const response = await fetch(url, options);

  // Extract credit info from headers
  const creditInfo = {
    balance: response.headers.get('X-Credits-Balance'),
    monthlyRemaining: response.headers.get('X-Credits-Monthly-Remaining'),
    totalAvailable: response.headers.get('X-Credits-Total-Available'),
  };

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    // Sanitize error messages for users
    const userMessage = response.status === 401 ? 'Invalid API key. Get one at https://dashboard.wireweave.org'
      : response.status === 402 ? `Insufficient credits. ${error.message || 'Please add more credits.'}`
      : response.status === 403 ? 'Access denied. Upgrade your plan for this feature.'
      : response.status === 429 ? 'Rate limit exceeded. Please wait and try again.'
      : response.status >= 500 ? 'Service temporarily unavailable'
      : error.error || error.message || 'Request failed';
    throw new Error(userMessage);
  }

  const result = await response.json();

  // Add credit info to successful responses if available
  if (creditInfo.balance || creditInfo.totalAvailable) {
    return {
      ...result,
      _credits: {
        balance: creditInfo.balance ? parseInt(creditInfo.balance, 10) : undefined,
        monthlyRemaining: creditInfo.monthlyRemaining ? parseInt(creditInfo.monthlyRemaining, 10) : undefined,
        totalAvailable: creditInfo.totalAvailable ? parseInt(creditInfo.totalAvailable, 10) : undefined,
      },
    };
  }

  return result;
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
