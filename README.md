# @weavetab/sdk

> Official TypeScript SDK and Developer Toolkit for building plugins for **[Weavetab](https://weavetab.pages.dev)**.

[![npm version](https://img.shields.io/npm/v/@weavetab/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@weavetab/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/status-beta-f59e0b.svg?style=flat-square)](https://weavetab.pages.dev)

---

> [!WARNING]
> **BETA RELEASE (v2.4.0-beta.3)**
>
> The Weavetab Plugin System and SDK are currently in **Beta**.
> While the core extension architecture is stable, APIs may receive refinements as the ecosystem evolves. Feedback and issues are welcome!

---

## ⚡ Overview

`@weavetab/sdk` empowers developers to build modular, type-safe plugins and custom Model Context Protocol (MCP) tools that seamlessly hook into the Weavetab runtime.

Whether you are building custom browser automation workflows, DOM scrapers, AI agent extensions, or enterprise integrations, `@weavetab/sdk` provides the typings, manifest synchronizers, and developer CLI you need.

- 🌐 **Official Website:** [https://weavetab.pages.dev](https://weavetab.pages.dev)
- 📦 **NPM Package:** [`@weavetab/sdk`](https://www.npmjs.com/package/@weavetab/sdk)
- 🐙 **GitHub Repository:** [https://github.com/weavetab/sdk](https://github.com/weavetab/sdk)

---

## 🔢 Version Alignment (1:1 with MCP)

`@weavetab/sdk` shares **identical version numbering** with the core `@weavetab/mcp` engine:

* **Unified SemVer:** `@weavetab/sdk@2.4.x` targets and is tested against `@weavetab/mcp@2.4.x`.
* **Zero Confusion:** When specifying `"engines": { "weavetab": "^2.4.0" }` in your `weavetab.json`, install `@weavetab/sdk@^2.4.0`.
* **Forward Compatibility:** Plugins built on `v2.4.0` are forward-compatible across minor and patch releases (e.g. `v2.5.0`, `v2.6.0`).

---

## 🚀 Quick Start

### 1. Scaffold a New Plugin (Fastest)

Run the SDK CLI with `npx -y` to initialize a ready-to-code plugin repository:

```bash
npx -y @weavetab/sdk init my-custom-plugin
cd my-custom-plugin
npm install
```

### 2. Or Install as a Dev Dependency in an Existing Project

Install `@weavetab/sdk` into your `devDependencies` (`-D`):

```bash
npm install -D @weavetab/sdk@beta
```

### 3. Plugin Project Structure

```
my-custom-plugin/
├── src/
│   └── index.ts        # Plugin entrypoint (tools, hooks)
├── weavetab.json       # Plugin manifest (auto-synced)
├── package.json
└── tsconfig.json
```

---

## 🛠️ Authoring a Plugin

A Weavetab plugin is an ES module exporting a plugin definition via `definePlugin`:

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "weavetab-plugin-example",

  async onLoad(ctx: PluginContext) {
    console.log("[MyPlugin] Loaded successfully!");

    // Register a custom tool available to AI agents via MCP
    ctx.mcp.registerTool({
      name: "extract_page_summary",
      description: "Extracts high-level summary and metadata from current active tab",
      schema: {
        type: "object",
        properties: {
          maxLength: {
            type: "number",
            description: "Maximum summary length in characters",
          },
        },
      },
      handler: async (args) => {
        return {
          content: [
            {
              type: "text",
              text: `Summary extracted (max length: ${args.maxLength ?? 500})`,
            },
          ],
        };
      },
    });
  },

  async onUnload(ctx: PluginContext) {
    console.log("[MyPlugin] Unloaded.");
  },
});
```

---

## 📄 Manifest Specification (`weavetab.json`)

Every plugin contains a `weavetab.json` describing its runtime requirements, permissions, and tool signatures:

```json
{
  "$schema": "https://weavetab.pages.dev/schema/plugin.json",
  "name": "weavetab-plugin-example",
  "version": "1.0.0",
  "description": "Custom high-performance tools for Weavetab AI agents",
  "entry": "dist/index.js",
  "engines": {
    "weavetab": "^2.4.0",
    "node": ">=18.0.0"
  },
  "environments": ["mcp"],
  "permissions": {
    "cdp": {
      "evaluate": true,
      "reason": "Evaluates DOM scripts for page extraction"
    }
  },
  "tools": [
    {
      "name": "extract_page_summary",
      "description": "Extracts high-level summary and metadata from current active tab"
    }
  ]
}
```

---

## 💻 SDK CLI Reference

The `@weavetab/sdk` package installs the `weavetab` CLI in development environments:

| Command | Description |
|---|---|
| `weavetab init [name]` | Scaffolds a new TypeScript plugin project |
| `weavetab build` | Compiles TypeScript and updates `weavetab.json` manifest |
| `weavetab validate` | Audits and validates `weavetab.json` schema and permissions |
| `weavetab --version` | Displays current SDK version |

---

## 📦 Publishing Your Plugin

1. Build your plugin:
   ```bash
   npm run build
   ```
2. Publish to npm:
   ```bash
   npm publish --access public
   ```
3. End-users can now load your plugin into Weavetab:
   ```bash
   weavetab plugin add your-plugin-name
   ```

---

## 📜 License

MIT © [fy2ne](https://github.com/fy2ne)
