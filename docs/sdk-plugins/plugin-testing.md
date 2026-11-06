---
title: "Testing & Validation Harness"
description: "Testing Weavetab plugins offline using @weavetab/sdk/testing, simulating tool calls, commands, and mock CDP sessions."
product: sdk
section: sdk-plugins
order: 6
icon: CheckCircle
slug: plugin-testing
---

# Testing & Validation Harness

The `@weavetab/sdk/testing` module provides an offline testing harness for unit and integration testing Weavetab plugins. You do not need to launch Chrome or connect to an MCP client to verify tool handlers, CLI commands, or lifecycle hooks.

---

## 1. Core Testing Utilities

Import helpers from `@weavetab/sdk/testing`:

```typescript
import {
  simulateToolCall,
  simulateCommandCall,
  simulateHook,
  createMockContext,
  createMockSession,
} from "@weavetab/sdk/testing";
```

| Utility | Description |
|---|---|
| `simulateToolCall(tool, args, options)` | Invokes a `defineTool` handler with schema validation, mock CDP session, and mock context. |
| `simulateCommandCall(command, args, options)` | Invokes a `defineCommand` handler with mock command context. |
| `simulateHook(hookFn, ...args)` | Executes a middleware hook (`onBeforeAction`, etc.) and returns modified result or block payload. |
| `createMockContext(overrides)` | Generates an in-memory `PluginContext` with mock storage, scoped logger, and mock CLI/MCP registries. |
| `createMockSession(evaluates)` | Generates a mock browser tab session with programmable `session.evaluate()` return values. |

---

## 2. Testing an MCP Tool

Here is a complete unit test using Node's native test runner (`node:test` and `node:assert`):

```typescript
// tests/extractor.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulateToolCall, createMockSession, createMockContext } from "@weavetab/sdk/testing";
import { tableExtractor } from "../src/tools/extractor.js";

describe("tableExtractor tool", () => {
  it("extracts clean table rows from page DOM", async () => {
    // 1. Create a mock session that simulates document.querySelector in page
    const mockSession = createMockSession({
      evaluate: async (code: string) => {
        return [
          ["Header 1", "Header 2"],
          ["Row 1 Col 1", "Row 1 Col 2"],
        ];
      },
    });

    const ctx = createMockContext({ name: "test-plugin" });

    // 2. Simulate tool invocation
    const res = await simulateToolCall(
      tableExtractor,
      { selector: "#data-table", maxRows: 10, cleanWhitespace: true },
      { session: mockSession, context: ctx }
    );

    // 3. Verify tool response content
    assert.equal(res.content[0].type, "text");
    const parsed = JSON.parse(res.content[0].text);
    assert.equal(parsed.rowCount, 2);
    assert.deepEqual(parsed.rows[0], ["Header 1", "Header 2"]);
  });

  it("throws validation error on invalid arguments", async () => {
    await assert.rejects(
      async () => {
        await simulateToolCall(tableExtractor, {
          selector: 123 as any, // invalid type
        });
      },
      /Expected string, received number/
    );
  });
});
```

---

## 3. Testing a Plugin CLI Command

Use `simulateCommandCall` to test terminal command handlers:

```typescript
// tests/commands.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulateCommandCall, createMockContext } from "@weavetab/sdk/testing";
import { migrateCommand } from "../src/commands/migrate.js";

describe("migrateCommand CLI", () => {
  it("executes dry-run without writing changes", async () => {
    const ctx = createMockContext({
      name: "test-db-plugin",
      config: { env: "test" },
    });

    const res = await simulateCommandCall(
      migrateCommand,
      { "dry-run": true },
      { context: ctx }
    );

    assert.equal(res.dryRun, true);
    assert.equal(res.applied.length, 2);
  });
});
```

---

## 4. Testing Sandboxed Storage

`createMockContext` provides an in-memory `PluginStorage` implementation so tests do not write to the user's home directory:

```typescript
it("persists key-value data in storage", async () => {
  const ctx = createMockContext();

  await ctx.storage.set("token", "xyz_123");
  assert.equal(await ctx.storage.get("token"), "xyz_123");

  await ctx.storage.setJSON("settings", { retries: 5 });
  const settings = await ctx.storage.getJSON<{ retries: number }>("settings");
  assert.equal(settings?.retries, 5);

  const keys = await ctx.storage.list();
  assert.deepEqual(keys.sort(), ["settings", "token"]);
});
```

---

## 5. Testing Middleware Hooks

Verify that security filters block unwanted actions:

```typescript
it("blocks unencrypted HTTP navigations in onBeforeAction hook", async () => {
  const hook = async (tool: string, args: any) => {
    if (tool === "browser_navigate" && args.url?.startsWith("http://")) {
      return { __blocked: true, reason: "Insecure navigation." };
    }
  };

  const blocked = await simulateHook(hook, "browser_navigate", { url: "http://insecure.local" });
  assert.equal(blocked?.__blocked, true);

  const allowed = await simulateHook(hook, "browser_navigate", { url: "https://secure.com" });
  assert.equal(allowed, undefined);
});
```
