# @weavetab/sdk

> Official Enterprise TypeScript SDK and Developer Toolkit for building plugins, tools, isolated configurations, and visual extensions for **[Weavetab](https://github.com/weavetab/mcp)**.

[![npm version](https://img.shields.io/npm/v/@weavetab/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@weavetab/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/status-beta-f59e0b.svg?style=flat-square)](https://github.com/weavetab/mcp)

---

## ⚡ Overview

`@weavetab/sdk` is the official developer SDK for building modular, enterprise-grade plugins that seamlessly extend the **Weavetab Model Context Protocol (MCP)** runtime.

With `@weavetab/sdk`, you can:
- 🛠️ **Register Custom MCP Tools**: Expose new automation, scraping, or API tools directly to AI coding agents (Claude, Gemini, Cursor, Copilot, Antigravity).
- ⚙️ **Isolated Plugin Configurations**: Maintain dedicated `~/.weavetab/plugins/<name>/config.json` without modifying core settings.
- 💾 **Sandboxed Persistent Storage**: Store key-value data and JSON files safely inside `~/.weavetab/plugins/<name>/`.
- 🎨 **Chrome Extension & Visual HUD**: Show animated thought bubbles (`showThought`), update HUD status badges (`setHudState`), inject custom CSS (`injectStyles`), and execute scripts.
- 🔀 **Override Built-in Tools**: Wrap or replace existing Weavetab tools (e.g. `browser_eval`, `browser_click`, `browser_navigate`).
- 🪝 **Lifecycle & Pre/Post Hooks**: Intercept tool executions with `beforeToolCall`, `afterToolCall`, and `onPageNavigate`.
- 🏗️ **Fluent `PluginBuilder` API**: Write clean, enterprise-grade plugin definitions with fluent chaining.

---

## 🔢 Version Alignment (1:1 with MCP)

`@weavetab/sdk` shares **identical version numbering** with `@weavetab/mcp`:
* **Unified SemVer:** `@weavetab/sdk@2.5.x` matches `@weavetab/mcp@2.5.x`.
* **Zero Confusion:** When specifying `"engines": { "weavetab": "^2.5.0" }` in your `weavetab.json`, install `@weavetab/sdk@^2.5.0`.

---

## 🚀 Quick Start

### 1. Scaffold a New Plugin Template

Choose from 6 enterprise starter templates:

```bash
# Standard versatile plugin (Tools + Storage + HUD)
npx -y @weavetab/sdk init my-custom-plugin

# Visual feedback & UI overlay plugin
npx -y @weavetab/sdk init my-visual-plugin --template visual

# Web scraper & data extraction plugin
npx -y @weavetab/sdk init my-scraper-plugin --template scraper

# Security tool interceptor & hook plugin
npx -y @weavetab/sdk init my-guard-plugin --template override

# YouTube / Media auto-interaction plugin
npx -y @weavetab/sdk init my-youtube-plugin --template youtube
```

### 2. Available Starter Templates

| Template | Focus Area | Highlights |
|---|---|---|
| `standard` | General purpose | Tool registration, isolated storage, HUD thought bubble |
| `visual` | UI & Visual Feedback | `setHudState`, `showThought`, `injectStyles` |
| `scraper` | Data Extraction | CDP evaluation, DOM extraction, `storage.setJSON` |
| `automation` | Browser Automations | Multi-step workflows, forms, navigations |
| `override` | Security & Interception | `overrideTool("browser_navigate")`, `beforeToolCall` |
| `youtube` | Media Automations | URL pattern matching, CDP auto-like, video controls |

### 3. Project Structure

```text
my-custom-plugin/
├── src/
│   └── index.ts          # Plugin implementation (tools, hooks, visuals)
├── weavetab.json         # Security manifest & permissions (auto-synced)
├── package.json          # Dependencies & build scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # Documentation
```

---

## 🛠️ Authoring Patterns

### Option A: Fluent `PluginBuilder` Pattern (Enterprise)

```typescript
import { PluginBuilder } from "@weavetab/sdk";

export default new PluginBuilder("weavetab-plugin-analytics")
  .version("1.0.0")
  .description("Enterprise real-time web analytics and visual HUD plugin")
  .defaultConfig({
    enableHud: true,
    themeColor: "#3b82f6",
    sampleRate: 100,
  })
  .addTool({
    name: "record_metric",
    description: "Records custom telemetry event in isolated plugin storage",
    schema: {
      type: "object",
      properties: {
        metric: { type: "string", description: "Metric name" },
        value: { type: "number", description: "Numerical value" },
      },
      required: ["metric", "value"],
    },
    handler: async (args, session) => {
      return { content: [{ type: "text", text: `Recorded ${args.metric}: ${args.value}` }] };
    },
  })
  .onLoad(async (ctx) => {
    ctx.logger.info("Analytics plugin active with config:", ctx.config);
  })
  .build();
```

### Option B: Declarative `definePlugin` Pattern

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "weavetab-plugin-example",
  version: "1.0.0",

  defaultConfig: {
    enableHud: true,
    maxRetries: 3,
    themeColor: "#3b82f6",
  },

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("Plugin loaded! Config:", ctx.config);

    // 1. Register custom MCP tool
    ctx.mcp.registerTool({
      name: "example_analyze_page",
      description: "Extracts key insights and displays real-time visual feedback.",
      schema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector to target" },
        },
      },
      handler: async (args: { selector?: string }, session: any) => {
        // Track stats in isolated plugin storage
        const runs = (await ctx.storage.get<number>("runs", 0)) || 0;
        await ctx.storage.set("runs", runs + 1);

        // Show real-time thought bubble on the active browser tab
        if (ctx.config.enableHud && session) {
          await ctx.extension.showThought(
            session,
            `🔍 Analyzing page selector: ${args.selector || "body"}...`,
            { durationMs: 4000 }
          );

          await ctx.extension.setHudState(session, {
            badge: "Analyzing",
            badgeColor: ctx.config.themeColor,
          });
        }

        return {
          content: [
            {
              type: "text",
              text: `Analysis complete! Total executions: ${runs + 1}`,
            },
          ],
        };
      },
    });

    // 2. Register lifecycle hooks
    ctx.hooks.beforeToolCall((toolName, toolArgs) => {
      ctx.logger.debug(`[Hook] Invoking: ${toolName}`, toolArgs);
    });
  },

  async onUnload(ctx: PluginContext) {
    ctx.logger.info("Plugin unloaded.");
  },
});
```

---

## ⚙️ Isolated Configuration Sandbox

Unlike legacy tools that pollute a single global file, Weavetab gives each plugin its own isolated sandbox directory:

```text
~/.weavetab/plugins/<plugin-name>/
├── config.json             <-- User editable configuration
├── storage.json            <-- Sandboxed key-value store
└── data/                   <-- Custom assets / cache files
```

---

## 💾 Sandboxed Persistent Storage API (`ctx.storage`)

```typescript
// Key-Value Store (~/.weavetab/plugins/<plugin-name>/storage.json)
await ctx.storage.set("token", "secret-xyz");
const token = await ctx.storage.get<string>("token");
await ctx.storage.delete("token");

