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

```json
{
  "$schema": "https://raw.githubusercontent.com/weavetab/sdk/main/schema/plugin.json",
  "name": "weavetab-plugin-visual",
  "version": "1.0.0",
  "description": "Visual HUD highlights and styling plugin",
  "entry": "dist/index.js",
  "engines": {
    "weavetab": "^2.5.0",
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
    }
  },
  "tools": [
    {
      "name": "highlight_elements",
      "description": "Highlights specific DOM elements on the active webpage with custom outline colors"
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
