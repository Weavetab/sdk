export class PluginError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(code: string, message: string, details?: Record<string, any>) {
    super(`[${code}] ${message}`);
    this.name = "PluginError";
    this.code = code;
    this.details = details;
  }
}

/**
 * @weavetab/sdk
 * Official TypeScript SDK for developing Weavetab plugins, tools, CLI commands, isolated storage, and visual extensions.
 *
 * Copyright (c) 2026 fy2ne <hello@fy2ne.me>. Licensed under the MIT License.
 */

import { z } from "zod";
import { TabClient } from "./tab.js";
import { DesktopClient } from "./desktop.js";
export { z };
export * from "./schema/exporter.js";
export * from "./version.js";
export * from "./tab.js";
export * from "./desktop.js";
export * from "./testing.js";
export * from "./preflight.js";

export interface McpToolSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

export interface McpToolContentItem {
  type: "text" | "image" | "resource" | string;
  text?: string;
  data?: string;
  mimeType?: string;
  [key: string]: any;
}

export interface McpToolResult {
  content: McpToolContentItem[];
  isError?: boolean;
  [key: string]: any;
}

export type InferToolArgs<TSchema> = TSchema extends z.ZodRawShape
  ? z.infer<z.ZodObject<TSchema>>
  : TSchema extends z.ZodTypeAny
  ? z.infer<TSchema>
  : any;

export interface ToolExecutionContext<TConfig = any> {
  tab?: TabClient;
  desktop?: DesktopClient;
  storage: PluginStorage;
  config: TConfig;
  logger?: PluginLogger;
  signal?: AbortSignal;
  session?: any;
  [key: string]: any;
}

export interface DefinedTool<TSchema = any, TReturn = any> {
  name: string;
  description: string;
  schema?: TSchema;
  parameters?: any;
  inputSchema?: any;
  /**
   * When `false`, the host skips establishing a browser/CDP session before
   * invoking this tool — the handler receives `session === undefined`.
   * Use for API-only tools that never touch the browser (e.g. HTTP fetchers).
   * Defaults to `true`. RBAC and rate limiting are still enforced.
   */
  requiresSession?: boolean;
  handler: (
    args: InferToolArgs<TSchema>,
    contextOrSession?: ToolExecutionContext | any,
    config?: any
  ) => Promise<McpToolResult | Record<string, any> | string | void>;
}

/**
 * Type-safe helper to define an MCP Tool with automatic Zod schema inference.
 */
export function defineTool<TSchema extends z.ZodRawShape | z.ZodTypeAny = any, TReturn = any>(
  definition: DefinedTool<TSchema, TReturn>
): DefinedTool<TSchema, TReturn> {
  return definition;
}

export interface McpToolRegistration<TArgs = any> {
  name: string;
  description: string;
  schema?: McpToolSchema | Record<string, any>;
  parameters?: McpToolSchema | Record<string, any>;
  /** See {@link DefinedTool.requiresSession}. Defaults to `true`. */
  requiresSession?: boolean;
  handler: (
    args: TArgs,
    session?: any,
    config?: any
  ) => Promise<McpToolResult | Record<string, any> | string | void>;
}

export type ToolOverrideHandler<TArgs = any> = (
  args: TArgs,
  session?: any,
  config?: any,
  originalHandler?: (args: TArgs, session?: any, config?: any) => Promise<any>
) => Promise<any>;

export interface PluginSurfaceContext<TConfig = Record<string, any>> {
  tab?: TabClient;
  storage: PluginStorage;
  config: TConfig;
  logger: PluginLogger;
}

export type PromptReturn =
  | string
  | {
      description?: string;
      messages: Array<{ role: "user" | "assistant"; content: string | { type: "text"; text: string } }>;
    };

export type ResourceReturn =
  | string
  | { text: string; mimeType?: string }
  | { blob: string; mimeType?: string }
  | { contents: Array<{ uri?: string; text?: string; blob?: string; mimeType?: string }> };

export interface ListedResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface DefinedPrompt<TArgs extends Record<string, any> = Record<string, string>> {
  name: string;
  title?: string;
  description?: string;
  /** Zod raw shape (string fields) or JSON Schema. MCP prompt arguments travel as strings. */
  arguments?: TArgs;
  handler: (
    args: InferToolArgs<TArgs>,
    ctx: PluginSurfaceContext
  ) => Promise<PromptReturn> | PromptReturn;
}

