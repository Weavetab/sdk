/**
 * @weavetab/sdk
 * Official TypeScript SDK for developing Weavetab plugins and tools.
 *
 * Copyright (c) 2026 fy2ne. Licensed under the MIT License.
 */

export interface McpToolSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

export interface McpToolRegistration {
  name: string;
  description: string;
  schema?: McpToolSchema;
  parameters?: McpToolSchema;
  handler: (args: any, extra?: any) => Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> } | any>;
}

export interface McpContext {
  /** Register a dynamic MCP tool into the Weavetab runtime */
  registerTool: (tool: McpToolRegistration) => void;
  /** Unregister an active MCP tool by name */
  unregisterTool?: (toolName: string) => void;
  [key: string]: any;
}

export interface PluginContext {
  /** MCP server context for registering tools */
  mcp: McpContext;
  /** Plugin configuration options from weavetab.json or user settings */
  config?: Record<string, any>;
  /** Logging utilities */
  logger?: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };
  [key: string]: any;
}

export interface WeavetabPlugin {
  /** Unique name of the plugin matching package.json */
  name: string;
  /** Called when the plugin is loaded into the Weavetab runtime */
  onLoad: (ctx: PluginContext) => Promise<void> | void;
  /** Called when the plugin is unloaded */
  onUnload?: (ctx: PluginContext) => Promise<void> | void;
  [key: string]: any;
}

export interface WeavetabManifestTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface WeavetabPermissions {
  cdp?: {
    evaluate?: boolean;
    network?: boolean;
    dom?: boolean;
    reason?: string;
  };
  network?: {
    hosts?: string[];
    reason?: string;
  };
  filesystem?: {
    read?: string[];
    write?: string[];
    reason?: string;
  };
  [key: string]: any;
}

export interface WeavetabManifest {
  $schema?: string;
  name: string;
  version: string;
  description?: string;
  entry?: string;
  author?: string;
  authors?: Array<{ name: string; email?: string; url?: string; role?: string }>;
  engines?: Record<string, string>;
  environments?: string[];
  permissions?: WeavetabPermissions;
  tools?: WeavetabManifestTool[];
  keywords?: string[];
  homepage?: string;
  repository?: string;
  [key: string]: any;
}

/**
 * Type-safe helper to define a Weavetab Plugin.
 *
 * @example
 * ```ts
 * import { definePlugin } from "@weavetab/sdk";
 *
 * export default definePlugin({
 *   name: "my-plugin",
 *   async onLoad(ctx) {
 *     ctx.mcp.registerTool({
 *       name: "my_tool",
 *       description: "Example custom tool",
 *       handler: async (args) => ({
 *         content: [{ type: "text", text: "Hello from plugin!" }]
 *       })
 *     });
 *   }
 * });
 * ```
 */
export function definePlugin(plugin: WeavetabPlugin): WeavetabPlugin {
  return plugin;
}