---
title: "Quickstart"
description: "Step-by-step guide to scaffolding, building, testing, and verifying a Weavetab plugin."
product: sdk
section: sdk-getting-started
order: 2
icon: Rocket
slug: sdk-quickstart
---

# Plugin Developer Quickstart

Build and verify a production-ready Weavetab plugin in under two minutes.

---

## 1. Scaffold the Project

Run the SDK interactive scaffolding tool:

```bash
npx @weavetab/sdk init my-weavetab-plugin
cd my-weavetab-plugin
npm install
```

The CLI creates a preconfigured project with TypeScript strict mode, Zod validation, and a schema-compliant `weavetab.json` with embedded agent instructions:

```
my-weavetab-plugin/
├── src/
│   └── index.ts          # Plugin entrypoint (tools, commands, utilities)
├── tests/
│   └── index.test.ts     # Offline test harness using @weavetab/sdk/testing
├── weavetab.json         # Manifest declaring tools, commands, instructions, and permissions
├── package.json          # Dependencies & build scripts
├── tsconfig.json         # Strict TypeScript configuration
└── README.md             # Human-facing installation instructions
```

---

## 2. Implement the Plugin

Open `src/index.ts`. Every plugin registers capabilities through `definePlugin`:

```typescript
import {
  definePlugin,
  defineTool,
  defineCommand,
  definePrompt,
  defineResource,
  z,
  type PluginContext
} from "@weavetab/sdk";

export default definePlugin({
  name: "my-weavetab-plugin",
  version: "1.0.0",
  description: "Production plugin demonstrating tools, CLI commands, and utilities",
  instructions: "Extracts OpenGraph, title, and meta descriptions from active browser tab. Run extract_metadata after page navigation completes.",

  defaultConfig: {
    maxRetries: 3,
    verbose: false,
  },

  async onLoad(ctx: PluginContext) {
    // 1. Register an MCP Tool (called by AI agents)
    ctx.mcp.registerTool(
      defineTool({
        name: "extract_metadata",
        description: "Extracts OpenGraph and Twitter card metadata from the active tab",
        requiresSession: true,
        schema: {
          includeFavicon: z.boolean().default(false).describe("Include favicon URL in output"),
        },
        handler: async (args, session) => {
          if (!session) {
            throw new Error("Active browser tab required.");
          }

          // Evaluate script in the tab context
          const data = await session.evaluate(`(() => {
            const get = (sel) => document.querySelector(sel)?.getAttribute('content') || null;
            return {
              title: document.title,
              description: get('meta[name="description"]') || get('meta[property="og:description"]'),
              ogImage: get('meta[property="og:image"]'),
              canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || window.location.href,
            };
          })()`);

          // Show in-browser HUD thought bubble
          await ctx.extension.showThought(session, `Extracted metadata for ${data.title}`);

          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          };
        },
      })
    );

    // 2. Register a CLI Command (called via terminal)
    ctx.cli.registerCommand(
      defineCommand({
        name: "check-config",
        description: "Prints active configuration and storage state to stdout",
        usage: "weavetab plugin use my-weavetab-plugin check-config [--json]",
        schema: {
          json: { type: "boolean", description: "Output as raw JSON" },
        },
        handler: async (args) => {
          const stored = await ctx.storage.list();
          const payload = {
            plugin: ctx.name,
            version: ctx.version,
            config: ctx.config,
            storedKeysCount: stored.length,
          };

          if (args.json) {
            return payload;
          }

          console.log(`Plugin: ${payload.plugin} v${payload.version}`);
          console.log(`Stored Keys: ${payload.storedKeysCount}`);
          return payload;
        },
      })
    );

    // 3. Register a Prompt Utility (/ slash command in MCP clients)
    ctx.mcp.registerPrompt(
      definePrompt({
        name: "audit_seo",
        description: "Generate an SEO optimization plan for the active page",
        arguments: {
          targetKeyword: z.string().describe("Primary keyword target"),
        },
        handler: async ({ targetKeyword }, { tab }) => {
          const title = (await tab?.evaluate("document.title")) || "Unknown Page";
          return `Perform an SEO audit on "${title}" targeting keyword "${targetKeyword}". Check title tags, meta descriptions, heading hierarchy, and image alt text.`;
        },
      })
    );

    // 4. Register a Resource Utility (@ context mention in MCP clients)
    ctx.mcp.registerResource(
      defineResource({
        name: "plugin-telemetry",
        uri: "metadata://telemetry",
        description: "Runtime telemetry and invocation counters",
        mimeType: "application/json",
        read: async () => {
          const keys = await ctx.storage.list();
          return JSON.stringify({ keys, uptimeSec: process.uptime() }, null, 2);
        },
      })
    );
  },

  async onUnload(ctx: PluginContext) {
    ctx.logger.info("Plugin unloaded cleanly.");
  },
});
```

---

## 3. Configure `weavetab.json`

Grant the necessary permissions in your manifest:

```json
{
  "$schema": "https://weavetab.dev/schema/plugin.json",
  "name": "my-weavetab-plugin",
  "version": "1.0.0",
  "description": "Production plugin demonstrating tools, CLI commands, and utilities",
  "entry": "dist/index.js",
  "instructions": "Extracts OpenGraph, title, and meta descriptions from active browser tab. Run extract_metadata after page navigation completes.",
  "defaultConfig": {
    "maxRetries": 3,
    "verbose": false
  },
  "permissions": {
    "tools": {
      "add": true,
      "reason": "Registers the extract_metadata tool."
    },
    "commands": {
      "add": true,
      "reason": "Registers the check-config CLI command."
    },
    "prompts": {
      "add": true,
      "reason": "Registers the /audit_seo prompt shortcut."
    },
    "resources": {
      "add": true,
      "reason": "Exposes @metadata://telemetry context resource."
    },
    "extension": {
      "hud": true,
      "reason": "Displays floating thought bubbles during metadata extraction."
    },
    "cdp": {
      "evaluate": true,
      "reason": "Evaluates page DOM queries to extract meta tags."
    }
  }
}
```

---

## 4. Declare Agent Instructions

Instructions can be declared directly in `weavetab.json` under `"instructions": string` (max 3,200 characters) or passed to `definePlugin({ instructions })`. No separate `AGENTS.md` file is needed:

```json
{
  "instructions": "Run extract_metadata only after page navigation has completed. For headless CLI checks, invoke weavetab plugin use my-weavetab-plugin check-config --json."
}
```

---

## 5. Build, Validate & Test

Compile TypeScript and synchronize the manifest:

```bash
# 1. Compile and auto-sync weavetab.json
npm run build

# 2. Run preflight security and instructions budget audit
npx @weavetab/sdk preflight

# 3. Validate against official JSON schema
npx @weavetab/sdk validate

# 4. Run unit tests
npm test
```

---

## 6. Test with Weavetab CLI

Test your plugin directly in the terminal before publishing:

```bash
# Inspect registered tools, commands, utilities, and instructions
weavetab plugin use .

# Execute your CLI command
weavetab plugin use . check-config --json

# Read the agent instructions
weavetab plugin use . instructions
```
