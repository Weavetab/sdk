---
title: "SDK CLI Reference"
description: "Developer commands: init, build, dev, validate, doctor."
product: sdk
section: sdk-cli-section
icon: Terminal
slug: sdk-cli
---

# SDK CLI Reference

The SDK exposes developer CLI commands via `npx @weavetab/sdk <command>` or local `weavetab <command>`:

```bash
# Scaffold a new plugin
weavetab init <plugin-name> --template <template>

# Build TypeScript and auto-synchronize weavetab.json tool schemas & hooks
weavetab build

# Auto-generate weavetab.json manifest from Zod tool definitions & middleware hooks
weavetab manifest
# or alias:
weavetab schema

# Live TypeScript watch mode with manifest auto-sync
weavetab dev

# Validate schema, permissions, and sandbox compliance
weavetab validate

# Run environment diagnostics and check plugin health
weavetab doctor

# Print current SDK version
weavetab version
# → 2.5.0-beta.4
```
