---
title: "Tool Overrides"
description: "Wrapping built-in Weavetab tools, pre-processing arguments, and post-processing results."
product: sdk
section: sdk-plugins
order: 10
icon: Replace
slug: plugin-overrides
---

# Tool Overrides

Tool overrides allow plugins to wrap built-in Weavetab tools (e.g. `browser_click`, `browser_navigate`, `browser_fill`) without replacing the underlying CDP mechanics.

Use cases include:
- Enforcing enterprise compliance checks on specific actions.
- Automatically taking screenshots before and after high-stakes operations.
- Translating legacy selector formats into modern semantic selectors.

---

## 1. Registering an Override

Use `ctx.mcp.overrideTool` inside `onLoad`:

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "weavetab-plugin-safe-clicks",
  version: "1.0.0",
  instructions: "Safety policy overrides for browser click actions.",

  async onLoad(ctx: PluginContext) {
    ctx.mcp.overrideTool("browser_click", {
      description: "Clicks an element with pre-flight double-click prevention and audit logging",
      handler: async (args, session, originalHandler) => {
        ctx.logger.info(`Pre-click audit on selector: ${args.selector || args.targetRef}`);

        // Block clicks on dangerous selectors
        if (typeof args.selector === "string" && args.selector.includes(".btn-delete-account")) {
          throw new Error("Clicking account deletion buttons is blocked by safety policy.");
        }

        // Call the original built-in handler
        const result = await originalHandler(args, session);

        // Augment result with audit metadata
        return {
          ...result,
          metadata: {
            auditedBy: ctx.name,
            timestamp: Date.now(),
          },
        };
      },
    });
  },
});
```

---

## 2. Manifest Permission

Overriding built-in tools requires explicit declaration under `permissions.tools.override`:

```json
{
  "permissions": {
    "tools": {
      "override": ["browser_click"],
      "reason": "Audits mouse clicks and blocks high-risk account deletion buttons."
    }
  }
}
```

The runtime verifies that any tool wrapped via `overrideTool` is present in `permissions.tools.override`. Undeclared overrides fail validation.
