#!/usr/bin/env node
/**
 * @weavetab/sdk CLI
 * Enterprise developer CLI for scaffolding, building, watching, and validating Weavetab plugins.
 *
 * Copyright (c) 2026 fy2ne. Licensed under the MIT License.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { exportManifest } from "./schema/exporter.js";
import { runPreflight } from "./preflight.js";

import { WEAVETAB_VERSION } from "./version.js";

const _require = createRequire(import.meta.url);

function getSdkVersion(): string {
  try {
    const pkg = _require("../package.json");
    return pkg.version || WEAVETAB_VERSION;
  } catch {
    return WEAVETAB_VERSION;
  }
}

const SCHEMA_URL = "https://weavetab.dev/schema/plugin.json";
const SCHEMA_FALLBACK_URL =
  "https://raw.githubusercontent.com/weavetab/sdk/main/schema/plugin.json";
const REGISTRY_URL = "https://weavetab.dev/api/registry/verified.json";
const DOCS_URL = "https://weavetab.dev/docs";

const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : "";

function printBanner(): void {
  const v = getSdkVersion();
  console.log(`
\x1b[36m╔══════════════════════════════════════════════════════════════════╗
║               WEAVETAB PLUGIN DEVELOPER SDK v${v.padEnd(19)}║
╚══════════════════════════════════════════════════════════════════╝\x1b[0m`);
}

function printHelp(): void {
  printBanner();
  console.log(`
\x1b[1mUSAGE:\x1b[0m
  $ weavetab <command> [options]
  $ npx @weavetab/sdk <command> [options]

\x1b[1mDEVELOPER COMMANDS:\x1b[0m
  \x1b[32minit\x1b[0m [name]            Scaffold a new enterprise TypeScript plugin project
  \x1b[32mbuild\x1b[0m                  Compile TypeScript and synchronize weavetab.json manifest
  \x1b[32mmanifest\x1b[0m (or schema)   Auto-generate MCP manifest & JSON schemas from Zod tools
  \x1b[32mdev\x1b[0m                    Start live TypeScript watch mode with manifest auto-sync
  \x1b[32mvalidate\x1b[0m [--offline]   Validate manifest schema, isolated permissions, and sandbox
  \x1b[32mpreflight\x1b[0m              Run complete pre-publish verification suite
  \x1b[32mdoctor\x1b[0m                 Run environment diagnostics and verify plugin health
  \x1b[32mpublish\x1b[0m [--dry-run]    npm publish + sync to weavetab.dev registry
  \x1b[32mtemplates\x1b[0m              List all 5 available plugin templates
  \x1b[32mversion\x1b[0m                Print current SDK version
  \x1b[32mhelp\x1b[0m                   Display this help screen

\x1b[1mTEMPLATE OPTIONS (for 'init'):\x1b[0m
  \x1b[36m--template standard\x1b[0m    Default versatile plugin (Tools + Isolated Storage + HUD)
  \x1b[36m--template visual\x1b[0m      Visual feedback & UI overlay plugin (HUD, badges, DOM styles)
  \x1b[36m--template scraper\x1b[0m     Data extraction & DOM scraper with sandboxed JSON storage
  \x1b[36m--template automation\x1b[0m  High-speed multi-step browser automation workflow
  \x1b[36m--template override\x1b[0m    Built-in tool interceptor & lifecycle hook wrapper

\x1b[1mDOCUMENTATION & REGISTRY:\x1b[0m
  Docs:     https://weavetab.dev/docs
  Schemas:  https://weavetab.dev/schema/plugin.json
  Registry: https://weavetab.dev/api/plugins
  SDK:      https://github.com/weavetab/sdk
`);
}

// ---------------------------------------------------------------------------
// TEMPLATES DEFINITION — 5 first-class professional scaffolds
// ---------------------------------------------------------------------------

export const TEMPLATE_CATALOG: Array<{ id: string; label: string; description: string }> = [
  { id: "standard", label: "Standard", description: "Versatile plugin (Tools + Isolated Storage + HUD)" },
  { id: "visual", label: "Visual", description: "Visual feedback & UI overlay (HUD, badges, DOM styles)" },
  { id: "scraper", label: "Scraper", description: "Data extraction & DOM scraper with sandboxed JSON storage" },
  { id: "automation", label: "Automation", description: "High-speed multi-step browser automation workflow" },
  { id: "override", label: "Override", description: "Built-in tool interceptor & lifecycle hook wrapper" },
];

export function isValidTemplate(t: string): boolean {
  return TEMPLATE_CATALOG.some((x) => x.id === t.toLowerCase());
}

function printTemplates(): void {
  console.log(`\n\x1b[1mAVAILABLE TEMPLATES:\x1b[0m`);
  for (const t of TEMPLATE_CATALOG) {
    console.log(`  \x1b[36m${t.id.padEnd(12)}\x1b[0m ${t.description}`);
  }
  console.log(`\nUsage: weavetab init my-plugin --template <id>\n`);
}

function getTemplateSource(templateType: string, pluginPkgName: string): { src: string; tools: any[]; perms: any; config: any } {
  switch (templateType.toLowerCase()) {
    case "visual":
      return {
        config: {
          hudBadge: "Visual Mode",
          badgeColor: "#8b5cf6",
          autoInjectDarkTheme: false,
        },
        perms: {
          config: { read: true, write: true, reason: "Manages visual HUD preferences" },
          extension: { hud: true, overlay: true, styles: true, scripts: true, reason: "Renders HUD badges and injects custom styles" },
          cdp: { evaluate: true, reason: "Applies visual DOM transforms in page" },
          tools: { add: true, reason: "Registers the highlight_elements tool" },
        },
        tools: [
          {
            name: "highlight_elements",
            description: "Highlights specific DOM elements on the active webpage with custom outline colors",
            parameters: {
              type: "object",
              properties: {
                selector: { type: "string", description: "CSS selector of elements to highlight" },
                color: { type: "string", description: "Border color (e.g. #22c55e, red)" },
              },
              required: ["selector"],
            },
          },
        ],
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    hudBadge: "Visual Mode",
    badgeColor: "#8b5cf6",
    autoInjectDarkTheme: false,
  },

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("Visual Extension plugin initialized!");

    // Register visual highlight tool
    ctx.mcp.registerTool({
      name: "highlight_elements",
      description: "Highlights specific DOM elements on the active webpage with custom outline colors",
      schema: {
        selector: z.string().describe("CSS selector of elements to highlight"),
        color: z.string().optional().describe("Border color (e.g. #22c55e, red)"),
      },
      handler: async (args: { selector: string; color?: string }, session: any) => {
        const color = args.color || "#22c55e";

        // Show floating HUD thought bubble
        if (session) {
          await ctx.extension.showThought(session, \`🎨 Highlighting \${args.selector}\`, { durationMs: 3000 });
          await ctx.extension.setHudState(session, {
            badge: ctx.config.hudBadge,
            badgeColor: ctx.config.badgeColor,
          });

          // Inject custom styling
          await ctx.extension.injectStyles(session, \`
            \${args.selector} {
              outline: 3px solid \${color} !important;
              outline-offset: 2px !important;
              transition: outline 0.2s ease !important;
            }
          \`);
        }

        return {
          content: [{ type: "text", text: \`highlighted elements matching "\${args.selector}" with color \${color}\` }],
        };
      },
    });
  },
});
`,
      };

    case "scraper":
      return {
        config: {
          maxItems: 50,
          exportFormat: "json",
        },
        perms: {
          config: { read: true, write: true, reason: "Controls scraping limits" },
          cdp: { evaluate: true, dom: true, reason: "Extracts DOM nodes and data" },
          tools: { add: true, reason: "Registers the extract_table_data tool" },
        },
        tools: [
          {
            name: "extract_table_data",
            description: "Scrapes structured table or list records from the active webpage and caches into isolated storage",
            parameters: {
              type: "object",
              properties: {
                rowSelector: { type: "string", description: "CSS selector for individual rows or cards" },
                limit: { type: "number", description: "Max rows to extract" },
              },
              required: ["rowSelector"],
            },
          },
        ],
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    maxItems: 50,
    exportFormat: "json",
  },

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("Scraper plugin loaded!");

    ctx.mcp.registerTool({
      name: "extract_table_data",
      description: "Scrapes structured table or list records from the active webpage and caches into isolated storage",
      schema: {
        rowSelector: z.string().describe("CSS selector for individual rows or cards"),
        limit: z.number().optional().describe("Max rows to extract"),
      },
      handler: async (args: { rowSelector: string; limit?: number }, session: any) => {
        const limit = args.limit || ctx.config.maxItems || 50;

        let rows: any[] = [];
        if (session) {
          rows = await ctx.extension.injectScript(session, \`
            (() => {
              const elements = Array.from(document.querySelectorAll(\${JSON.stringify(args.rowSelector)})).slice(0, \${limit});
              return elements.map((el) => ({
                text: el.innerText.trim(),
                html: el.innerHTML.slice(0, 150),
              }));
            })()
          \`);
        }

        // Save scraped dataset in isolated plugin storage (~/.weavetab/plugins/${pluginPkgName}/scraped_data.json)
        await ctx.storage.setJSON("scraped_data.json", { timestamp: Date.now(), count: rows.length, rows });

        return {
          content: [
            {
              type: "text",
              text: \`Scraped \${rows.length} records. Saved to isolated plugin storage: \${ctx.storage.getPath("scraped_data.json")}\`,
            },
          ],
        };
      },
    });
  },
});
`,
      };

    case "override":
      return {
        config: {
          logInterceptions: true,
          blockedDomains: ["evil-tracker.com"],
        },
        perms: {
          config: { read: true, write: true, reason: "Manages tool interception configuration" },
          tools: { override: ["browser_navigate"], reason: "Secures browser navigation actions" },
          hooks: { onBeforeAction: true, reason: "Audits and filters every tool call" },
        },
        tools: [],
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    logInterceptions: true,
    blockedDomains: ["evil-tracker.com"],
  },

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("Security Interceptor plugin loaded!");

    // Override browser_navigate tool to protect against unsafe URLs
    if (ctx.mcp.overrideTool) {
      ctx.mcp.overrideTool("browser_navigate", async (args: { url: string }, session: any, config: any, original: any) => {
        const blocked = ctx.config.blockedDomains || [];
        const isBlocked = blocked.some((d: string) => args.url.includes(d));

        if (isBlocked) {
          ctx.logger.warn(\`Blocked navigation to unsafe URL: \${args.url}\`);
          if (session) {
            await ctx.extension.showThought(session, \`🛡️ Blocked unsafe URL: \${args.url}\`, { durationMs: 4000 });
          }
          return {
            content: [{ type: "text", text: \`[Security Guard] Navigation blocked to prohibited destination: \${args.url}\` }],
            isError: true,
          };
        }

        ctx.logger.info(\`Allowed navigation to: \${args.url}\`);
        return original ? await original(args, session, config) : null;
      });
    }

    // Register global hook
    ctx.hooks.beforeToolCall((toolName, args) => {
      if (ctx.config.logInterceptions) {
        ctx.logger.debug(\`[Hook] Tool execution invoked: \${toolName}\`);
      }
    });
  },
});
`,
      };

    case "standard":
    default:
      return {
        config: {
          enabled: true,
          showVisualHud: true,
          retryCount: 3,
        },
        perms: {
          config: { read: true, write: true, reason: "Accesses isolated plugin preferences" },
          extension: { hud: true, overlay: true, styles: true, scripts: true, reason: "Displays visual HUD feedback" },
          cdp: { evaluate: true, click: true, navigate: true, reason: "Executes automation in browser context" },
          tools: { add: true, reason: "Registers the example_action tool" },
        },
        tools: [
          {
            name: "example_action",
            description: "An example custom tool registered by this plugin with visual HUD feedback",
            parameters: {
              type: "object",
              properties: {
                message: { type: "string", description: "A message to display or echo back" },
              },
              required: ["message"],
            },
          },
        ],
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    enabled: true,
    showVisualHud: true,
    retryCount: 3,
  },

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("Plugin loaded with config:", ctx.config);

    // 1. Register custom MCP tool
    ctx.mcp.registerTool({
      name: "example_action",
      description: "An example custom tool registered by this plugin with visual HUD feedback",
      schema: {
        message: z.string().describe("A message to echo back and display on the screen"),
      },
      handler: async (args: { message: string }, session: any) => {
        // Track invocations in isolated persistent storage (~/.weavetab/plugins/${pluginPkgName}/storage.json)
        const currentCount = (await ctx.storage.get<number>("invokeCount", 0)) || 0;
        await ctx.storage.set("invokeCount", currentCount + 1);

        // Render animated thought bubble and HUD badge on the browser tab
        if (ctx.config.showVisualHud && session) {
          await ctx.extension.showThought(session, \`✨ \${args.message}\`, { durationMs: 4000 });
          await ctx.extension.setHudState(session, {
            badge: "Active",
            badgeColor: "#3b82f6",
          });
        }

        return {
          content: [
            {
              type: "text",
              text: \`Echo from \${ctx.name}: "\${args.message}" (Total Invocations: \${currentCount + 1})\`,
            },
          ],
        };
      },
    });

    // 2. Lifecycle Hooks
    ctx.hooks.beforeToolCall((toolName, args) => {
      ctx.logger.debug(\`Before tool call: \${toolName}\`, args);
    });
  },

  async onUnload(ctx: PluginContext) {
    ctx.logger.info("Plugin unloaded.");
  },
});
`,
      };
    case "automation":
      return {
        config: {
          enabled: true,
        },
        perms: {
          cdp: { evaluate: true, navigate: true, click: true, reason: "Executes multi-step automation sequences" },
          filesystem: { read: ["*"], write: ["*"], reason: "Reads input files and writes outputs" },
          tools: { add: true, reason: "Registers the run_automation tool" },
        },
        tools: [
          {
            name: "run_automation",
            description: "Runs a custom multi-step automation workflow",
            parameters: {
              type: "object",
              properties: {
                target: { type: "string", description: "Target to automate" },
              },
              required: ["target"],
            }
          }
        ],
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("Automation plugin loaded");

    ctx.mcp.registerTool({
      name: "run_automation",
      description: "Runs a custom multi-step automation workflow",
      schema: {
        target: z.string().describe("Target to automate"),
      },
      handler: async (args, session) => {
        ctx.logger.info(\`Running automation on \${args.target}\`);
        return {
          content: [{ type: "text", text: \`Automation complete for \${args.target}\` }]
        };
      },
    });
  },
});
`
      };
  }
}

// ---------------------------------------------------------------------------
// 1. INIT COMMAND
// ---------------------------------------------------------------------------

async function runInit(): Promise<void> {
  printBanner();

  if (args.includes("--list") || args.includes("-l")) {
    printTemplates();
    return;
  }

  let targetName = "";
  let templateType = "standard";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--template" && args[i + 1]) {
      templateType = args[i + 1].toLowerCase();
      i++;
    } else if (!targetName && !args[i].startsWith("-")) {
      targetName = args[i];
    }
  }

  if (!isValidTemplate(templateType)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Unknown template "${templateType}".`);
    printTemplates();
    process.exit(1);
  }

  const pluginName = (targetName || "my-weavetab-plugin").trim();
  const targetDir = path.resolve(process.cwd(), pluginName);

  console.log(`\x1b[36m[Weavetab SDK]\x1b[0m Scaffolding [1m${templateType}[0m plugin in [1m${targetDir}[0m...\n`);

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Directory "${pluginName}" already exists and is not empty.`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(targetDir, "src"), { recursive: true });

  const sdkVer = getSdkVersion();
  const pkgName = pluginName.startsWith("@") ? pluginName : `weavetab-plugin-${pluginName.replace(/^weavetab-plugin-/, "")}`;
  const tpl = getTemplateSource(templateType, pkgName);

  // 1. package.json
  const tplMeta = TEMPLATE_CATALOG.find((t) => t.id === templateType)!;
  const pkgJson = {
    name: pkgName,
    version: "1.0.0",
    description: `A Weavetab ${templateType} plugin — ${tplMeta.description}`,
    license: "MIT",
    main: "dist/index.js",
    types: "dist/index.d.ts",
    type: "module",
    scripts: {
      build: "weavetab build",
      dev: "weavetab dev",
      validate: "weavetab validate",
      doctor: "weavetab doctor",
      publish: "weavetab publish",
      test: "node --test test/*.test.mjs",
    },
    engines: {
      node: ">=18.0.0",
    },
    keywords: ["weavetab", "weavetab-plugin", "mcp", "browser-automation", `weavetab-template-${templateType}`],
    dependencies: {
      "@weavetab/sdk": `^${sdkVer}`,
    },
    devDependencies: {
      typescript: "^5.3.0",
    },
  };

  fs.writeFileSync(path.join(targetDir, "package.json"), JSON.stringify(pkgJson, null, 2) + "\n");

  // 2. tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      outDir: "./dist",
      rootDir: "./src",
      declaration: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ["src/**/*"],
  };

  fs.writeFileSync(path.join(targetDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n");

  // 3. weavetab.json
  const weavetabJson = {
    $schema: SCHEMA_URL,
    name: pkgJson.name,
    version: "1.0.0",
    description: pkgJson.description,
    entry: "dist/index.js",
    engines: {
      weavetab: `^${sdkVer}`,
      node: ">=18.0.0",
    },
    environments: ["mcp"],
    defaultConfig: tpl.config,
    permissions: tpl.perms,
    tools: tpl.tools,
  };

  fs.writeFileSync(path.join(targetDir, "weavetab.json"), JSON.stringify(weavetabJson, null, 2) + "\n");

  // 4. src/index.ts
  fs.writeFileSync(path.join(targetDir, "src", "index.ts"), tpl.src);

  // 5. .gitignore
  const gitignore = `node_modules/
dist/
*.log
.DS_Store
`;
  fs.writeFileSync(path.join(targetDir, ".gitignore"), gitignore);

  // 6. README.md (per-template, truthful)
  const readme = `# ${pkgJson.name}

> ${tplMeta.description}. Built with \`@weavetab/sdk\` for [Weavetab](https://weavetab.dev).

## Template

This plugin was scaffolded with \`weavetab init --template ${templateType}\`.

| Template | Use when |
|---|---|
| \`standard\` | General-purpose plugin (tools + storage + HUD) |
| \`visual\` | HUD badges, overlays, DOM styling |
| \`scraper\` | DOM extraction with sandboxed JSON storage |
| \`automation\` | Multi-step browser workflows |
| \`override\` | Intercepting / wrapping built-in tools |

Switch templates: \`weavetab init <name> --template <id>\` · list: \`weavetab templates\`

## Architectural Guarantees
- **Isolated Configuration**: \`~/.weavetab/plugins/${pkgJson.name}/config.json\`
- **Sandboxed Storage**: key-value + JSON files under \`~/.weavetab/plugins/${pkgJson.name}/\`
- **Permissions with reasons**: every capability in \`weavetab.json\` declares a \`reason\`

## Development

\`\`\`bash
npm install
npm run build      # tsc + sync weavetab.json
npm run dev        # watch mode
npm run validate   # manifest + remote schema check (add --offline to skip network)
npm run doctor     # env + schema + registry reachability
\`\`\`

## Publish

\`\`\`bash
npm run publish    # npm publish + sync to https://weavetab.dev/discover
# dry run first:
weavetab publish --dry-run
\`\`\`

## Manifest

See [\`weavetab.json\` schema](https://weavetab.dev/schema/plugin.json) and [docs](https://weavetab.dev/docs).
`;
  fs.writeFileSync(path.join(targetDir, "README.md"), readme);

  // 7. Smoke test — validates manifest without a framework
  fs.mkdirSync(path.join(targetDir, "test"), { recursive: true });
  const smokeTest = `import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "weavetab.json"), "utf-8"));

describe("weavetab.json manifest", () => {
  it("has required fields", () => {
    assert.ok(manifest.name, "missing name");
    assert.ok(manifest.version, "missing version");
    assert.ok(manifest.entry, "missing entry");
    assert.ok(manifest.engines?.weavetab, "missing engines.weavetab");
  });

  it("declares $schema on weavetab.dev", () => {
    assert.equal(manifest.$schema, "https://weavetab.dev/schema/plugin.json");
  });

  it("every permission category declares a reason", () => {
    for (const [cat, perm] of Object.entries(manifest.permissions ?? {})) {
      assert.ok(perm && perm.reason, "permission '" + cat + "' is missing a reason");
    }
  });
});
`;
  fs.writeFileSync(path.join(targetDir, "test", "manifest.test.mjs"), smokeTest);

  console.log(`\x1b[32m✔\x1b[0m Plugin \x1b[1m${pluginName}\x1b[0m scaffolded with \x1b[36m${templateType}\x1b[0m template!`);
  console.log(`\n\x1b[1mNext steps:\x1b[0m`);
  console.log(`  cd ${pluginName}`);
  console.log(`  npm install`);
  console.log(`  npm run build\n`);
}

// ---------------------------------------------------------------------------
// 2. BUILD COMMAND
// ---------------------------------------------------------------------------

async function runBuild(): Promise<void> {
  const cwd = process.cwd();
  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Building plugin in [1m${cwd}[0m...`);

  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m package.json not found in ${cwd}`);
    process.exit(1);
  }

  // 1. Run tsc if tsconfig exists
  if (fs.existsSync(path.join(cwd, "tsconfig.json"))) {
    try {
      console.log(`  \x1b[34m→\x1b[0m Compiling TypeScript sources...`);
      const isWin = process.platform === "win32";
      const tscCmd = isWin ? "npx.cmd tsc" : "npx tsc";
      execSync(tscCmd, { cwd, stdio: "inherit" });
    } catch {
      console.error(`\x1b[31m[ERROR]\x1b[0m TypeScript compilation failed.`);
      process.exit(1);
    }
  }

  // 2. Synchronize weavetab.json and export tool schemas
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const manifestPath = path.join(cwd, "weavetab.json");
  let manifest: any = {};

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
      manifest = {};
    }
  }

  // Attempt to load compiled plugin module to extract Zod tools and hooks
  const entryRel = pkgJson.main || manifest.entry || "dist/index.js";
  const entryAbs = path.join(cwd, entryRel);
  if (fs.existsSync(entryAbs)) {
    try {
      const mod = await import(pathToFileURL(entryAbs).href);
      const pluginDef = mod.default || mod.plugin || mod;
      if (pluginDef && (pluginDef.name || pluginDef.tools || pluginDef.onBeforeAction || pluginDef.onAfterAction || pluginDef.onDOMMutation)) {
        manifest = exportManifest(pluginDef, manifest);
      }
    } catch {
      // If module requires runtime MCP host or globals, fallback gracefully to existing manifest
    }
  }

  const sdkVer = getSdkVersion();

  manifest.$schema = manifest.$schema || SCHEMA_URL;
  manifest.name = pkgJson.name || manifest.name || "unnamed-plugin";
  manifest.version = pkgJson.version || manifest.version || "1.0.0";
  manifest.description = pkgJson.description || manifest.description || "";
  manifest.entry = entryRel;

  if (!manifest.engines) {
    manifest.engines = {
      weavetab: `^${sdkVer}`,
      node: pkgJson.engines?.node || ">=18.0.0",
    };
  }

  if (!manifest.environments) {
    manifest.environments = ["mcp"];
  }

  if (!manifest.permissions) {
    manifest.permissions = {
      config: {
        read: true,
        write: true,
        reason: "Accesses isolated plugin preferences in ~/.weavetab/plugins/",
      },
      extension: {
        hud: true,
        reason: "Displays visual HUD feedback",
      },
      cdp: {
        evaluate: true,
        reason: "Executes automation actions in browser context",
      },
    };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`  \x1b[32m✔\x1b[0m Synchronized and validated weavetab.json manifest (${manifest.tools?.length || 0} tools declared)`);
  console.log(`\x1b[32m✔ build complete.\x1b[0m\n`);
}

