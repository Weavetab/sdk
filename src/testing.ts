import type { PluginContext, PluginStorage, PluginExtensionBridge, DefinedTool, McpToolResult } from "./index.js";
import { TabClient } from "./tab.js";
import { DesktopClient, type DiscoveredApp } from "./desktop.js";

export interface MockContextOptions {
  name?: string;
  config?: Record<string, any>;
  mockUrl?: string;
  mockTitle?: string;
  mockApps?: DiscoveredApp[];
  initialStorage?: Record<string, any>;
}

export function createMockContext(opts: MockContextOptions = {}): PluginContext {
  const store = new Map<string, any>(Object.entries(opts.initialStorage || {}));
  const ttlStore = new Map<string, { val: any; exp: number }>();

  const storage: PluginStorage = {
    async get<T = any>(key: string, defaultValue?: T): Promise<T | null> {
      if (store.has(key)) return store.get(key);
      return defaultValue !== undefined ? defaultValue : null;
    },
    async set<T = any>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async delete(key: string): Promise<boolean> {
      const removed = store.delete(key);
      ttlStore.delete(key);
      return removed;
    },
    async setWithExpiry<T = any>(key: string, value: T, ttlMs: number): Promise<void> {
      ttlStore.set(key, { val: value, exp: Date.now() + ttlMs });
    },
    async getWithExpiry<T = any>(key: string): Promise<T | null> {
      const entry = ttlStore.get(key);
      if (!entry) return null;
      if (Date.now() > entry.exp) {
        ttlStore.delete(key);
        return null;
      }
      return entry.val as T;
    },
    async remember<T = any>(key: string, ttlMs: number, resolver: () => Promise<T>): Promise<T> {
      const cached = await this.getWithExpiry<T>(key);
      if (cached !== null) return cached;
      const fresh = await resolver();
      await this.setWithExpiry(key, fresh, ttlMs);
      return fresh;
    },
    async clear(): Promise<void> {
      store.clear();
      ttlStore.clear();
    },
    async getJSON<T = any>(): Promise<T | null> {
      return null;
    },
    async setJSON(): Promise<void> {},
    getPath(subpath?: string): string {
      return `/mock/storage/${subpath || ""}`;
    },
    async list(): Promise<string[]> {
      return [];
    },
  };

  const mockTab = new TabClient({
    Runtime: {
      evaluate: async ({ expression }) => {
        if (expression.includes("location.href")) {
          return { result: { value: opts.mockUrl || "https://example.com" } };
        }
        if (expression.includes("document.title")) {
          return { result: { value: opts.mockTitle || "Mock Document" } };
        }
        return { result: { value: undefined } };
      },
    },
  });

  const mockDesktop = new DesktopClient({
    listApps: async () => opts.mockApps || [],
    getTargets: async () => [],
  });

  const registeredTools: any[] = [];
  const registeredOverrides: any[] = [];

  return {
    name: opts.name || "mock-plugin",
    version: "1.0.0",
    pluginDir: "/mock/plugins/mock-plugin",
    config: opts.config || {},
    storage,
    tab: mockTab,
    desktop: mockDesktop,
    extension: {
      send: async () => true,
      setHudState: async () => {},
      showThought: async () => {},
      clearThought: async () => {},
      injectStyles: async () => {},
      injectScript: async () => undefined,
      hideOverlay: async () => {},
      restoreOverlay: async () => {},
    } as PluginExtensionBridge,
    mcp: {
      registerTool: (tool) => registeredTools.push(tool),
      overrideTool: (toolName, handler) => registeredOverrides.push({ toolName, handler }),
      removeTool: () => {},
      unregisterTool: () => {},
    },
    hooks: {
      onBeforeAction: () => {},
      onAfterAction: () => {},
      onDOMMutation: () => {},
      beforeToolCall: () => {},
      afterToolCall: () => {},
      onPageNavigate: () => {},
    },
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
  };
}

export async function simulateToolCall(
  tool: DefinedTool | { handler: (...args: any[]) => any },
  args: Record<string, any>,
  ctx: PluginContext
): Promise<McpToolResult> {
  const signal = new AbortController().signal;
  const toolCtx = {
    tab: ctx.tab,
    desktop: ctx.desktop,
    storage: ctx.storage,
    config: ctx.config,
    logger: ctx.logger,
    signal,
  };

  let raw: any;
  // Support both unified (args, ctx) signature and legacy (args, session, config)
  if (tool.handler.length <= 2) {
    raw = await tool.handler(args, toolCtx);
  } else {
    raw = await tool.handler(args, (ctx.tab as any)?.session, ctx.config);
  }

  if (raw && Array.isArray(raw.content)) {
    return raw as McpToolResult;
  }
  if (typeof raw === "string") {
    return { content: [{ type: "text", text: raw }] };
  }
  if (raw && raw.isError) {
    return {
      isError: true,
      content: [{ type: "text", text: raw.error || raw.message || "execution failed" }],
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(raw ?? null, null, 2) }],
  };
}
