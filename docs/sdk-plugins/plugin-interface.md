---
title: "Plugin Architecture"
description: "PluginBuilder, definePlugin, and the PluginContext interface."
product: sdk
section: sdk-plugins
icon: Puzzle
slug: plugin-interface
---

# Plugin Architecture & APIs

The SDK supports two authoring paradigms: the declarative **`definePlugin`** function and the fluent **`PluginBuilder`** class, combined with **`defineTool`** for 100% type-safe Zod tool definitions.

---

## 1. Type-Safe Tool Definition with Zod (`defineTool`)

Plugin authors do not need to manually write JSON Schema draft-07. Use `defineTool` with `z` from `@weavetab/sdk`:

```typescript
import { defineTool, z } from "@weavetab/sdk";

export const scrapeTool = defineTool({
  name: "scrape_catalog",
  description: "Extracts structured product cards from an e-commerce page",
  schema: z.object({
    category: z.string().describe("Product category filter"),
    maxItems: z.number().default(20).describe("Maximum items to extract"),
    includeOutdated: z.boolean().optional().describe("Include out-of-stock items"),
  }),
  // args is automatically typed: { category: string; maxItems: number; includeOutdated?: boolean }
  handler: async (args, session) => {
    return {
      content: [{ type: "text", text: `Scraping category ${args.category} (limit: ${args.maxItems})` }],
    };
  },
});
```

---

### Browser-less tools (`requiresSession: false`)

By default the host establishes a browser/CDP session before invoking your tool, so the `session` argument is populated. API-only tools that never touch the browser (HTTP fetchers, formatters, pure compute) can opt out:

```typescript
import { defineTool, z } from "@weavetab/sdk";

export const repoInfo = defineTool({
  name: "repo_info",
  description: "Fetches repository metadata over HTTPS — no browser needed.",
  requiresSession: false, // handler receives session === undefined
  schema: z.object({ repo: z.string().describe("owner/repo slug") }),
  handler: async ({ repo }) => ({
    content: [{ type: "text", text: `fetched ${repo}` }],
  }),
});
```

With `requiresSession: false` the host skips launching/connecting Chrome entirely, so the call works headlessly and never mutates the user's tabs. RBAC and rate limiting are still enforced. The official `@weavetab/plugin-github` plugin uses this flag.

---

## 2. Fluent `PluginBuilder` API

```typescript
import { PluginBuilder, z } from "@weavetab/sdk";

export default new PluginBuilder("enterprise-auditor")
  .version("1.0.0")
  .description("Enterprise accessibility, security, and SEO auditing plugin")
  .defaultConfig({ autoInjectA11yBadges: true })
  .addTool({
    name: "audit_a11y",
    description: "Audits page elements for WCAG compliance",
    schema: z.object({
      selector: z.string().describe("Root container selector"),
      strictMode: z.boolean().default(false),
    }),
    handler: async (args, session) => {
      return { content: [{ type: "text", text: `Audit complete for ${args.selector}: 0 violations` }] };
    },
  })
  .onBeforeAction(async (tool, args, session) => {
    if (tool === "browser_navigate" && args.url?.includes("untrusted.local")) {
      return { __blocked: true, reason: "Navigation to untrusted intranet site is blocked." };
    }
  })
  .onAfterAction(async (tool, result) => {
    // Redact or scrub result data
    return result;
  })
  .onDOMMutation(async (delta) => {
    console.log(`[Auditor] Page mutated: ${delta.added?.length ?? 0} elements added.`);
  })
  .onLoad(async (ctx) => {
    ctx.logger.info("Enterprise auditor initialized!");
  })
  .build();
```

---

## 3. Declarative `definePlugin` API

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";
import { scrapeTool } from "./tools.js";

export default definePlugin({
  name: "custom-scraper",
  version: "1.0.0",
  defaultConfig: {
    maxItems: 50,
  },
  tools: [scrapeTool],

  // Enterprise middleware hooks
  onBeforeAction: async (tool, args) => {
    // Audit or modify arguments before any MCP tool executes
  },
  onAfterAction: async (tool, result) => {
    // Inspect or redact results after tool executes
  },
  onDOMMutation: async (delta) => {
    // Real-time DOM mutation stream
  },

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("Custom scraper loaded!");
  },
});
```

---

## 4. The `PluginContext` Contract

Every plugin's `onLoad` handler receives a `PluginContext` instance containing:

| Property | Type | Description |
|---|---|---|
| `ctx.name` | `string` | Plugin unique name. |
| `ctx.config` | `Record<string, any>` | Configuration parsed from `~/.weavetab/plugins/<name>/config.json`. |
| `ctx.storage` | `PluginStorage` | Isolated persistent key-value and JSON file storage API. |
| `ctx.extension` | `PluginExtensionBridge` | Direct bridge to in-browser HUD overlays and styles. |
| `ctx.mcp` | `PluginMcpContext` | Tool registration, override, and unregistration API. |
| `ctx.hooks` | `PluginHooks` | Interceptors and lifecycle hooks (`onBeforeAction`, `onAfterAction`, `onDOMMutation`). |
| `ctx.logger` | `PluginLogger` | Scoped logger with info, warn, error, and debug levels. |