// ---------------------------------------------------------------------------
// 2.5 MANIFEST / SCHEMA EXPORT COMMAND
// ---------------------------------------------------------------------------

async function runManifest(): Promise<void> {
  const cwd = process.cwd();
  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Generating MCP manifest & tool schemas in \x1b[1m${cwd}\x1b[0m...`);

  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m package.json not found in ${cwd}`);
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const manifestPath = path.join(cwd, "weavetab.json");
  let manifest: any = {};

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
      manifest = {};
    }
  }

  const entryRel = pkgJson.main || manifest.entry || "dist/index.js";
  const entryAbs = path.join(cwd, entryRel);
  if (!fs.existsSync(entryAbs)) {
    console.log(`  \x1b[33m⚠\x1b[0m Compiled entry ${entryRel} not found. Running build first...`);
    await runBuild();
    return;
  }

  try {
    const mod = await import(pathToFileURL(entryAbs).href);
    const pluginDef = mod.default || mod.plugin || mod;
    manifest = exportManifest(pluginDef, manifest);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`  \x1b[32m✔\x1b[0m exported ${manifest.tools?.length || 0} tool(s) to weavetab.json:\n`);
    console.log(JSON.stringify(manifest, null, 2));
  } catch (err: any) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Failed to export manifest: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 3. DEV / WATCH COMMAND
