<p align="center">
  <img src="logo.svg" width="128" height="128" alt="Wireweave MCP">
</p>

<h1 align="center">@wireweave/mcp-server</h1>

<p align="center">Model Context Protocol server for Wireweave DSL - AI integration for wireframe generation</p>

## Overview

This MCP server acts as a thin client that proxies requests to the Wireweave API Server. It enables AI assistants like Claude to generate wireframes using the Wireweave DSL.

## Prerequisites

You need a Wireweave API key. Get one from the [Dashboard](https://dashboard.wireweave.dev).

## Installation

```bash
npm install -g @wireweave/mcp-server
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
| `WIREWEAVE_API_URL` | No | API server URL (default: https://api.wireweave.dev) |

## Available Tools

| Tool | Description |
|------|-------------|
| `wireweave_parse` | Parse DSL source to AST |
| `wireweave_validate` | Validate DSL syntax |
| `wireweave_grammar` | Get DSL grammar reference |
| `wireweave_render_html` | Render DSL to HTML |
| `wireweave_render_svg` | Render DSL to SVG |

## Usage Example

Once configured, you can ask Claude:

> "Create a wireframe for a login page with email and password fields"

Claude will use the `wireweave_render_html` or `wireweave_render_svg` tool to generate the wireframe.

## Architecture

```
Claude → MCP Server (this package) → API Server → Response
              ↓                          ↓
         Thin client              Actual execution
         (proxies requests)       (validates key, runs tools)
```

The MCP server is a thin client that:
- Receives tool calls from Claude
- Forwards them to the Wireweave API Server
- Returns the results back to Claude

All authentication, rate limiting, and tool execution happens on the API Server.

## License

MIT
