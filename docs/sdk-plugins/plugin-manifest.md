---
title: "weavetab.json Manifest"
description: "Comprehensive specification for the weavetab.json plugin manifest, permissions model, and schema validation."
product: sdk
section: sdk-plugins
order: 2
icon: FileJson
slug: plugin-manifest
---

# `weavetab.json` Manifest Specification

Every Weavetab plugin must contain a `weavetab.json` file in its root directory. This manifest serves as the single source of truth for the plugin's metadata, permissions, declared tools, CLI commands, and AI agent documentation.

The official schema is available at:
`https://weavetab.dev/schema/plugin.json`

---

## 1. Complete Manifest Example

```json
{
  "$schema": "https://weavetab.dev/schema/plugin.json",
  "name": "weavetab-plugin-database",
  "displayName": "Database Inspector",
  "version": "1.0.0",
  "description": "Inspect PostgreSQL tables, execute safe read queries, and diff schemas",
  "entry": "dist/index.js",
  "instructions": "Inspect PostgreSQL tables, execute safe read queries, and diff schemas before modifying.",
  "engines": {
    "weavetab": ">=2.6.2",
    "node": ">=18.0.0"
  },
  "environments": ["mcp", "cli"],
  "defaultConfig": {
    "maxRows": 100,
    "ssl": true
  },
  "permissions": {
    "tools": {
      "add": true,
      "reason": "Registers db_query and db_schema tools."
    },
    "commands": {
      "add": true,
      "reason": "Registers db-migrate and db-ping terminal commands."
    },
    "prompts": {
      "add": true,
      "reason": "Registers /db_optimize prompt template."
    },
    "resources": {
      "add": true,
      "reason": "Exposes @postgres://tables resource."
    },
    "network": {
      "allowedDomains": ["localhost:5432", "postgres.internal"],
      "reason": "Connects to local and private network database servers."
    },
    "config": {
      "read": true,
      "write": true,
      "reason": "Stores connection strings and query cache."
    }
  },
  "tools": [
    {
      "name": "db_query",
      "description": "Executes a read-only SQL query against the connected database",
      "requiresSession": false,
      "inputSchema": {
        "type": "object",
        "properties": {
          "sql": { "type": "string", "description": "SELECT SQL query" }
        },
        "required": ["sql"]
      }
    }
  ],
  "commands": [
    {
      "name": "db-ping",
      "description": "Tests connectivity to the configured database instance",
      "usage": "weavetab plugin use weavetab-plugin-database db-ping"
    }
  ],
  "prompts": [
    {
      "name": "db_optimize",
      "description": "Generates EXPLAIN ANALYZE guidance for a slow query",
      "arguments": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "SQL statement to analyze" }
        },
        "required": ["query"]
      }
    }
  ],
  "resources": [
    {
      "name": "postgres-tables",
      "uri": "postgres://tables",
      "description": "List of active tables and row counts in JSON format",
      "mimeType": "application/json"
    }
  ]
}
```

---

## 2. Manifest Properties Reference

| Property | Type | Required | Description |
|---|---|---|---|
| `$schema` | `string` | No | URI pointing to the Weavetab plugin JSON schema. |
| `name` | `string` | **Yes** | Unique npm package name. Must be lowercase alphanumeric with hyphens or scoped (`@org/pkg`). |
| `displayName`| `string` | No | Human-readable title displayed on `weavetab.dev/discover` (max 60 characters). |
| `version` | `string` | **Yes** | Semantic version matching `package.json` (e.g., `1.0.0`). |
| `description`| `string` | **Yes** | Concise summary of what the plugin does (10–300 characters). |
| `entry` | `string` | **Yes** | Relative path to compiled JavaScript entrypoint (e.g., `dist/index.js`). |
| `instructions` | `string` | **Yes** | Inline AI agent instructions injected directly into MCP context (20–3,200 chars). |
| `agentsMd` | `string` | No | Legacy relative path to AI agent markdown file (deprecated, use `instructions`). |
| `engines` | `object` | **Yes** | Required runtime versions (`weavetab`, `node`). |
| `environments`| `string[]`| No | Supported target environments: `["mcp"]`, `["cli"]`, or `["mcp", "cli"]`. |
| `defaultConfig`| `object` | No | Default configuration keys merged on initial load. |
| `permissions`| `object` | **Yes** | RBAC permission grants with mandatory justification strings. |
| `tools` | `array` | No | Statically exported MCP tools. |
| `commands` | `array` | No | Statically exported CLI commands. |
| `prompts` | `array` | No | Statically exported `/` Prompt templates (Utilities). |
| `resources`| `array` | No | Statically exported `@` Resource endpoints (Utilities). |

---

## 3. The Permissions Subsystem

Plugins execute without privileges by default. Any capability accessed by the plugin must be explicitly declared under `permissions` and include a non-empty `reason` string explaining why the permission is required.

### Permission Categories

| Category | Field | Type | Description |
|---|---|---|---|
| **Tools** | `tools.add` | `boolean` | Permission to register new MCP tools via `ctx.mcp.registerTool`. |
| | `tools.override`| `string[]` | List of built-in tool names this plugin is permitted to wrap. |
| | `tools.remove` | `string[]` | List of built-in tool names this plugin is permitted to unmount. |
| **Commands** | `commands.add` | `boolean` | Permission to register terminal CLI commands via `ctx.cli.registerCommand`. |
| **Prompts** | `prompts.add` | `boolean` | Permission to register `/` slash prompt shortcuts. |
| **Resources**| `resources.add`| `boolean` | Permission to register `@` context resources. |
| **Extension**| `extension.hud` | `boolean` | Permission to show floating thought bubbles via `showThought`. |
| | `extension.overlay`| `boolean`| Permission to update HUD status badge state. |
| | `extension.styles` | `boolean`| Permission to inject custom CSS styles into the active tab. |
| **CDP** | `cdp.evaluate` | `boolean` | Permission to execute JavaScript in the browser tab. |
| | `cdp.click` | `boolean` | Permission to dispatch synthetic mouse clicks. |
| | `cdp.navigate` | `boolean` | Permission to navigate active tabs. |
| | `cdp.screenshot`| `boolean`| Permission to capture CDP viewport screenshots. |
| **Network** | `network.allowedDomains`| `string[]`| Whitelist of hostnames or globs permitted for outgoing HTTP requests. |
| **Filesystem**| `filesystem.allowedPaths`| `string[]`| Whitelist of paths permitted outside `~/.weavetab/plugins/<name>/`. |
| **Hooks** | `hooks.onBeforeAction` | `boolean`| Permission to arm pre-execution interceptors. |
| | `hooks.onAfterAction` | `boolean`| Permission to arm post-execution interceptors. |
| | `hooks.onDOMMutation` | `boolean`| Permission to listen to real-time DOM mutation streams. |
| **Config** | `config.read` / `write` | `boolean`| Permission to access persistent storage in `~/.weavetab/plugins/<name>/`. |

---

## 4. Automatic Manifest Synchronization

You do not need to keep `tools`, `commands`, `prompts`, and `resources` arrays in sync by hand.

When you execute:
```bash
npm run build
# or:
npx @weavetab/sdk manifest
```

The SDK analyzes your compiled JavaScript bundle, extracts the schemas declared in `defineTool`, `defineCommand`, `definePrompt`, and `defineResource`, and updates `weavetab.json` automatically while preserving comments and custom permission reasons.
