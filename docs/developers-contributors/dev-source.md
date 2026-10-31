---
title: "Source Structure"
description: "Codebase architecture across /MCP, /sdk, and /skills."
product: sdk
section: developers-contributors
icon: Code
slug: dev-source
---

# Codebase Source Architecture

Weavetab is organized into a clean multi-package monorepo:

```
Weavetab/
├── MCP/                    # Core Model Context Protocol server (@weavetab/mcp v2.6.0)
│   ├── src/
│   │   ├── cdp/            # Direct Chrome DevTools Protocol (CDP) bridge
│   │   ├── intelligence/   # Delta Engine, Session Memory, Loop Detection
│   │   ├── sensors/        # Network telemetry, mutation observers, thought HUD
│   │   ├── security/       # Domain blacklist, RBAC roles, Blind Injection
│   │   ├── tools/          # 41 built-in tool implementations
│   │   ├── overlay/        # Ghost Cursor canvas & Shadow DOM HUD injector
│   │   ├── plugin/         # Plugin discovery and verified registry
│   │   ├── config/         # 3-tier config loader and live reload
│   │   ├── cli/            # Interactive wizard and CLI subcommands
│   │   └── server.ts       # MCP JSON-RPC server entrypoint
├── sdk/                    # Developer SDK (@weavetab/sdk v2.6.0)
│   ├── src/
│   │   ├── index.ts        # PluginBuilder, definePlugin, types, interfaces
│   │   └── cli.ts          # Developer CLI (init, build, dev, validate, doctor)
├── skills/                 # Agent Skills Ecosystem (@weavetab/skills v2.6.0)
│   ├── [category]/         # Domain skill bundles (browser, desktop, memory, etc.)
│   └── bin/cli.js          # Interactive skills injector
└── website/                # Documentation & Marketing Website (React 19 + Vite)
```
