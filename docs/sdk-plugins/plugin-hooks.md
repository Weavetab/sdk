---
title: "Plugin Middleware & Hooks"
description: "Interceptor hooks: onBeforeAction, onAfterAction, and onDOMMutation."
product: sdk
section: sdk-plugins
icon: ShieldAlert
slug: plugin-hooks
---

# Plugin Middleware & Interceptor Hooks

Weavetab plugins do not just register isolated tools. Through the interceptor pipeline, plugins act as **middleware** running beneath every MCP tool call executed by AI agents across web and desktop contexts.

Common use cases:
- **Automated Ad & Tracker Blocking**: Block navigations or clicks targeting known advertising or phishing domains.
- **Enterprise Auth Injection**: Automatically inject OAuth tokens, session cookies, or custom headers before actions execute.
- **Data Loss Prevention (DLP) & PII Scrubbing**: Inspect, mask, or redact sensitive fields (SSNs, credit cards, bearer tokens) in tool results before the agent receives them.
- **Live DOM Mutation Listening**: Stream element insertions, deletions, and attribute changes across page state transitions.

---

## 1. `onBeforeAction(tool, args, session)`

Runs immediately before any tool handler (built-in or plugin-provided) executes.

### Signature:
```typescript
type BeforeActionHook = (
  toolName: string,
  args: Record<string, any>,
  session: any
) => Promise<Record<string, any> | { __blocked: true; reason: string } | void | undefined>;
```

### Pattern A: Blocking Dangerous or Unauthorized Actions
If an action violates policy, return `{ __blocked: true, reason: string }`. The tool execution will be halted immediately, and the MCP agent will receive an error without touching the browser.

```typescript
import { definePlugin } from "@weavetab/sdk";

export default definePlugin({
  name: "enterprise-guard",
  version: "1.0.0",
  onBeforeAction: async (tool, args) => {
    // Block clicks on destructive or untrusted controls
    if (tool === "browser_click" && args.selector?.includes(".delete-account")) {
      return {
        __blocked: true,
        reason: "Account deletion actions are restricted by enterprise policy.",
      };
    }

    // Block navigation to known tracking or malicious domains
    if (tool === "browser_navigate" && args.url?.includes("tracking-service.com")) {
      return {
        __blocked: true,
        reason: "Navigation to tracking domains is prohibited.",
      };
    }
  },
});
```

### Pattern B: Mutating Arguments (Auth & Header Injection)
Return a modified `args` object to enrich or rewrite parameters before the tool receives them:

```typescript
import { definePlugin } from "@weavetab/sdk";

export default definePlugin({
  name: "auth-injector",
  version: "1.0.0",
  onBeforeAction: async (tool, args, session) => {
    if (tool === "browser_navigate" && args.url?.startsWith("https://api.internal/")) {
      return {
        ...args,
        headers: {
          ...args.headers,
          Authorization: `Bearer ${process.env.CORP_API_TOKEN}`,
        },
      };
    }
  },
});
```

---

## 2. `onAfterAction(tool, result, session, args)`

Runs immediately after a tool finishes execution. Receives the raw tool result and can transform, redact, or record telemetry.

### Signature:
```typescript
type AfterActionHook = (
  toolName: string,
  result: any,
  session: CDP.Client | null,
  args?: Record<string, any>
) => Promise<any | void | undefined>;
```

### Pattern: PII Redaction & Data Loss Prevention (DLP)
```typescript
import { definePlugin } from "@weavetab/sdk";

export default definePlugin({
  name: "pii-masker",
  version: "1.0.0",
  onAfterAction: async (tool, result) => {
    if (tool === "browser_map" || tool === "browser_scrape") {
      const sanitized = JSON.stringify(result)
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED-SSN]")
        .replace(/\b(?:\d{4}-){3}\d{4}\b/g, "[REDACTED-CC]");
      return JSON.parse(sanitized);
    }
    return result;
  },
});
```

---

## 3. `onDOMMutation(delta, session)`

Receives real-time DOM mutation events whenever page elements are added, removed, or modified.

### Signature:
```typescript
type DOMMutationHook = (
  delta: DOMMutationDelta,
  session: CDP.Client | null
) => Promise<void>;

interface DOMMutationDelta {
  type: "dom_diff" | "rich_delta" | "cdp_mutation";
  timestamp: number;
  url?: string;
  added?: Array<any>;
  removed?: Array<any>;
  changed?: Array<any>;
  stable_count?: number;
  iframes?: Array<{ frameUrl: string; status: "added" | "removed" | "changed"; elementCount: number }>;
  significantChange?: boolean;
}
```

### Pattern: Live Mutation Monitoring
```typescript
import { definePlugin } from "@weavetab/sdk";

export default definePlugin({
  name: "mutation-sentinel",
  version: "1.0.0",
  onDOMMutation: async (delta) => {
    if (delta.significantChange) {
      console.log(`[Sentinel] Major DOM change detected on ${delta.url}:`);
      console.log(` - Added elements: ${delta.added?.length ?? 0}`);
      console.log(` - Removed elements: ${delta.removed?.length ?? 0}`);
      console.log(` - Changed properties: ${delta.changed?.length ?? 0}`);
    }
  },
});
```

---

## 4. Manifest Security Declaration

When using middleware hooks, declare the `hooks` permission in `weavetab.json`:

```json
{
  "permissions": {
    "hooks": {
      "onBeforeAction": true,
      "onAfterAction": true,
      "onDOMMutation": true,
      "reason": "Enforces enterprise ad-blocking, security policies, and PII masking"
    }
  },
  "middleware": {
    "onBeforeAction": true,
    "onAfterAction": true,
    "onDOMMutation": true
  }
}
```

The SDK CLI auto-generates the `middleware` block when you run `weavetab build` or `weavetab manifest`.
