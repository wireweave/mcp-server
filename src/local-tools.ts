/**
 * Local-only MCP Tools
 *
 * These tools are handled locally without full API proxy.
 * They are NOT auto-generated and should be maintained manually.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { callApi, type ApiConfig } from './api.js';
import { toolEndpoints } from './tools.js';

/**
 * Local tool definitions
 */
export const localTools: Tool[] = [
  {
    name: 'wireweave_render_html_file',
    description:
      'Render Wireweave DSL to HTML and save to a local file. Returns the file path. Use this when you need a persistent HTML file for preview or browser viewing. Credits are charged via internal API call.',
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
        outputDir: {
          type: 'string',
          description:
            'Output directory for the HTML file. Defaults to system temp directory.',
        },
        filename: {
          type: 'string',
          description:
            'Custom filename without extension. Defaults to wireframe-{timestamp}.',
        },
      },
      required: ['source'],
    },
  },
];

/**
 * Set of local tool names for quick lookup
 */
export const LOCAL_TOOL_NAMES = new Set(localTools.map((t) => t.name));

/**
 * Handle local tool calls
 */
export async function handleLocalTool(
  name: string,
  args: Record<string, unknown>,
  apiConfig: ApiConfig
): Promise<CallToolResult> {
  switch (name) {
    case 'wireweave_render_html_file':
      return handleRenderHtmlFile(args, apiConfig);
    default:
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Unknown local tool: ${name}` }, null, 2),
          },
        ],
        isError: true,
      };
  }
}

/**
 * Handle wireweave_render_html_file
 *
 * 1. Call API to render HTML (credits are charged)
 * 2. Save to local file
 * 3. Return file path
 */
async function handleRenderHtmlFile(
  args: Record<string, unknown>,
  apiConfig: ApiConfig
): Promise<CallToolResult> {
  const { source, theme = 'light', outputDir, filename } = args;

  // Validate source
  if (!source || typeof source !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'source is required' }, null, 2),
        },
      ],
      isError: true,
    };
  }

  try {
    // 1. Call API to render HTML (this charges credits)
    const endpoint = toolEndpoints['wireweave_render_html_code'];
    if (!endpoint) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { error: 'wireweave_render_html_code endpoint not found' },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    const result = (await callApi(apiConfig, endpoint, {
      source,
      theme,
      fullDocument: true, // Always request full document for file output
    })) as { success?: boolean; html?: string; css?: string; error?: string };

    if (!result.success || !result.html) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { error: result.error || 'No HTML content returned from API' },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // 2. Prepare file path
    const dir = typeof outputDir === 'string' ? outputDir : os.tmpdir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fname = typeof filename === 'string' ? filename : `wireframe-${timestamp}`;
    const filePath = path.join(dir, `${fname}.html`);

    // 3. Build HTML content with embedded CSS
    let htmlContent = result.html;
    if (result.css && !htmlContent.includes('<style>')) {
      // Inject CSS into head
      htmlContent = htmlContent.replace('</head>', `<style>${result.css}</style></head>`);
    }

    // 4. Write to file
    fs.writeFileSync(filePath, htmlContent, 'utf-8');

    // 5. Return result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              filePath,
              message: `HTML file saved to: ${filePath}`,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : 'Failed to render HTML file',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
