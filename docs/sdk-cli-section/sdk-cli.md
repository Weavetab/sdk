---
title: "SDK CLI Reference"
description: "Developer commands: init, build, manifest, dev, validate, doctor, publish."
product: sdk
section: sdk-cli-section
icon: Terminal
slug: sdk-cli
---

# SDK CLI Reference

The SDK developer CLI is available via `npx @weavetab/sdk <command>` or local `weavetab <command>`:

```bash
# Scaffold a new TypeScript plugin project
weavetab init <plugin-name>

# Compile TypeScript and sync weavetab.json
weavetab build

# Export weavetab.json manifest from definePlugin & defineTool definitions
weavetab manifest
# or alias:
weavetab schema

# Live TypeScript watch mode with manifest auto-sync
weavetab dev

# Run preflight audit before publishing (manifest, permissions, anti-squatting)
weavetab preflight

# Validate schema, permissions, and sandbox compliance (--offline skips network)
weavetab validate

# Run environment diagnostics and check plugin health
weavetab doctor

# npm publish + sync to registry
weavetab publish
# preview without publishing:
weavetab publish --dry-run

# Print current SDK version
weavetab version
```
