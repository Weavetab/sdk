---
title: "SDK Overview"
description: "Official TypeScript SDK for Weavetab plugins and visual extensions."
product: sdk
section: sdk-getting-started
badge: new
icon: Boxes
slug: sdk-overview
---

# Weavetab SDK


The **`@weavetab/sdk`** is the official TypeScript developer toolkit for authoring custom MCP tools, modular plugins, in-browser HUD overlays, and tool overrides for the Weavetab automation ecosystem.

## Version Synchronization

> [!IMPORTANT]
> **`@weavetab/sdk`** and **`@weavetab/mcp`** are maintained in lockstep and share synchronized releases. All SDK types, tool interfaces, storage handlers, and extension bridges are guaranteed 100% binary-compatible with the runtime.

```bash
# Install SDK as a development dependency
npm install -D @weavetab/sdk@latest

# Or with pnpm / yarn / bun
pnpm add -D @weavetab/sdk@latest
yarn add -D @weavetab/sdk@latest
bun add -d @weavetab/sdk@latest
```

---

## SDK Core Architecture

The SDK gives developers first-class access to:
1. **Tool Registration & Interception**: Register new MCP tools or wrap/override existing built-in tools (`ctx.mcp.overrideTool`).
2. **Sandboxed Storage**: Private key-value store and JSON files at `~/.weavetab/plugins/<name>/`.
3. **In-Browser Visual Extensions**: Display animated thought bubbles (`showThought`), status badges (`setHudState`), and inject custom CSS/JS.
4. **Lifecycle Hooks**: Intercept actions before or after execution (`beforeToolCall`, `afterToolCall`, `onPageNavigate`).
5. **Developer CLI**: Full CLI toolset for scaffolding, building, watching, and validating plugins.

---

## SDK vs Core MCP Comparison

| Feature | Core MCP (`@weavetab/mcp`) | Developer SDK (`@weavetab/sdk`) |
|---|---|---|
| **Role** | Execution server & 50 built-in tools | Tool/Plugin authoring framework |
| **Target Audience** | AI agents, users, client IDEs | Developers & plugin creators |
| **Package** | `@weavetab/mcp@latest` | `@weavetab/sdk@latest` |
| **Entrypoint** | `weavetab` binary | `@weavetab/sdk` library + CLI |
| **Extension Engine** | Mounts `node_modules` plugins | Builds & validates `weavetab.json` plugins |
