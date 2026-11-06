---
title: "Source Tree Architecture"
description: "Internal organization and module boundaries within the @weavetab/sdk package."
product: sdk
section: developers-contributors
order: 3
icon: FolderTree
slug: dev-source
---

# Source Tree Architecture

The `@weavetab/sdk` codebase is organized around clear modular boundaries:

```
sdk/
├── src/
│   ├── index.ts              # Master library exports (definePlugin, defineTool, defineCommand, types)
│   ├── builder.ts            # Fluent PluginBuilder implementation
│   ├── cli.ts                # Developer CLI commands (init, build, manifest, preflight, etc.)
│   ├── preflight.ts          # Security, anti-squatting, and agent instructions context budget auditor
│   ├── testing.ts            # Offline unit test simulation harness (simulateToolCall, etc.)
│   ├── version.ts            # Synchronized package semver constant
│   └── schema/
│       ├── exporter.ts       # Generates JSON Schema Draft-07 from TypeScript types
│       └── validator.ts      # Validates weavetab.json against schema
├── schema/
│   └── plugin.json           # Exported JSON Schema specification
├── tests/
│   ├── builder.test.ts       # Unit tests for PluginBuilder
│   ├── cli.test.ts           # Unit tests for CLI commands
│   ├── preflight.test.ts     # Unit tests for preflight audits and instructions budgeting
│   └── testing.test.ts       # Unit tests for test simulation helpers
├── docs/                     # Documentation markdown files mirrored to weavetab.dev/docs
├── package.json
└── tsconfig.json
```

---

## Key Modules

### `src/preflight.ts`
Enforces the mandatory context budget on instructions:
- `MIN_INSTRUCTIONS_CHARS = 20`
- `MAX_INSTRUCTIONS_CHARS = 3200`
- Legacy `AGENTS.md` fallback: max 80 lines, max 3200 chars.
Also audits permission consistency between code and `weavetab.json`.

### `src/builder.ts`
Provides the fluent, chainable `PluginBuilder` class that validates permissions as tools and commands are attached.

### `src/schema/exporter.ts`
Programmatically generates the single-source-of-truth JSON Schema Draft-07 document (`schema/plugin.json`).
