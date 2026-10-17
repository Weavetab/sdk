---
title: "SDK CLI Reference"
description: "Developer commands: init, build, manifest, dev, validate, doctor, publish, templates."
product: sdk
section: sdk-cli-section
icon: Terminal
slug: sdk-cli
---

# SDK CLI Reference

The SDK exposes developer CLI commands via `npx @weavetab/sdk <command>` or local `weavetab <command>`:

```bash
# Scaffold a new plugin (6 templates: standard, visual, scraper, automation, override, youtube)
weavetab init <plugin-name> --template <template>
# List all templates
weavetab templates
# or:
weavetab init --list

# Build TypeScript and auto-synchronize weavetab.json tool schemas & hooks
weavetab build

# Auto-generate weavetab.json manifest from Zod tool definitions & middleware hooks
weavetab manifest
# or alias:
weavetab schema

# Live TypeScript watch mode with manifest auto-sync
weavetab dev

# Validate schema, permissions, and sandbox compliance (--offline skips network)
weavetab validate

# Run environment diagnostics and check plugin health (incl. schema + registry reachability)
weavetab doctor

# npm publish + sync to https://weavetab.dev/plugins
weavetab publish
# preview without publishing:
weavetab publish --dry-run

# Print current SDK version
weavetab version
# → 2.5.0
```
