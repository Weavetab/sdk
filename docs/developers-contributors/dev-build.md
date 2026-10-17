---
title: "Build Scripts"
description: "Build, dev, and test commands."
product: sdk
section: developers-contributors
icon: Hammer
slug: dev-build
---

# Build Scripts & Compilation

| Command | Purpose |
|---|---|
| `npm run build` | Full production build (TypeScript compilation of CLI and SDK core) |
| `npm test` | Run full test suite (`node --test`) |
| `npm run sync:schema` | Sync `sdk/schema/*.json` to `website/public/schema/` (+ `v1/` aliases) |