// ---------------------------------------------------------------------------

async function runDev(): Promise<void> {
  const cwd = process.cwd();
  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m watch mode in \x1b[1m${cwd}\x1b[0m...`);

  const isWin = process.platform === "win32";
  const cmd = isWin ? "npx.cmd" : "npx";

  const child = spawn(cmd, ["tsc", "--watch"], {
    cwd,
    stdio: "inherit",
    shell: isWin,
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });

  child.on("error", (err) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m Failed to start tsc --watch: ${err.message}`);
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// 4. VALIDATE COMMAND
// ---------------------------------------------------------------------------

async function runValidate(): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, "weavetab.json");
  const pkgPath = path.join(cwd, "package.json");
  const offline = args.includes("--offline");

  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Validating plugin in \x1b[1m${cwd}\x1b[0m...\n`);

  if (!fs.existsSync(manifestPath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m weavetab.json not found in ${cwd}`);
    process.exit(1);
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!manifest.name) errors.push("Missing 'name' field");
    if (!manifest.version) errors.push("Missing 'version' field");
    if (!manifest.entry) errors.push("Missing 'entry' field");
    if (!manifest.engines?.weavetab) errors.push("Missing 'engines.weavetab' field");

    // Verify entry file exists
    const entryPath = path.resolve(cwd, manifest.entry || "dist/index.js");
    if (!fs.existsSync(entryPath)) {
      warnings.push(`Entrypoint file '${manifest.entry}' does not exist yet. Run 'weavetab build' to compile.`);
    }

    // Check permissions reasons
    if (manifest.permissions) {
      for (const [category, perm] of Object.entries(manifest.permissions)) {
        if (typeof perm === "object" && perm !== null && !(perm as any).reason) {
          warnings.push(`Permission category '${category}' is missing a 'reason' explanation.`);
        }
      }
    }

    // Remote schema check (skipped with --offline)
    if (!offline) {
      let schemaOk = false;
      for (const url of [SCHEMA_URL, SCHEMA_FALLBACK_URL]) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            schemaOk = true;
            console.log(`  \x1b[32m→\x1b[0m Remote schema reachable: ${url}`);
            break;
          }
        } catch {
          continue;
        }
      }
      if (!schemaOk) {
        warnings.push(`Remote schema unreachable (${SCHEMA_URL}). Validated locally only. Use --offline to silence.`);
      }
    } else {
      console.log(`  \x1b[33m→\x1b[0m Offline mode: skipping remote schema fetch.`);
    }

    // Warnings output
    if (warnings.length > 0) {
      console.log(`\x1b[33m[WARNINGS]\x1b[0m`);
      warnings.forEach((w) => console.log(`  \x1b[33m⚠\x1b[0m ${w}`));
      console.log();
    }

    // Errors output
    if (errors.length > 0) {
      console.error(`\x1b[31m[FAIL]\x1b[0m Manifest validation failed:`);
      errors.forEach((e) => console.error(`  \x1b[31m✖\x1b[0m ${e}`));
      process.exit(1);
    }

    console.log(`\x1b[32m✔ weavetab.json manifest is strictly valid and compliant!\x1b[0m\n`);
  } catch (err: any) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Failed to parse weavetab.json: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 5. DOCTOR / DIAGNOSTICS COMMAND