export function definePrompt<TArgs extends Record<string, any> = Record<string, string>>(
  definition: DefinedPrompt<TArgs>
): DefinedPrompt<TArgs> {
  return definition;
}

export interface DefinedResource {
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  /** Fixed URI, e.g. `realtime://state`. Provide either `uri` or `uriTemplate`. */
  uri?: string;
  /** RFC 6570 URI template, e.g. `realtime://reflex/{id}`. */
  uriTemplate?: string;
  /** Template only: concrete resources shown in the `@` picker. */
  list?: (ctx: PluginSurfaceContext) => Promise<ListedResource[]> | ListedResource[];
  /** Template only: autocomplete handler per `{variable}`. */
  complete?: Record<string, (value: string) => Promise<string[]> | string[]>;
  /** Reads resource content when selected via `@`. `vars` is empty for fixed URIs. */
  read: (
    uri: string,
    vars: Record<string, string | string[]>,
    ctx: PluginSurfaceContext
  ) => Promise<ResourceReturn> | ResourceReturn;
}

export function defineResource(definition: DefinedResource): DefinedResource {
  return definition;
}

export interface PluginCommandContext<TConfig = Record<string, any>> {
  args: string[];
  flags: Record<string, any>;
  tab?: TabClient;
  desktop?: DesktopClient;
  storage: PluginStorage;
  config: TConfig;
  logger: PluginLogger;
  session?: any;
  getSession?: () => Promise<any>;
  [key: string]: any;
}

export interface DefinedCommand<TSchema = any, TReturn = any> {
  name: string;
  description: string;
  usage?: string;
  schema?: TSchema;
  parameters?: any;
  examples?: string[];
  /** When true, establishes a browser/CDP session before running the command. Defaults to false for fast CLI execution. */
  requiresSession?: boolean;
  handler: (
    args: InferToolArgs<TSchema>,
    ctx: PluginCommandContext
  ) => Promise<TReturn | Record<string, any> | string | void> | TReturn | Record<string, any> | string | void;
}

export function defineCommand<TSchema extends z.ZodRawShape | z.ZodTypeAny = any, TReturn = any>(
  definition: DefinedCommand<TSchema, TReturn>
): DefinedCommand<TSchema, TReturn> {
  return definition;
}

export interface PluginCliContext {
  /** Register a CLI command invoked via `weavetab plugin use <plugin> <command>` */
  registerCommand: <TSchema = any>(command: DefinedCommand<TSchema>) => void;
  /** Unregister a CLI command by name */
  unregisterCommand?: (name: string) => void;
}

export interface PluginMcpContext {
  /** Register a `/` prompt utility (MCP prompt) */
  registerPrompt: (prompt: DefinedPrompt<any>) => void;
  /** Register an `@` resource utility (MCP resource or resource template) */
  registerResource: (resource: DefinedResource) => void;
  /** Register a CLI command invoked via `weavetab plugin use <plugin> <command>` */
  registerCommand?: <TSchema = any>(command: DefinedCommand<TSchema>) => void;
  /** Unregister a `/` prompt utility by name */
  unregisterPrompt?: (name: string) => void;
  /** Unregister an `@` resource utility by fixed URI or template name */
  unregisterResource?: (uriOrName: string) => void;
  /** Unregister a CLI command by name */
  unregisterCommand?: (name: string) => void;
  /** Register a new MCP tool into the Weavetab runtime */
  registerTool: <T = any>(tool: McpToolRegistration<T>) => void;
  /** Override or wrap an existing built-in tool (e.g. browser_eval, browser_navigate, browser_click) */
  overrideTool?: <T = any>(toolName: string, overrideHandler: ToolOverrideHandler<T>) => void;
  /** Disable or remove a built-in tool by name */
  removeTool?: (toolName: string) => void;
  /** Unregister an active MCP tool by name */
  unregisterTool?: (toolName: string) => void;
  [key: string]: any;
}

export interface PluginStorage {
  /** Read a value from the plugin's isolated key-value store */
  get<T = any>(key: string, defaultValue?: T): Promise<T | null>;
  /** Save a value in the plugin's isolated key-value store */
  set<T = any>(key: string, value: T): Promise<void>;
  /** Delete a key from the plugin's isolated key-value store */
  delete(key: string): Promise<boolean>;
  /** Read and parse a JSON file inside the plugin's isolated directory (~/.weavetab/plugins/<name>/) */
  getJSON<T = any>(filename: string): Promise<T | null>;
  /** Serialize and save a JSON file inside the plugin's isolated directory */
  setJSON<T = any>(filename: string, data: T): Promise<void>;
  /** Returns the absolute path inside the plugin's isolated directory */
  getPath(subpath?: string): string;
  /** Lists files inside the plugin's isolated directory */
  list(subpath?: string): Promise<string[]>;
  setWithExpiry<T = any>(key: string, value: T, ttlMs: number): Promise<void>;
  getWithExpiry<T = any>(key: string): Promise<T | null>;
  remember<T = any>(key: string, ttlMs: number, resolver: () => Promise<T>): Promise<T>;
  clear(): Promise<void>;
}