// Structured JSON files (~/.weavetab/plugins/<plugin-name>/data/report.json)
await ctx.storage.setJSON("data/report.json", { items: [1, 2, 3] });
const report = await ctx.storage.getJSON("data/report.json");

// Sandbox path resolver with path-traversal protection
const filePath = ctx.storage.getPath("cache.db");
const files = await ctx.storage.list("data");
```

---

## 🎨 Chrome Extension & Visual HUD (`ctx.extension`)

```typescript
// 1. Show an animated floating thought bubble
await ctx.extension.showThought(
  session,
  "✨ Automatically liked YouTube Video!",
  { durationMs: 3500 }
);

// 2. Update HUD badge and status
await ctx.extension.setHudState(session, {
  action: "Extracting Tables",
  badge: "Running",
  badgeColor: "#10b981",
});

// 3. Inject custom CSS stylesheets into the DOM
await ctx.extension.injectStyles(
  session,
  `
  .weavetab-highlight {
    outline: 2px solid #3b82f6 !important;
    background: rgba(59, 130, 246, 0.1) !important;
  }
`
);

// 4. Temporarily hide HUD for clean screenshots or PDF prints
await ctx.extension.hideOverlay(session);
// ... take screenshot ...
await ctx.extension.restoreOverlay(session);
```

---

## 🔀 Tool Overrides & Wrapping Built-in Tools

```typescript
ctx.mcp.overrideTool("browser_eval", async (args, session, config, originalHandler) => {
  console.log("Auditing script before evaluation:", args.code);

  // Execute original built-in handler if desired
  const res = originalHandler ? await originalHandler(args, session, config) : null;

  return {
    ...res,
    auditedByPlugin: true,
  };
});
```

---

## 💻 Developer CLI Reference

The `@weavetab/sdk` exposes the `weavetab`, `weavetab-sdk`, and `weavetab-plugin` binaries:

| Command | Description |
|---|---|
| `weavetab init [name] [--template <type>]` | Scaffolds a new TypeScript plugin template |
| `weavetab build` | Compiles TypeScript and synchronizes `weavetab.json` |
| `weavetab dev` | Starts live TypeScript watch mode (`tsc --watch`) |
| `weavetab validate` | Audits and validates `weavetab.json` schema and permissions |
| `weavetab doctor` | Runs complete developer environment diagnostics and health checks |
| `weavetab --version` | Displays the current SDK version |

---

## 📦 Publishing Your Plugin

1. **Build and validate:**
   ```bash
   npm run build
   npx weavetab validate
   npx weavetab doctor
   ```
2. **Publish to npm:**
   ```bash
   npm publish --access public
   ```
3. **Install into Weavetab runtime:**
   ```bash
   weavetab plugin add your-plugin-name
   ```

---

## 📜 License

MIT © [fy2ne](https://github.com/fy2ne)
