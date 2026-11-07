import fs from "node:fs";
import path from "node:path";

export const MAX_INSTRUCTIONS_LINES = 80;
export const MAX_INSTRUCTIONS_CHARS = 3200;
export const MIN_INSTRUCTIONS_CHARS = 20;

export interface InstructionsAudit {
  valid: boolean;
  lines: number;
  chars: number;
  errors: string[];
  warnings: string[];
}

/**
 * Enforces the strict context-window budget on plugin instructions so
 * loaded plugins never bloat or overflow an AI agent's context window.
 */
export function auditInstructions(content: string, label = "instructions"): InstructionsAudit {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = content.trim();
  const chars = trimmed.length;
  const lines = trimmed ? trimmed.split(/\r?\n/).length : 0;

  if (chars < MIN_INSTRUCTIONS_CHARS) {
    errors.push(
      `${label} is too short (${chars} chars, minimum ${MIN_INSTRUCTIONS_CHARS}); document operational rules or usage for AI agents`
    );
  }
  if (lines > MAX_INSTRUCTIONS_LINES) {
    errors.push(
      `${label} exceeds strict context budget: ${lines} lines (max ${MAX_INSTRUCTIONS_LINES} lines allowed to prevent AI agent context overflow)`
    );
  }
  if (chars > MAX_INSTRUCTIONS_CHARS) {
    errors.push(
      `${label} exceeds strict character budget: ${chars} chars (max ${MAX_INSTRUCTIONS_CHARS} chars / ~800 tokens allowed)`
    );
  }

  return {
    valid: errors.length === 0,
    lines,
    chars,
    errors,
    warnings,
  };
}

export interface PreflightResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export function runPreflight(cwd = process.cwd()): PreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const manifestPath = path.join(cwd, "weavetab.json");
  const pkgJsonPath = path.join(cwd, "package.json");
  const readmePath = path.join(cwd, "README.md");

  // 1. package.json checks
  if (!fs.existsSync(pkgJsonPath)) {
    errors.push("missing package.json in plugin root");
    return { success: false, errors, warnings };
  }

  let pkgJson: Record<string, any> = {};
  try {
    pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  } catch (err: any) {
    errors.push(`invalid package.json: ${err.message}`);
    return { success: false, errors, warnings };
  }

  // 2. weavetab.json checks
  if (!fs.existsSync(manifestPath)) {
    errors.push("missing weavetab.json manifest in plugin root");
    return { success: false, errors, warnings };
  }

  let manifest: Record<string, any> = {};
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch (err: any) {
    errors.push(`invalid weavetab.json: ${err.message}`);
    return { success: false, errors, warnings };
  }

  const pkgName = pkgJson.name || manifest.name || "";
  if (!pkgName) {
    errors.push("manifest or package.json must define a 'name'");
  }

  // Namespace spoofing guard: only official first-party packages can use @weavetab/
  if (pkgName.startsWith("@weavetab/") && !process.env.WEAVETAB_OFFICIAL_RELEASE) {
    warnings.push("package uses official '@weavetab/' scope; reserved for first-party plugins");
  }

  // Anti-squatting rule: no arbitrary short id in weavetab.json
  if (manifest.id) {
    errors.push("field 'id' is not allowed in weavetab.json; use 'name' for package ID and 'displayName' for title");
  }

  if (manifest.agentsMd) {
    errors.push("field 'agentsMd' is removed; declare agent instructions directly in weavetab.json under 'instructions'");
  }

  // Version check (strictly from package.json)
  if (!pkgJson.version) {
    errors.push("missing 'version' in package.json");
  }

  // SDK / MCP dependency check in package.json
  const sdkDep =
    pkgJson.dependencies?.["@weavetab/sdk"] ||
    pkgJson.peerDependencies?.["@weavetab/sdk"] ||
    pkgJson.devDependencies?.["@weavetab/sdk"];
  if (!sdkDep) {
    warnings.push("missing '@weavetab/sdk' in package.json dependencies (used to determine Weavetab MCP version compatibility)");
  }

  if (!pkgJson.engines?.node) {
    warnings.push("missing 'engines.node' declaration in package.json; defaults to >=18.0.0");
  }

  // 3. README check
  if (!fs.existsSync(readmePath)) {
    errors.push("missing README.md; required for marketplace indexing and discoverability");
  } else {
    const readmeContent = fs.readFileSync(readmePath, "utf-8").trim();
    if (readmeContent.length < 40) {
      warnings.push("README.md is very brief; consider documenting tools and usage");
    }
  }

  // 4. Agent instructions check (strictly in weavetab.json 'instructions')
  if (typeof manifest.instructions !== "string" || !manifest.instructions.trim()) {
    errors.push(
      "weavetab.json must declare 'instructions' so AI agents know how to use this plugin's tools and commands"
    );
  } else {
    const audit = auditInstructions(manifest.instructions, "manifest 'instructions'");
    errors.push(...audit.errors);
    warnings.push(...audit.warnings);
  }

  // 5. Commands Structure & Permissions Audit
  if (Array.isArray(manifest.commands)) {
    for (const cmd of manifest.commands) {
      if (!cmd.name || typeof cmd.name !== "string" || !cmd.name.trim()) {
        errors.push("all declared commands in 'commands' must have a non-empty 'name'");
      }
      if (!cmd.description || typeof cmd.description !== "string" || cmd.description.trim().length < 5) {
        errors.push(`command '${cmd.name || "unnamed"}' must have a descriptive 'description' (at least 5 characters)`);
      }
    }
  }

  // 5. Permissions Reason & Commands Gate Audit
  const perms = manifest.permissions;
  if (perms && typeof perms === "object" && !Array.isArray(perms)) {
    for (const [category, val] of Object.entries(perms)) {
      if (val && typeof val === "object") {
        const reason = (val as any).reason;
        if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
          errors.push(`permission category '${category}' must declare a descriptive 'reason'`);
        }
      }
    }
    if (Array.isArray(manifest.commands) && manifest.commands.length > 0 && !perms.commands?.add) {
      errors.push(
        `manifest declares ${manifest.commands.length} CLI command(s) in 'commands' but is missing 'permissions.commands.add: true'`
      );
    }
  } else if (Array.isArray(manifest.commands) && manifest.commands.length > 0) {
    const hasCmdPerm = Array.isArray(perms) && (perms.includes("commands") || perms.includes("commands.add"));
    if (!hasCmdPerm) {
      errors.push("manifest declares CLI commands in 'commands' but is missing 'permissions.commands'");
    }
  }

  // 6. Build Artifact & Entry point check
  const entryRel = manifest.entry || pkgJson.main || "dist/index.js";
  const entryAbs = path.join(cwd, entryRel);
  if (!fs.existsSync(entryAbs)) {
    errors.push(`entry point '${entryRel}' not found on disk; run 'npm run build' first`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