export interface PluginExtensionBridge {
  /** Send a raw message to the Weavetab Chrome Extension */
  send(session: any, message: object): Promise<boolean>;
  /** Update HUD state, action text, or badge in the browser */
  setHudState(
    session: any,
    state: { action?: string; badge?: string; badgeColor?: string; groupState?: string }
  ): Promise<void>;
  /** Show an animated thought bubble on the browser screen */
  showThought(session: any, text: string, options?: { durationMs?: number }): Promise<void>;
  /** Clear active thought bubbles on the screen */
  clearThought(session: any): Promise<void>;
  /** Inject custom CSS styles into the active page DOM */
  injectStyles(session: any, css: string): Promise<void>;
  /** Alias for injectStyles */
  injectCss?(session: any, css: string): Promise<void>;
  /** Inject and execute JavaScript in the page context */
  injectScript<T = any>(session: any, js: string): Promise<T>;
  /** Temporarily hide all Weavetab HUD overlays (e.g. for clean screenshots/PDFs) */
  hideOverlay(session: any): Promise<void>;
  /** Restore all Weavetab HUD overlays */
  restoreOverlay(session: any): Promise<void>;
}

export interface DOMMutationDelta {
  type?: "cdp_mutation" | "action_delta" | "page_update" | string;
  timestamp?: number;
  url?: string;
  added: Array<{
    id?: string;
    role?: string;
    label?: string;
    tag?: string;
    text?: string;
    backendNodeId?: number;
    [key: string]: any;
  }>;
  removed: Array<string | { backendNodeId?: number; tag?: string; text?: string; [key: string]: any }>;
  changed: Array<{
    ref?: string;
    role?: string;
    label?: string;
    attribute?: string;
    oldValue?: any;
    newValue?: any;
    changes?: Record<string, { from: any; to: any }>;
    actionable?: boolean;
    [key: string]: any;
  }>;
  significantChange?: boolean;
  stable_count?: number;
  [key: string]: any;
}

export type BeforeActionHook = (
  tool: string,
  args: Record<string, any>,
  session?: any
) => Promise<Record<string, any> | { __blocked: boolean; reason?: string } | void> | Record<string, any> | { __blocked: boolean; reason?: string } | void;

export type AfterActionHook = (
  tool: string,
  result: any,
  session?: any,
  args?: Record<string, any>
) => Promise<any> | any;

export type DOMMutationHook = (
  delta: DOMMutationDelta,
  session?: any
) => Promise<void> | void;

export interface PluginHooks {
  /** Enterprise interceptor called before any tool action executes */
  onBeforeAction(handler: BeforeActionHook): void;
  /** Enterprise interceptor called after any tool action completes */
  onAfterAction(handler: AfterActionHook): void;
  /** Real-time observer called when DOM mutations or action deltas occur */
  onDOMMutation(handler: DOMMutationHook): void;

  /** Register a hook called before any tool is executed (backwards-compatible alias) */
  beforeToolCall(
    handler: (toolName: string, args: Record<string, any>, session?: any) => Promise<any> | void
  ): void;
  /** Register a hook called after a tool completes execution (backwards-compatible alias) */
  afterToolCall(
    handler: (toolName: string, args: Record<string, any>, result: any, session?: any) => Promise<any> | void
  ): void;
  /** Register a hook called when the browser navigates to a new URL */
  onPageNavigate?(handler: (url: string, session?: any) => Promise<void> | void): void;
}

export interface PluginLogger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

export interface WorkflowStep {
  tool: string;
  target?: string;
  value?: string;
  extra?: Record<string, any>;
}

export interface WorkflowPattern {
  name: string;
  steps: WorkflowStep[];
  success_indicator?: string;
  entry?: string;
  avg_duration_ms?: number;
  reliability: number;
  strikes: number;
  last_verified: string;
  total_executions: number;
  successful_executions: number;
}