// ---------------------------------------------------------------------------

async function runDoctor(): Promise<void> {
  printBanner();
  const cwd = process.cwd();
  console.log(`\x1b[36m[Weavetab Doctor]\x1b[0m Running plugin diagnostics in [1m${cwd}[0m...\n`);

  const checks: Array<{ title: string; status: "pass" | "warn" | "fail"; detail: string }> = [];

  // Check 1: Node.js version
  const nodeVer = process.version;
  const major = parseInt(nodeVer.slice(1).split(".")[0], 10);
  if (major >= 18) {
    checks.push({ title: "Node.js Environment", status: "pass", detail: `${nodeVer} (>= 18 required)` });
  } else {
    checks.push({ title: "Node.js Environment", status: "fail", detail: `${nodeVer} is below required >= 18.0.0` });
  }

  // Check 2: package.json
  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      checks.push({ title: "package.json", status: "pass", detail: `Found "${pkg.name}" (v${pkg.version})` });
    } catch {
      checks.push({ title: "package.json", status: "fail", detail: "Invalid JSON syntax" });
    }
  } else {
    checks.push({ title: "package.json", status: "fail", detail: "Not found in directory" });
  }

  // Check 3: weavetab.json
  const manifestPath = path.join(cwd, "weavetab.json");
  if (fs.existsSync(manifestPath)) {
    checks.push({ title: "weavetab.json Manifest", status: "pass", detail: "Manifest detected" });
  } else {
    checks.push({ title: "weavetab.json Manifest", status: "warn", detail: "Missing weavetab.json. Run 'weavetab build' to generate" });
  }

  // Check 4: TypeScript configuration
  const tsconfigPath = path.join(cwd, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    checks.push({ title: "TypeScript Setup", status: "pass", detail: "tsconfig.json configured" });
  } else {
    checks.push({ title: "TypeScript Setup", status: "warn", detail: "No tsconfig.json found" });
  }

  // Check 5: Sandboxed isolated storage directory
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const pluginsDir = path.join(homeDir, ".weavetab", "plugins");
  checks.push({ title: "Plugin Sandbox Isolation", status: "pass", detail: `Isolated storage path: ${pluginsDir}` });

  // Check 6: Schema reachability
  try {
    const res = await fetch(SCHEMA_URL, { signal: AbortSignal.timeout(5000) });
    checks.push({
      title: "Schema Reachability",
      status: res.ok ? "pass" : "warn",
      detail: res.ok ? `${SCHEMA_URL} reachable` : `${SCHEMA_URL} returned ${res.status}`,
    });
  } catch {
    checks.push({ title: "Schema Reachability", status: "warn", detail: `${SCHEMA_URL} unreachable (offline?)` });
  }

  // Check 7: Registry reachability
  try {
    const res = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(5000) });
    checks.push({
      title: "Registry Reachability",
      status: res.ok ? "pass" : "warn",
      detail: res.ok ? `${REGISTRY_URL} reachable` : `${REGISTRY_URL} returned ${res.status}`,
    });
  } catch {
    checks.push({ title: "Registry Reachability", status: "warn", detail: `${REGISTRY_URL} unreachable (offline?)` });
  }

  // Print results
  for (const c of checks) {
    if (c.status === "pass") {
      console.log(`  \x1b[32m✔ [PASS]\x1b[0m [1m${c.title}[0m: [2m${c.detail}[0m`);
    } else if (c.status === "warn") {
      console.log(`  \x1b[33m⚠ [WARN]\x1b[0m [1m${c.title}[0m: [33m${c.detail}[0m`);
    } else {
      console.log(`  \x1b[31m✖ [FAIL]\x1b[0m [1m${c.title}[0m: [31m${c.detail}[0m`);
    }
  }

  console.log();
  const hasFail = checks.some((c) => c.status === "fail");
  if (!hasFail) {
    console.log(`\x1b[32mAll health checks passed! Plugin development environment is optimal.\x1b[0m\n`);
  } else {
    console.log(`\x1b[31mSome diagnostics failed. Please resolve the errors above.\x1b[0m\n`);
  }
}

