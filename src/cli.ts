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
import {
  runPreflight,
  auditInstructions,
  MAX_INSTRUCTIONS_LINES,
  MAX_INSTRUCTIONS_CHARS,
} from "./preflight.js";

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
  \x1b[32mbuild\x1b[0m                  Compile TypeScript, verify instructions budget, and sync weavetab.json
  \x1b[32mmanifest\x1b[0m (or schema)   Auto-generate MCP manifest & JSON schemas from Zod tools/commands
  \x1b[32mdev\x1b[0m                    Start live TypeScript watch mode with manifest auto-sync
  \x1b[32mvalidate\x1b[0m [--offline]   Validate manifest schema, instructions budget, and permissions
  \x1b[32mpreflight\x1b[0m              Run complete pre-publish verification suite
  \x1b[32mdoctor\x1b[0m                 Run environment diagnostics and verify plugin health
  \x1b[32mpublish\x1b[0m [--dry-run]    Run preflight gate + npm publish + sync to weavetab.dev registry
  \x1b[32mtemplates\x1b[0m              List all 5 available plugin templates
  \x1b[32mversion\x1b[0m                Print current SDK version
  \x1b[32mhelp\x1b[0m                   Display this help screen

\x1b[1mTEMPLATE OPTIONS (for 'init'):\x1b[0m
  \x1b[36m--template standard\x1b[0m    Default versatile plugin (Tools + CLI Commands + Storage + HUD)
  \x1b[36m--template visual\x1b[0m      Visual feedback & UI overlay plugin (HUD, badges, DOM styles)
  \x1b[36m--template scraper\x1b[0m     Data extraction & DOM scraper with sandboxed JSON storage
  \x1b[36m--template automation\x1b[0m  High-speed multi-step browser automation workflow
  \x1b[36m--template override\x1b[0m    Built-in tool interceptor & lifecycle hook wrapper

\x1b[1mDOCUMENTATION & REGISTRY:\x1b[0m
  Docs:     ${DOCS_URL}
  Schemas:  ${SCHEMA_URL}
  Registry: https://weavetab.dev/api/plugins
  SDK:      https://github.com/weavetab/sdk
`);
}

// ---------------------------------------------------------------------------
// TEMPLATES DEFINITION — 5 first-class professional scaffolds
// ---------------------------------------------------------------------------

export const TEMPLATE_CATALOG: Array<{ id: string; label: string; description: string }> = [
  { id: "standard", label: "Standard", description: "Versatile plugin (Tools + CLI Commands + Storage + HUD)" },
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

function getTemplateSource(
  templateType: string,
  pluginPkgName: string
): { src: string; tools: any[]; commands: any[]; perms: any; config: any; instructions: string } {
  switch (templateType.toLowerCase()) {
    case "visual": {
      const instructions = `Visual overlay plugin for highlighting DOM targets and managing HUD state.
MCP Tools:
- highlight_elements: Outline matching CSS selectors on the active page (selector, color).
CLI Commands:
- weavetab plugin use ${pluginPkgName} badge [--label <text>]: Read or update HUD badge settings.
- weavetab plugin use ${pluginPkgName} highlight_elements --selector "button" --color "#22c55e": Run tool from CLI.`;
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
          commands: { add: true, reason: "Registers the badge CLI command for terminal HUD control" },
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
        commands: [
          {
            name: "badge",
            description: "Inspect or update the configured visual HUD badge text from the CLI",
            usage: `weavetab plugin use ${pluginPkgName} badge [--label <text>]`,
            parameters: {
              type: "object",
              properties: {
                label: { type: "string", description: "Optional new HUD badge label" },
              },
            },
          },
        ],
        instructions,
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    hudBadge: "Visual Mode",
    badgeColor: "#8b5cf6",
    autoInjectDarkTheme: false,
  },

  async onLoad(ctx: PluginContext) {
    ctx.mcp.registerTool({
      name: "highlight_elements",
      description: "Highlights specific DOM elements on the active webpage with custom outline colors",
      schema: {
        selector: z.string().describe("CSS selector of elements to highlight"),
        color: z.string().optional().describe("Border color (e.g. #22c55e, red)"),
      },
      handler: async (args: { selector: string; color?: string }, session: any) => {
        const color = args.color || "#22c55e";

        if (session) {
          await ctx.extension.showThought(session, \`Highlighting \${args.selector}\`, { durationMs: 3000 });
          await ctx.extension.setHudState(session, {
            badge: ctx.config.hudBadge,
            badgeColor: ctx.config.badgeColor,
          });

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

    ctx.cli.registerCommand({
      name: "badge",
      description: "Inspect or update the configured visual HUD badge text from the CLI",
      usage: "weavetab plugin use ${pluginPkgName} badge [--label <text>]",
      schema: {
        label: z.string().optional().describe("Optional new HUD badge label"),
      },
      handler: async (args, cmdCtx) => {
        if (args.label) {
          await cmdCtx.storage.set("hudBadge", args.label);
          return { status: "updated", hudBadge: args.label };
        }
        const saved = (await cmdCtx.storage.get<string>("hudBadge")) || cmdCtx.config.hudBadge;
        return { hudBadge: saved, badgeColor: cmdCtx.config.badgeColor };
      },
    });
  },
});
`,
      };
    }

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
          commands: { add: true, reason: "Registers the export-cache CLI command to dump scraped datasets" },
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
        commands: [
          {
            name: "export-cache",
            description: "Print the latest scraped dataset stored in isolated plugin storage",
            usage: `weavetab plugin use ${pluginPkgName} export-cache`,
            parameters: { type: "object", properties: {} },
          },
        ],
        instructions: `DOM extraction plugin with isolated JSON storage.
MCP Tools:
- extract_table_data: Scrape rows matching rowSelector (up to limit) and persist to scraped_data.json.
CLI Commands:
- weavetab plugin use ${pluginPkgName} export-cache: Dump cached scraped_data.json records to stdout.`,
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    maxItems: 50,
    exportFormat: "json",
  },

  async onLoad(ctx: PluginContext) {
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

    ctx.cli.registerCommand({
      name: "export-cache",
      description: "Print the latest scraped dataset stored in isolated plugin storage",
      usage: "weavetab plugin use ${pluginPkgName} export-cache",
      handler: async (_args, cmdCtx) => {
        const dataset = await cmdCtx.storage.getJSON("scraped_data.json");
        return dataset ?? { count: 0, rows: [] };
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
          commands: { add: true, reason: "Registers the blocklist CLI command to inspect blocked domains" },
        },
        tools: [],
        commands: [
          {
            name: "blocklist",
            description: "List or add blocked navigation domains via CLI",
            usage: `weavetab plugin use ${pluginPkgName} blocklist [--add <domain>]`,
            parameters: {
              type: "object",
              properties: {
                add: { type: "string", description: "Domain to append to blocklist" },
              },
            },
          },
        ],
        instructions: `Navigation guardrail and tool interceptor plugin.
Interceptors:
- Wraps browser_navigate to block domains listed in blockedDomains.
CLI Commands:
- weavetab plugin use ${pluginPkgName} blocklist [--add <domain>]: View or add blocked domains.`,
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    logInterceptions: true,
    blockedDomains: ["evil-tracker.com"],
  },

  async onLoad(ctx: PluginContext) {
    if (ctx.mcp.overrideTool) {
      ctx.mcp.overrideTool("browser_navigate", async (args: { url: string }, session: any, config: any, original: any) => {
        const blocked = ctx.config.blockedDomains || [];
        const isBlocked = blocked.some((d: string) => args.url.includes(d));

        if (isBlocked) {
          ctx.logger.warn(\`Blocked navigation to unsafe URL: \${args.url}\`);
          if (session) {
            await ctx.extension.showThought(session, \`Blocked unsafe URL: \${args.url}\`, { durationMs: 4000 });
          }
          return {
            content: [{ type: "text", text: \`[Security Guard] Navigation blocked to prohibited destination: \${args.url}\` }],
            isError: true,
          };
        }

        return original ? await original(args, session, config) : null;
      });
    }

    ctx.hooks.beforeToolCall((toolName) => {
      if (ctx.config.logInterceptions) {
        ctx.logger.debug(\`[Hook] Tool execution invoked: \${toolName}\`);
      }
    });

    ctx.cli.registerCommand({
      name: "blocklist",
      description: "List or add blocked navigation domains via CLI",
      usage: "weavetab plugin use ${pluginPkgName} blocklist [--add <domain>]",
      schema: {
        add: z.string().optional().describe("Domain to append to blocklist"),
      },
      handler: async (args, cmdCtx) => {
        const current = (await cmdCtx.storage.get<string[]>("blockedDomains")) || cmdCtx.config.blockedDomains || [];
        if (args.add && !current.includes(args.add)) {
          current.push(args.add);
          await cmdCtx.storage.set("blockedDomains", current);
        }
        return { blockedDomains: current };
      },
    });
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
          commands: { add: true, reason: "Registers the trigger CLI command for terminal workflow execution" },
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
            },
          },
        ],
        commands: [
          {
            name: "trigger",
            description: "Trigger an automation workflow run directly from the CLI",
            usage: `weavetab plugin use ${pluginPkgName} trigger --target <url>`,
            parameters: {
              type: "object",
              properties: {
                target: { type: "string", description: "Target URL or workflow identifier" },
              },
              required: ["target"],
            },
          },
        ],
        instructions: `Multi-step browser automation workflow plugin.
MCP Tools:
- run_automation: Execute workflow against target.
CLI Commands:
- weavetab plugin use ${pluginPkgName} trigger --target <url>: Run automation workflow from CLI.`,
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  async onLoad(ctx: PluginContext) {
    ctx.mcp.registerTool({
      name: "run_automation",
      description: "Runs a custom multi-step automation workflow",
      schema: {
        target: z.string().describe("Target to automate"),
      },
      handler: async (args) => {
        ctx.logger.info(\`Running automation on \${args.target}\`);
        return {
          content: [{ type: "text", text: \`Automation complete for \${args.target}\` }],
        };
      },
    });

    ctx.cli.registerCommand({
      name: "trigger",
      description: "Trigger an automation workflow run directly from the CLI",
      usage: "weavetab plugin use ${pluginPkgName} trigger --target <url>",
      schema: {
        target: z.string().describe("Target URL or workflow identifier"),
      },
      handler: async (args) => {
        return { status: "triggered", target: args.target };
      },
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
          commands: { add: true, reason: "Registers the status CLI command for terminal inspection" },
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
        commands: [
          {
            name: "status",
            description: "Check invocation count and plugin configuration from the CLI",
            usage: `weavetab plugin use ${pluginPkgName} status [--reset]`,
            parameters: {
              type: "object",
              properties: {
                reset: { type: "boolean", description: "Reset stored invocation counter" },
              },
            },
          },
        ],
        instructions: `Standard Weavetab plugin with MCP tool, CLI command, and HUD integration.
MCP Tools:
- example_action: Echoes message, increments persistent counter, and updates browser HUD.
CLI Commands:
- weavetab plugin use ${pluginPkgName} status [--reset]: Inspect or reset invocation counter.
- weavetab plugin use ${pluginPkgName} example_action --message "hello": Invoke MCP tool from CLI.`,
        src: `import { definePlugin, z, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    enabled: true,
    showVisualHud: true,
    retryCount: 3,
  },

  async onLoad(ctx: PluginContext) {
    ctx.mcp.registerTool({
      name: "example_action",
      description: "An example custom tool registered by this plugin with visual HUD feedback",
      schema: {
        message: z.string().describe("A message to echo back and display on the screen"),
      },
      handler: async (args: { message: string }, session: any) => {
        const currentCount = (await ctx.storage.get<number>("invokeCount", 0)) || 0;
        await ctx.storage.set("invokeCount", currentCount + 1);

        if (ctx.config.showVisualHud && session) {
          await ctx.extension.showThought(session, \`\${args.message}\`, { durationMs: 4000 });
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

    ctx.cli.registerCommand({
      name: "status",
      description: "Check invocation count and plugin configuration from the CLI",
      usage: "weavetab plugin use ${pluginPkgName} status [--reset]",
      schema: {
        reset: z.boolean().optional().describe("Reset stored invocation counter"),
      },
      handler: async (args, cmdCtx) => {
        if (args.reset) {
          await cmdCtx.storage.set("invokeCount", 0);
        }
        const invokeCount = (await cmdCtx.storage.get<number>("invokeCount", 0)) || 0;
        return { plugin: ctx.name, invokeCount, config: cmdCtx.config };
      },
    });

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

  console.log(`\x1b[36m[Weavetab SDK]\x1b[0m Scaffolding \x1b[1m${templateType}\x1b[0m plugin in \x1b[1m${targetDir}\x1b[0m...\n`);

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Directory "${pluginName}" already exists and is not empty.`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(targetDir, "src"), { recursive: true });

  const sdkVer = getSdkVersion();
  const pkgName = pluginName.startsWith("@")
    ? pluginName
    : `weavetab-plugin-${pluginName.replace(/^weavetab-plugin-/, "")}`;
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
    files: ["dist", "weavetab.json", "README.md"],
    scripts: {
      build: "weavetab build",
      dev: "weavetab dev",
      validate: "weavetab validate",
      preflight: "weavetab preflight",
      prepublishOnly: "weavetab preflight",
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
    displayName: pluginName,
    description: pkgJson.description,
    tags: ["Automation", "Tools", "MCP"],
    entry: "dist/index.js",
    instructions: tpl.instructions,
    defaultConfig: tpl.config,
    permissions: tpl.perms,
    tools: tpl.tools,
    commands: tpl.commands,
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

  // 7. README.md
  const readme = `# ${pkgJson.name}

> ${tplMeta.description}. Built with \`@weavetab/sdk\` for [Weavetab](https://weavetab.dev).

## Template

This plugin was scaffolded with \`weavetab init --template ${templateType}\`.

| Template | Use when |
|---|---|
| \`standard\` | General-purpose plugin (tools + CLI commands + storage + HUD) |
| \`visual\` | HUD badges, overlays, DOM styling |
| \`scraper\` | DOM extraction with sandboxed JSON storage |
| \`automation\` | Multi-step browser workflows |
| \`override\` | Intercepting / wrapping built-in tools |

## CLI Commands & AI Agent Instructions
- Run CLI commands: \`weavetab plugin use ${pkgJson.name} <command> [flags]\`
- Inspect AI agent instructions: \`weavetab plugin use ${pkgJson.name}\`

## Architectural Guarantees
- **Isolated Configuration**: \`~/.weavetab/plugins/${pkgJson.name}/config.json\`
- **Sandboxed Storage**: key-value + JSON files under \`~/.weavetab/plugins/${pkgJson.name}/\`
- **Permissions with reasons**: every capability in \`weavetab.json\` declares a \`reason\`
- **Context-Safe Instructions**: strictly capped at ${MAX_INSTRUCTIONS_LINES} lines / ${MAX_INSTRUCTIONS_CHARS} chars inside \`weavetab.json\` so AI agent context never overflows

## Development

\`\`\`bash
npm install
npm run build      # tsc + verify instructions budget + sync weavetab.json
npm run dev        # watch mode
npm run validate   # manifest + instructions + remote schema check (add --offline to skip network)
npm run doctor     # env + schema + registry reachability
\`\`\`

## Publish

\`\`\`bash
npm run publish    # preflight gate + npm publish + sync to https://weavetab.dev/discover
# dry run first:
weavetab publish --dry-run
\`\`\`
`;
  fs.writeFileSync(path.join(targetDir, "README.md"), readme);

  // 8. Smoke test — validates manifest and instructions budget without a framework
  fs.mkdirSync(path.join(targetDir, "test"), { recursive: true });
  const smokeTest = `import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "weavetab.json"), "utf-8"));
const instructions = (manifest.instructions || "").trim();

describe("weavetab.json manifest & agent instructions budget", () => {
  it("has required fields in package.json and weavetab.json", () => {
    assert.ok(pkgJson.name, "missing package.json name");
    assert.ok(pkgJson.version, "missing package.json version");
    assert.ok(manifest.name, "missing weavetab.json name");
    assert.ok(manifest.entry, "missing weavetab.json entry");
    assert.equal(manifest.id, undefined, "id must not exist in weavetab.json");
    assert.equal(manifest.agentsMd, undefined, "agentsMd must not exist in weavetab.json");
  });

  it("declares $schema on weavetab.dev", () => {
    assert.equal(manifest.$schema, "https://weavetab.dev/schema/plugin.json");
  });

  it("every permission category declares a reason", () => {
    for (const [cat, perm] of Object.entries(manifest.permissions ?? {})) {
      assert.ok(perm && perm.reason, "permission '" + cat + "' is missing a reason");
    }
  });

  it("enforces strict instructions context window budget (<= ${MAX_INSTRUCTIONS_LINES} lines, <= ${MAX_INSTRUCTIONS_CHARS} chars)", () => {
    assert.ok(instructions.length >= 20, "instructions is too short");
    const lines = instructions.split(/\\r?\\n/).length;
    assert.ok(lines <= ${MAX_INSTRUCTIONS_LINES}, "instructions exceeds ${MAX_INSTRUCTIONS_LINES} lines (" + lines + ")");
    assert.ok(instructions.length <= ${MAX_INSTRUCTIONS_CHARS}, "instructions exceeds ${MAX_INSTRUCTIONS_CHARS} chars (" + instructions.length + ")");
  });
});
`;
  fs.writeFileSync(path.join(targetDir, "test", "manifest.test.mjs"), smokeTest);

  console.log(`\x1b[32m✔\x1b[0m Plugin \x1b[1m${pluginName}\x1b[0m scaffolded with \x1b[36m${templateType}\x1b[0m template (including instructions & CLI commands)!`);
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
  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Building plugin in \x1b[1m${cwd}\x1b[0m...`);

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

  // 2. Synchronize weavetab.json and export tool/command schemas
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

  // Attempt to load compiled plugin module to extract Zod tools, commands, and hooks
  const entryRel = pkgJson.main || manifest.entry || "dist/index.js";
  const entryAbs = path.join(cwd, entryRel);
  if (fs.existsSync(entryAbs)) {
    try {
      const mod = await import(pathToFileURL(entryAbs).href);
      const pluginDef = mod.default || mod.plugin || mod;
      if (
        pluginDef &&
        (pluginDef.name ||
          pluginDef.tools ||
          pluginDef.commands ||
          pluginDef.onBeforeAction ||
          pluginDef.onAfterAction ||
          pluginDef.onDOMMutation)
      ) {
        manifest = exportManifest(pluginDef, manifest);
      }
    } catch {
      // Fallback gracefully to existing manifest
    }
  }

  delete manifest.id;
  delete manifest.agentsMd;
  delete manifest.version;
  delete manifest.author;
  delete manifest.authors;
  delete manifest.license;
  delete manifest.engines;
  delete manifest.environments;

  manifest.$schema = manifest.$schema || SCHEMA_URL;
  manifest.name = pkgJson.name || manifest.name || "unnamed-plugin";
  manifest.description = manifest.description || pkgJson.description || "";
  manifest.entry = entryRel;

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

  // 3. Enforce instructions context budget (strictly in weavetab.json 'instructions')
  const agentSource = typeof manifest.instructions === "string" ? manifest.instructions.trim() : "";
  const sourceLabel = "manifest 'instructions'";

  if (!agentSource) {
    console.error(
      `\x1b[31m[ERROR]\x1b[0m Missing agent instructions in ${cwd}. Every plugin must declare 'instructions' in weavetab.json teaching AI agents how to use its tools and commands.`
    );
    process.exit(1);
  }
  const instructionsAudit = auditInstructions(agentSource, sourceLabel);
  if (!instructionsAudit.valid) {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${sourceLabel} failed strict context budget verification:`);
    for (const err of instructionsAudit.errors) {
      console.error(`  \x1b[31m✖\x1b[0m ${err}`);
    }
    process.exit(1);
  }

  // 4. Enforce permissions.commands gate if CLI commands are declared
  if (Array.isArray(manifest.commands) && manifest.commands.length > 0) {
    const perms = manifest.permissions;
    const allowed =
      (Array.isArray(perms) && (perms.includes("commands") || perms.includes("commands.add"))) ||
      (perms && typeof perms === "object" && perms.commands?.add === true);
    if (!allowed) {
      console.error(
        `\x1b[31m[ERROR]\x1b[0m Manifest declares ${manifest.commands.length} CLI command(s) in 'commands', but 'permissions.commands.add: true' (with a 'reason') is missing.`
      );
      process.exit(1);
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `  \x1b[32m✔\x1b[0m Synchronized weavetab.json (${manifest.tools?.length || 0} tools, ${manifest.commands?.length || 0} CLI commands, ${sourceLabel}: ${instructionsAudit.lines}/${MAX_INSTRUCTIONS_LINES} lines)`
  );
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
    console.log(
      `  \x1b[32m✔\x1b[0m exported ${manifest.tools?.length || 0} tool(s) and ${manifest.commands?.length || 0} command(s) to weavetab.json:\n`
    );
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

    if (!manifest.name) errors.push("Missing 'name' field in weavetab.json");
    if (!manifest.entry) errors.push("Missing 'entry' field in weavetab.json");
    if (manifest.id) errors.push("Field 'id' is not allowed in weavetab.json");
    if (manifest.agentsMd) errors.push("Field 'agentsMd' is removed; use 'instructions' in weavetab.json");

    // Verify entry file exists
    const entryPath = path.resolve(cwd, manifest.entry || "dist/index.js");
    if (!fs.existsSync(entryPath)) {
      warnings.push(`Entrypoint file '${manifest.entry}' does not exist yet. Run 'weavetab build' to compile.`);
    }

    // Verify instructions context budget (strictly in weavetab.json 'instructions')
    const agentSource = typeof manifest.instructions === "string" ? manifest.instructions.trim() : "";
    const sourceLabel = "manifest 'instructions'";

    if (!agentSource) {
      errors.push(
        "Missing agent instructions in weavetab.json. Declare 'instructions' so AI agents know how to use this plugin."
      );
    } else {
      const audit = auditInstructions(agentSource, sourceLabel);
      errors.push(...audit.errors);
      warnings.push(...audit.warnings);
      if (audit.valid) {
        console.log(
          `  \x1b[32m→\x1b[0m ${sourceLabel} verified (${audit.lines}/${MAX_INSTRUCTIONS_LINES} lines, ${audit.chars}/${MAX_INSTRUCTIONS_CHARS} chars)`
        );
      }
    }

    // Check permissions reasons & commands gate
    if (manifest.permissions && typeof manifest.permissions === "object" && !Array.isArray(manifest.permissions)) {
      for (const [category, perm] of Object.entries(manifest.permissions)) {
        if (typeof perm === "object" && perm !== null && !(perm as any).reason) {
          errors.push(`Permission category '${category}' is missing a 'reason' explanation.`);
        }
      }
      if (Array.isArray(manifest.commands) && manifest.commands.length > 0 && !manifest.permissions.commands?.add) {
        errors.push(
          `Manifest declares ${manifest.commands.length} CLI command(s) in 'commands' without 'permissions.commands.add: true'.`
        );
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

    if (warnings.length > 0) {
      console.log(`\x1b[33m[WARNINGS]\x1b[0m`);
      warnings.forEach((w) => console.log(`  \x1b[33m⚠\x1b[0m ${w}`));
      console.log();
    }

    if (errors.length > 0) {
      console.error(`\x1b[31m[FAIL]\x1b[0m Manifest validation failed:`);
      errors.forEach((e) => console.error(`  \x1b[31m✖\x1b[0m ${e}`));
      process.exit(1);
    }

    console.log(`\x1b[32m✔ weavetab.json manifest & instructions are strictly valid and compliant!\x1b[0m\n`);
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
  console.log(`\x1b[36m[Weavetab Doctor]\x1b[0m Running plugin diagnostics in \x1b[1m${cwd}\x1b[0m...\n`);

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

  // Check 4: Agent instructions context budget
  let doctorSource: string | null = null;
  const doctorLabel = "weavetab.json 'instructions'";
  try {
    if (fs.existsSync(manifestPath)) {
      const parsedManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (typeof parsedManifest.instructions === "string" && parsedManifest.instructions.trim()) {
        doctorSource = parsedManifest.instructions.trim();
      }
    }
  } catch {}

  if (doctorSource) {
    const audit = auditInstructions(doctorSource, doctorLabel);
    if (audit.valid) {
      checks.push({
        title: "Agent Instructions Context Budget",
        status: "pass",
        detail: `${doctorLabel}: ${audit.lines}/${MAX_INSTRUCTIONS_LINES} lines, ${audit.chars}/${MAX_INSTRUCTIONS_CHARS} chars`,
      });
    } else {
      checks.push({
        title: "Agent Instructions Context Budget",
        status: "fail",
        detail: audit.errors.join("; "),
      });
    }
  } else {
    checks.push({
      title: "Agent Instructions Context Budget",
      status: "fail",
      detail: `Missing agent instructions in weavetab.json (max ${MAX_INSTRUCTIONS_LINES} lines / ${MAX_INSTRUCTIONS_CHARS} chars)`,
    });
  }

  // Check 5: TypeScript configuration
  const tsconfigPath = path.join(cwd, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    checks.push({ title: "TypeScript Setup", status: "pass", detail: "tsconfig.json configured" });
  } else {
    checks.push({ title: "TypeScript Setup", status: "warn", detail: "No tsconfig.json found" });
  }

  // Check 6: Sandboxed isolated storage directory
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const pluginsDir = path.join(homeDir, ".weavetab", "plugins");
  checks.push({ title: "Plugin Sandbox Isolation", status: "pass", detail: `Isolated storage path: ${pluginsDir}` });

  // Check 7: Schema reachability
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

  // Check 8: Registry reachability
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

  for (const c of checks) {
    if (c.status === "pass") {
      console.log(`  \x1b[32m✔ [PASS]\x1b[0m \x1b[1m${c.title}\x1b[0m: \x1b[2m${c.detail}\x1b[0m`);
    } else if (c.status === "warn") {
      console.log(`  \x1b[33m⚠ [WARN]\x1b[0m \x1b[1m${c.title}\x1b[0m: \x1b[33m${c.detail}\x1b[0m`);
    } else {
      console.log(`  \x1b[31m✖ [FAIL]\x1b[0m \x1b[1m${c.title}\x1b[0m: \x1b[31m${c.detail}\x1b[0m`);
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
// 6. PUBLISH COMMAND — preflight gate + npm publish + sync to weavetab.dev registry
// ---------------------------------------------------------------------------

async function runPublish(): Promise<void> {
  const cwd = process.cwd();
  const dryRun = args.includes("--dry-run");
  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Publishing plugin in \x1b[1m${cwd}\x1b[0m...`);

  // Mandatory pre-publish gate: block npm publish if AGENTS.md or manifest fails preflight
  const preflight = runPreflight(cwd);
  if (preflight.warnings.length > 0) {
    for (const w of preflight.warnings) {
      console.log(`  \x1b[33m!\x1b[0m ${w}`);
    }
  }
  if (!preflight.success) {
    console.error(`\x1b[31m[BLOCKED]\x1b[0m Pre-publish verification failed — refusing to push to npm:`);
    for (const err of preflight.errors) {
      console.error(`  \x1b[31m✖\x1b[0m ${err}`);
    }
    process.exit(1);
  }

  const pkgPath = path.join(cwd, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  if (dryRun) {
    console.log(
      `  \x1b[32m✔\x1b[0m Preflight passed. Dry run: would run 'npm publish' then POST { packageName: "${pkg.name}" } to https://weavetab.dev/api/plugins/sync`
    );
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
      console.log(
        `  \x1b[33m→\x1b[0m npm package is live. Retry sync later: POST { packageName: "${pkg.name}" } to https://weavetab.dev/api/plugins/sync`
      );
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

async function runPreflightCmd(targetDir?: string): Promise<void> {
  printBanner();
  const cwd = targetDir ? path.resolve(process.cwd(), targetDir) : process.cwd();
  console.log(`\x1b[36m[Weavetab SDK]\x1b[0m Running plugin preflight verification in \x1b[1m${cwd}\x1b[0m...\n`);
  const res = runPreflight(cwd);

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
      await runPreflightCmd(args[1]);
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