export interface SiteQuirks {
  cookie_banner?: {
    selector: string;
    action: string;
    appears: "first_visit" | "always" | "random";
  };
  rate_limit?: {
    threshold?: string;
    recovery?: string;
  };
  modal_popups?: Array<{
    trigger?: string;
    dismiss_selector: string;
  }>;
  [key: string]: any;
}

export interface SiteProfile {
  origin: string;
  framework?: string;
  shadowDom?: boolean;
  captcha_frequency?: "none" | "rare" | "moderate" | "frequent";
  quirks: SiteQuirks;
  patterns: Record<string, WorkflowPattern>;
  updatedAt: string;
  visitCount: number;
}

export interface PluginMemoryContext {
  /** Inspect or load the persistent SiteProfile for an origin (~/.weavetab-system/memory/sites/) */
  getSiteProfile(origin: string): Promise<SiteProfile | null>;
  /** Register or update a named workflow pattern for an origin */
  learnPattern(origin: string, name: string, pattern: Partial<WorkflowPattern>): Promise<WorkflowPattern>;
  /** Update reliability score following a replay attempt */
  recordExecution(origin: string, name: string, success: boolean, durationMs?: number): Promise<WorkflowPattern | null>;
  /** Get reliability score (0.0–1.0) for a pattern */
  getReliability(origin: string, patternName: string): Promise<number>;
  /** Record a site quirk (cookie banner, rate limit, modal popup) */
  recordQuirk(origin: string, quirkKey: string, quirkData: any): Promise<void>;
}

export interface PluginContext {
  /** Plugin unique name */
  name: string;
  /** Plugin semantic version */
  version?: string;
  /** Absolute path to this plugin's isolated configuration directory: ~/.weavetab/plugins/<name>/ */
  pluginDir: string;
  /** Isolated configuration parsed from ~/.weavetab/plugins/<name>/config.json */
  config: Record<string, any>;
  /** Isolated persistent storage API for this plugin */
  storage: PluginStorage;
  /** Direct bridge to Weavetab Chrome Extension, HUD, and visuals */
  extension: PluginExtensionBridge;
  /** MCP server context for registering, overriding, or removing tools */
  mcp: PluginMcpContext;
  /** CLI context for registering plugin CLI commands (`weavetab plugin use <plugin> <cmd>`) */
  cli: PluginCliContext;
  /** Lifecycle and execution hooks */
  hooks: PluginHooks;
  /** Cross-session site learning and persistent profile memory */
  memory?: PluginMemoryContext;
  /** Logger */
  logger: PluginLogger;
  [key: string]: any;
}

export function defineOverride<TArgs = any>(
  definition: ToolOverrideDefinition<TArgs>
): ToolOverrideDefinition<TArgs> {
  return definition;
}

export interface ToolOverrideDefinition<TArgs = any> {
  name: string;
  description?: string;
  schema?: any;
  handler: ToolOverrideHandler<TArgs>;
}

export interface WeavetabPluginDefinition {
  /** Unique name of the plugin matching package.json / weavetab.json */
  name: string;
  /** Version string */
  version?: string;
  /** Description */
  description?: string;
  /** Static tool registrations */
  tools?: Array<DefinedTool | McpToolRegistration>;
  /** Static CLI command registrations (`weavetab plugin use <plugin> <cmd>`) */
  commands?: Array<DefinedCommand<any>>;
  /** Static `/` prompt utility (MCP prompt) registrations */
  prompts?: Array<DefinedPrompt<any>>;
  /** Static `@` resource utility (MCP resource) registrations */
  resources?: DefinedResource[];
  /** Relative path to the plugin's AI agent playbook (legacy fallback) */
  agentsMd?: string;
  /** Operational heuristics and instructions for AI agents interacting with this plugin */
  instructions?: string;
  /** Static tool overrides */
  overrides?: ToolOverrideDefinition[];
  /** Built-in tools to remove */
  removeTools?: string[];
  /** Default isolated configuration written to ~/.weavetab/plugins/<name>/config.json if not present */
  defaultConfig?: Record<string, any>;
  /** Declared capabilities and tool/hook access permissions */
  permissions?: WeavetabPermissions;
  /** Called when the plugin is loaded into the Weavetab runtime */
  onLoad?: (ctx: PluginContext) => Promise<void> | void;
  /** Called when the plugin is unloaded */
  onUnload?: (ctx: PluginContext) => Promise<void> | void;

  /** Enterprise interceptor called before any tool action executes */
  onBeforeAction?: BeforeActionHook;
  /** Enterprise interceptor called after any tool action completes */
  onAfterAction?: AfterActionHook;
  /** Real-time observer called when DOM mutations or action deltas occur */
  onDOMMutation?: DOMMutationHook;

