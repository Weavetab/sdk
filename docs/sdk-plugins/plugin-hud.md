---
title: "Visual HUD & Thought Bubbles"
description: "Render animated thoughts, status badges, and DOM styles in the browser."
product: sdk
section: sdk-plugins
icon: Sparkle
slug: plugin-hud
---

# In-Browser Visual Extensions

Plugins can interact directly with the live browser session to render visual feedback, animated thought bubbles, and custom CSS overlays.

---

## 1. Floating Thought Bubbles (`showThought`)

Displays an animated status thought bubble on the active browser window:

```typescript
await ctx.extension.showThought(
  session,
  "🎨 Analyzing page typography and color palette...",
  { durationMs: 4000 }
);
```

---

## 2. Status Badges & HUD State (`setHudState`)

Updates the floating HUD badge in the browser header:

```typescript
await ctx.extension.setHudState(session, {
  badge: "Auditing",
  badgeColor: "#22c55e",
  action: "Scanning DOM hierarchy"
});
```

---

## 3. Style & Script Injection

```typescript
// Inject custom CSS into the page DOM
await ctx.extension.injectStyles(session, `
  .highlight-box {
    outline: 3px solid #8b5cf6 !important;
    background: rgba(139, 92, 246, 0.1) !important;
  }
`);

// Execute sandboxed script in page context
const result = await ctx.extension.injectScript(session, `
  document.querySelectorAll('.pricing-card').length
`);
```
