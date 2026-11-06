---
title: "Plugin CLI Commands"
description: "Authoring standalone terminal commands in plugins, parsing flags, permissions gating, and execution lifecycles."
product: sdk
section: sdk-plugins
order: 3
icon: Terminal
slug: plugin-commands
---

# Plugin CLI Commands

While MCP tools are designed for AI agents operating inside an active agent loop, **Plugin CLI Commands** allow plugins to expose terminal-first subcommands. Developers and CI/CD pipelines can invoke these commands directly from the shell without launching an LLM agent.

```
┌─────────────────────────────────────────────────────────────┐
│                 Two Execution Surfaces                      │
├──────────────────────────────┬──────────────────────────────┤
│  MCP Tools                   │  AI Agents (Claude/Cursor)   │
│  CLI Commands                │  Terminal / Shell Scripts    │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 1. Declaring a Command (`defineCommand`)

Import `defineCommand` from `@weavetab/sdk`:

```typescript
import { defineCommand } from "@weavetab/sdk";

export const migrateCommand = defineCommand({
  name: "migrate",
  description: "Run pending database schema migrations",
  usage: "weavetab plugin use @my-org/plugin-db migrate [--dry-run] [--target <version>]",
  schema: {
    "dry-run": {
      type: "boolean",
      description: "Preview migration steps without writing to disk or database",
    },
    target: {
      type: "string",
      description: "Target migration version timestamp",
    },
  },
  handler: async (args, ctx) => {
    // args is typed based on the schema: { "dry-run"?: boolean; target?: string }
    const isDryRun = Boolean(args["dry-run"]);
    ctx.logger.info(`Running migrations (dry-run: ${isDryRun})...`);

    const result = {
      applied: ["001_init.sql", "002_users.sql"],
      dryRun: isDryRun,
      target: args.target || "latest",
      durationMs: 42,
    };

    // Return value is formatted as JSON when piped or displayed cleanly in terminal
    return result;
  },
});
```

---

## 2. Registering Commands in `definePlugin`

You can declare commands statically in `definePlugin({ commands: [...] })` or dynamically in `onLoad(ctx)`:

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";
import { migrateCommand } from "./commands/migrate.js";
import { pingCommand } from "./commands/ping.js";

export default definePlugin({
  name: "@my-org/plugin-db",
  version: "1.0.0",
  instructions: "Database migration and inspection utilities.",

  // 1. Static registration
  commands: [migrateCommand],

  async onLoad(ctx: PluginContext) {
    // 2. Dynamic registration via ctx.cli
    ctx.cli.registerCommand(pingCommand);
  },
});
```

---

## 3. Permission Gating

Registering CLI commands requires the `commands` capability in `weavetab.json`:

```json
{
  "permissions": {
    "commands": {
      "add": true,
      "reason": "Allows developers to execute schema migrations and status checks via CLI."
    }
  }
}
```

If a plugin attempts to call `ctx.cli.registerCommand()` without `permissions.commands.add: true`, the runtime throws an `UNAUTHORIZED_CAPABILITY` exception and aborts loading.

---

## 4. Invoking Commands via Terminal

Once a plugin is installed or linked locally, users invoke its commands through the Weavetab CLI:

### Full Syntax
```bash
weavetab plugin use <plugin-name-or-alias> <command-name> [--flags]
```

### Shorthand Syntax
```bash
weavetab use <plugin-name-or-alias> <command-name> [--flags]
```

### Examples

```bash
# Run the migrate command with flags
weavetab plugin use @my-org/plugin-db migrate --dry-run

# Shorthand invocation
weavetab use db migrate --target 20261105

# Inspect all commands and tools provided by a plugin
weavetab plugin use db
```

When called without a command name (`weavetab plugin use <pkg>`), the CLI prints:
1. Package version and description.
2. The declared agent instructions.
3. A table of available CLI Commands.
4. A table of available MCP Tools.
5. A table of Utilities (`/` Prompts and `@` Resources).

---

## 5. Command Execution Context

Command handlers receive a `PluginCommandContext` containing:
- `ctx.name`: The plugin package name.
- `ctx.version`: The plugin version.
- `ctx.config`: The active plugin configuration.
- `ctx.storage`: The sandboxed storage API (`get`, `set`, `list`, `getJson`, `setJson`).
- `ctx.logger`: The scoped logger.
- `ctx.tab`: Optional lightweight tab client (if Chrome is running).

---

## 6. Exit Codes and Output Formatting

1. **Structured Return Values**: If your handler returns an object or array, the CLI outputs it as formatted JSON when stdout is not a TTY (e.g. piped to `jq`) or as a human-readable table in terminal sessions.
2. **Standard Output**: You can call `console.log()` directly for terminal output.
3. **Exit Codes**: Throw an error to terminate the CLI command with non-zero exit code:
   ```typescript
   if (!connected) {
     throw new Error("Database connection failed: ECONNREFUSED 127.0.0.1:5432");
   }
   ```
