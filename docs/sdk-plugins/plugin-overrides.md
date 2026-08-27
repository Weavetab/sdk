---
title: "Tool Overrides & Hooks"
description: "Intercept built-in tools and subscribe to global lifecycle events."
product: sdk
section: sdk-plugins
icon: GitFork
slug: plugin-overrides
---

# Tool Overrides & Lifecycle Hooks

Plugins can wrap or intercept built-in tools (such as `browser_navigate`, `browser_click`, `browser_eval`) and subscribe to global lifecycle hooks.

---

## 1. Tool Overriding (`overrideTool`)

Intercept an existing tool to add validation, security guards, or logging:

```typescript
ctx.mcp.overrideTool("browser_navigate", async (args: { url: string }, session, config, original) => {
  // Check against custom security rules
  if (args.url.includes("untrusted-domain.com")) {
    if (session) {
      await ctx.extension.showThought(session, "🛡️ Blocked navigation to untrusted domain!");
    }
    return {
      content: [{ type: "text", text: "Navigation blocked by custom security plugin." }],
      isError: true
    };
  }

  // Forward to original built-in handler
  return original ? await original(args, session, config) : null;
});
```

---

## 2. Global Execution Hooks

```typescript
// Before any tool executes
ctx.hooks.beforeToolCall((toolName, args) => {
  ctx.logger.debug(`[Hook] Executing ${toolName}`, args);
});

// After any tool finishes
ctx.hooks.afterToolCall((toolName, args, result) => {
  ctx.logger.debug(`[Hook] Completed ${toolName}`);
});

// On page navigation
ctx.hooks.onPageNavigate?.(async (url, session) => {
  ctx.logger.info(`Navigated to: ${url}`);
});
```
