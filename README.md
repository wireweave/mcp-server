<p align="center">
  <img src="https://raw.githubusercontent.com/wireweave/wireframe-lang/main/assets/wireweave-mcp.svg" width="128" height="128" alt="Wireweave MCP">
</p>

<h1 align="center">@wireweave/mcp-server</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@wireweave/mcp-server"><img src="https://img.shields.io/npm/v/@wireweave/mcp-server.svg" alt="npm version"></a>
  <a href="https://github.com/wireweave/wireframe-lang/blob/main/packages/mcp-server/LICENSE"><img src="https://img.shields.io/npm/l/@wireweave/mcp-server.svg" alt="license"></a>
</p>

<p align="center">Model Context Protocol server for Wireweave DSL - AI-powered wireframe generation</p>

## Overview

This MCP server enables AI assistants like Claude to generate wireframes using the Wireweave DSL. It provides **32 tools** for parsing, rendering, validating, and managing wireframes.

## Prerequisites

You need a Wireweave API key. Get one from the [Dashboard](https://dashboard.wireweave.org).

## Installation

```bash
npm install -g @wireweave/mcp-server
```

Or use directly with npx:

```bash
npx @wireweave/mcp-server
```

## Configuration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WIREWEAVE_API_KEY` | Yes | Your API key from Dashboard |
| `WIREWEAVE_API_URL` | No | API server URL (default: https://api.wireweave.org) |

## Available Tools (32)

### Core Tools (14)

| Tool | Description |
|------|-------------|
| `wireweave_parse` | Parse DSL source code into an AST |
| `wireweave_validate` | Validate DSL syntax |
| `wireweave_grammar` | Get DSL grammar documentation |
| `wireweave_guide` | **Primary LLM resource** - comprehensive language guide |
| `wireweave_patterns` | Get common layout patterns |
| `wireweave_examples` | Get code examples by category |
| `wireweave_render_html` | Render DSL to HTML and CSS |
| `wireweave_render_svg` | Render DSL to SVG format |
| `wireweave_validate_ux` | Validate UX best practices |
| `wireweave_ux_rules` | Get UX rule categories |
| `wireweave_diff` | Compare two wireframe sources |
| `wireweave_export_json` | Export to JSON format |
| `wireweave_export_figma` | Export to Figma format |
| `wireweave_analyze` | Analyze wireframe statistics |

### Cloud Storage Tools (14)

| Tool | Description |
|------|-------------|
| `wireweave_cloud_list_projects` | List your projects |
| `wireweave_cloud_create_project` | Create a new project |
| `wireweave_cloud_update_project` | Update project details |
| `wireweave_cloud_delete_project` | Delete a project |
| `wireweave_cloud_list_wireframes` | List saved wireframes |
| `wireweave_cloud_get_wireframe` | Get a specific wireframe |
| `wireweave_cloud_save_wireframe` | Save a new wireframe |
| `wireweave_cloud_update_wireframe` | Update an existing wireframe |
| `wireweave_cloud_delete_wireframe` | Delete a wireframe |
| `wireweave_cloud_get_versions` | Get version history |
| `wireweave_cloud_restore_version` | Restore to a previous version |
| `wireweave_cloud_create_share_link` | Create a shareable link |
| `wireweave_cloud_list_shares` | List share links |
| `wireweave_gallery` | Browse public wireframe gallery |

### Account & Billing Tools (4)

| Tool | Description |
|------|-------------|
| `wireweave_account_balance` | Check credit balance |
| `wireweave_account_subscription` | Get subscription details |
| `wireweave_account_transactions` | View transaction history |
| `wireweave_pricing` | Get pricing information |

## Usage Examples

Once configured, you can ask Claude:

**Generate a wireframe:**
> "Create a wireframe for a login page with email and password fields"

**Validate UX:**
> "Check the UX best practices for this wireframe code"

**Save to cloud:**
> "Save this wireframe as 'Dashboard v2' in my project"

**Export:**
> "Export this wireframe to Figma format"

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Claude/LLM    │────▶│   MCP Server    │────▶│   API Server    │
│                 │     │  (this package) │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │                       │
                         Tool definitions        Execution
                         Request forwarding      Auth & Rate Limit
                                                 Credit management
```

The MCP server is a thin client that:
- Defines and exposes 32 tools to AI assistants
- Forwards tool calls to the Wireweave API Server
- Returns results back to the AI

All authentication, rate limiting, and business logic runs on the API Server.

## Credit Costs

| Feature | Credits |
|---------|---------|
| Parse, Validate, Grammar, Guide, Patterns | 1 |
| Render HTML/SVG | 2 |
| UX Validation | 3 |
| Diff, Analyze | 2 |
| Export JSON/Figma | 3 |
| Cloud Save/Update | 1 |
| Create Share Link | 5 |

## Links

- [Documentation](https://docs.wireweave.org)
- [Dashboard](https://dashboard.wireweave.org)
- [Playground](https://playground.wireweave.org)
- [GitHub](https://github.com/wireweave/wireframe-lang)

## License

MIT
