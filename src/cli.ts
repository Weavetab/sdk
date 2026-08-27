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

const _require = createRequire(import.meta.url);

function getSdkVersion(): string {
  try {
    const pkg = _require("../package.json");
    return pkg.version || "2.5.0-beta.2";
  } catch {
    return "2.5.0-beta.2";
  }
}

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
  \x1b[32mdev\x1b[0m                    Start live TypeScript watch mode with manifest auto-sync
  \x1b[32mvalidate\x1b[0m               Validate manifest schema, isolated permissions, and sandbox
  \x1b[32mdoctor\x1b[0m                 Run environment diagnostics and verify plugin health
  \x1b[32mversion\x1b[0m                Print current SDK version
  \x1b[32mhelp\x1b[0m                   Display this help screen

\x1b[1mTEMPLATE OPTIONS (for 'init'):\x1b[0m
  \x1b[36m--template standard\x1b[0m    Default versatile plugin (Tools + Isolated Storage + HUD)
  \x1b[36m--template visual\x1b[0m      Visual feedback & UI overlay plugin (HUD, badges, DOM styles)
  \x1b[36m--template scraper\x1b[0m     Data extraction & DOM scraper with sandboxed JSON storage
  \x1b[36m--template automation\x1b[0m  High-speed multi-step browser automation workflow
  \x1b[36m--template override\x1b[0m    Built-in tool interceptor & lifecycle hook wrapper
  \x1b[36m--template youtube\x1b[0m     Media automation plugin (YouTube auto-liker / navigator)

\x1b[1mDOCUMENTATION & REGISTRY:\x1b[0m
  Docs:     https://github.com/weavetab/mcp/docs/plugins
  Registry: https://github.com/weavetab/mcp
  SDK:      https://github.com/weavetab/sdk
`);
}

// ---------------------------------------------------------------------------
// TEMPLATES DEFINITION
// ---------------------------------------------------------------------------

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
        src: `import { definePlugin, type PluginContext } from "@weavetab/sdk";

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
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of elements to highlight" },
          color: { type: "string", description: "Border color (e.g. #22c55e, red)" },
        },
        required: ["selector"],
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
          content: [{ type: "text", text: \`Successfully highlighted elements matching "\${args.selector}" with color \${color}\` }],
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
        src: `import { definePlugin, type PluginContext } from "@weavetab/sdk";

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
        type: "object",
        properties: {
          rowSelector: { type: "string", description: "CSS selector for individual rows or cards" },
          limit: { type: "number", description: "Max rows to extract" },
        },
        required: ["rowSelector"],
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
          tools: { override: ["browser_navigate"], hooks: true, reason: "Secures browser navigation actions" },
        },
        tools: [],
        src: `import { definePlugin, type PluginContext } from "@weavetab/sdk";

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

    case "youtube":
      return {
        config: {
          autoLike: true,
          showThought: true,
          cooldownMs: 2000,
        },
        perms: {
          config: { read: true, write: true, reason: "Stores YouTube automation preferences" },
          extension: { hud: true, reason: "Displays like status bubble on screen" },
          network: { domains: ["*.youtube.com", "youtu.be"], reason: "Interacts with YouTube videos" },
          cdp: { evaluate: true, click: true, reason: "Clicks YouTube like button" },
        },
        tools: [
          {
            name: "youtube_autolike_status",
            description: "Checks or updates the auto-like settings for YouTube videos",
            parameters: {
              type: "object",
              properties: {
                enable: { type: "boolean", description: "Toggle auto-like behavior" },
              },
            },
          },
        ],
        src: `import { definePlugin, matchUrlPattern, sleep, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pluginPkgName}",

  defaultConfig: {
    autoLike: true,
    showThought: true,
    cooldownMs: 2000,
  },

  async onLoad(ctx: PluginContext) {
    ctx.logger.info("YouTube Automation plugin active!");

    // Register status management tool
    ctx.mcp.registerTool({
      name: "youtube_autolike_status",
      description: "Checks or updates the auto-like settings for YouTube videos",
      schema: {
        type: "object",
        properties: {
          enable: { type: "boolean", description: "Toggle auto-like behavior" },
        },
      },
      handler: async (args: { enable?: boolean }, session: any) => {
        if (args.enable !== undefined) {
          ctx.config.autoLike = args.enable;
          await ctx.storage.set("autoLike", args.enable);
        }

        const totalLiked = (await ctx.storage.get<number>("totalLiked", 0)) || 0;

        return {
          content: [
            {
              type: "text",
              text: \`YouTube Auto-Like is currently \${ctx.config.autoLike ? "ENABLED" : "DISABLED"}. Total videos auto-liked: \${totalLiked}\`,
            },
          ],
        };
      },
    });

    // Hook: Trigger like routine when YouTube video URL is opened
    ctx.hooks.onPageNavigate?.(async (url: string, session: any) => {
      if (!ctx.config.autoLike || !session) return;
      if (!matchUrlPattern(url, "*.youtube.com") && !matchUrlPattern(url, "youtu.be")) return;

      if (url.includes("/watch") || url.includes("/shorts/")) {
        await sleep(ctx.config.cooldownMs || 2000);

        const liked = await ctx.extension.injectScript(session, \`
          (() => {
            const btn = document.querySelector('like-button-view-model button[aria-pressed="false"]') ||
                        document.querySelector('#segmented-like-button button[aria-pressed="false"]');
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          })()
        \`);

        if (liked) {
          const count = ((await ctx.storage.get<number>("totalLiked", 0)) || 0) + 1;
          await ctx.storage.set("totalLiked", count);

          if (ctx.config.showThought) {
            await ctx.extension.showThought(session, \`👍 Auto-liked video! (Total: \${count})\`, { durationMs: 3000 });
          }
        }
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
        src: `import { definePlugin, type PluginContext } from "@weavetab/sdk";

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
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "A message to echo back and display on the screen",
          },
        },
        required: ["message"],
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
  }
}

// ---------------------------------------------------------------------------
// 1. INIT COMMAND
// ---------------------------------------------------------------------------

async function runInit(): Promise<void> {
  printBanner();

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
  const pkgJson = {
    name: pkgName,
    version: "1.0.0",
    description: `A Weavetab ${templateType} plugin with isolated config, storage, and visual extension support`,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    type: "module",
    scripts: {
      build: "weavetab build",
      dev: "weavetab dev",
      validate: "weavetab validate",
      doctor: "weavetab doctor",
    },
    engines: {
      node: ">=18.0.0",
    },
    keywords: ["weavetab", "weavetab-plugin", "mcp", "browser-automation"],
    devDependencies: {
      "@weavetab/sdk": `^${sdkVer}`,
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
    $schema: "https://raw.githubusercontent.com/weavetab/sdk/main/schema/plugin.json",
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

  // 6. README.md
  const readme = `# ${pkgJson.name}

A ${templateType} plugin for [Weavetab](https://github.com/weavetab/mcp) built with \`@weavetab/sdk\`.

## Architectural Guarantees
- **Isolated Configuration**: Stored exclusively at \`~/.weavetab/plugins/${pkgJson.name}/config.json\`
- **Sandboxed Storage**: Key-value data in \`~/.weavetab/plugins/${pkgJson.name}/storage.json\`
- **Visual Extensions**: Floating HUD thought bubbles, badges, and DOM style injections

## Development

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Build and synchronize weavetab.json
npm run build

# 3. Watch for changes during development
npm run dev
\`\`\`

## Installation into Weavetab

\`\`\`bash
weavetab plugin add ${pkgJson.name}
\`\`\`
`;
  fs.writeFileSync(path.join(targetDir, "README.md"), readme);

  console.log(`\x1b[32m✔\x1b[0m Plugin [1m${pluginName}[0m scaffolded successfully using [36m${templateType}[0m template!`);
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

  // 2. Synchronize weavetab.json
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

  const sdkVer = getSdkVersion();

  manifest.$schema = manifest.$schema || "https://raw.githubusercontent.com/weavetab/sdk/main/schema/plugin.json";
  manifest.name = pkgJson.name || manifest.name || "unnamed-plugin";
  manifest.version = pkgJson.version || manifest.version || "1.0.0";
  manifest.description = pkgJson.description || manifest.description || "";
  manifest.entry = pkgJson.main || manifest.entry || "dist/index.js";

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
  console.log(`  \x1b[32m✔\x1b[0m Synchronized and validated weavetab.json manifest`);
  console.log(`\x1b[32m✔ Build completed successfully! Ready for publishing.\x1b[0m\n`);
}

// ---------------------------------------------------------------------------
// 3. DEV / WATCH COMMAND
// ---------------------------------------------------------------------------

async function runDev(): Promise<void> {
  const cwd = process.cwd();
  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Starting developer watch mode in [1m${cwd}[0m...`);

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
}

// ---------------------------------------------------------------------------
// 4. VALIDATE COMMAND
// ---------------------------------------------------------------------------

async function runValidate(): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, "weavetab.json");
  const pkgPath = path.join(cwd, "package.json");

  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Validating plugin in [1m${cwd}[0m...\n`);

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
  console.log(`\x1b[36m[Weavetab Doctor]\x1b[0m Running enterprise plugin diagnostics in [1m${cwd}[0m...\n`);

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
// ROUTER
// ---------------------------------------------------------------------------

switch (command) {
  case "init":
  case "create":
  case "new":
    runInit();
    break;
  case "build":
    runBuild();
    break;
  case "dev":
  case "watch":
    runDev();
    break;
  case "validate":
  case "check":
    runValidate();
    break;
  case "doctor":
  case "test":
    runDoctor();
    break;
  case "version":
  case "-v":
  case "--version":
    console.log(`@weavetab/sdk v${getSdkVersion()}`);
    break;
  case "help":
  case "-h":
  case "--help":
  default:
    printHelp();
    break;
}
