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
npx -y @weavetab/sdk@latest init my-custom-plugin --template standard
cd my-custom-plugin
npm install
```

## 2. Explore the Scaffolding Layout

```
my-custom-plugin/
├── src/
│   └── index.ts        # Plugin implementation
├── weavetab.json       # Manifest declaring tools & permissions
├── package.json        # Dependencies & scripts
├── tsconfig.json       # TypeScript compiler options
└── README.md
```

## 3. Implement Your Tool

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "my-custom-plugin",
  async onLoad(ctx: PluginContext) {
    ctx.mcp.registerTool({
      name: "greet_page",
      description: "Greets the user and shows a thought bubble on the active browser tab",
      schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Your name" }
        },
        required: ["name"]
      },
      handler: async (args: { name: string }, session: any) => {
        if (session) {
          await ctx.extension.showThought(session, `Hello, ${args.name}! Welcome to Weavetab.`);
        }
        return {
          content: [{ type: "text", text: `Greeting dispatched to ${args.name}!` }]
        };
      }
    });
  }
});
```

## 4. Build and Validate

```bash
# Build TypeScript and synchronize manifest
npm run build

# Validate schema compliance
npm run validate
```

## 5. Install into Weavetab

```bash
weavetab plugin add ./my-custom-plugin
```
