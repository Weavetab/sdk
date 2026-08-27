---
title: "Sandboxed Storage"
description: "Isolated key-value store, config, and file sandbox per plugin."
product: sdk
section: sdk-plugins
icon: HardDrive
slug: plugin-storage
---

# Sandboxed Storage & Configuration

Weavetab strictly isolates every plugin into its own dedicated directory on the local filesystem:

```
~/.weavetab/plugins/<plugin-name>/
├── config.json          # Private configuration
├── storage.json         # Key-value store (get / set)
└── custom_data.json     # Custom JSON datasets
```

---

## `ctx.storage` API Reference

```typescript
// 1. Key-Value Storage
await ctx.storage.set("visitCount", 42);
const count = await ctx.storage.get<number>("visitCount", 0);
await ctx.storage.delete("visitCount");

// 2. Structured JSON Files
await ctx.storage.setJSON("scraped_products.json", { items: [1, 2, 3] });
const data = await ctx.storage.getJSON("scraped_products.json");

// 3. Isolated Path Resolution (Path-Traversal Protected)
const filePath = ctx.storage.getPath("scraped_products.json");
// → "/home/user/.weavetab/plugins/my-plugin/scraped_products.json"

// 4. File Listing
const files = await ctx.storage.list();
```
