---
title: "SDK Overview"
description: "Architecture, runtime contracts, and core primitives for authoring Weavetab plugins."
product: sdk
section: sdk-getting-started
order: 1
badge: new
icon: Boxes
slug: sdk-overview
---

# Weavetab SDK Overview

The **`@weavetab/sdk`** is the official TypeScript development kit for creating plugins in the Weavetab Layer-0 automation ecosystem. It provides strictly typed contracts for extending Weavetab across four execution surfaces:

1. **Model Context Protocol (MCP)**: Register custom tools (`defineTool`) callable by any MCP client (Claude Desktop, Cursor, Windsurf, Zed, Antigravity).
2. **Terminal CLI Commands**: Register standalone CLI subcommands (`defineCommand`) callable directly from developer terminals via `weavetab plugin use <pkg> <cmd>`.
3. **Prompts & Resources**: Expose `/` prompt templates (`definePrompt`) and `@` context resources (`defineResource`) with RFC 6570 dynamic URI templates.
4. **Browser Runtime Extensions**: Inject visual HUD thought bubbles, status badges, custom CSS highlights, and intercept CDP actions before or after execution.

---

## The Tri-Package Lockstep Standard

Weavetab adheres to a strict Tri-Package Version Lock-Step standard. The core MCP server, developer SDK, and skills package share identical semver versions:

```
┌─────────────────────────────────────────────────────────────┐
│                      Weavetab Ecosystem                     │
├──────────────────────────────┬──────────────────────────────┤
│  @weavetab/mcp (v2.6.3)      │  Core MCP server & runtime   │
│  @weavetab/sdk (v2.6.3)      │  Developer authoring toolkit │
│  @weavetab/skills (v2.6.3)   │  Operational agent recipes   │
└──────────────────────────────┴──────────────────────────────┘
```

Every release of `@weavetab/sdk` is verified against the matching `@weavetab/mcp` binary. Type definitions, schema exports, and IPC communication bridges have zero API or ABI drift.

---

## Installation

Add the SDK as a dependency in your plugin repository:

```bash
# npm
npm install @weavetab/sdk@^2.6.3

# pnpm
pnpm add @weavetab/sdk@^2.6.3

# bun
bun add @weavetab/sdk@^2.6.3
```

---

## Core Primitives

| Primitive | API | Primary Surface | Permission Key |
|---|---|---|---|
| **MCP Tool** | `defineTool()` | AI Agent Function Calling | `permissions.tools.add` |
| **CLI Command** | `defineCommand()` | Terminal / Shell Scripts | `permissions.commands.add` |
| **`/` Prompt** | `definePrompt()` | Chatbot Slash Commands | `permissions.prompts.add` |
| **`@` Resource**| `defineResource()` | Dynamic Context Injection | `permissions.resources.add` |
| **Visual HUD** | `ctx.extension.showThought()` | Live Browser Viewport | `permissions.extension.hud` |
| **Lifecycle Hook** | `onBeforeAction()`, `onAfterAction()` | Execution Interceptor | `permissions.hooks` |
| **DOM Stream** | `onDOMMutation()` | Real-time DOM Observer | `permissions.hooks.onDOMMutation` |
| **Sandboxed Store**| `ctx.storage` | `~/.weavetab/plugins/<name>/`| `permissions.config` |

---

## Security & Permission Model

Weavetab plugins run locally under a zero-privilege security model. Every capability a plugin consumes must be explicitly declared in its `weavetab.json` manifest with a human-readable `reason`:

```json
{
  "name": "@my-org/weavetab-plugin-db",
  "displayName": "Database Inspector",
  "description": "Local database schema and migration toolkit for Weavetab",
  "permissions": {
    "commands": {
      "add": true,
      "reason": "Allows running local database migrations and schema checks via terminal."
    },
    "tools": {
      "add": true,
      "reason": "Exposes db_query and db_schema tools to connected AI agents."
    },
    "network": {
      "domains": ["api.database.internal", "localhost:5432"],
      "reason": "Connects to staging database instances."
    }
  }
}
```

The runtime enforces these declarations at three boundaries:
1. **Manifest Validation**: `weavetab validate` audits declarations against the JSON Schema and `package.json`.
2. **Registration Enforcement**: The plugin loader blocks any attempt to register tools, commands, prompts, resources, or hooks not granted in the manifest.
3. **Execution Sandboxing**: Network and filesystem requests outside the plugin's isolated directory are blocked.

---

## The AI Agent Context Budget Standard

A core failure mode in AI agent tooling is prompt bloat. When multiple plugins inject pages of documentation into an agent's system prompt, reasoning degrades rapidly and context window limits are breached.

To prevent context window degradation, the SDK enforces a strict agent `instructions` context budget declared in `weavetab.json`:

```
┌─────────────────────────────────────────────────────────────┐
│             Agent Instructions Context Budget               │
├──────────────────────────────┬──────────────────────────────┤
│  Minimum Characters          │  10 chars (when provided)    │
│  Maximum Characters          │  3,200 chars                 │
│  Maximum Lines               │  80 lines                    │
│  Enforcement Points          │  init, build, validate,      │
│                              │  doctor, publish, runtime    │
└─────────────────────────────────────────────────────────────┘
```

The preflight auditor in `weavetab preflight` and `weavetab publish` evaluates `instructions` in `weavetab.json`. If a plugin exceeds 80 lines or 3,200 characters, publishing is rejected. At runtime, Weavetab groups each plugin's `instructions` and CLI `commands` cleanly for connected agents.

---

## Architectural Comparison

| Dimension | Core MCP Server (`@weavetab/mcp`) | Developer SDK (`@weavetab/sdk`) |
|---|---|---|
| **Role** | Execution host, CDP connector, RPC dispatcher | Authoring framework, CLI build tools, testing harness |
| **Primary Audience**| AI assistants, automation engineers, end users | Plugin creators, system integrators |
| **Runtime Scope** | In-process daemon, stdio / WebSocket transport | Library imported by plugin packages |
| **Built-in Tools** | 41 core tools (`browser_click`, `browser_fill`, etc.) | None (supplies tool builder contracts) |
| **Configuration** | `~/.weavetab/config.json` | `weavetab.json` & `package.json` in plugin root |