  [key: string]: any;
}

export interface WeavetabPermissions {
  commands?: {
    /** Must be true for the plugin to register CLI commands (`weavetab plugin use <plugin> <cmd>`) */
    add?: boolean;
    reason?: string;
  };
  prompts?: {
    /** Must be true for the plugin to register `/` prompt utilities (MCP prompts) */
    add?: boolean;
    reason?: string;
  };
  resources?: {
    /** Must be true for the plugin to register `@` resource utilities (MCP resources) */
    add?: boolean;
    reason?: string;
  };
  desktop?: {
    apps?: string[];
    reason?: string;
  };
  config?: {
    read?: boolean;
    write?: boolean;
    default?: Record<string, any>;
    reason?: string;
  };
  extension?: {
    hud?: boolean;
    overlay?: boolean;
    styles?: boolean;
    scripts?: boolean;
    reason?: string;
  };
  tools?: {
    /** Must be true for the plugin to register any new MCP tools */
    add?: boolean;
    override?: string[];
    remove?: string[];
    reason?: string;
  };
  hooks?: {
    onBeforeAction?: boolean;
    onAfterAction?: boolean;
    onDOMMutation?: boolean;
    onPageNavigate?: boolean;
    reason?: string;
  };
  cdp?: {
    evaluate?: boolean;
    network?: boolean;
    dom?: boolean;
    click?: boolean;
    navigate?: boolean;
    input?: boolean;
    screenshot?: boolean;
    reason?: string;
    [key: string]: any;
  };
  network?: {
    domains?: string[];
    hosts?: string[];
    intercept?: boolean;
    reason?: string;
  };
  filesystem?: {
    read?: string[];
    write?: string[];
    reason?: string;
  };
  /** @deprecated use `filesystem` */
  fs?: {
    read?: string[];
    write?: string[];
    reason?: string;
  };
  [key: string]: any;
}

export type WeavetabManifestPermissions = WeavetabPermissions | string[];

export interface WeavetabManifestTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  schema?: Record<string, any>;
}

export interface WeavetabManifestCommand {
  name: string;
  description: string;
  usage?: string;
  parameters?: Record<string, any>;
  schema?: Record<string, any>;
  examples?: string[];
  requiresSession?: boolean;
}

export interface WeavetabManifestPrompt {
  name: string;
  description?: string;
  arguments?: Record<string, any>;
}

export interface WeavetabManifestResource {
  name: string;
  uri?: string;
  uriTemplate?: string;
  description?: string;
  mimeType?: string;
}

export interface WeavetabManifest {
  $schema?: string;
  name: string;
  displayName?: string;
  version: string;
  description?: string;
  entry?: string;
  agentsMd?: string;
  instructions?: string;
  author?: string | { name: string; email?: string; url?: string; role?: string };
  authors?: Array<{ name: string; email?: string; url?: string; role?: string }>;
  engines?: Record<string, string>;
  environments?: string[];
  permissions?: WeavetabManifestPermissions;
  tools?: WeavetabManifestTool[];
  commands?: WeavetabManifestCommand[];
  prompts?: WeavetabManifestPrompt[];
  resources?: WeavetabManifestResource[];
  defaultConfig?: Record<string, any>;
  keywords?: string[];
  homepage?: string;
  repository?: string;
  [key: string]: any;
}

/**
 * Fluent builder class for creating enterprise Weavetab plugins.
 */
export class PluginBuilder {
  private def: WeavetabPluginDefinition;

  constructor(name: string) {
    this.def = {
      name,
      tools: [],
      commands: [],
      prompts: [],
      resources: [],
      overrides: [],
      removeTools: [],
      defaultConfig: {},
      onLoad: async () => {},
    };
  }

  version(version: string): this {
    this.def.version = version;
    return this;
  }

  description(description: string): this {
    this.def.description = description;
    return this;
  }

  agentsMd(path: string): this {
    this.def.agentsMd = path;
    return this;
  }

  instructions(text: string): this {
    this.def.instructions = text;
    return this;
  }

  defaultConfig(config: Record<string, any>): this {
    this.def.defaultConfig = { ...this.def.defaultConfig, ...config };
    return this;
  }

  permissions(perms: WeavetabPermissions): this {
    this.def.permissions = { ...(this.def.permissions || {}), ...perms };
    return this;
  }

