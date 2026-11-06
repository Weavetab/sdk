---
title: "Visual HUD & In-Page Overlays"
description: "Rendering floating thought bubbles, HUD status badges, custom CSS styling, and client scripts directly in the active browser tab."
product: sdk
section: sdk-plugins
order: 9
icon: Eye
slug: plugin-hud
---

# Visual HUD & In-Page Overlays

Weavetab features an in-browser Heads-Up Display (HUD) rendered directly onto active web tabs over the Chrome DevTools Protocol. Plugins can render animated thought bubbles, update status badges, and inject styling or scripts into pages.

---

## 1. Extension Bridge API (`ctx.extension`)

Access the bridge via `ctx.extension` in tool handlers:

```typescript
import { definePlugin, defineTool, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "weavetab-plugin-visual",
  version: "1.0.0",
  instructions: "Visual inspection tools with live HUD overlays.",

  async onLoad(ctx: PluginContext) {
    ctx.mcp.registerTool(
      defineTool({
        name: "highlight_element",
        description: "Highlights a DOM element with an animated pulse border and displays a thought",
        requiresSession: true,
        schema: {
          selector: z.string().describe("CSS selector to highlight"),
          thoughtText: z.string().describe("Message to display in the floating bubble"),
        },
        handler: async (args, session) => {
          if (!session) throw new Error("Active tab required.");

          // 1. Show floating thought bubble next to element
          await ctx.extension.showThought(
            session,
            `Inspecting ${args.selector}: "${args.thoughtText}"`
          );

          // 2. Update HUD status badge in top-right corner
          await ctx.extension.setHudState(session, {
            status: "active",
            badgeText: "Visual Audit",
            badgeColor: "#3b82f6",
          });

          // 3. Inject custom CSS outline animation
          await ctx.extension.injectCss(
            session,
            `
            ${args.selector} {
              outline: 2px solid #3b82f6 !important;
              outline-offset: 4px !important;
              transition: outline 0.2s ease-in-out !important;
            }
            `
          );

          return {
            content: [{ type: "text", text: `Element ${args.selector} highlighted.` }],
          };
        },
      })
    );
  },
});
```

---

## 2. Thought Bubbles (`showThought`)

Thought bubbles render in the browser viewport, showing the user what the AI agent is thinking or planning:
- Auto-collapses after a configurable duration.
- Never disrupts page layout (rendered in an isolated Shadow DOM container attached to `document.documentElement`).
- Sanitizes user input to prevent DOM-based XSS inside the thought bubble.

---

## 3. Manifest Permissions

Consuming visual extension APIs requires the `extension` permission block:

```json
{
  "permissions": {
    "extension": {
      "hud": true,
      "overlay": true,
      "styles": true,
      "reason": "Renders floating thoughts and injects element outline highlights on audited pages."
    }
  }
}
```
