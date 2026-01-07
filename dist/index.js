#!/usr/bin/env node

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/tools/parse.ts
import { parse, tryParse } from "@wireweave/core";
function textContent(text) {
  return { type: "text", text };
}
var parseTool = {
  name: "wireweave_parse",
  description: "Parse Wireweave DSL source code into an Abstract Syntax Tree (AST). Returns the parsed document structure or error information if parsing fails.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Wireweave DSL source code to parse"
      },
      safe: {
        type: "boolean",
        description: "If true, returns errors instead of throwing (default: true)",
        default: true
      }
    },
    required: ["source"]
  }
};
async function executeParse(args) {
  const { source, safe = true } = args;
  try {
    if (safe) {
      const result = tryParse(source);
      if (result.success) {
        return {
          content: [
            textContent(
              JSON.stringify(
                {
                  success: true,
                  document: result.document,
                  pageCount: result.document?.children.length ?? 0
                },
                null,
                2
              )
            )
          ]
        };
      } else {
        return {
          content: [
            textContent(
              JSON.stringify(
                {
                  success: false,
                  errors: result.errors
                },
                null,
                2
              )
            )
          ],
          isError: true
        };
      }
    } else {
      const document = parse(source);
      return {
        content: [
          textContent(
            JSON.stringify(
              {
                success: true,
                document,
                pageCount: document.children.length
              },
              null,
              2
            )
          )
        ]
      };
    }
  } catch (error) {
    return {
      content: [
        textContent(
          JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}

// src/tools/validate.ts
import { isValid, getErrors } from "@wireweave/core";
function textContent2(text) {
  return { type: "text", text };
}
var validateTool = {
  name: "wireweave_validate",
  description: "Validate Wireweave DSL source code syntax. Returns validation result with any syntax errors found.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Wireweave DSL source code to validate"
      }
    },
    required: ["source"]
  }
};
async function executeValidate(args) {
  const { source } = args;
  try {
    const valid = isValid(source);
    if (valid) {
      return {
        content: [
          textContent2(
            JSON.stringify(
              {
                valid: true,
                message: "Wireweave source is valid"
              },
              null,
              2
            )
          )
        ]
      };
    } else {
      const errors = getErrors(source);
      return {
        content: [
          textContent2(
            JSON.stringify(
              {
                valid: false,
                errors: errors.map((e) => ({
                  message: e.message,
                  line: e.location?.line,
                  column: e.location?.column
                }))
              },
              null,
              2
            )
          )
        ]
      };
    }
  } catch (error) {
    return {
      content: [
        textContent2(
          JSON.stringify(
            {
              valid: false,
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}

// src/tools/grammar.ts
function textContent3(text) {
  return { type: "text", text };
}
var grammarReference = {
  overview: `
Wireweave is a DSL for creating wireframe mockups. It uses a simple, indentation-based syntax
where components are nested using curly braces {}.

Basic structure:
  page "Title" {
    // components go here
  }
`,
  components: {
    // Layout components
    page: {
      description: "Root container for a wireframe page",
      props: ["title", "width", "height", "centered", "viewport", "device", "p", "m"],
      example: 'page "Dashboard" width=1440 height=900 { ... }'
    },
    header: {
      description: "Page header section",
      props: ["p", "m", "border"],
      example: "header p=4 border { ... }"
    },
    main: {
      description: "Main content area",
      props: ["p", "m"],
      example: "main p=6 { ... }"
    },
    footer: {
      description: "Page footer section",
      props: ["p", "m", "border"],
      example: "footer p=4 { ... }"
    },
    sidebar: {
      description: "Sidebar panel",
      props: ["position", "w", "p", "m"],
      example: "sidebar position=left w=250 { ... }"
    },
    section: {
      description: "Generic section container",
      props: ["title", "expanded", "p", "m"],
      example: 'section "Settings" { ... }'
    },
    // Grid components
    row: {
      description: "Horizontal flex container",
      props: ["gap", "justify", "align", "wrap"],
      example: "row gap=4 justify=between { ... }"
    },
    col: {
      description: "Vertical flex container or grid column",
      props: ["span", "gap", "align", "sm", "md", "lg", "xl", "order"],
      example: "col span=6 gap=2 { ... }"
    },
    // Container components
    card: {
      description: "Card container with optional title",
      props: ["title", "shadow", "border", "p"],
      example: 'card "User Profile" p=4 shadow=md { ... }'
    },
    modal: {
      description: "Modal dialog overlay",
      props: ["title", "w", "p"],
      example: 'modal "Confirm" w=400 { ... }'
    },
    drawer: {
      description: "Slide-out drawer panel",
      props: ["title", "position", "w"],
      example: 'drawer "Menu" position=left w=300 { ... }'
    },
    accordion: {
      description: "Collapsible accordion section",
      props: ["title"],
      example: 'accordion "Advanced Options" { ... }'
    },
    // Text components
    text: {
      description: "Text paragraph",
      props: ["size", "weight", "align", "muted", "bold"],
      example: 'text "Hello world" size=lg muted'
    },
    title: {
      description: "Heading text (h1-h6)",
      props: ["level", "size", "align"],
      example: 'title "Welcome" level=2'
    },
    link: {
      description: "Hyperlink text",
      props: ["href", "external"],
      example: 'link "Click here" href="/page"'
    },
    // Input components
    input: {
      description: "Text input field",
      props: ["label", "type", "placeholder", "value", "disabled", "required", "icon"],
      example: 'input "Email" placeholder="you@example.com" type=email'
    },
    textarea: {
      description: "Multi-line text input",
      props: ["label", "placeholder", "rows", "disabled"],
      example: 'textarea "Description" rows=4'
    },
    select: {
      description: "Dropdown select",
      props: ["label", "options", "placeholder", "disabled"],
      example: 'select "Country" options=["USA", "UK", "Korea"]'
    },
    checkbox: {
      description: "Checkbox input",
      props: ["label", "checked", "disabled"],
      example: 'checkbox "I agree" checked'
    },
    radio: {
      description: "Radio button input",
      props: ["label", "name", "checked", "disabled"],
      example: 'radio "Option A" name="choice"'
    },
    switch: {
      description: "Toggle switch",
      props: ["label", "checked", "disabled"],
      example: 'switch "Dark mode" checked'
    },
    slider: {
      description: "Range slider",
      props: ["label", "min", "max", "value", "step"],
      example: 'slider "Volume" min=0 max=100 value=50'
    },
    // Button
    button: {
      description: "Clickable button",
      props: ["content", "primary", "secondary", "outline", "ghost", "danger", "size", "icon", "disabled", "loading"],
      example: 'button "Submit" primary size=lg'
    },
    // Display components
    image: {
      description: "Image placeholder",
      props: ["src", "alt", "w", "h"],
      example: 'image placeholder="Product photo" w=200 h=150'
    },
    placeholder: {
      description: "Generic placeholder box",
      props: ["label", "w", "h"],
      example: 'placeholder "Chart" w=full h=300'
    },
    avatar: {
      description: "User avatar",
      props: ["name", "src", "size"],
      example: 'avatar "JD" size=lg'
    },
    badge: {
      description: "Status badge",
      props: ["content", "variant", "pill", "icon", "size"],
      example: 'badge "New" variant=success pill'
    },
    icon: {
      description: "Icon from Lucide icon set",
      props: ["name", "size", "muted"],
      example: 'icon "settings" size=lg'
    },
    // Data components
    table: {
      description: "Data table",
      props: ["columns", "rows", "striped", "bordered", "hover"],
      example: 'table columns=["Name", "Email"] rows=[["John", "john@example.com"]]'
    },
    list: {
      description: "List of items",
      props: ["items", "ordered", "none"],
      example: 'list items=["Item 1", "Item 2", "Item 3"]'
    },
    // Feedback components
    alert: {
      description: "Alert message box",
      props: ["content", "variant", "dismissible", "icon"],
      example: 'alert "Success!" variant=success'
    },
    toast: {
      description: "Toast notification",
      props: ["content", "position", "variant"],
      example: 'toast "Saved" position=top-right variant=success'
    },
    progress: {
      description: "Progress bar",
      props: ["value", "max", "label", "indeterminate"],
      example: "progress value=75 max=100"
    },
    spinner: {
      description: "Loading spinner",
      props: ["label", "size"],
      example: 'spinner "Loading..." size=lg'
    },
    // Overlay components
    tooltip: {
      description: "Tooltip popup",
      props: ["content", "position"],
      example: 'tooltip "Help text" position=top { button "?" }'
    },
    popover: {
      description: "Popover container",
      props: ["title"],
      example: 'popover "Details" { ... }'
    },
    dropdown: {
      description: "Dropdown menu",
      props: ["items"],
      example: 'dropdown items=[{label: "Edit"}, {label: "Delete", danger: true}]'
    },
    // Navigation components
    nav: {
      description: "Navigation menu",
      props: ["items", "vertical"],
      example: 'nav items=["Home", "About", "Contact"] vertical'
    },
    tabs: {
      description: "Tab navigation",
      props: ["items", "active"],
      example: 'tabs items=["Tab 1", "Tab 2"] active=0'
    },
    breadcrumb: {
      description: "Breadcrumb navigation",
      props: ["items"],
      example: 'breadcrumb items=["Home", "Products", "Details"]'
    },
    // Utility
    divider: {
      description: "Horizontal divider line",
      props: [],
      example: "divider"
    }
  },
  props: {
    // Spacing
    p: "Padding (all sides). Number = spacing token, or value with unit (e.g., p=4 or p=16px)",
    px: "Horizontal padding",
    py: "Vertical padding",
    pt: "Padding top",
    pr: "Padding right",
    pb: "Padding bottom",
    pl: "Padding left",
    m: "Margin (all sides)",
    mx: 'Horizontal margin (can be "auto")',
    my: "Vertical margin",
    mt: "Margin top",
    mr: "Margin right",
    mb: "Margin bottom",
    ml: "Margin left",
    gap: "Gap between flex/grid children",
    // Sizing
    w: "Width. Number = px, or keywords: full, auto, screen, fit",
    h: "Height. Number = px, or keywords: full, auto, screen",
    minW: "Minimum width",
    maxW: "Maximum width",
    minH: "Minimum height",
    maxH: "Maximum height",
    // Flex
    justify: "Justify content: start, center, end, between, around, evenly",
    align: "Align items: start, center, end, stretch, baseline",
    direction: "Flex direction: row, column, row-reverse, column-reverse",
    wrap: "Flex wrap: true, false, nowrap",
    // Grid
    span: "Grid column span (1-12)",
    sm: "Span at small breakpoint (576px+)",
    md: "Span at medium breakpoint (768px+)",
    lg: "Span at large breakpoint (992px+)",
    xl: "Span at extra large breakpoint (1200px+)",
    // Visual
    shadow: "Box shadow: none, sm, md, lg, xl",
    border: "Show border: true/false"
  },
  spacingTokens: {
    "0": "0px",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px"
  },
  examples: [
    {
      name: "Simple card",
      code: `page "Example" {
  main p=6 {
    card "Welcome" p=4 {
      text "Hello, World!" size=lg
      button "Get Started" primary
    }
  }
}`
    },
    {
      name: "Login form",
      code: `page centered width=400 p=8 {
  col gap=4 align=center {
    title "Login" level=2
    input "Email" type=email placeholder="you@example.com"
    input "Password" type=password placeholder="********"
    button "Sign In" primary w=full
  }
}`
    },
    {
      name: "Dashboard layout",
      code: `page "Dashboard" width=1440 height=900 {
  header p=4 border {
    row justify=between align=center {
      title "Admin" level=3
      avatar "JD" size=md
    }
  }
  main p=6 {
    row gap=4 {
      card "Users" p=4 { title "1,234" level=2 }
      card "Revenue" p=4 { title "$12.3K" level=2 }
      card "Orders" p=4 { title "567" level=2 }
    }
  }
}`
    }
  ]
};
var grammarTool = {
  name: "wireweave_grammar",
  description: "Get Wireweave DSL grammar reference and documentation. Can return full reference or specific component documentation.",
  inputSchema: {
    type: "object",
    properties: {
      component: {
        type: "string",
        description: 'Specific component name to get documentation for (e.g., "button", "card"). If omitted, returns overview.'
      },
      section: {
        type: "string",
        description: 'Section to retrieve: "overview", "components", "props", "examples", or "all"',
        enum: ["overview", "components", "props", "examples", "all"],
        default: "all"
      }
    },
    required: []
  }
};
async function executeGrammar(args) {
  const { component, section = "all" } = args;
  try {
    if (component) {
      const comp = grammarReference.components[component];
      if (!comp) {
        return {
          content: [
            textContent3(
              JSON.stringify(
                {
                  error: `Component '${component}' not found`,
                  availableComponents: Object.keys(grammarReference.components)
                },
                null,
                2
              )
            )
          ],
          isError: true
        };
      }
      return {
        content: [
          textContent3(
            JSON.stringify(
              {
                component,
                ...comp
              },
              null,
              2
            )
          )
        ]
      };
    }
    let result = {};
    if (section === "all") {
      result = grammarReference;
    } else if (section === "overview") {
      result = { overview: grammarReference.overview };
    } else if (section === "components") {
      result = { components: grammarReference.components };
    } else if (section === "props") {
      result = {
        props: grammarReference.props,
        spacingTokens: grammarReference.spacingTokens
      };
    } else if (section === "examples") {
      result = { examples: grammarReference.examples };
    }
    return {
      content: [textContent3(JSON.stringify(result, null, 2))]
    };
  } catch (error) {
    return {
      content: [
        textContent3(
          JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}

// src/tools/render.ts
import { parse as parse2, renderToHtml, renderToSvg, render } from "@wireweave/core";
function textContent4(text) {
  return { type: "text", text };
}
var renderHtmlTool = {
  name: "wireweave_render_html",
  description: "Render Wireweave DSL source code to HTML. Returns complete HTML document with embedded CSS styles.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Wireweave DSL source code to render"
      },
      theme: {
        type: "string",
        description: "Color theme for rendering",
        enum: ["light", "dark"],
        default: "light"
      },
      minify: {
        type: "boolean",
        description: "Minify the output HTML/CSS",
        default: false
      }
    },
    required: ["source"]
  }
};
var renderSvgTool = {
  name: "wireweave_render_svg",
  description: "Render Wireweave DSL source code to SVG image format. Returns SVG string with dimensions.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Wireweave DSL source code to render"
      },
      width: {
        type: "number",
        description: "SVG viewport width (default: 1440)",
        default: 1440
      },
      height: {
        type: "number",
        description: "SVG viewport height (default: 900)",
        default: 900
      }
    },
    required: ["source"]
  }
};
var renderComponentsTool = {
  name: "wireweave_render",
  description: "Render Wireweave DSL to separate HTML and CSS. Useful when you need to integrate into existing pages.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Wireweave DSL source code to render"
      },
      theme: {
        type: "string",
        description: "Color theme for rendering",
        enum: ["light", "dark"],
        default: "light"
      }
    },
    required: ["source"]
  }
};
async function executeRenderHtml(args) {
  const { source, theme = "light", minify = false } = args;
  try {
    const document = parse2(source);
    const html = renderToHtml(document, { theme, minify });
    return {
      content: [
        textContent4(
          JSON.stringify(
            {
              success: true,
              html,
              length: html.length
            },
            null,
            2
          )
        )
      ]
    };
  } catch (error) {
    return {
      content: [
        textContent4(
          JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}
async function executeRenderSvg(args) {
  const { source, width = 1440, height = 900 } = args;
  try {
    const document = parse2(source);
    const result = renderToSvg(document, { width, height });
    return {
      content: [
        textContent4(
          JSON.stringify(
            {
              success: true,
              svg: result.svg,
              width: result.width,
              height: result.height
            },
            null,
            2
          )
        )
      ]
    };
  } catch (error) {
    return {
      content: [
        textContent4(
          JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}
async function executeRender(args) {
  const { source, theme = "light" } = args;
  try {
    const document = parse2(source);
    const { html, css } = render(document, { theme });
    return {
      content: [
        textContent4(
          JSON.stringify(
            {
              success: true,
              html,
              css,
              htmlLength: html.length,
              cssLength: css.length
            },
            null,
            2
          )
        )
      ]
    };
  } catch (error) {
    return {
      content: [
        textContent4(
          JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}

// src/database/client.ts
import { createClient } from "@supabase/supabase-js";
var SUPABASE_URL = process.env.SUPABASE_URL;
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
var supabaseClient = null;
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
    );
  }
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: "public"
    }
  });
  return supabaseClient;
}
function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
}

// src/database/types.ts
var TIER_CONFIGS = {
  free: {
    tier: "free",
    rateLimit: {
      perMinute: 10,
      perDay: 100
    },
    monthlyQuota: 1e3,
    features: ["parse", "validate", "grammar"]
  },
  basic: {
    tier: "basic",
    rateLimit: {
      perMinute: 30,
      perDay: 500
    },
    monthlyQuota: 1e4,
    features: ["parse", "validate", "grammar", "render_html", "render_svg"]
  },
  pro: {
    tier: "pro",
    rateLimit: {
      perMinute: 100,
      perDay: 2e3
    },
    monthlyQuota: 5e4,
    features: ["parse", "validate", "grammar", "render_html", "render_svg", "render"]
  },
  enterprise: {
    tier: "enterprise",
    rateLimit: {
      perMinute: 500,
      perDay: 1e4
    },
    monthlyQuota: null,
    // unlimited
    features: ["parse", "validate", "grammar", "render_html", "render_svg", "render"]
  }
};

// src/database/api-keys.ts
import { createHash, randomBytes } from "crypto";
var API_KEY_PREFIX = "ww_";
function generateApiKey(tier = "free") {
  const randomPart = randomBytes(24).toString("base64url");
  const key = `${API_KEY_PREFIX}${tier}_${randomPart}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 12);
  return { key, keyHash, keyPrefix };
}
function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}
async function createApiKey(options) {
  const { name, userId, tier = "free", expiresAt, metadata } = options;
  const supabase = getSupabaseClient();
  const { key, keyHash, keyPrefix } = generateApiKey(tier);
  const tierConfig = TIER_CONFIGS[tier];
  const insert = {
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name,
    user_id: userId ?? null,
    tier,
    rate_limit_per_minute: tierConfig.rateLimit.perMinute,
    rate_limit_per_day: tierConfig.rateLimit.perDay,
    monthly_quota: tierConfig.monthlyQuota,
    expires_at: expiresAt?.toISOString() ?? null,
    metadata: metadata ?? {}
  };
  const { data, error } = await supabase.from("api_keys").insert(insert).select().single();
  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }
  return {
    apiKey: data,
    plainTextKey: key
    // Only returned once at creation time
  };
}
async function getApiKeyById(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("api_keys").select().eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get API key: ${error.message}`);
  }
  return data;
}
async function getApiKeysByUserId(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("api_keys").select().eq("user_id", userId).order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to get API keys: ${error.message}`);
  }
  return data ?? [];
}
async function revokeApiKey(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("api_keys").update({ status: "revoked" }).eq("id", id);
  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }
}
async function validateApiKey(key) {
  const supabase = getSupabaseClient();
  const keyHash = hashApiKey(key);
  const { data, error } = await supabase.rpc("validate_api_key", {
    p_key_hash: keyHash
  });
  if (error) {
    throw new Error(`Failed to validate API key: ${error.message}`);
  }
  const results = data;
  if (!results || results.length === 0) {
    return {
      is_valid: false,
      api_key_id: null,
      tier: null,
      rate_limit_per_minute: null,
      rate_limit_per_day: null,
      monthly_quota: null,
      daily_usage: null,
      monthly_usage: null,
      error_message: "Invalid API key"
    };
  }
  return results[0];
}
async function getApiKeyStats(id) {
  const supabase = getSupabaseClient();
  const { data: apiKey, error: keyError } = await supabase.from("api_keys").select("last_used_at").eq("id", id).single();
  if (keyError) {
    throw new Error(`Failed to get API key stats: ${keyError.message}`);
  }
  const { data: dailyData } = await supabase.rpc("get_daily_usage_count", {
    p_api_key_id: id
  });
  const { data: monthlyData } = await supabase.rpc("get_monthly_usage_count", {
    p_api_key_id: id
  });
  const keyInfo = apiKey;
  return {
    dailyUsage: dailyData ?? 0,
    monthlyUsage: monthlyData ?? 0,
    lastUsedAt: keyInfo?.last_used_at ?? null
  };
}

// src/database/usage.ts
async function logUsage(params) {
  const supabase = getSupabaseClient();
  const {
    apiKeyId,
    toolName,
    requestSize,
    responseSize,
    durationMs,
    success,
    errorMessage,
    ipAddress,
    userAgent
  } = params;
  const insert = {
    api_key_id: apiKeyId,
    tool_name: toolName,
    request_size: requestSize ?? null,
    response_size: responseSize ?? null,
    duration_ms: durationMs ?? null,
    success,
    error_message: errorMessage ?? null,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null
  };
  const { error: logError } = await supabase.from("usage_logs").insert(insert);
  if (logError) {
    console.error("Failed to log usage:", logError.message);
  }
  const { error: dailyError } = await supabase.rpc("increment_daily_usage", {
    p_api_key_id: apiKeyId,
    p_tool_name: toolName,
    p_request_size: requestSize ?? 0,
    p_response_size: responseSize ?? 0,
    p_duration_ms: durationMs ?? 0,
    p_success: success
  });
  if (dailyError) {
    console.error("Failed to update daily usage:", dailyError.message);
  }
  const { error: monthlyError } = await supabase.rpc("increment_monthly_usage", {
    p_api_key_id: apiKeyId,
    p_success: success
  });
  if (monthlyError) {
    console.error("Failed to update monthly usage:", monthlyError.message);
  }
}
async function getUsageSummary(apiKeyId) {
  const supabase = getSupabaseClient();
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const { data: dailyData } = await supabase.from("usage_daily").select().eq("api_key_id", apiKeyId).eq("date", today).single();
  const yearMonth = today.substring(0, 7);
  const { data: monthlyData } = await supabase.from("usage_monthly").select().eq("api_key_id", apiKeyId).eq("year_month", yearMonth).single();
  const daily = dailyData;
  const monthly = monthlyData;
  const toolCounts = daily?.tool_counts ?? {};
  const topTools = Object.entries(toolCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  return {
    today: {
      requests: daily?.request_count ?? 0,
      successes: daily?.success_count ?? 0,
      errors: daily?.error_count ?? 0,
      avgDurationMs: daily && daily.request_count > 0 ? Math.round(daily.total_duration_ms / daily.request_count) : 0
    },
    thisMonth: {
      requests: monthly?.request_count ?? 0,
      successes: monthly?.success_count ?? 0,
      errors: monthly?.error_count ?? 0
    },
    topTools
  };
}

// src/tools/admin.ts
function textContent5(text) {
  return { type: "text", text };
}
var createApiKeyTool = {
  name: "wireweave_admin_create_key",
  description: "Create a new API key for the Wireweave MCP server. Returns the key once (store it securely). Requires admin privileges.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "A friendly name for this API key"
      },
      tier: {
        type: "string",
        description: "The tier for this key",
        enum: ["free", "basic", "pro", "enterprise"],
        default: "free"
      },
      userId: {
        type: "string",
        description: "Optional user ID to associate with this key"
      },
      expiresInDays: {
        type: "number",
        description: "Number of days until the key expires (optional)"
      }
    },
    required: ["name"]
  }
};
async function executeCreateApiKey(args) {
  const { name, tier = "free", userId, expiresInDays } = args;
  if (!isSupabaseConfigured()) {
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              error: "Supabase is not configured",
              message: "Set SUPABASE_URL and SUPABASE_SERVICE_KEY to use admin tools"
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
  try {
    let expiresAt;
    if (expiresInDays) {
      expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }
    const { apiKey, plainTextKey } = await createApiKey({
      name,
      tier,
      userId,
      expiresAt
    });
    const tierConfig = TIER_CONFIGS[tier];
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              success: true,
              message: "API key created successfully. Store the key securely - it cannot be retrieved again.",
              apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                key: plainTextKey,
                // Only shown once!
                keyPrefix: apiKey.key_prefix,
                tier: apiKey.tier,
                rateLimits: {
                  perMinute: tierConfig.rateLimit.perMinute,
                  perDay: tierConfig.rateLimit.perDay,
                  monthlyQuota: tierConfig.monthlyQuota
                },
                expiresAt: apiKey.expires_at,
                createdAt: apiKey.created_at
              }
            },
            null,
            2
          )
        )
      ]
    };
  } catch (error) {
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              error: "Failed to create API key",
              message: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}
var getApiKeyInfoTool = {
  name: "wireweave_admin_get_key",
  description: "Get information about an API key including usage statistics.",
  inputSchema: {
    type: "object",
    properties: {
      keyId: {
        type: "string",
        description: "The API key ID to look up"
      }
    },
    required: ["keyId"]
  }
};
async function executeGetApiKeyInfo(args) {
  const { keyId } = args;
  if (!isSupabaseConfigured()) {
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              error: "Supabase is not configured",
              message: "Set SUPABASE_URL and SUPABASE_SERVICE_KEY to use admin tools"
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
  try {
    const apiKey = await getApiKeyById(keyId);
    if (!apiKey) {
      return {
        content: [
          textContent5(
            JSON.stringify(
              {
                error: "API key not found",
                keyId
              },
              null,
              2
            )
          )
        ],
        isError: true
      };
    }
    const stats = await getApiKeyStats(keyId);
    const usage = await getUsageSummary(keyId);
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              success: true,
              apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                keyPrefix: apiKey.key_prefix,
                tier: apiKey.tier,
                status: apiKey.status,
                rateLimits: {
                  perMinute: apiKey.rate_limit_per_minute,
                  perDay: apiKey.rate_limit_per_day,
                  monthlyQuota: apiKey.monthly_quota
                },
                lastUsedAt: apiKey.last_used_at,
                expiresAt: apiKey.expires_at,
                createdAt: apiKey.created_at
              },
              usage: {
                daily: stats.dailyUsage,
                monthly: stats.monthlyUsage,
                today: usage.today,
                thisMonth: usage.thisMonth,
                topTools: usage.topTools
              }
            },
            null,
            2
          )
        )
      ]
    };
  } catch (error) {
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              error: "Failed to get API key info",
              message: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}
var listApiKeysTool = {
  name: "wireweave_admin_list_keys",
  description: "List all API keys for a user.",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "The user ID to list keys for"
      }
    },
    required: ["userId"]
  }
};
async function executeListApiKeys(args) {
  const { userId } = args;
  if (!isSupabaseConfigured()) {
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              error: "Supabase is not configured",
              message: "Set SUPABASE_URL and SUPABASE_SERVICE_KEY to use admin tools"
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
  try {
    const apiKeys = await getApiKeysByUserId(userId);
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              success: true,
              userId,
              count: apiKeys.length,
              apiKeys: apiKeys.map((key) => ({
                id: key.id,
                name: key.name,
                keyPrefix: key.key_prefix,
                tier: key.tier,
                status: key.status,
                lastUsedAt: key.last_used_at,
                expiresAt: key.expires_at,
                createdAt: key.created_at
              }))
            },
            null,
            2
          )
        )
      ]
    };
  } catch (error) {
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              error: "Failed to list API keys",
              message: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}
var revokeApiKeyTool = {
  name: "wireweave_admin_revoke_key",
  description: "Revoke an API key. The key will no longer be valid for authentication.",
  inputSchema: {
    type: "object",
    properties: {
      keyId: {
        type: "string",
        description: "The API key ID to revoke"
      }
    },
    required: ["keyId"]
  }
};
async function executeRevokeApiKey(args) {
  const { keyId } = args;
  if (!isSupabaseConfigured()) {
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              error: "Supabase is not configured",
              message: "Set SUPABASE_URL and SUPABASE_SERVICE_KEY to use admin tools"
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
  try {
    const apiKey = await getApiKeyById(keyId);
    if (!apiKey) {
      return {
        content: [
          textContent5(
            JSON.stringify(
              {
                error: "API key not found",
                keyId
              },
              null,
              2
            )
          )
        ],
        isError: true
      };
    }
    if (apiKey.status === "revoked") {
      return {
        content: [
          textContent5(
            JSON.stringify(
              {
                success: true,
                message: "API key was already revoked",
                keyId,
                name: apiKey.name
              },
              null,
              2
            )
          )
        ]
      };
    }
    await revokeApiKey(keyId);
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              success: true,
              message: "API key revoked successfully",
              keyId,
              name: apiKey.name
            },
            null,
            2
          )
        )
      ]
    };
  } catch (error) {
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              error: "Failed to revoke API key",
              message: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
}
var getTierInfoTool = {
  name: "wireweave_tier_info",
  description: "Get information about available API tiers and their limits.",
  inputSchema: {
    type: "object",
    properties: {
      tier: {
        type: "string",
        description: "Specific tier to get info for (optional)",
        enum: ["free", "basic", "pro", "enterprise"]
      }
    },
    required: []
  }
};
async function executeGetTierInfo(args) {
  const { tier } = args;
  if (tier) {
    const config = TIER_CONFIGS[tier];
    return {
      content: [
        textContent5(
          JSON.stringify(
            {
              tier,
              rateLimit: {
                perMinute: config.rateLimit.perMinute,
                perDay: config.rateLimit.perDay
              },
              monthlyQuota: config.monthlyQuota ?? "unlimited",
              features: config.features
            },
            null,
            2
          )
        )
      ]
    };
  }
  const tiers = Object.entries(TIER_CONFIGS).map(([name, config]) => ({
    tier: name,
    rateLimit: {
      perMinute: config.rateLimit.perMinute,
      perDay: config.rateLimit.perDay
    },
    monthlyQuota: config.monthlyQuota ?? "unlimited",
    features: config.features
  }));
  return {
    content: [
      textContent5(
        JSON.stringify(
          {
            tiers
          },
          null,
          2
        )
      )
    ]
  };
}
var adminTools = [
  createApiKeyTool,
  getApiKeyInfoTool,
  listApiKeysTool,
  revokeApiKeyTool,
  getTierInfoTool
];
var adminExecutors = {
  wireweave_admin_create_key: executeCreateApiKey,
  wireweave_admin_get_key: executeGetApiKeyInfo,
  wireweave_admin_list_keys: executeListApiKeys,
  wireweave_admin_revoke_key: executeRevokeApiKey,
  wireweave_tier_info: executeGetTierInfo
};

// src/tools/index.ts
function textContent6(text) {
  return { type: "text", text };
}
var coreTools = [
  parseTool,
  validateTool,
  grammarTool,
  renderHtmlTool,
  renderSvgTool,
  renderComponentsTool
];
var tools = [...coreTools, ...adminTools];
var coreExecutors = {
  wireweave_parse: executeParse,
  wireweave_validate: executeValidate,
  wireweave_grammar: executeGrammar,
  wireweave_render_html: executeRenderHtml,
  wireweave_render_svg: executeRenderSvg,
  wireweave_render: executeRender
};
var executors = {
  ...coreExecutors,
  ...adminExecutors
};
async function executeTool(name, args) {
  const executor = executors[name];
  if (!executor) {
    return {
      content: [
        textContent6(
          JSON.stringify(
            {
              error: `Unknown tool: ${name}`,
              availableTools: Object.keys(executors)
            },
            null,
            2
          )
        )
      ],
      isError: true
    };
  }
  return executor(args);
}

// src/auth/types.ts
var TIER_TOOL_ACCESS = {
  free: [
    "wireweave_parse",
    "wireweave_validate",
    "wireweave_grammar"
  ],
  basic: [
    "wireweave_parse",
    "wireweave_validate",
    "wireweave_grammar",
    "wireweave_render_html",
    "wireweave_render_svg"
  ],
  pro: [
    "wireweave_parse",
    "wireweave_validate",
    "wireweave_grammar",
    "wireweave_render_html",
    "wireweave_render_svg",
    "wireweave_render"
  ],
  enterprise: [
    "wireweave_parse",
    "wireweave_validate",
    "wireweave_grammar",
    "wireweave_render_html",
    "wireweave_render_svg",
    "wireweave_render"
  ]
};
function canAccessTool(tier, toolName) {
  return TIER_TOOL_ACCESS[tier].includes(toolName);
}

// src/ratelimit/types.ts
var RATE_LIMIT_CONFIGS = {
  free: {
    perMinute: 10,
    perDay: 100,
    monthlyQuota: 1e3
  },
  basic: {
    perMinute: 30,
    perDay: 500,
    monthlyQuota: 1e4
  },
  pro: {
    perMinute: 100,
    perDay: 2e3,
    monthlyQuota: 5e4
  },
  enterprise: {
    perMinute: 500,
    perDay: 1e4,
    monthlyQuota: null
    // unlimited
  }
};
function createRateLimitError(result) {
  return {
    code: "RATE_LIMIT_EXCEEDED",
    message: `Rate limit exceeded. You have made ${result.current} requests. Limit is ${result.limit} per minute.`,
    limit: result.limit,
    current: result.current,
    resetInMs: result.resetInMs,
    resetAt: new Date(result.resetAt).toISOString()
  };
}

// src/ratelimit/limiter.ts
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
var UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
var UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
var redis = null;
var rateLimiters = /* @__PURE__ */ new Map();
function isUpstashConfigured() {
  return !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}
function getRedis() {
  if (redis) {
    return redis;
  }
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      "Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
    );
  }
  redis = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN
  });
  return redis;
}
function getRateLimiter(tier) {
  const cached = rateLimiters.get(tier);
  if (cached) {
    return cached;
  }
  const config = RATE_LIMIT_CONFIGS[tier];
  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(config.perMinute, "1 m"),
    prefix: `wireweave:ratelimit:${tier}`,
    analytics: true
  });
  rateLimiters.set(tier, limiter);
  return limiter;
}
async function checkRateLimit(apiKeyId, tier) {
  if (!isUpstashConfigured()) {
    const config = RATE_LIMIT_CONFIGS[tier];
    return {
      allowed: true,
      current: 0,
      limit: config.perMinute,
      remaining: config.perMinute,
      resetInMs: 6e4,
      resetAt: Date.now() + 6e4
    };
  }
  try {
    const limiter = getRateLimiter(tier);
    const result = await limiter.limit(apiKeyId);
    return {
      allowed: result.success,
      current: result.limit - result.remaining,
      limit: result.limit,
      remaining: result.remaining,
      resetInMs: result.reset - Date.now(),
      resetAt: result.reset
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    const config = RATE_LIMIT_CONFIGS[tier];
    return {
      allowed: true,
      current: 0,
      limit: config.perMinute,
      remaining: config.perMinute,
      resetInMs: 6e4,
      resetAt: Date.now() + 6e4
    };
  }
}
var InMemoryRateLimiter = class {
  requests = /* @__PURE__ */ new Map();
  windowMs;
  limit;
  constructor(limit, windowMs = 6e4) {
    this.limit = limit;
    this.windowMs = windowMs;
  }
  check(key) {
    const now = Date.now();
    const record = this.requests.get(key);
    if (record && record.resetAt <= now) {
      this.requests.delete(key);
    }
    const current = this.requests.get(key);
    if (!current) {
      this.requests.set(key, {
        count: 1,
        resetAt: now + this.windowMs
      });
      return {
        allowed: true,
        current: 1,
        limit: this.limit,
        remaining: this.limit - 1,
        resetInMs: this.windowMs,
        resetAt: now + this.windowMs
      };
    }
    current.count++;
    const allowed = current.count <= this.limit;
    return {
      allowed,
      current: current.count,
      limit: this.limit,
      remaining: Math.max(0, this.limit - current.count),
      resetInMs: current.resetAt - now,
      resetAt: current.resetAt
    };
  }
  reset(key) {
    this.requests.delete(key);
  }
};
var inMemoryLimiters = /* @__PURE__ */ new Map();
function getInMemoryLimiter(tier) {
  const cached = inMemoryLimiters.get(tier);
  if (cached) {
    return cached;
  }
  const config = RATE_LIMIT_CONFIGS[tier];
  const limiter = new InMemoryRateLimiter(config.perMinute);
  inMemoryLimiters.set(tier, limiter);
  return limiter;
}
function checkRateLimitInMemory(apiKeyId, tier) {
  const limiter = getInMemoryLimiter(tier);
  return limiter.check(apiKeyId);
}

// src/auth/middleware.ts
var API_KEY_HEADER = "x-api-key";
var API_KEY_ENV = "WIREWEAVE_API_KEY";
function createUnauthenticatedContext(request = {}) {
  return {
    authenticated: false,
    apiKeyId: null,
    tier: null,
    rateLimits: null,
    usage: null,
    request
  };
}
function createAuthenticatedContext(params) {
  return {
    authenticated: true,
    apiKeyId: params.apiKeyId,
    tier: params.tier,
    rateLimits: params.rateLimits,
    usage: params.usage,
    request: params.request,
    rateLimit: params.rateLimit
  };
}
function createErrorResult(code, message, request = {}, rateLimit) {
  return {
    success: false,
    context: {
      ...createUnauthenticatedContext(request),
      rateLimit
    },
    error: { code, message }
  };
}
function extractApiKey(params) {
  if (params.headers) {
    const headerKey = params.headers[API_KEY_HEADER] || params.headers[API_KEY_HEADER.toLowerCase()];
    if (headerKey) {
      return Array.isArray(headerKey) ? headerKey[0] : headerKey;
    }
    const authHeader = params.headers["authorization"] || params.headers["Authorization"];
    if (authHeader) {
      const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (auth.startsWith("Bearer ")) {
        return auth.substring(7);
      }
    }
  }
  if (params.query?.api_key) {
    return params.query.api_key;
  }
  if (process.env[API_KEY_ENV]) {
    return process.env[API_KEY_ENV];
  }
  return null;
}
async function authenticate(params) {
  const { options = {} } = params;
  const request = {
    ipAddress: params.ipAddress,
    userAgent: params.userAgent
  };
  const supabaseEnabled = isSupabaseConfigured();
  if (!supabaseEnabled) {
    if (options.required === true) {
      return createErrorResult(
        "INTERNAL_ERROR",
        "Authentication is required but Supabase is not configured",
        request
      );
    }
    return {
      success: true,
      context: createUnauthenticatedContext(request)
    };
  }
  const apiKey = params.apiKey ?? extractApiKey({
    headers: params.headers,
    query: params.query
  });
  if (!apiKey) {
    if (options.required === false) {
      return {
        success: true,
        context: createUnauthenticatedContext(request)
      };
    }
    return createErrorResult("MISSING_API_KEY", "API key is required", request);
  }
  try {
    const result = await validateApiKey(apiKey);
    if (!result.is_valid) {
      const errorCode = mapErrorMessage(result.error_message);
      return createErrorResult(errorCode, result.error_message ?? "Invalid API key", request);
    }
    if (params.toolName && result.tier) {
      if (!canAccessTool(result.tier, params.toolName)) {
        return createErrorResult(
          "TIER_NOT_ALLOWED",
          `Your tier (${result.tier}) does not have access to ${params.toolName}`,
          request
        );
      }
    }
    if (options.allowedTiers && result.tier && !options.allowedTiers.includes(result.tier)) {
      return createErrorResult(
        "TIER_NOT_ALLOWED",
        `This operation requires one of: ${options.allowedTiers.join(", ")}`,
        request
      );
    }
    let rateLimitResult;
    if (isUpstashConfigured()) {
      rateLimitResult = await checkRateLimit(result.api_key_id, result.tier);
    } else {
      rateLimitResult = checkRateLimitInMemory(result.api_key_id, result.tier);
    }
    if (!rateLimitResult.allowed) {
      const rateLimitError = createRateLimitError(rateLimitResult);
      return createErrorResult(
        "RATE_LIMIT_EXCEEDED",
        rateLimitError.message,
        request,
        rateLimitResult
      );
    }
    return {
      success: true,
      context: createAuthenticatedContext({
        apiKeyId: result.api_key_id,
        tier: result.tier,
        rateLimits: {
          perMinute: result.rate_limit_per_minute,
          perDay: result.rate_limit_per_day,
          monthlyQuota: result.monthly_quota
        },
        usage: {
          daily: result.daily_usage ?? 0,
          monthly: result.monthly_usage ?? 0
        },
        request,
        rateLimit: rateLimitResult
      })
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return createErrorResult(
      "INTERNAL_ERROR",
      "Authentication service error",
      request
    );
  }
}
function mapErrorMessage(message) {
  if (!message) return "INVALID_API_KEY";
  if (message.includes("expired")) return "EXPIRED_API_KEY";
  if (message.includes("revoked")) return "REVOKED_API_KEY";
  if (message.includes("rate limit")) return "RATE_LIMIT_EXCEEDED";
  if (message.includes("Daily")) return "DAILY_LIMIT_EXCEEDED";
  if (message.includes("Monthly") || message.includes("quota")) return "MONTHLY_QUOTA_EXCEEDED";
  return "INVALID_API_KEY";
}
var AuthError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
  toJSON() {
    return {
      error: this.code,
      message: this.message
    };
  }
};
function isAuthError(error) {
  return error instanceof AuthError;
}

// src/index.ts
var server = new Server(
  {
    name: "wireweave-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();
  const authEnabled = isSupabaseConfigured();
  const authResult = await authenticate({
    toolName: name,
    options: {
      // Require auth only if Supabase is configured
      required: authEnabled
    }
  });
  if (!authResult.success) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: authResult.error?.code ?? "AUTH_ERROR",
              message: authResult.error?.message ?? "Authentication failed"
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  }
  const { context } = authResult;
  if (context.authenticated && context.tier) {
    if (!canAccessTool(context.tier, name)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "TIER_NOT_ALLOWED",
                message: `Your tier (${context.tier}) does not have access to ${name}. Upgrade your plan for access.`,
                currentTier: context.tier,
                requiredTiers: ["basic", "pro", "enterprise"]
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  }
  try {
    const result = await executeTool(name, args);
    const durationMs = Date.now() - startTime;
    if (context.authenticated && context.apiKeyId) {
      const responseSize = JSON.stringify(result.content).length;
      await logUsage({
        apiKeyId: context.apiKeyId,
        toolName: name,
        requestSize: JSON.stringify(args).length,
        responseSize,
        durationMs,
        success: !result.isError,
        errorMessage: result.isError ? "Tool execution failed" : void 0,
        ipAddress: context.request.ipAddress,
        userAgent: context.request.userAgent
      }).catch((err) => {
        console.error("Failed to log usage:", err);
      });
    }
    return {
      content: result.content,
      isError: result.isError
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    if (context.authenticated && context.apiKeyId) {
      await logUsage({
        apiKeyId: context.apiKeyId,
        toolName: name,
        requestSize: JSON.stringify(args).length,
        durationMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        ipAddress: context.request.ipAddress,
        userAgent: context.request.userAgent
      }).catch((err) => {
        console.error("Failed to log usage:", err);
      });
    }
    if (isAuthError(error)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(error.toJSON(), null, 2)
          }
        ],
        isError: true
      };
    }
    throw error;
  }
});
server.onerror = (error) => {
  console.error("[MCP Error]", error);
};
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const authEnabled = isSupabaseConfigured();
  console.error("Wireweave MCP server running on stdio");
  console.error(`Authentication: ${authEnabled ? "enabled" : "disabled (Supabase not configured)"}`);
  if (!authEnabled) {
    console.error("To enable authentication, set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables");
  }
}
main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
