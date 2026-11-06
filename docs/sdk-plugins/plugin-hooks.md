---
title: "Lifecycle Hooks & Middleware"
description: "Intercepting tool execution, mutating parameters, inspecting DOM mutation streams, and arming security filters."
product: sdk
section: sdk-plugins
order: 7
icon: Webhook
slug: plugin-hooks
---

# Lifecycle Hooks & Middleware

Weavetab plugins can register middleware interceptors that execute around core and third-party tool calls. This allows plugins to audit executions, enforce corporate security policies, scrub sensitive data, and monitor real-time DOM changes.

---

## 1. Available Lifecycle Hooks

| Hook | Phase | Permissions Key |
|---|---|---|
| `onBeforeAction` | Runs **before** an MCP tool is dispatched to CDP. Can modify arguments or block the action entirely. | `permissions.hooks.onBeforeAction` |
| `onAfterAction` | Runs **after** an MCP tool finishes execution. Can inspect, augment, or redact output before it returns to the agent. | `permissions.hooks.onAfterAction` |
| `onDOMMutation` | Fires continuously when the browser tab DOM tree mutates. Delivers delta batches. | `permissions.hooks.onDOMMutation` |
| `onLoad` | Runs once when the plugin is loaded into the MCP server or CLI process. | None (standard lifecycle) |
| `onUnload` | Runs when the plugin is unmounted or the server process receives `SIGTERM`. | None (standard lifecycle) |

---

## 2. Pre-Execution Interception (`onBeforeAction`)

`onBeforeAction` receives the target tool name, its arguments, and an optional browser session reference:

```typescript
import { definePlugin } from "@weavetab/sdk";

export default definePlugin({
  name: "weavetab-plugin-policy",
  version: "1.0.0",
  instructions: "Policy enforcement rules and validation interceptors.",

  onBeforeAction: async (tool, args, session) => {
    // 1. Audit log
    console.log(`[Policy] Pre-action check for: ${tool}`);

    // 2. Block restricted domains
    if (tool === "browser_navigate" && typeof args.url === "string") {
      const parsed = new URL(args.url);
      if (parsed.hostname.endsWith(".internal.bank")) {
        return {
          __blocked: true,
          reason: "Direct AI navigation to internal banking endpoints is strictly blocked by corporate policy.",
        };
      }
    }

    // 3. Mutate arguments (e.g. enforce stealth mode on searches)
    if (tool === "browser_find" && args.extractQuery) {
      return {
        ...args,
        extractQuery: args.extractQuery.trim().toLowerCase(),
      };
    }
  },
});
```

If `onBeforeAction` returns an object containing `{ __blocked: true, reason: string }`, the execution pipeline terminates immediately, the tool is never called, and an error is returned to the agent with the provided reason.

---

## 3. Post-Execution Interception (`onAfterAction`)

`onAfterAction` receives the tool name, its arguments, and the raw output result returned by the tool handler:

```typescript
export default definePlugin({
  name: "weavetab-plugin-scrubber",
  version: "1.0.0",
  instructions: "Output scrubber and pattern redactor.",

  onAfterAction: async (tool, args, result) => {
    // Redact credit card numbers matching regex patterns in any text output
    if (result && Array.isArray(result.content)) {
      result.content = result.content.map((item: any) => {
        if (item.type === "text" && typeof item.text === "string") {
          return {
            ...item,
            text: item.text.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, "[REDACTED_CARD]"),
          };
        }
        return item;
      });
    }

    return result;
  },
});
```

---

## 4. Real-time DOM Mutation Streams (`onDOMMutation`)

When the active tab's DOM tree updates, Weavetab's native Rust delta engine emits structured mutation batches:

```typescript
export default definePlugin({
  name: "weavetab-plugin-live-watcher",
  version: "1.0.0",
  instructions: "Live DOM watcher and real-time state change tracker.",

  onDOMMutation: async (delta) => {
    // delta contains added, removed, and modified nodes
    const addedCount = delta.added?.length ?? 0;
    const removedCount = delta.removed?.length ?? 0;

    if (addedCount > 0) {
      console.log(`[LiveWatcher] +${addedCount} nodes added to active DOM.`);
    }
  },
});
```

---

## 5. Middleware Pipeline Ordering

When multiple plugins are active, hooks execute in registration order:
1. All `onBeforeAction` hooks execute sequentially. If any hook returns `__blocked: true`, the pipeline aborts.
2. The core tool handler (or tool override) executes.
3. All `onAfterAction` hooks execute in reverse order, allowing outer plugins to filter inner plugin modifications.
