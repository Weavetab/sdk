---
title: "SDK Quickstart"
description: "Scaffold and build a TypeScript plugin in 60 seconds."
product: sdk
section: sdk-getting-started
icon: Rocket
slug: sdk-quickstart
---

# SDK Quickstart

Scaffold a production-grade TypeScript plugin in seconds using the SDK CLI.

## 1. Scaffold a Plugin Project

```bash
npx -y @weavetab/sdk@latest init my-custom-plugin
cd my-custom-plugin
npm install
```

## 2. Project Layout

```
my-custom-plugin/
├── src/
│   └── index.ts        # Plugin implementation & tool definitions
├── weavetab.json       # Manifest declaring tools & permissions
├── package.json        # Dependencies & scripts
├── tsconfig.json       # TypeScript compiler options
└── README.md
```

## 3. Implement Your Tool

```typescript
import { definePlugin, defineTool, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "my-custom-plugin",
  async onLoad(ctx: PluginContext) {
    ctx.mcp.registerTool(
      defineTool({
        name: "greet_page",
        description: "Greets the user and displays a thought bubble on the active tab",
        requiresSession: true,
        schema: {
          name: z.string().describe("Target name to greet"),
        },
        handler: async (args, session) => {
          if (session) {
            await ctx.extension.showThought(session, `Hello, ${args.name}! Welcome to Weavetab.`);
          }
          return {
            content: [{ type: "text", text: `Greeting dispatched to ${args.name}!` }],
          };
        },
      })
    );
  },
});
```

## 4. Build and Validate

```bash
# Build TypeScript and synchronize manifest
npm run build

# Validate schema compliance
npx @weavetab/sdk validate
```

## 5. Install into Weavetab

Install your plugin directly using the Weavetab CLI. Both local workspace directories and published npm packages are supported:

```bash
# Local development install:
weavetab plugin add ./my-custom-plugin

# Or after publishing to npm:
weavetab plugin add my-custom-plugin
```

Installed plugins are stored globally under `~/.weavetab/plugins/` and automatically loaded whenever your IDE or agent connects to Weavetab MCP.