  allowToolAdd(reason?: string): this {
    if (!this.def.permissions) this.def.permissions = {};
    const t = this.def.permissions.tools ?? {};
    t.add = true;
    if (reason) t.reason = reason;
    this.def.permissions.tools = t;
    return this;
  }

  allowOverride(...names: string[]): this {
    if (!this.def.permissions) this.def.permissions = {};
    const t = this.def.permissions.tools ?? {};
    t.override = [...(t.override ?? []), ...names];
    this.def.permissions.tools = t;
    return this;
  }

  allowRemove(...names: string[]): this {
    if (!this.def.permissions) this.def.permissions = {};
    const t = this.def.permissions.tools ?? {};
    t.remove = [...(t.remove ?? []), ...names];
    this.def.permissions.tools = t;
    return this;
  }

  allowCommandAdd(reason?: string): this {
    if (!this.def.permissions) this.def.permissions = {};
    this.def.permissions.commands = {
      ...(this.def.permissions.commands ?? {}),
      add: true,
      ...(reason ? { reason } : {}),
    };
    return this;
  }

  allowPromptAdd(reason?: string): this {
    if (!this.def.permissions) this.def.permissions = {};
    this.def.permissions.prompts = {
      ...(this.def.permissions.prompts ?? {}),
      add: true,
      ...(reason ? { reason } : {}),
    };
    return this;
  }

  allowResourceAdd(reason?: string): this {
    if (!this.def.permissions) this.def.permissions = {};
    this.def.permissions.resources = {
      ...(this.def.permissions.resources ?? {}),
      add: true,
      ...(reason ? { reason } : {}),
    };
    return this;
  }

  addTool<TArgs = any>(tool: McpToolRegistration<TArgs>): this {
    if (!this.def.tools) this.def.tools = [];
    this.def.tools.push(tool);
    return this;
  }

  addCommand<TSchema = any>(command: DefinedCommand<TSchema>): this {
    if (!this.def.commands) this.def.commands = [];
    this.def.commands.push(command);
    return this;
  }

  addPrompt<TArgs extends Record<string, any> = Record<string, string>>(prompt: DefinedPrompt<TArgs>): this {
    if (!this.def.prompts) this.def.prompts = [];
    this.def.prompts.push(prompt);
    return this;
  }

  addResource(resource: DefinedResource): this {
    if (!this.def.resources) this.def.resources = [];
    this.def.resources.push(resource);
    return this;
  }

  overrideTool<TArgs = any>(override: ToolOverrideDefinition<TArgs>): this {
    if (!this.def.overrides) this.def.overrides = [];
    this.def.overrides.push(override);
    return this;
  }

  removeTool(toolName: string): this {
    if (!this.def.removeTools) this.def.removeTools = [];
    this.def.removeTools.push(toolName);
    return this;
  }

  onLoad(handler: (ctx: PluginContext) => Promise<void> | void): this {
    this.def.onLoad = handler;
    return this;
  }

  onUnload(handler: (ctx: PluginContext) => Promise<void> | void): this {
    this.def.onUnload = handler;
    return this;
  }

  onBeforeAction(handler: BeforeActionHook): this {
    this.def.onBeforeAction = handler;
    return this;
  }

  onAfterAction(handler: AfterActionHook): this {
    this.def.onAfterAction = handler;
    return this;
  }

  onDOMMutation(handler: DOMMutationHook): this {
    this.def.onDOMMutation = handler;
    return this;
  }

  build(): WeavetabPluginDefinition {
    return this.def;
  }
}

export function createPlugin(name: string): PluginBuilder {
  return new PluginBuilder(name);
}

export function definePlugin(plugin: WeavetabPluginDefinition): WeavetabPluginDefinition {
  return plugin;
}

export function createTool<TArgs = any>(tool: McpToolRegistration<TArgs>): McpToolRegistration<TArgs> {
  return tool;
}

export function createOverride<TArgs = any>(override: ToolOverrideDefinition<TArgs>): ToolOverrideDefinition<TArgs> {
  return override;
}

export function defineManifest(manifest: WeavetabManifest): WeavetabManifest {
  return manifest;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function matchUrlPattern(url: string, pattern: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const cleanPattern = pattern.toLowerCase().trim();

    if (cleanPattern === "*" || cleanPattern === "*.*") return true;

    if (cleanPattern.startsWith("*.")) {
      const baseDomain = cleanPattern.slice(2);
      return host === baseDomain || host.endsWith("." + baseDomain);
    }

    return host === cleanPattern;
  } catch {
    return false;
  }
}
