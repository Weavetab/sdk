# @weavetab/sdk

> Official TypeScript SDK and Developer Toolkit for building plugins, tools, isolated configurations, and visual extensions for **[Weavetab](https://github.com/weavetab/mcp)**.

[![npm version](https://img.shields.io/npm/v/@weavetab/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@weavetab/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Status: Stable](https://img.shields.io/badge/status-stable-10b981.svg?style=flat-square)](https://github.com/weavetab/sdk)

---

## ⚡ Overview

`@weavetab/sdk` is the official developer SDK for building modular plugins that extend the **Weavetab Model Context Protocol (MCP)** runtime.

With `@weavetab/sdk`, you can:
- 🛠️ **Zod Schema Exporter & Typegen**: Define MCP tools using 100% pure TypeScript + Zod (`defineTool`, `z`). Zero manual JSON schema writing — automatically exported to `weavetab.json`.
- 🛡️ **Middleware & Interceptor Hooks**: Intercept every tool executed across the browser runtime with `onBeforeAction` (ad-blocking, auth injection), `onAfterAction` (PII redaction, DLP), and `onDOMMutation` (live change streams).
- 🛠️ **Register Custom MCP Tools**: Expose new automation, scraping, or API tools directly to AI coding agents (Claude, Gemini, Cursor, Copilot, Antigravity).
- ⚙️ **Isolated Plugin Configurations**: Maintain dedicated `~/.weavetab/plugins/<name>/config.json` without modifying core settings.
- 💾 **Sandboxed Persistent Storage**: Store key-value data and JSON files safely inside `~/.weavetab/plugins/<name>/`.
- 🎨 **Chrome Extension & Visual HUD**: Show animated thought bubbles (`showThought`), update HUD status badges (`setHudState`), inject custom CSS (`injectStyles`), and execute scripts.
- 🔀 **Override Built-in Tools**: Wrap or replace existing Weavetab tools (e.g. `browser_eval`, `browser_click`, `browser_navigate`).
- 🏗️ **Fluent `PluginBuilder` API**: Write clean, strongly-typed plugin definitions with fluent chaining.

---

## 🔢 Version Alignment (1:1 with MCP)

`@weavetab/sdk` shares **identical version numbering** with `@weavetab/mcp`:
* **Unified SemVer:** `@weavetab/sdk@2.6.x` matches `@weavetab/mcp@2.6.x`.
* **Zero Confusion:** When specifying `"engines": { "weavetab": ">=2.6.0" }` in your `weavetab.json`, install `@weavetab/sdk@^2.6.0`.

---

## 🚀 Quick Start

### 1. Scaffold a New Plugin Template

Choose from 5 starter templates:

```bash
# Standard versatile plugin (Tools + Storage + HUD)
npx -y @weavetab/sdk init my-custom-plugin

# Visual feedback & UI overlay plugin
npx -y @weavetab/sdk init my-visual-plugin --template visual

# Web scraper & data extraction plugin
npx -y @weavetab/sdk init my-scraper-plugin --template scraper

# Security tool interceptor & hook plugin
npx -y @weavetab/sdk init my-guard-plugin --template override
```

### 2. Available Starter Templates

| Template | Focus Area | Highlights |
|---|---|---|
| `standard` | General purpose | Tool registration, isolated storage, HUD thought bubble |
| `visual` | UI & Visual Feedback | `setHudState`, `showThought`, `injectStyles` |
| `scraper` | Data Extraction | CDP evaluation, DOM extraction, `storage.setJSON` |
| `automation` | Browser Automations | Multi-step workflows, forms, navigations |
| `override` | Security & Interception | `overrideTool("browser_navigate")`, `beforeToolCall` |

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

### Option A: Type-Safe Tool Definition with Zod (`defineTool`)

Plugin authors do not have to hand-craft JSON Schema draft-07 objects. Define tools using pure TypeScript + Zod with full auto-completion and compile-time type inference:

```typescript
import { defineTool, z } from "@weavetab/sdk";

export const auditTool = defineTool({
  name: "audit_page",
  description: "Audits target page components and reports issues",
  schema: z.object({
    selector: z.string().describe("Root CSS selector to inspect"),
    maxDepth: z.number().default(5).describe("Maximum DOM depth to traverse"),
    strictMode: z.boolean().optional().describe("Fail on minor accessibility warnings"),
  }),
  // args is inferred as: { selector: string; maxDepth: number; strictMode?: boolean }
  handler: async (args, session) => {
    return {
      content: [{ type: "text", text: `Inspected ${args.selector} up to depth ${args.maxDepth}` }],
    };
  },
});
```

### Option B: Fluent `PluginBuilder` Pattern (Enterprise)

```typescript
import { PluginBuilder, z } from "@weavetab/sdk";

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
    schema: z.object({
      metric: z.string().describe("Metric name"),
      value: z.number().describe("Numerical value"),
    }),
    handler: async (args, session) => {
      return { content: [{ type: "text", text: `Recorded ${args.metric}: ${args.value}` }] };
    },
  })
  // Intercept every tool call before it runs
  .onBeforeAction(async (tool, args, session) => {
    if (tool === "browser_navigate" && args.url?.includes("tracking-ads.com")) {
      return { __blocked: true, reason: "Blocked navigation to tracking domain" };
    }
  })
  // Inspect or transform results after execution
  .onAfterAction(async (tool, result) => {
    return result;
  })
  // Stream live DOM mutations
  .onDOMMutation(async (delta) => {
    console.log(`[Analytics] DOM change detected: ${delta.type}`);
  })
  .onLoad(async (ctx) => {
    ctx.logger.info("Analytics plugin active with config:", ctx.config);
  })
  .build();
```

### Option C: Declarative `definePlugin` Pattern

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";
import { auditTool } from "./tools.js";

export default definePlugin({
  name: "weavetab-plugin-example",
  version: "1.0.0",

  defaultConfig: {
    enableHud: true,
    maxRetries: 3,
    themeColor: "#3b82f6",
  },

  tools: [auditTool],

  // Enterprise Middleware Hooks
  onBeforeAction: async (tool, args) => {
    // Modify args or block unauthorized tool calls
  },
  onAfterAction: async (tool, result) => {
    // Redact sensitive data before returning to agent
    return result;
  },
  onDOMMutation: async (delta) => {
    // Process live element mutations
  },

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("Plugin loaded! Config:", ctx.config);

    // Dynamic tool registrations also support Zod schemas
    ctx.mcp.registerTool({
      name: "example_ping",
      description: "Health check probe",
      handler: async () => ({ content: [{ type: "text", text: "pong" }] }),
    });
  },

  async onUnload(ctx: PluginContext) {
    ctx.logger.info("Plugin unloaded.");
  },
});
```

---

## 🛡️ Enterprise Middleware & Interceptor Hooks

Enterprise plugins can intercept **every MCP tool call** across the runtime beneath the agent:

### 1. `onBeforeAction` (Ad-Blocking & Security Guards)
```typescript
onBeforeAction: async (tool, args) => {
  // Block destructive actions
  if (tool === "browser_click" && args.selector?.includes(".delete-all")) {
    return { __blocked: true, reason: "Destructive bulk deletion forbidden by security policy" };
  }

  // Inject corporate auth headers
  if (tool === "browser_navigate" && args.url?.startsWith("https://corp.internal/")) {
    return {
      ...args,
      headers: { ...args.headers, Authorization: "Bearer token-xyz" },
    };
  }
}
```

### 2. `onAfterAction` (DLP & PII Redaction)
```typescript
onAfterAction: async (tool, result) => {
  if (tool === "browser_map" || tool === "browser_scrape") {
    // Scrub sensitive identifiers from the DOM text returned to LLMs
    return JSON.parse(
      JSON.stringify(result).replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN REDACTED]")
    );
  }
  return result;
}
```

### 3. `onDOMMutation` (Real-Time DOM Diff Stream)
```typescript
onDOMMutation: async (delta) => {
  if (delta.significantChange) {
    console.log(`DOM mutated on ${delta.url}: ${delta.added?.length || 0} elements added.`);
  }
}
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
  "✨ Automation step complete!",
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


---

## 🧪 Unit Testing & Preflight Verification

`@weavetab/sdk` includes a built-in headless testing harness and preflight auditor so you can test plugins without launching Chrome or establishing live CDP connections:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { createMockContext, simulateToolCall } from "@weavetab/sdk/testing";
import { runPreflight } from "@weavetab/sdk/preflight";

test("plugin passes preflight audit", async () => {
  const audit = await runPreflight(process.cwd());
  assert.equal(audit.success, true);
});

test("simulates tool execution", async () => {
  const ctx = createMockContext({
    config: { key: "value" },
    mockTabUrl: "https://example.com",
  });

  const res = await simulateToolCall(myTool, { param: "value" }, ctx);
  assert.equal(res.isError, undefined);
  assert.ok(res.content.length > 0);
});
```

## 💻 Developer CLI Reference

The `@weavetab/sdk` exposes the `weavetab`, `weavetab-sdk`, and `weavetab-plugin` binaries:

| Command | Description |
|---|---|
| `weavetab init [name] [--template <type>]` | Scaffolds a new TypeScript plugin (5 templates: standard, visual, scraper, automation, override) |
| `weavetab templates` | Lists all 5 available plugin templates |
| `weavetab build` | Compiles TypeScript and synchronizes `weavetab.json` |
| `weavetab manifest` / `schema` | Auto-generates `weavetab.json` manifest from Zod tool definitions & middleware hooks |
| `weavetab dev` | Starts live TypeScript watch mode (`tsc --watch`) |
| `weavetab preflight` | Audits plugin readiness before publish (manifest, permissions, anti-squatting) |
| `weavetab validate [--offline]` | Audits and validates `weavetab.json` schema and permissions (`--offline` skips the remote schema check) |
| `weavetab doctor` | Runs complete developer environment diagnostics and health checks |
| `weavetab publish [--dry-run]` | `npm publish` + sync to the `weavetab.dev` registry |
| `weavetab version` | Displays the current SDK version |

> Both `@weavetab/mcp` and `@weavetab/sdk` ship a `weavetab` binary. In docs, bare `weavetab <sdk-cmd>` means the SDK one — run it via `npx @weavetab/sdk <cmd>` (or the local `npm run` script) to remove ambiguity.

---

## 📦 Publishing Your Plugin

1. **Build and validate:**
   ```bash
   npm run build
   npx @weavetab/sdk validate
   npx @weavetab/sdk doctor
   ```
2. **Publish to npm + sync the registry:**
   ```bash
   npx @weavetab/sdk publish
   # preview first:
   npx @weavetab/sdk publish --dry-run
   ```
3. **Install into Weavetab runtime (npm package name, not a path):**
   ```bash
   weavetab plugin add your-published-package-name
   ```

---

## 📜 License

MIT © [fy2ne](https://github.com/fy2ne)
