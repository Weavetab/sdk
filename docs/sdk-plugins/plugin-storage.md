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

// 2. Cached Memory with TTL Expiry
await ctx.storage.setWithExpiry("session_token", "val-xyz", 3600000);
const cached = await ctx.storage.getWithExpiry("session_token");

// Compute-and-cache memoization pattern
const profile = await ctx.storage.remember("site_profile", 600000, async () => {
  return await fetchProfileOverNetwork();
});

// 3. Structured JSON Files
await ctx.storage.setJSON("scraped_products.json", { items: [1, 2, 3] });
const data = await ctx.storage.getJSON("scraped_products.json");

// 4. Isolated Path Resolution (Path-Traversal Protected)
const filePath = ctx.storage.getPath("scraped_products.json");
// → "~/.weavetab/plugins/my-plugin/scraped_products.json"

// 5. File Listing
const files = await ctx.storage.list();
```
