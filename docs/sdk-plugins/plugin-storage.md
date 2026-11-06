---
title: "Sandboxed Storage"
description: "Isolated persistent key-value and JSON file storage APIs for Weavetab plugins."
product: sdk
section: sdk-plugins
order: 8
icon: Database
slug: plugin-storage
---

# Sandboxed Storage API

Weavetab provides each installed plugin with an isolated persistent storage directory:

```
~/.weavetab/plugins/<plugin-name>/
├── config.json          # User-editable plugin configuration
└── storage/             # Isolated key-value data files
    ├── cache.json
    └── state.json
```

Plugins cannot access other plugins' storage or read arbitrary filesystem paths without explicit permission grants.

---

## 1. Storage API Reference

Access storage through `ctx.storage` in your plugin's `onLoad(ctx)` or command/tool handlers:

```typescript
import { definePlugin, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "my-plugin",
  version: "1.0.0",
  instructions: "Plugin storage helpers and profile persistence.",

  async onLoad(ctx: PluginContext) {
    // 1. Primitive string storage
    await ctx.storage.set("session_token", "abc-123");
    const token = await ctx.storage.get("session_token"); // "abc-123"

    // 2. Typed JSON storage
    interface UserProfile {
      id: string;
      tier: "free" | "pro";
      lastSync: number;
    }

    await ctx.storage.setJSON<UserProfile>("active_profile", {
      id: "usr_991",
      tier: "pro",
      lastSync: Date.now(),
    });

    const profile = await ctx.storage.getJSON<UserProfile>("active_profile");
    console.log(profile?.tier); // "pro"

    // 4. List all stored keys
    const keys = await ctx.storage.list(); // ["session_token", "active_profile"]

    // 5. Delete a specific key
    await ctx.storage.delete("session_token");

    // 6. Purge all stored keys for this plugin
    await ctx.storage.clear();
  },
});
```

---

## 2. Manifest Permission

Access to persistent storage requires `config` permissions in `weavetab.json`:

```json
{
  "permissions": {
    "config": {
      "read": true,
      "write": true,
      "reason": "Persists local session tokens and caching metadata across browser restarts."
    }
  }
}
```

---

## 3. Concurrency & Atomic File Writes

Weavetab's storage implementation executes atomic write operations using temporary file swaps (`.tmp` -> rename). If the server process crashes or terminates unexpectedly mid-write, storage files are not corrupted.
