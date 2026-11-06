---
title: "Agent Instructions & Context Budget"
description: "The strict context budget standard for Weavetab plugins, manifest instructions, enforcement rules, and authoring guidelines."
product: sdk
section: sdk-plugins
order: 5
icon: Bot
slug: plugin-agents-context
---

# Agent Instructions & Context Budget

Every Weavetab plugin declares concise, high-density instructions for AI agents. These instructions serve as operational heuristics for AI agents across MCP-enabled environments (Claude, Cursor, Windsurf, Zed, Antigravity).

Instructions are declared directly in `weavetab.json` via the `"instructions"` property (or via `.instructions(...)` on `PluginBuilder`), completely eliminating the need for a separate `AGENTS.md` file. For backward compatibility, legacy plugins bundling an `AGENTS.md` file continue to work as a fallback.

To protect AI agents from context window bloat, the SDK and MCP runtime enforce a strict, machine-verified context budget.

---

## 1. The Context Crisis in AI Tooling

When a developer installs 10 plugins, and each plugin injects a 500-line manual into the system prompt:
1. **Thousands of lines of prompt overhead** are parsed before every single turn.
2. **Reasoning ability degrades** due to distraction and attention drift.
3. **Token costs skyrocket** by orders of magnitude.
4. **Context limits are hit prematurely**, causing truncated chat histories.

Weavetab solves this at the protocol level:
- Instructions are strictly capped at **3,200 characters**.
- Declared CLI commands are indexed as structured metadata and formatted into a unified cheatsheet.
- Instructions and commands are dynamically injected into the AI agent's MCP session upon `weavetab plugin add` via hot-swap notifications (`notifications/tools/list_changed`, `notifications/resources/list_changed`).

---

## 2. Declaring Instructions

### Option A: In `weavetab.json` (Recommended)

```json
{
  "$schema": "https://weavetab.dev/schema/plugin.json",
  "name": "weavetab-plugin-sample",
  "version": "1.0.0",
  "entry": "dist/index.js",
  "instructions": "Always call `sample_check` before modifying state. Prefer CLI command `weavetab plugin use sample dump` for offline inspection.",
  "commands": [
    {
      "name": "dump",
      "description": "Export current snapshot to JSON",
      "usage": "weavetab plugin use sample dump [--out file.json]"
    }
  ]
}
```

### Option B: In TypeScript with `definePlugin`

```typescript
import { definePlugin } from "@weavetab/sdk";

export default definePlugin({
  name: "weavetab-plugin-sample",
  version: "1.0.0",
  instructions: "Always call `sample_check` before modifying state.",
  // ...
});
```

### Option C: Using `PluginBuilder`

```typescript
import { PluginBuilder } from "@weavetab/sdk";

export default new PluginBuilder("weavetab-plugin-sample", "1.0.0")
  .instructions("Always call `sample_check` before modifying state.")
  .build();
```

---

## 3. The Context Budget Limits

The SDK audit engine validates instructions against strict boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│             Agent Instructions Audit Boundaries             │
├──────────────────────────────┬──────────────────────────────┤
│  Minimum Characters          │  20 characters               │
│  Maximum Characters          │  3,200 characters            │
│  Maximum Lines (if AGENTS.md)│  80 lines                    │
└──────────────────────────────┴──────────────────────────────┘
```

### Where Enforcement Occurs

| Stage | Command | Behavior on Violation |
|---|---|---|
| **Project Creation** | `weavetab init` | Scaffolds inline instructions into `weavetab.json`. |
| **Local Build** | `weavetab build` | Emits a warning if approaching limits; fails if exceeding. |
| **Preflight Audit** | `weavetab preflight` | Aborts with non-zero exit code if limits are exceeded. |
| **Validation** | `weavetab validate` | Emits strict schema failure if limits are exceeded. |
| **Environment Check** | `weavetab doctor` | Flags non-compliant plugins in workspace or `node_modules`. |
| **Publishing Gate** | `weavetab publish` | **Rejects NPM publish and registry dispatch.** |
| **Host Runtime** | `@weavetab/mcp` loader | Automatically clamps content to 3,200 characters. |

---

## 4. How Agents Access Instructions & Commands

Plugin instructions and CLI commands are exposed to AI agents and developers through multiple channels:

### 1. Direct MCP System Instructions
On MCP initialize handshake, Weavetab delivers a compiled guide containing all active CLI commands and plugin instructions directly into the agent's MCP session.

### 2. Standard MCP Resources
Weavetab exposes dedicated MCP resources:
- `weavetab://instructions`: Aggregated instructions and commands guide for all active plugins.
- `weavetab://commands`: Structured JSON index of all active CLI commands.
- `weavetab://plugins/<plugin-slug>/instructions`: Instructions for a specific plugin (alias: `weavetab://plugins/<plugin-slug>/agents`).

### 3. Terminal Inspection
```bash
# Print instructions for a plugin
weavetab plugin use <plugin-name> instructions

# Inspect full plugin details (tools, commands, utilities)
weavetab plugin use <plugin-name>
```

---

## 5. Preflight Checklist

Before publishing your plugin, run:

```bash
npx @weavetab/sdk preflight
```

If your instructions pass:
```
✓ Agent instructions budget verified (1420 chars)
✓ Manifest permissions verified
✓ All checks passed
```
