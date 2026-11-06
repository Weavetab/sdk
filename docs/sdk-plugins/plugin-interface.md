---
title: "Plugin Architecture & Context"
description: "Core interfaces, definePlugin, PluginBuilder, and the complete PluginContext contract."
product: sdk
section: sdk-plugins
order: 1
icon: Puzzle
slug: plugin-interface
---

# Plugin Architecture & APIs

The Weavetab SDK provides two paradigms for creating plugins:
- **`definePlugin`**: A declarative functional API for static and dynamic registration.
- **`PluginBuilder`**: A fluent, chainable builder for complex middleware pipelines.

Both paradigms compile to the same runtime contract and receive a typed **`PluginContext`** at load time.

---

## 1. Type-Safe Tool Definition (`defineTool`)

The SDK uses [Zod](https://zod.dev) for input schema validation. Tools defined with `defineTool` automatically generate JSON Schema Draft-07 representations and infer runtime TypeScript argument types.

```typescript
import { defineTool, z } from "@weavetab/sdk";

export const tableExtractor = defineTool({
  name: "extract_table",
  description: "Extracts tabular data matching a CSS selector into structured JSON rows",
  requiresSession: true, // Requires an active browser tab session
  schema: {
    selector: z.string().describe("CSS selector targeting the <table> or data grid"),
    maxRows: z.number().int().min(1).max(500).default(50).describe("Maximum rows to parse"),
    cleanWhitespace: z.boolean().default(true).describe("Strip extra whitespace and newlines"),
  },
  handler: async (args, session) => {
    // args is strictly typed: { selector: string; maxRows: number; cleanWhitespace: boolean }
    if (!session) {
      throw new Error("Active browser tab is required.");
    }

    const rows = await session.evaluate(`((sel, limit, clean) => {
      const table = document.querySelector(sel);
      if (!table) return [];
      const trs = Array.from(table.querySelectorAll('tbody tr, tr')).slice(0, limit);
      return trs.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td, th'));
        return cells.map(c => clean ? c.innerText.trim().replace(/\\s+/g, ' ') : c.innerText);
      });
    })(${JSON.stringify(args.selector)}, ${args.maxRows}, ${args.cleanWhitespace})`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ selector: args.selector, rowCount: rows.length, rows }, null, 2),
        },
      ],
    };
  },
});
```

### Browser-less Tools (`requiresSession: false`)

Tools that only execute API calls, compute transformations, or query local databases should specify `requiresSession: false`. The host skips launching or connecting to Chrome:

```typescript
export const dnsLookup = defineTool({
  name: "dns_lookup",
  description: "Performs DNS record queries without launching a browser",
  requiresSession: false,
  schema: {
    domain: z.string().describe("Domain name to query"),
    recordType: z.enum(["A", "AAAA", "CNAME", "MX", "TXT"]).default("A"),
  },
  handler: async (args) => {
    // session is undefined, Chrome is never started
    const records = await resolveDns(args.domain, args.recordType);
    return {
      content: [{ type: "text", text: JSON.stringify(records) }],
    };
  },
});
```

---

## 2. Declarative `definePlugin` API

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";
import { tableExtractor } from "./tools/extractor.js";
import { tableCommand } from "./commands/table.js";

export default definePlugin({
  name: "weavetab-plugin-grid",
  version: "1.0.0",
  description: "Grid extraction and data transformation tools",
  instructions: "Grid extraction and data transformation tools.",

  defaultConfig: {
    defaultLimit: 50,
  },

  // Statically registered tools & commands
  tools: [tableExtractor],
  commands: [tableCommand],

  // Lifecycle hooks
  async onLoad(ctx: PluginContext) {
    ctx.logger.info(`Loaded grid plugin with limit=${ctx.config.defaultLimit}`);
  },

  async onUnload(ctx: PluginContext) {
    ctx.logger.info("Unloaded grid plugin");
  },
});
```

---

## 3. Fluent `PluginBuilder` API

For plugins requiring conditional tool mounting or middleware interceptors:

```typescript
import { PluginBuilder, z } from "@weavetab/sdk";

