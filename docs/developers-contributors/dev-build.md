---
title: "Build Pipeline & Tooling"
description: "Compiling TypeScript, generating schemas, and verifying bundle outputs across the SDK."
product: sdk
section: developers-contributors
order: 2
icon: Wrench
slug: dev-build
---

# SDK Build Pipeline & Tooling

The `@weavetab/sdk` build pipeline compiles TypeScript into clean, ESM-compliant JavaScript distributions, validates JSON Schema schemas, and packages CLI binaries.

---

## 1. Prerequisites

- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`

---

## 2. Build Scripts

Execute scripts from the `sdk/` directory:

```bash
# Full clean build: compiles TypeScript and regenerates schema
npm run build

# Watch mode for interactive development
npm run dev

# Synchronize JSON Schema Draft-07 from TypeScript exporter
npm run sync:schema

# Run test suite
npm test
```

---

## 3. Build Artifacts

Running `npm run build` outputs:
- `dist/index.js` & `dist/index.d.ts`: Core runtime library exports (`definePlugin`, `defineTool`, `defineCommand`, etc.).
- `dist/cli.js`: Standalone developer CLI executable (`weavetab`).
- `dist/testing.js` & `dist/testing.d.ts`: Testing harness exports (`simulateToolCall`, `createMockContext`, etc.).
- `schema/plugin.json`: Official JSON Schema Draft-07 specification mirrored to `https://weavetab.dev/schema/plugin.json`.
