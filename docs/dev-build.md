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
| `npm run build` | Full production build (Extension, HUD bundle, TypeScript compilation) |
| `npm run build:ext` | Chrome extension manifest and background script bundle |
| `npm run build:hud` | Shadow DOM HUD bundle via esbuild |
| `npm run dev` | Dev mode with tsx hot-reload |
| `npm test` | Run full test suite |
| `npm run test:unit` | Fast in-memory unit tests |
| `npm run test:e2e` | End-to-end smoke test with real Chromium instance |