export default new PluginBuilder("weavetab-plugin-security")
  .version("1.0.0")
  .description("Enterprise security auditor and URL sanitizer")
  .instructions("Enterprise security auditor and URL sanitizer.")
  .defaultConfig({ strictAudit: true })
  .allowToolAdd("Registers the security_scan tool")
  .allowCommandAdd("Registers the audit-urls CLI command")
  .addTool({
    name: "security_scan",
    description: "Audits page headers, cookies, and scripts for security compliance",
    schema: {
      deep: z.boolean().default(false),
    },
    handler: async (args, session) => {
      return { content: [{ type: "text", text: "Security scan passed." }] };
    },
  })
  .onBeforeAction(async (tool, args, session) => {
    // Block navigations to unencrypted HTTP addresses
    if (tool === "browser_navigate" && typeof args.url === "string" && args.url.startsWith("http://")) {
      return { __blocked: true, reason: "Plain HTTP navigation blocked by security policy." };
    }
  })
  .onLoad(async (ctx) => {
    ctx.logger.info("Security interceptor armed.");
  })
  .build();
```

---

## 4. The Complete `PluginContext` Contract

The `PluginContext` passed to `onLoad(ctx)` gives plugins access to Weavetab's subsystem APIs:

| Subsystem | Type | Responsibility |
|---|---|---|
| `ctx.name` | `string` | Unique npm package identifier declared in `weavetab.json`. |
| `ctx.version` | `string` | Plugin semver version. |
| `ctx.config` | `Record<string, unknown>` | Merged configuration from defaults and `~/.weavetab/plugins/<name>/config.json`. |
| `ctx.cli` | `PluginCliContext` | Register CLI subcommands invoked via `weavetab plugin use <pkg> <cmd>`. |
| `ctx.mcp` | `PluginMcpContext` | Register MCP tools, `/` prompt templates, `@` resources, and tool overrides. |
| `ctx.storage` | `PluginStorage` | Isolated persistent key-value store and JSON file system. |
| `ctx.extension` | `PluginExtensionBridge`| In-browser visual extensions: floating thoughts, HUD state, CSS/JS injection. |
| `ctx.hooks` | `PluginHooks` | Runtime execution interceptors (`onBeforeAction`, `onAfterAction`, `onDOMMutation`). |
| `ctx.logger` | `PluginLogger` | Scoped logger writing to `~/.weavetab/logs/` with level gating (`info`, `warn`, `error`, `debug`). |

---

## 5. Subsystem Interface Details

### `ctx.cli` (Plugin CLI Engine)

```typescript
interface PluginCliContext {
  // Registers a terminal command callable via `weavetab plugin use <pkg> <cmd>`
  registerCommand(cmd: DefinedCommand): void;
  // Unregisters a command dynamically
  unregisterCommand(name: string): void;
}
```

### `ctx.mcp` (Model Context Protocol Engine)

```typescript
interface PluginMcpContext {
  // Registers an MCP tool for agent function calling
  registerTool(tool: DefinedTool): void;
  // Registers a `/` slash prompt template
  registerPrompt(prompt: DefinedPrompt): void;
  // Registers an `@` context mention or dynamic URI template
  registerResource(resource: DefinedResource): void;
  // Wraps a built-in Weavetab tool with custom logic
  overrideTool(name: string, override: ToolOverrideDefinition): void;
}
```

### `ctx.storage` (Isolated Storage Engine)

```typescript
interface PluginStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  list(): Promise<string[]>;
  clear(): Promise<void>;
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T): Promise<void>;
}
```

### `ctx.extension` (Browser Viewport Engine)

```typescript
interface PluginExtensionBridge {
  // Shows an animated floating thought bubble on the active page
  showThought(session: any, text: string): Promise<void>;
  // Updates the top-right Weavetab HUD state badge
  setHudState(session: any, state: HudState): Promise<void>;
  // Injects custom CSS styling into the page DOM
  injectCss(session: any, css: string): Promise<void>;
  // Injects an arbitrary JavaScript script into the page DOM
  injectScript(session: any, code: string): Promise<any>;
}
```

---

## 6. Error Handling

Throw `PluginError` to deliver structured error responses back to agents and terminal callers:

```typescript
import { PluginError } from "@weavetab/sdk";

throw new PluginError(
  "INVALID_TARGET",
  "Target selector '#payment-form' was not found in the DOM after 3000ms.",
  { selector: "#payment-form", timeoutMs: 3000 }
);
```

Standard error codes:
- `INVALID_ARGUMENTS`: Argument failed schema validation.
- `EXECUTION_FAILED`: Execution threw an unhandled exception.
- `SESSION_REQUIRED`: Tool requires an active tab but none is attached.
- `UNAUTHORIZED_CAPABILITY`: Plugin attempted an action not declared in its `weavetab.json` permissions.
- `RATE_LIMITED`: Plugin exceeded its invocation budget.
