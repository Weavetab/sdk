---
title: "Plugin Architecture"
description: "PluginBuilder, definePlugin, and the PluginContext interface."
product: sdk
section: sdk-plugins
icon: Puzzle
slug: plugin-interface
---

# Plugin Architecture & APIs

The SDK supports two authoring paradigms: the declarative **`definePlugin`** function and the fluent **`PluginBuilder`** class.

---

## 1. Fluent `PluginBuilder` API

```typescript
import { PluginBuilder } from "@weavetab/sdk";

export default new PluginBuilder("enterprise-auditor")
  .version("1.0.0")
  .description("Enterprise accessibility and SEO auditing plugin")
  .defaultConfig({ autoInjectA11yBadges: true })
  .addTool({
    name: "audit_a11y",
    description: "Audits page elements for WCAG compliance",
    parameters: {
      type: "object",
      properties: {
        selector: { type: "string", description: "Root container selector" }
      }
    },
    handler: async (args, session) => {
      return { content: [{ type: "text", text: "Audit complete: 0 violations" }] };
    }
  })
  .onLoad(async (ctx) => {
    ctx.logger.info("Enterprise auditor initialized!");
  })
  .build();
```

---

## 2. Declarative `definePlugin` API

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "custom-scraper",
  version: "1.0.0",
  defaultConfig: {
    maxItems: 50
  },
  async onLoad(ctx: PluginContext) {
    ctx.mcp.registerTool({
      name: "scrape_cards",
      description: "Extracts product cards and stores in isolated plugin storage",
      handler: async (args, session) => {
        // Isolated storage
        await ctx.storage.setJSON("data.json", { timestamp: Date.now() });
        return { content: [{ type: "text", text: "Saved to isolated storage" }] };
      }
    });
  }
});
```

---

## 3. The `PluginContext` Contract

Every plugin's `onLoad` handler receives a `PluginContext` instance containing:

| Property | Type | Description |
|---|---|---|
| `ctx.name` | `string` | Plugin unique name. |
| `ctx.config` | `Record<string, any>` | Configuration parsed from `~/.weavetab/plugins/<name>/config.json`. |
| `ctx.storage` | `PluginStorage` | Isolated persistent key-value and JSON file storage API. |
| `ctx.extension` | `PluginExtensionBridge` | Direct bridge to in-browser HUD overlays and styles. |
| `ctx.mcp` | `PluginMcpContext` | Tool registration, override, and unregistration API. |
| `ctx.hooks` | `PluginHooks` | Global lifecycle hooks (`beforeToolCall`, `afterToolCall`, `onPageNavigate`). |
| `ctx.logger` | `PluginLogger` | Scoped logger with info, warn, error, and debug levels. |
