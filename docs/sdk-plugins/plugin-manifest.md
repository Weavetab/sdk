---
title: "weavetab.json Manifest"
description: "Specification for weavetab.json schema, permissions, and engines."
product: sdk
section: sdk-plugins
icon: FileJson
slug: plugin-manifest
---

# `weavetab.json` Manifest Specification

Every Weavetab plugin includes a `weavetab.json` manifest at its root describing its metadata, engine requirements, permissions, and tools.

`name` must be the npm package id (lowercase, no spaces; the schema enforces this). To control the title shown on weavetab.dev, set the optional `displayName` (max 60 characters). Without it, the registry derives a title from `name`.

```json
{
  "$schema": "https://weavetab.dev/schema/plugin.json",
  "name": "weavetab-plugin-visual",
  "displayName": "Visual HUD",
  "version": "1.0.0",
  "description": "Visual HUD highlights and styling plugin",
  "entry": "dist/index.js",
  "engines": {
    "weavetab": ">=2.6.0",
    "node": ">=18.0.0"
  },
  "environments": ["mcp"],
  "defaultConfig": {
    "hudBadge": "Visual Mode",
    "badgeColor": "#8b5cf6"
  },
  "permissions": {
    "config": {
      "read": true,
      "write": true,
      "reason": "Manages visual HUD badge preferences"
    },
    "extension": {
      "hud": true,
      "overlay": true,
      "styles": true,
      "reason": "Renders floating thought bubbles and injects element highlight outlines"
    },
    "cdp": {
      "evaluate": true,
      "reason": "Applies visual DOM transforms in page"
    },
    "hooks": {
      "onBeforeAction": true,
      "onAfterAction": true,
      "onDOMMutation": true,
      "reason": "Intercepts tool calls for security inspection and listens to DOM deltas"
    }
  },
  "middleware": {
    "onBeforeAction": true,
    "onAfterAction": true,
    "onDOMMutation": true
  },
  "tools": [
    {
      "name": "highlight_elements",
      "description": "Highlights specific DOM elements on the active webpage with custom outline colors",
      "inputSchema": {
        "type": "object",
        "properties": {
          "selector": { "type": "string", "description": "CSS selector to highlight" },
          "color": { "type": "string", "description": "CSS outline color hex" }
        },
        "required": ["selector"]
      }
    }
  ]
}
```

---

## Permission Categories

| Permission | Description |
|---|---|
| `config` | Access to read/write plugin-specific configuration in `~/.weavetab/plugins/<name>/config.json`. |
| `extension` | Permission to render HUD thoughts, badges, and inject CSS/JS overlays. |
| `cdp` | Granular CDP capabilities (`evaluate`, `dom`, `click`, `navigate`, `network`, `screenshot`). |
| `network` | Specific allowed domain and host glob patterns. |
| `filesystem` | Restricted read/write path access outside the plugin's isolated folder. |
| `tools` | Tool authoring capabilities: `add` (register new MCP tools), `override` (wrap listed built-ins), `remove` (disable listed built-ins). |
| `prompts` | `/` command authoring capability: `{ "add": true, "reason": "..." }`. |
| `resources` | `@` mention authoring capability: `{ "add": true, "reason": "..." }`. |
| `hooks` | Permission to register enterprise middleware interceptors (`onBeforeAction`, `onAfterAction`, `onDOMMutation`). |

---

## Declaring `prompts` and `resources` in `weavetab.json`

List your plugin's `/` commands under `prompts` and `@` mentions under `resources` so the Weavetab `/discover` registry indexes them:

```json
{
  "permissions": {
    "prompts": { "add": true, "reason": "Registers the /realtime_watch slash command." },
    "resources": { "add": true, "reason": "Exposes @realtime-state and @realtime-reflex mentions." }
  },
  "prompts": [
    {
      "name": "realtime_watch",
      "description": "Prime the agent to sample canvas entities and arm a 60Hz reflex rule.",
      "arguments": {
        "type": "object",
        "properties": {
          "goal": { "type": "string", "description": "Target rule or game objective" }
        }
      }
    }
  ],
  "resources": [
    {
      "name": "realtime-state",
      "uri": "realtime://state",
      "description": "Current page probe, canvas frame count, and active reflex rules.",
      "mimeType": "application/json"
    },
    {
      "name": "realtime-reflex",
      "uriTemplate": "realtime://reflex/{id}",
      "description": "Single reflex rule telemetry by rule id.",
      "mimeType": "application/json"
    }
  ]
}
```