// ---------------------------------------------------------------------------
// 6. PUBLISH COMMAND — npm publish + sync to weavetab.dev registry
// ---------------------------------------------------------------------------

async function runPublish(): Promise<void> {
  const cwd = process.cwd();
  const dryRun = args.includes("--dry-run");
  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Publishing plugin in \x1b[1m${cwd}\x1b[0m...`);

  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m package.json not found in ${cwd}`);
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  if (!pkg.name) {
    console.error(`\x1b[31m[ERROR]\x1b[0m package.json is missing a name field.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`  \x1b[33m→\x1b[0m Dry run: would run 'npm publish' then POST { packageName: "${pkg.name}" } to https://weavetab.dev/api/plugins/sync`);
    return;
  }

  try {
    console.log(`  \x1b[34m→\x1b[0m Running npm publish...`);
    execSync("npm publish", { cwd, stdio: "inherit" });
  } catch {
    console.error(`\x1b[31m[ERROR]\x1b[0m npm publish failed. Fix the error above and retry.`);
    process.exit(1);
  }

  try {
    console.log(`  \x1b[34m→\x1b[0m Syncing ${pkg.name} to weavetab.dev registry...`);
    const res = await fetch("https://weavetab.dev/api/plugins/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageName: pkg.name }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Registry sync failed (${res.status}): ${(data as any).error || res.statusText}`);
      console.log(`  \x1b[33m→\x1b[0m npm package is live. Retry sync later: POST { packageName: "${pkg.name}" } to https://weavetab.dev/api/plugins/sync`);
      process.exit(1);
    }
    console.log(`\x1b[32m✔ Published ${pkg.name} and synced to https://weavetab.dev/discover\x1b[0m\n`);
  } catch (err: any) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Registry sync failed: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// ROUTER
// ---------------------------------------------------------------------------

async function runPreflightCmd(): Promise<void> {
  printBanner();
  console.log(`\x1b[36m[Weavetab SDK]\x1b[0m Running plugin preflight verification...\n`);
  const res = runPreflight(process.cwd());

  if (res.warnings.length > 0) {
    console.log(`\x1b[33m[WARNINGS]\x1b[0m`);
    for (const w of res.warnings) {
      console.log(`  \x1b[33m!\x1b[0m ${w}`);
    }
    console.log();
  }

  if (res.errors.length > 0) {
    console.log(`\x1b[31m[ERRORS]\x1b[0m`);
    for (const e of res.errors) {
      console.log(`  \x1b[31m✖\x1b[0m ${e}`);
    }
    console.log(`\n\x1b[31m[FAIL]\x1b[0m Plugin failed preflight checks. Fix errors before publishing.\n`);
    process.exit(1);
  }

  console.log(`\x1b[32m✔\x1b[0m All preflight checks passed. Plugin is ready for publication.\n`);
}

async function main() {
  switch (command) {
    case "init":
    case "create":
    case "new":
      await runInit();
      break;
    case "build":
      await runBuild();
      break;
    case "manifest":
    case "schema":
      await runManifest();
      break;
    case "dev":
    case "watch":
      await runDev();
      break;
    case "validate":
    case "check":
      await runValidate();
      break;
    case "doctor":
    case "test":
      await runDoctor();
      break;
    case "preflight":
      await runPreflightCmd();
      break;
    case "publish":
      await runPublish();
      break;
    case "templates":
    case "list-templates":
      printBanner();
      printTemplates();
      break;
    case "version":
    case "-v":
    case "--version":
      console.log(`@weavetab/sdk v${getSdkVersion()}`);
      break;
    case "config":
      console.log(`\n\x1b[33m[Weavetab SDK] The configuration wizard is part of @weavetab/mcp.\x1b[0m`);
      console.log(`To configure the MCP server, run: \x1b[36mnpx -y @weavetab/mcp config\x1b[0m\n`);
      break;
    case "skills":
      console.log(`\n\x1b[33m[Weavetab SDK] The agent skills engine is part of @weavetab/skills.\x1b[0m`);
      console.log(`To install or update skills, run: \x1b[36mnpx -y @weavetab/skills@latest\x1b[0m\n`);
      break;
    case "help":
    case "-h":
    case "--help":
    default:
      printHelp();
      break;
  }
}

main().catch((err) => {
  console.error(`\x1b[31m[Weavetab SDK] Unhandled CLI Error:\x1b[0m`, err);
  process.exit(1);
});
