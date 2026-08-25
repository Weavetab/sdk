#!/usr/bin/env node
/**
 * @weavetab/sdk CLI
 * Developer CLI for scaffolding, building, and validating Weavetab plugins.
 *
 * Copyright (c) 2026 fy2ne. Licensed under the MIT License.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

function getSdkVersion(): string {
  try {
    const pkg = _require("../package.json");
    return pkg.version || "2.4.0-beta.3";
  } catch {
    return "2.4.0-beta.3";
  }
}

const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : "";

function printHelp(): void {
  const v = getSdkVersion();
  console.log(`
\x1b[36m╔══════════════════════════════════════════════════════╗
║                Weavetab Plugin SDK v${v.padEnd(16)}║
╚══════════════════════════════════════════════════════╝\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  $ weavetab <command> [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[32minit\x1b[0m [name]       Scaffold a new Weavetab TypeScript plugin template
  \x1b[32mbuild\x1b[0m             Compile plugin and synchronize weavetab.json manifest
  \x1b[32mvalidate\x1b[0m          Validate weavetab.json schema and permissions
  \x1b[32mversion\x1b[0m           Show current SDK version
  \x1b[32mhelp\x1b[0m              Show this help message

\x1b[1mDOCUMENTATION & ECOSYSTEM:\x1b[0m
  Website:  https://weavetab.pages.dev
  Registry: https://github.com/weavetab/mcp
  SDK:      https://github.com/weavetab/sdk
`);
}

async function runInit(targetName?: string): Promise<void> {
  const pluginName = (targetName || args[1] || "my-weavetab-plugin").trim();
  const targetDir = path.resolve(process.cwd(), pluginName);

  console.log(`\n\x1b[36m[Weavetab SDK]\x1b[0m Scaffolding new plugin in \x1b[1m${targetDir}\x1b[0m...\n`);

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Directory "${pluginName}" already exists and is not empty.`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(targetDir, "src"), { recursive: true });

  const sdkVer = getSdkVersion();

  // 1. package.json
  const pkgJson = {
    name: pluginName.startsWith("@") ? pluginName : `weavetab-plugin-${pluginName.replace(/^weavetab-plugin-/, "")}`,
    version: "1.0.0",
    description: "A custom Weavetab plugin",
    main: "dist/index.js",
    types: "dist/index.d.ts",
    type: "module",
    scripts: {
      build: "weavetab build",
      dev: "tsc --watch",
    },
    engines: {
      node: ">=18.0.0",
    },
    keywords: ["weavetab", "weavetab-plugin"],
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
    $schema: "https://weavetab.pages.dev/schema/plugin.json",
    name: pkgJson.name,
    version: "1.0.0",
    description: "A custom Weavetab plugin",
    entry: "dist/index.js",
    engines: {
      weavetab: `^${sdkVer}`,
      node: ">=18.0.0",
    },
    environments: ["mcp"],
    permissions: {
      cdp: {
        evaluate: true,
        reason: "Executes automation in browser context",
      },
    },
    tools: [
      {
        name: "hello_tool",
        description: "An example custom tool registered by this plugin",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "A message to echo back",
            },
          },
          required: ["message"],
        },
      },
    ],
  };

  fs.writeFileSync(path.join(targetDir, "weavetab.json"), JSON.stringify(weavetabJson, null, 2) + "\n");

  // 4. src/index.ts
  const srcCode = `import { definePlugin, type PluginContext } from "@weavetab/sdk";

export default definePlugin({
  name: "${pkgJson.name}",

  async onLoad(ctx: PluginContext) {
    console.log("[${pkgJson.name}] Plugin initialized!");

    // Register a custom MCP tool
    ctx.mcp.registerTool({
      name: "hello_tool",
      description: "An example custom tool registered by this plugin",
      schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "A message to echo back",
          },
        },
        required: ["message"],
      },
      handler: async (args: { message: string }) => {
        return {
          content: [
            {
              type: "text",
              text: \`Echo from \${pkgJson.name}: \${args.message || "Hello World!"}\`,
            },
          ],
        };
      },
    });
  },

  async onUnload(ctx: PluginContext) {
    console.log("[${pkgJson.name}] Plugin unloaded.");
  },
});
`;

  fs.writeFileSync(path.join(targetDir, "src", "index.ts"), srcCode);

  // 5. .gitignore
  const gitignore = `node_modules/
dist/
*.log
.DS_Store
`;
  fs.writeFileSync(path.join(targetDir, ".gitignore"), gitignore);

  // 6. README.md
  const readme = `# ${pkgJson.name}

A plugin for [Weavetab](https://weavetab.pages.dev).

## Development

\`\`\`bash
# Install dependencies
npm install

# Build the plugin
npm run build
\`\`\`

## Installation into Weavetab

\`\`\`bash
weavetab plugin add ${pkgJson.name}
\`\`\`
`;
  fs.writeFileSync(path.join(targetDir, "README.md"), readme);

  console.log(`\x1b[32m✔\x1b[0m Plugin \x1b[1m${pluginName}\x1b[0m scaffolded successfully!`);
  console.log(`\n\x1b[1mNext steps:\x1b[0m`);
  console.log(`  cd ${pluginName}`);
  console.log(`  npm install`);
  console.log(`  npm run build\n`);
}

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
      console.log(`  \x1b[34m→\x1b[0m Compiling TypeScript...`);
      execSync("npx tsc", { cwd, stdio: "inherit" });
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

  manifest.$schema = manifest.$schema || "https://weavetab.pages.dev/schema/plugin.json";
  manifest.name = pkgJson.name || manifest.name || "unnamed-plugin";
  manifest.version = pkgJson.version || manifest.version || "1.0.0";
  manifest.description = pkgJson.description || manifest.description || "";
  manifest.entry = manifest.entry || "dist/index.js";

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
      cdp: {
        evaluate: true,
        reason: "Executes automation actions in browser context",
      },
    };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`  \x1b[32m✔\x1b[0m Synchronized weavetab.json manifest`);
  console.log(`\x1b[32m✔ Build completed successfully!\x1b[0m\n`);
}

async function runValidate(): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, "weavetab.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m weavetab.json not found in ${cwd}`);
    process.exit(1);
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const errors: string[] = [];

    if (!manifest.name) errors.push("Missing 'name' field");
    if (!manifest.version) errors.push("Missing 'version' field");
    if (!manifest.entry) errors.push("Missing 'entry' field");
    if (!manifest.engines?.weavetab) errors.push("Missing 'engines.weavetab' field");

    if (errors.length > 0) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Manifest validation failed:`);
      errors.forEach((e) => console.error(`  - ${e}`));
      process.exit(1);
    }

    console.log(`\x1b[32m✔\x1b[0m weavetab.json is valid!`);
  } catch (err: any) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Failed to parse weavetab.json: ${err.message}`);
    process.exit(1);
  }
}

switch (command) {
  case "init":
    runInit();
    break;
  case "build":
    runBuild();
    break;
  case "validate":
    runValidate();
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